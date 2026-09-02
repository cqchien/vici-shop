# Serverless AWS — Áp dụng trong Vici

**Đề xuất** — [ADR-010](../../20-architecture/adrs/ADR-010-serverless-aws-delivery.md) (Proposed),
luồng chi tiết: [`20-architecture/06-serverless-aws.md`](../../20-architecture/06-serverless-aws.md).

## Bảng ánh xạ (ADR-010)

| Hiện tại | Serverless |
| --- | --- |
| Kong | **API Gateway HTTP API** + **Lambda authorizer** (verify JWT + resolve tenant → `context.tenantId`) + usage plan/tenant |
| Service container (REST/gRPC) | **Lambda / service** — 1 hàm REST, 1 hàm mỗi RPC nội bộ / consumer |
| gRPC nội bộ đồng bộ | **Lambda `Invoke` (RequestResponse)** hoặc private API GW; `infrastructure/grpc` → `infrastructure/awsinvoke` |
| Kafka topic + outbox relay | outbox **không đổi** → relay Lambda (Scheduler 1' / DynamoDB Streams / DMS) → **EventBridge** (`source=vici.<ctx>`) |
| Kafka consumer group | EventBridge rule → **SQS mỗi consumer** → Lambda (batch, `ReportBatchItemFailures`, DLQ `<queue>-dlq`) |
| Fan-out rộng (`tenant.provisioned` → 7 context) | **SNS** → SQS mỗi subscriber |
| `@nestjs/cqrs` Saga (checkout, provisioning) | **AWS Step Functions** (Standard) — task = Lambda invoke; `Catch`/`Retry`; callback task token |
| Cron (dunning, deadline, purge) | **EventBridge Scheduler** → Lambda |
| Redis (cart, drop counter) | **ElastiCache Serverless** (drop counter cần INCR atomic) |
| PostgreSQL database-per-service | **RDS + RDS Proxy** hoặc **Aurora Serverless v2**; RLS + `SET LOCAL` không đổi |
| K8s/Helm | **SAM/Terraform**; K8s là phương án thay thế |
| OTel collector | **ADOT Lambda layer** → collector hiện tại |

## 6 luồng (từ `06-serverless-aws.md`)

| # | Luồng | Điểm chính |
| --- | --- | --- |
| 1 | REST public (`GET /products`) | CloudFront → API GW → authorizer (tenant) → Lambda → RDS Proxy (`SET LOCAL app.tenant_id`) |
| 2 | Checkout saga | order Lambda append OrderPlaced+outbox → Step Functions: Reserve → CreatePayment → **WaitForPayment (callback token, timeout)** → Commit → Ship; `Catch` → Refund+Release+cancel |
| 3 | Fan-out `order.completed` | relay Lambda → EventBridge → rule → SQS(finance/user/notification) → Lambda (dedupe, DLQ) |
| 4 | Onboarding provisioning | tenant Lambda → Step Functions: AttachTenant → CreateSubscription → EventBridge `tenant.provisioned` → **SNS → context seed Lambdas** → RegisterSubdomain → MarkActive; compensation |
| 5 | Drop spike | API GW throttle/tenant → add-to-cart Lambda (**provisioned concurrency**) → ElastiCache Lua INCR → SQS FIFO cho checkout |
| 6 | Cron | EventBridge Scheduler → `*-outbox-relay`, `billing-dunning`, `order-preorder-deadline`, `tenant-purge` |

## Tenant context serverless (ADR-009 giữ, đổi phương tiện)

| Chặng | Serverless |
| --- | --- |
| Edge | API GW **Lambda authorizer** → `event.requestContext.authorizer.tenantId` |
| Lambda invoke nội bộ | `tenantId` trong payload envelope |
| EventBridge | `detail.tenantId` (bắt buộc); rule có thể lọc theo tenant |
| SQS | `MessageAttributes["tenant-id"]` (đọc không cần parse body) |
| DB | vẫn `SET LOCAL app.tenant_id` (qua RDS Proxy) |

## Những gì **KHÔNG** đổi

- `domain/`, `application/` — không một dòng (hexagonal — xem [`02-hexagonal/01`](../02-hexagonal/01-khai-niem.md#adapter-đổi-được--ví-dụ-cụ-thể)).
- **Outbox** bắt buộc (ADR-004) — chỉ đổi đích publish (EventBridge thay Kafka).
- **Pooled + RLS** (ADR-007) — chỉ thêm RDS Proxy.
- Contract proto/Avro — Avro schema tái dùng cho `detail` EventBridge / EventBridge Schema Registry.

## Đổi trong code

- `interface/` — thêm Lambda handler (adapter driving mới).
- `infrastructure/grpc` → `infrastructure/awsinvoke`; `infrastructure/kafka` →
  `infrastructure/eventbridge` + `infrastructure/sqs`.
- Saga → Step Functions ASL (`application/saga` → định nghĩa state machine).
- `main.go`/`main.ts` bootstrap → Lambda entrypoint.
- Kong `kong.yml` → API GW (SAM/OpenAPI).

## Pilot & lộ trình

Bắt đầu **tenant-service + billing-service** (platform plane — tải thấp, saga-heavy → minh hoạ
Step Functions rõ nhất), rồi migrate lần lượt service thương mại. Giữ cả hai target (container +
serverless) sau cùng test bằng cùng bộ e2e. ADR-010 cần **một ADR con** cho: Aurora Serverless
v2 vs RDS Proxy, cơ chế relay, ranh giới CloudFront/WAF.

## Dev & IaC

- **AWS SAM + LocalStack** (`sam local`) thay `docker compose` cho local (Lambda, API GW, SQS,
  SNS, EventBridge, Step Functions Local); Postgres/Redis vẫn container.
- `backend/infra/terraform/modules/` đã có `lambda`, `eventbridge` scaffold — thêm `apigateway`,
  `stepfunctions`, `sqs`, `sns`, `rds-proxy`.

## Đọc tiếp

- Vì sao đổi được mà không đụng domain → [`02-hexagonal`](../02-hexagonal/README.md)
- Saga → Step Functions → [`05-saga`](../05-saga/README.md) §3
- Outbox → EventBridge → [`06-outbox`](../06-outbox/README.md) §3
- Kafka → EventBridge/SQS/SNS → [`07-event-driven-kafka`](../07-event-driven-kafka/README.md) §3
- RDS Proxy + authorizer + tenant → [`10-multi-tenancy-rls`](../10-multi-tenancy-rls/README.md)
