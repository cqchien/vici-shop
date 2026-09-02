# ADR-010: Mô hình vận hành serverless trên AWS (Lambda + EventBridge + SQS + SNS + Step Functions)

- **Trạng thái**: **Proposed** (chờ chấp nhận)
- **Ngày**: 2026-08-30
- **Quan hệ**: thay hạ tầng compute/broker trong [02-tech-stack.md](../02-tech-stack.md);
  thay [ADR-005](ADR-005-kong-api-gateway.md) (Kong → API Gateway) cho môi trường serverless;
  sửa đổi [ADR-008](ADR-008-platform-plane-services-nestjs.md) (saga: `@nestjs/cqrs` SagaManager →
  **AWS Step Functions**); **không đổi** [ADR-004](ADR-004-kafka-outbox-events.md) (outbox vẫn
  bắt buộc) và [ADR-007](ADR-007-multi-tenancy-pooled-rls.md) (pooled + RLS giữ nguyên).

## Problem

13 service hiện thiết kế là **container luôn chạy** (Kong, consumer Kafka thường trực, K8s/Helm).
Với nền tảng đa tenant nhiều shop nhỏ tải không đều, phần lớn thời gian compute nằm im nhưng vẫn
tính tiền; đồng thời tự vận hành Kafka + Kong + K8s là gánh nặng ops lớn so với quy mô. Người
dùng muốn chuyển sang **serverless AWS**, compute chạy bằng **Lambda**, và hỏi luồng dùng
**Lambda / EventBridge / SQS / SNS**.

## Why

- **Lambda scale-to-zero + tính theo request** khớp mô hình pooled đa tenant: tenant không hoạt
  động không tốn compute; spike drop = burst concurrency (kèm *provisioned concurrency* cho
  đường nóng: add-to-cart, checkout).
- **EventBridge + SQS + SNS thay broker tự vận hành**: hết việc chạy/patch/scale Kafka + relay;
  EventBridge cho routing theo `source`/`detail-type`, SQS cho buffer + retry + DLQ, SNS cho
  fan-out thuần độ rộng lớn. At-least-once vẫn đúng → consumer idempotent (đã là quy tắc ADR-004).
- **Step Functions** là process manager tường minh (state + compensation + retry/backoff dựng
  sẵn) cho saga — thay `@nestjs/cqrs` SagaManager; logic CQRS/ES của aggregate vẫn nằm trong
  Lambda, chỉ đổi *ai điều phối*.
- **Hexagonal giữ nguyên giá trị**: Lambda handler chỉ là một *driving adapter* mới trong
  `interface/`; `domain/` + `application/` không đổi một dòng. Đây chính là litmus test của
  [architecture.md](../../../.claude/conventions/architecture.md).
- Trade-off chấp nhận (và cách giảm):
  - **Cold start** → Go (binary nhỏ, khởi động ms); provisioned concurrency cho checkout/drop;
    NestJS (auth, user, order, tenant, billing) đóng gói dạng Lambda handler gọn, hoặc chạy Fastify adapter.
  - **Không gRPC luồng dài** → gọi nội bộ đồng bộ = **Lambda `Invoke` (RequestResponse)** hoặc
    **private API Gateway**; port interface giữ nguyên, đổi adapter `infrastructure/grpc` →
    `infrastructure/awsinvoke`.
  - **Kết nối DB** → **RDS Proxy** (pool connection cho Lambda; bắt buộc vì RLS dùng
    `SET LOCAL app.tenant_id` mỗi transaction) hoặc **Aurora Serverless v2**.
  - **Thứ tự event** → **SQS FIFO** với `MessageGroupId` (vd. `order_id`) ở nơi cần thứ tự.
  - **Giới hạn 15 phút / payload 256KB** → công việc dài đẩy sang Step Functions + S3 cho payload lớn.
  - **Lock-in** → giữ core sạch; EventBridge/SQS/SNS là ranh giới mỏng, thay được.
  - **Dev-prod parity** → **AWS SAM + LocalStack** thay `docker compose`.

## Solution

### Ánh xạ thành phần

