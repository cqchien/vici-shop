# Kafka / event-driven — Áp dụng trong Vici

Nguồn chuẩn: [ADR-004](../../20-architecture/adrs/ADR-004-kafka-outbox-events.md),
[`04-service-contracts-conventions.md`](../../20-architecture/04-service-contracts-conventions.md) §3,
[`backend/libs/events/registry.md`](../../../backend/libs/events/registry.md).

## Naming

Topic: **`<context>.<event-past-tense>`** phẳng một cấp — `order.completed`, `payment.succeeded`,
`inventory.stock_restocked`, `tenant.provisioned`, `billing.payment_failed`. DLQ: `<topic>.dlq`.

Envelope chung (§3 + §0):

```json
{ "eventId": "uuid", "eventType": "order.completed", "tenantId": "uuid",
  "occurredAt": "...", "version": 1, "payload": { } }
```

`tenantId` bắt buộc + header Kafka `tenant-id` (relay copy từ cột `outbox.tenant_id`).

## Topic catalog + consumer group

Danh mục đầy đủ: [`backend/libs/events/registry.md`](../../../backend/libs/events/registry.md).
Consumer group tiêu biểu:

| Consumer group | Service | Nghe topic |
| --- | --- | --- |
| `finance-consumer` | finance | `order.*`, `payment.*`, `purchase_receipt.created`, `billing.invoice_paid`… |
| `user-loyalty-consumer` | user | `user.registered`, `order.completed`, `order.returned` |
| `notification-consumer` | notification | `user.*`, `order.*`, `payment.*`, `tenant.branding_updated`, `billing.payment_failed`… |
| `tenant-consumer` | tenant | `billing.payment_failed`, `billing.subscription_changed` |
| `billing-usage-consumer` | billing | `product.created/updated/archived`, `order.placed`, `tenant.*` |
| `provisioning-consumer` | product/inventory/user/shipping/promotion/notification/finance | `tenant.provisioned`, `tenant.status_changed` |

## Sơ đồ async

Xem [`01-system-overview.md`](../../20-architecture/01-system-overview.md) "Góc nhìn giao tiếp"
và "ASYNC consumers". Nguyên tắc đọc: **mũi tên liền = gọi đồng bộ chờ kết quả (REST/gRPC);
mũi tên đứt = phát/nhận event Kafka (không chờ)**.

## Idempotency + DLQ

Từ ADR-004: *"Consumer idempotent bắt buộc (bảng `processed_events` hoặc unique constraint theo
event id); message hỏng đi vào DLQ `<topic>.dlq` kèm alert."*
Từ [`12-notification.md`](../../10-requirements/12-notification.md) FR-NOTI-04: notification-service
làm mẫu retry/DLQ, các service khác theo cùng pattern.

## Ordering trong Vici

- `order.*` của cùng một đơn: key = `orderId` → cùng partition → thứ tự.
- Counter drop (Promotion): không qua Kafka — dùng Redis atomic (xem
  [`05-key-flows.md`](../../20-architecture/05-key-flows.md) §2), Kafka chỉ dùng cho `drop.started`
  / `drop.ended` (không cần thứ tự chặt).

## Replay — nơi Vici dựa vào

- **finance-service** build read model báo cáo bằng cách consume `order.*` / `payment.*`; thêm
  báo cáo mới = replay từ offset cũ. Chỉ tin cậy vì outbox đảm bảo không mất event (NFR-03).
- **Onboard tenant mới**: `tenant.provisioned` phát một lần; nếu một context seed fail và cần
  làm lại → xử lý idempotent theo `tenantId` (spec [`tenant-service.md`](../../40-services/tenant-service.md) §4).

## Serverless (ADR-010)

Từ [`06-serverless-aws.md`](../../20-architecture/06-serverless-aws.md) §0, §3:

| Kafka | Serverless |
| --- | --- |
| Topic + consumer group | **EventBridge** (`source=vici.<context>`) → **rule** → **SQS queue mỗi consumer** → Lambda |
| Fan-out rộng (`tenant.provisioned` → 7 context) | **SNS** → SQS mỗi subscriber |
| Ordering theo key | **SQS FIFO** với `MessageGroupId = orderId` |
| DLQ | SQS redrive → `<queue>-dlq` + alarm |
| Header `tenant-id` | SQS `MessageAttributes["tenant-id"]` |

Mô hình event-driven **không đổi** — chỉ đổi broker.

## Đọc tiếp

- Vì sao event không mất → [`06-outbox`](../06-outbox/README.md)
- Choreography vs orchestration → [`05-saga`](../05-saga/README.md)
- Gọi đồng bộ (đối lập) → [`08-grpc-buf`](../08-grpc-buf/README.md)
- EventBridge/SQS/SNS chi tiết → [`13-serverless-aws`](../13-serverless-aws/README.md)
