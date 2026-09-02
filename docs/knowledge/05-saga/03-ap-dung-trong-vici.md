# Saga — Áp dụng trong Vici

Nguồn chuẩn: [`20-architecture/05-key-flows.md`](../../20-architecture/05-key-flows.md) §0 (provisioning)
và §1 (checkout); [`30-domain/02-order-lifecycle.md`](../../30-domain/02-order-lifecycle.md).

## Hai saga orchestration

### 1. Checkout saga — `order-service`

Process manager: `src/application/saga/checkout.saga.ts` (`@nestjs/cqrs` `Saga`). Không service
nào khác giữ state của saga này.

Các bước (từ [`05-key-flows.md`](../../20-architecture/05-key-flows.md) §1):

| # | Bước | Kiểu | Compensation |
| --- | --- | --- | --- |
| 1 | `inventory.ReserveStock` (gRPC, TTL 15' — drop 5') | compensatable | `ReleaseReservation` |
| 2 | `payment.CreatePayment` (gRPC) | compensatable | (chờ) |
| — | chờ `payment.succeeded` (Kafka từ IPN), timeout ~30' | wait | `payment.expired` → release |
| 3 | `inventory.CommitReservation` | pivot | — |
| 4 | `shipping.CreateShipment` | retriable | — |
| 5 | phát `OrderConfirmed` | retriable | — |

Bảng compensation đầy đủ ("Fail tại … → Compensation"):
[`05-key-flows.md`](../../20-architecture/05-key-flows.md) §1.

### 2. Provisioning saga — `tenant-service`

Process manager: `src/application/saga/provisioning.saga.ts`. Từ
[`40-services/tenant-service.md`](../../40-services/tenant-service.md) §4 và
[`30-domain/05-tenant-lifecycle.md`](../../30-domain/05-tenant-lifecycle.md):

| # | Step | Forward | Compensation |
| --- | --- | --- | --- |
| 1 | `account` | gRPC `auth.AttachTenant` | xoá account |
| 2 | `subscription` | gRPC `billing.CreateSubscription` | cancel subscription |
| 3 | `seed_config` | phát `tenant.provisioned` → context seed | context xoá theo `tenant_id` |
| 4 | `seed_catalog` | product/inventory tạo demo (nếu chọn) | xoá bản ghi seed |
| 5 | `subdomain` | đăng ký route Kong | gỡ route |
| 6 | `notify` | email chào mừng | — (retriable) |

Đạt **NFR-14** (< 5 phút p95). Bước seed **idempotent theo `tenantId`**. Sequence:
[`05-key-flows.md`](../../20-architecture/05-key-flows.md) §0.

FE mock (`frontend/src/lib/mock/store.ts`) mô phỏng saga này: `createTenant` → `provisioning`
run với các step, `advanceProvisioning` chạy từng bước bằng timer, `completeProvisioning` → active.

## Choreography — nơi Vici KHÔNG cần orchestrator

Fan-out `order.completed` → finance (ghi sổ) + user (cộng điểm) + notification (email): ba
consumer độc lập, không cần bù, thứ tự không quan trọng. Đây là **choreography thuần** — một
event, ba consumer idempotent tự phản ứng. Xem
[`05-key-flows.md`](../../20-architecture/05-key-flows.md) §5.

## `@nestjs/cqrs` Saga vs AWS Step Functions

| | `@nestjs/cqrs` `Saga` (hiện tại — ADR-002/008) | AWS Step Functions (đề xuất — ADR-010) |
| --- | --- | --- |
| State saga | Trong process của service (event store / bảng) | Trong engine Step Functions (execution) |
| Định nghĩa | Code TypeScript (lắng nghe event → phát command) | Amazon States Language (ASL), khai báo |
| Retry/backoff/timeout | Tự viết | Dựng sẵn trong ASL |
| Chờ async | Lắng nghe event | Callback task token |
| "Đang ở bước nào" | Query state trong service | Console Step Functions, execution history |
| Vì sao đổi | — | Serverless: không có process luôn chạy để giữ saga; Step Functions là orchestrator managed |

Xem [ADR-010](../../20-architecture/adrs/ADR-010-serverless-aws-delivery.md) và
[`06-serverless-aws.md`](../../20-architecture/06-serverless-aws.md) §2, §4. Điểm quan trọng:
**logic CQRS/ES của aggregate không đổi** — chỉ đổi *ai điều phối*.

## Đọc tiếp

- Event kích saga tới nơi an toàn → [`06-outbox`](../06-outbox/README.md)
- Choreography qua Kafka → [`07-event-driven-kafka`](../07-event-driven-kafka/README.md)
- Bước gọi đồng bộ giữa service → [`08-grpc-buf`](../08-grpc-buf/README.md)
- Step Functions chi tiết → [`13-serverless-aws`](../13-serverless-aws/README.md)