| Vai trò hiện tại | Serverless AWS |
| --- | --- |
| Kong (edge, JWT, tenant resolve, rate limit) | **API Gateway HTTP API** + **Lambda authorizer** (verify JWT, phân giải tenant từ `tid`/`Host` → context `X-Tenant-Id`) + **usage plan / throttling theo tenant** |
| Service container (REST/gRPC handler) | **Lambda / service** — một hàm cho REST (proxy integration), một cho mỗi RPC nội bộ / consumer |
| gRPC nội bộ đồng bộ | **Lambda `Invoke`** (RequestResponse) hoặc private API GW |
| Kafka topic + outbox relay | **outbox không đổi** → **relay Lambda** (EventBridge Scheduler mỗi 1', hoặc DynamoDB Streams / DMS logical replication) publish lên **EventBridge default bus** (`source=vici.<context>`, `detail-type=<event>`, `detail` chứa `tenantId` + payload) |
| Kafka consumer group | **EventBridge rule → SQS queue mỗi consumer → Lambda** (trigger SQS, batch + `ReportBatchItemFailures`, DLQ `<queue>-dlq` + alarm) |
| Fan-out độ rộng lớn (notification, `tenant.provisioned` → nhiều context) | **SNS topic** → SQS mỗi subscriber (SNS→SQS fanout) |
| `@nestjs/cqrs` Saga (checkout, provisioning) | **AWS Step Functions (Standard)** — task = Lambda invoke; `.catch`/`.retry` cho compensation; **callback task token** để chờ event async (`payment.succeeded`) |
| Cron (dunning, quét deadline pre-order, purge tenant) | **EventBridge Scheduler → Lambda** |
| Redis (cart, session, **drop counter atomic**) | **ElastiCache Serverless (Valkey/Redis)** — cần INCR atomic độ trễ thấp cho drop |
| PostgreSQL database-per-service | **RDS PostgreSQL + RDS Proxy** hoặc **Aurora Serverless v2**; RLS + `SET LOCAL app.tenant_id` giữ nguyên |
| K8s/Helm | **SAM/Terraform**; K8s giữ làm phương án thay thế, không phải target chính |
| OTel collector | **ADOT Lambda layer** → collector (Jaeger/Prometheus/Loki không đổi) |

### Quy tắc tenant context trên serverless (ADR-009 vẫn đúng, đổi phương tiện)

- **API GW Lambda authorizer** trả `context.tenantId` (từ claim `tid`, hoặc `ResolveTenantByHost`
  cho route public) → mọi Lambda đọc từ `event.requestContext.authorizer`.
- **Lambda `Invoke` nội bộ**: `tenantId` trong payload envelope (không phải tham số nghiệp vụ).
- **EventBridge**: `detail.tenantId` (bắt buộc); **rule** có thể lọc theo tenant nếu cần.
- **SQS**: `MessageAttributes["tenant-id"]` (đọc được không cần parse body).
- **DB**: repository vẫn `SET LOCAL app.tenant_id` mở đầu transaction (qua RDS Proxy).

### Phạm vi & lộ trình

- **Không đổi**: `domain/`, `application/`, outbox (ADR-004), pooled + RLS (ADR-007), contract
  proto/Avro (Avro schema tái dùng làm schema `detail` EventBridge / EventBridge Schema Registry).
- **Đổi**: `interface/` (thêm Lambda handler), `infrastructure/grpc` → `infrastructure/awsinvoke`,
  `infrastructure/kafka` → `infrastructure/eventbridge` + `infrastructure/sqs`, saga → Step Functions
  ASL, `main.go`/`main.ts` bootstrap → Lambda entrypoint, Kong `kong.yml` → API GW (SAM/OpenAPI).
- **Pilot**: bắt đầu bằng **tenant-service + billing-service** (platform plane — tải thấp,
  saga-heavy, minh hoạ Step Functions rõ nhất), rồi migrate lần lượt các service thương mại theo
  roadmap; giữ được cả hai target (container + serverless) sau cùng test bằng cùng bộ e2e.
- **ADR này cần một ADR con** khi chốt chi tiết: chọn Aurora Serverless v2 vs RDS Proxy, chọn cơ
  chế relay (Scheduler vs DynamoDB Streams vs DMS), và ranh giới CloudFront/WAF.

### Luồng chi tiết

Xem [06-serverless-aws.md](../06-serverless-aws.md) — sequence diagram cho: request REST public,
saga checkout (Step Functions + callback token), fan-out `order.completed`, onboarding
provisioning, drop spike, và cron.
