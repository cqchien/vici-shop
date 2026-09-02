# Outbox — Áp dụng trong Vici

Nguồn chuẩn: [ADR-004](../../20-architecture/adrs/ADR-004-kafka-outbox-events.md),
[`04-service-contracts-conventions.md`](../../20-architecture/04-service-contracts-conventions.md) §3.

## Quy tắc bắt buộc

Từ ADR-004: *"Mọi domain event publish qua **outbox table + relay** — cấm publish inline."*
Từ [`04-service-contracts-conventions.md`](../../20-architecture/04-service-contracts-conventions.md) §3:
*"service publish event ghi vào bảng `outbox` trong **cùng transaction** với thay đổi state; một
relay process (goroutine riêng hoặc Debezium — quyết định ở ADR nếu đổi) đọc `outbox` chưa gửi
→ publish Kafka → đánh dấu `sent_at`."*

Áp cho **cả 13 service** (mọi service phát event: auth, product, inventory, order, payment,
shipping, tenant, billing…). Consumer-only (notification) không có outbox nhưng phải dedupe.

## Envelope + `tenant_id` (ADR-009)

Từ [`04-service-contracts-conventions.md`](../../20-architecture/04-service-contracts-conventions.md) §3
và §0:

```json
{
  "eventId": "uuid",
  "eventType": "order.completed",
  "tenantId": "uuid",
  "occurredAt": "2026-07-11T10:00:00Z",
  "version": 1,
  "payload": { }
}
```

- `tenantId` **bắt buộc** trên mọi event service nghiệp vụ.
- Bảng `outbox` có **cột `tenant_id`**; relay copy cột → **header Kafka `tenant-id`** để consumer
  route/scoped mà không cần deserialize payload.
- Consumer set `app.tenant_id` từ header trước khi ghi (xem
  [`knowledge/10-multi-tenancy-rls`](../10-multi-tenancy-rls/README.md)).

## Consumer idempotency

Từ ADR-004: *"Consumer idempotent bắt buộc (bảng `processed_events` hoặc unique constraint theo
event id); message hỏng đi vào DLQ `<topic>.dlq` kèm alert."*

Danh mục consumer group: [`backend/libs/events/registry.md`](../../../backend/libs/events/registry.md)
(`user-loyalty-consumer`, `finance-consumer`, `billing-usage-consumer`, `provisioning-consumer`…).

## Chỗ outbox xuất hiện trong luồng Vici

- **Checkout** ([`05-key-flows.md`](../../20-architecture/05-key-flows.md) §1): *"append
  OrderPlaced (event + outbox, cùng transaction)"* — rồi relay publish, saga chạy tách khỏi
  transaction ghi domain.
- **Provisioning** ([`05-key-flows.md`](../../20-architecture/05-key-flows.md) §0):
  `tenant.provisioned` phát qua outbox → mọi context consume để seed.
- **Fan-out `order.completed`** ([`05-key-flows.md`](../../20-architecture/05-key-flows.md) §5):
  outbox → Kafka → 3 consumer độc lập (finance / user / notification), mỗi cái dedupe theo `eventId`.
- **Sổ cái Finance**: replay từ event để build read model báo cáo — chỉ tin cậy được vì outbox
  đảm bảo không mất event (NFR-03).

## Layout (Go, ví dụ `order-service` — NestJS tương tự)

```
internal/infrastructure/kafka/
├── outbox_writer.go     # gọi trong cùng tx với repo.Save (application layer điều phối)
└── outbox_relay.go      # goroutine: SELECT ... FOR UPDATE SKIP LOCKED → produce → UPDATE sent_at
internal/infrastructure/postgres/
└── migrations/0002_outbox.sql   # bảng outbox + partial index (sent_at) WHERE sent_at IS NULL
```

`cmd/server/main.go` khởi động relay goroutine cùng service, dừng graceful khi shutdown.

## Serverless (ADR-010)

Từ [`06-serverless-aws.md`](../../20-architecture/06-serverless-aws.md) §0 và §6: outbox
**không đổi**; relay thành **Lambda `*-outbox-relay`** chạy theo **EventBridge Scheduler mỗi 1
phút** (hoặc DynamoDB Streams / DMS logical replication), `PutEvents` lên **EventBridge** thay
vì Kafka. Bảng outbox, envelope, `tenant_id` giữ nguyên.

## Đọc tiếp

- Consumer group, DLQ, schema evolution → [`07-event-driven-kafka`](../07-event-driven-kafka/README.md)
- Event từ event store → [`04-event-sourcing`](../04-event-sourcing/README.md) §7
- Relay serverless → [`13-serverless-aws`](../13-serverless-aws/README.md)
