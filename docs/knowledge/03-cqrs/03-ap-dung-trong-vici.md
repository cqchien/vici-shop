# CQRS — Áp dụng trong Vici

Nguồn chuẩn: [`20-architecture/03-clean-architecture-ddd.md`](../../20-architecture/03-clean-architecture-ddd.md) §5.

## Ở đâu dùng CQRS

Chỉ **3 service NestJS** (ADR-002, ADR-008):

| Service | CQRS | Event Sourcing | Vì sao |
| --- | --- | --- | --- |
| [`order-service`](../../40-services/order-service.md) | ✅ | ✅ | Audit trail đầy đủ mọi thay đổi trạng thái đơn; ghi đơn ít hơn nhiều so với đọc lịch sử/tra cứu admin; saga đa bước |
| [`tenant-service`](../../40-services/tenant-service.md) | ✅ | (event store cho lịch sử vòng đời) | Saga provisioning; tách write (state machine tenant) khỏi read (danh sách + provisioning progress) |
| [`billing-service`](../../40-services/billing-service.md) | ✅ | ❌ | Write = subscription state machine + dunning; read = `Entitlements` + MRR + usage — hình dạng rất khác |

**8 service Go + `auth-service` + `user-service` KHÔNG dùng CQRS** — repository + CRUD thường
(ví dụ `inventory-service`: `stock_item` đọc/ghi cùng model). auth/user là NestJS vì hệ sinh
thái (passport, guard, class-validator — ADR-011), không phải vì cần CQRS. Xem
[`03-clean-architecture-ddd.md`](../../20-architecture/03-clean-architecture-ddd.md) §5.

## Folder layout (NestJS)

```
src/application/
├── command/        # write side — @nestjs/cqrs CommandHandler
│   └── place-order.handler.ts
├── query/          # read side — QueryHandler, đọc projection
│   └── get-order.handler.ts
├── saga/           # process manager (@nestjs/cqrs Saga) — xem knowledge/05-saga
└── dto/
src/infrastructure/persistence/
├── order-event-store.ts        # write: append event + outbox, optimistic concurrency (cột version)
└── order-read-model.repo.ts    # read: bảng orders_read_model
```

## Ví dụ — order-service

**Command** (`billing-service` `ChangePlan` minh hoạ trong spec
[`billing-service.md`](../../40-services/billing-service.md) §4): kiểm lượng dùng vs hạn mức gói
mới → nếu vượt trả lỗi domain `QUOTA_EXCEEDED`; nếu ok, đổi + phát `billing.subscription_changed`.

**Query** (`GetEntitlements` gRPC — [`billing-service.md`](../../40-services/billing-service.md) §2):
đọc từ read model `plan.limits + plan.features + credits`, trả DTO + `cache_ttl_seconds`. Không
đụng `Subscription` aggregate.

**Projection cập nhật** (`billing-service` usage counters —
[`billing-service.md`](../../40-services/billing-service.md) §2 "Tiêu thụ"): consume
`product.created` / `order.placed` từ Kafka → cộng dồn `UsageCounter` theo `tenantId`. Eventual.

## Read-your-writes trong FE mock

`frontend/src/lib/mock/store.ts` mô phỏng đúng tinh thần CQRS: mọi mutation đi qua `update()`
(clone → sửa → `notify()`), UI hiển thị ngay từ state client — không có "refetch từ server".
Khi backend thật lên, các query list đọc projection (eventual), query "đơn tôi vừa đặt" ở màn
confirmation đọc theo `orderId` cụ thể.

## Command/query naming (contract convention)

Theo [`04-service-contracts-conventions.md`](../../20-architecture/04-service-contracts-conventions.md) §2:

- Command = động từ mệnh lệnh: `ReserveStock`, `CreatePayment`, `CreateSubscription`.
- Query = `Get*` / `List*`: `GetOrderStatus`, `ListUserOrders`, `GetEntitlements`.

## Đọc tiếp

- Write side là event store → [`04-event-sourcing`](../04-event-sourcing/README.md)
- Projection cập nhật từ Kafka → [`07-event-driven-kafka`](../07-event-driven-kafka/README.md)
- Đảm bảo event tới được projection → [`06-outbox`](../06-outbox/README.md)
- Saga trong `application/saga` → [`05-saga`](../05-saga/README.md)
