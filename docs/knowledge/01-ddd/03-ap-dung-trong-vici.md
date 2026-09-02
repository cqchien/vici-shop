# DDD — Áp dụng trong Vici

## 13 bounded context

Nguồn chuẩn: [`30-domain/01-bounded-contexts.md`](../../30-domain/01-bounded-contexts.md).
Hai tầng:

- **Platform plane** (cross-tenant, không có `tenant_id` trên aggregate root): **Tenant**
  (`tenant-service`), **Billing** (`billing-service`).
- **Tenant plane** (mọi aggregate mang `tenant_id`): Identity, Customer, Catalog, Inventory,
  Cart, Ordering, Payment, Shipping, Promotion, Finance, Notification.

Quy tắc cứng (từ bounded-contexts §"Quy tắc cứng"): một context chỉ expose **proto**
(`backend/libs/proto/`), **event Avro** (`backend/libs/events/`), hoặc **REST qua Kong**. Không
share type, không đọc database của context khác.

## Bảng aggregate (điểm bắt đầu khi viết `domain/model/`)

Bảng đầy đủ: [`20-architecture/03-clean-architecture-ddd.md`](../../20-architecture/03-clean-architecture-ddd.md) §4.
Vài ví dụ minh hoạ cách "cùng từ khác nghĩa":

| Context | Aggregate root | `Order` ở đây là… |
| --- | --- | --- |
| Ordering (`order-service`) | `Order` (event-sourced) | Aggregate đầy đủ: status machine, line item, return request, `version` |
| Finance (`finance-service`) | `JournalEntry` | Chỉ là `order_id` + tổng tiền trên một dòng bút toán — **không** có `Order` type |
| Payment (`payment-service`) | `PaymentTransaction` | `order_id` là **denormalized ID** nhận qua event/gRPC, không phải FK vật lý |

Xem ER chi tiết + ghi chú "khác database, không phải FK" trong
[`30-domain/04-data-models.md`](../../30-domain/04-data-models.md).

## Value Object trong Vici

Convention: [`coding-conventions-go.md`](../../../.claude/conventions/coding-conventions-go.md) §4,
[`coding-conventions.md`](../../../.claude/conventions/coding-conventions.md) §1.

- `Money` (int64 VND, không float — NFR-04), `Sku`, `Email`, `Address` (snapshot trên `Order`).
- `TenantId` — VO bắt buộc cho hệ đa tenant. Gán một lần lúc tạo aggregate, không có setter;
  method domain **không** nhận `tenant_id` làm tham số (nó đã nằm trong aggregate). Chi tiết:
  [`03-clean-architecture-ddd.md`](../../20-architecture/03-clean-architecture-ddd.md) §4.1 và
  [`knowledge/10-multi-tenancy-rls`](../10-multi-tenancy-rls/README.md).

Sketch (Go, theo `architecture.md` §4):

```go
// internal/domain/model/money.go
type Money struct {
    amount int64 // VND, số nguyên
}

func NewMoney(vnd int64) (Money, error) {
    if vnd < 0 {
        return Money{}, apperr.ErrNegativeAmount
    }
    return Money{amount: vnd}, nil
}
// không có setter; chỉ accessor đọc
```

## Domain event

Danh mục topic + owner: [`backend/libs/events/registry.md`](../../../backend/libs/events/registry.md).
Ví dụ đặt tên quá khứ đúng chuẩn: `order.completed`, `inventory.stock_restocked`,
`tenant.provisioned`, `billing.payment_failed`. Envelope có `tenantId` (ADR-009).

Aggregate raise event; `infrastructure/kafka/outbox_relay` publish. Chi tiết luồng:
[`knowledge/06-outbox`](../06-outbox/README.md).

## Chỗ Vici cố ý đơn giản hoá

- **CQRS + Event Sourcing chỉ ở 3 service** (order, tenant, billing — ADR-002/008), không phải
  cả 13. 8 service Go + auth/user (NestJS nhưng CRUD — ADR-011) dùng repository + CRUD thường.
  Đừng bê ES sang chỗ khác chỉ vì "order-service làm vậy".
- **Notification** áp DDD nhẹ: `Delivery` + `NotificationTemplate`, chủ yếu là adapter gửi đi.
- **FE mock** (`frontend/src/lib/types.ts`) gộp tất cả vào một `State` phẳng — đó là mô phỏng,
  không phải mô hình domain thật; khi backend lên, mỗi context tách ra database riêng.

## Đọc tiếp

- Cách các lớp (domain/application/infrastructure/interface) sắp xếp → [`02-hexagonal`](../02-hexagonal/README.md)
- Aggregate event-sourced hoạt động ra sao → [`04-event-sourcing`](../04-event-sourcing/README.md)
- Đổi nhiều aggregate xuyên context → [`05-saga`](../05-saga/README.md)
