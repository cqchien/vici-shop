# Luồng chính xuyên service (sequence diagram)

Bổ sung chi tiết cho tóm tắt ở [01-system-overview.md](01-system-overview.md) — dùng khi implement
saga/consumer, tên RPC/event theo đúng [04-service-contracts-conventions.md](04-service-contracts-conventions.md).

> **Tenant context** (ADR-009): mọi luồng dưới đây chạy trong phạm vi một tenant — Kong đã gắn
> `X-Tenant-Id` từ claim `tid`/`Host`; mỗi hop gRPC mang metadata `x-tenant-id`; mỗi event mang
> `tenantId` + header Kafka `tenant-id`. Không vẽ lại trên từng mũi tên cho đỡ rối. Luồng 0 là
> ngoại lệ: nó **tạo ra** tenant, chạy ở platform plane.

## 0. Onboarding tenant + saga provisioning

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Chủ shop
    participant FE as Next.js /start
    participant Tenant as tenant-svc
    participant Auth as auth-svc
    participant Bill as billing-svc
    participant Kafka
    participant Ctx as Các context nghiệp vụ<br/>(product, inventory, user, shipping, notification…)
    participant Kong

    Owner->>FE: điền form (tên shop, subdomain, gói, seed?)
    FE->>Tenant: POST /v1/tenants  (cross-tenant route)
    Tenant->>Tenant: kiểm subdomain trùng → tạo Tenant{status: provisioning}
    Tenant->>Auth: AttachTenant (gRPC) — tạo account chủ shop, role tenant_admin, tid mới
    Tenant->>Tenant: khởi động ProvisioningSaga
    Tenant->>Bill: CreateSubscription (gRPC) {plan}
    Bill-->>Tenant: subscriptionId, entitlements
    Tenant->>Kafka: publish tenant.provisioned {tenantId, seed?}
    par Mỗi context tự seed dưới tenant_id mới
        Kafka-->>Ctx: consume tenant.provisioned
        Ctx->>Ctx: SET app.tenant_id → seed cấu hình mặc định (+ catalog mẫu nếu seed=true)
    end
    Tenant->>Kong: đăng ký route {subdomain}.vici.shop
    Tenant->>Tenant: status → active
    Tenant->>Kafka: publish (notification) email "cửa hàng đã sẵn sàng"
    Tenant-->>FE: provisioning hoàn tất
    FE-->>Owner: "Vào trang quản trị" → /admin
```

Compensation (bước fail → lùi, tenant về `provisioning_failed`, cho retry — NFR-14):

| Fail tại | Compensation |
| --- | --- |
| `AttachTenant` lỗi | Xoá bản ghi Tenant vừa tạo; báo lỗi form ngay (email đã dùng?) |
| `CreateSubscription` lỗi | Xoá account chủ shop + Tenant; `provisioning_failed` |
| Một context không seed được | Retry có backoff; quá số lần → đánh dấu task lỗi, tenant `active` một phần, Platform Operator xử tay (context seed idempotent theo `tenantId`) |
| Đăng ký subdomain trùng (race) | Yêu cầu chủ shop chọn subdomain khác, giữ nguyên phần đã seed |

`ProvisioningSaga` là process manager trong `tenant-service` (`application/saga/provisioning.saga.ts`,
`@nestjs/cqrs`) — song song với `checkout.saga.ts` của order-service.

## 1. Checkout đơn thường (happy path)

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Cart as cart-svc
    participant Order as order-svc
    participant Inv as inventory-svc
    participant Pay as payment-svc
    participant Ship as shipping-svc
    participant Kafka

    Client->>Cart: POST /checkout
    Cart->>Inv: ReserveStock (gRPC, TTL 15')
    Inv-->>Cart: ok, reservationId
    Client->>Order: POST /orders
    Order->>Order: append OrderPlaced (event + outbox, cùng transaction)
    Order->>Pay: CreatePayment (gRPC)
    Pay-->>Order: pending, payUrl
    Order-->>Client: 201 {orderId, payUrl}
    Note over Client: Redirect sang cổng thanh toán, khách thanh toán
    Pay->>Kafka: publish payment.succeeded (IPN)
    Kafka-->>Order: consume payment.succeeded
    Order->>Inv: CommitReservation (gRPC)
    Order->>Ship: CreateShipment (gRPC)
    Order->>Kafka: publish OrderConfirmed
    Note over Order,Kafka: order.completed phát sau, khi đơn chuyển completed
```

Compensation (bước nào fail thì lùi lại, không để nửa vời):

| Fail tại | Compensation |
| --- | --- |
| `CreatePayment` lỗi/timeout | `ReleaseReservation` → đơn `cancelled`, báo lỗi cho client ngay |
| `payment.succeeded` không tới trong timeout (VD 30') | `payment.expired` → `ReleaseReservation` → đơn quay `pending_payment`, cho thử phương thức khác (FR-PAY-07) |
| `CommitReservation`/`CreateShipment` lỗi sau khi đã thu tiền | `payment.Refund` + `ReleaseReservation` → đơn `cancelled`, không để mất tiền khách mà không có hàng |

Saga là process manager trong `order-service` (`application/saga/checkout.saga.ts`,
`@nestjs/cqrs`) — không service nào khác giữ state của saga.

## 2. Mua hàng trong Drop (điểm nóng concurrency, NFR-02)

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Product as product-svc
    participant Cart as cart-svc
    participant Promo as promotion-svc

    Client->>Product: GET /products/{slug}
    Product-->>Client: hiện đếm ngược / nút mua (nếu đã live)
    Client->>Cart: POST /cart/items
    Cart->>Promo: CheckDropEligibility (gRPC, atomic)
    Note right of Promo: Redis INCR có điều kiện<br/>(allocation, per-customer)
    alt còn slot, chưa chạm limit
        Promo-->>Cart: ok → giữ slot
        Cart-->>Client: 200
    else hết allocation / vượt limit
        Promo-->>Cart: ResourceExhausted
        Cart-->>Client: 422 {code: DROP_LIMIT_EXCEEDED}
    end
```

- Counter allocation giữ trong **Redis** (nhanh, atomic `INCR`/Lua script), chốt lại bằng
  **reservation Postgres** khi checkout thật sự bắt đầu (tránh giữ slot mãi nếu khách không bao
  giờ bấm mua) — TTL reservation ngắn hơn checkout thường (5' thay vì 15', xem
  [01-system-overview.md](01-system-overview.md)).
- Huỷ đơn drop sau khi đã mua **không** hoàn allocation về pool (chống bot giữ-nhả — xem
  [30-domain/03-blind-box-and-drops.md](../30-domain/03-blind-box-and-drops.md)).
- Early access: `CheckDropEligibility` nhận kèm `tier` của khách (từ JWT claim hoặc gRPC
  `user.GetTier`), so với `earlyAccessMinutes` của drop.
- Counter Redis mang tiền tố `tenant:{tid}:drop:{id}` — hai tenant chạy drop cùng lúc không
  đụng nhau. Drop chỉ bật khi `billing.GetEntitlements` cho tenant cho phép tính năng drop.

## 3. Pre-order: cọc → hàng về → thanh toán nốt

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Order as order-svc
    participant Promo as promotion-svc
    participant Pay as payment-svc
    actor Admin
    participant Inv as inventory-svc
    participant Fin as finance-svc
    participant Noti as notification-svc

    Client->>Order: POST /preorders
    Order->>Promo: validate campaign (còn slot? trong thời hạn nhận đặt?)
    Promo-->>Order: ok
    Order->>Pay: CreatePayment (purpose=deposit)
    Pay-->>Order: succeeded
    Order->>Order: append OrderPlaced, status → awaiting_stock

    Note over Admin,Fin: Hàng về — xảy ra sau, không đồng bộ với bước cọc ở trên
    Admin->>Inv: POST /receipts
    Inv->>Fin: publish inventory.stock_restocked (ghi giá vốn)
    Inv-->>Order: publish inventory.stock_restocked (map campaign)
    Order->>Order: awaiting_stock → balance_due
    Order->>Noti: email nhắc thanh toán, hạn 7 ngày

    Client->>Order: POST /orders/{id}/pay-balance
    Order->>Pay: CreatePayment (purpose=balance)
    Pay-->>Order: succeeded
    Order->>Order: balance_paid → confirmed
    Note over Order: Từ đây vào luồng đơn thường (mục 1) từ bước packing
```

Quá hạn 7 ngày chưa trả nốt → job quét deadline (cron trong order-service) chuyển `cancelled`,
xử lý cọc theo `PreOrderCampaign.forfeitPolicy` (mất/hoàn một phần — **phải enforce đúng**, xem
ghi chú trong [04-order.md](../10-requirements/04-order.md) về gap này ở FE mock).

## 4. Đổi trả & hoàn tiền

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Order as order-svc
    actor Admin
    participant Ship as shipping-svc
    participant Pay as payment-svc
    participant Inv as inventory-svc

    Client->>Order: POST /orders/{id}/return-requests
    Note left of Order: Chỉ khi status=delivered, trong 7 ngày
    Admin->>Order: PATCH .../return-requests/{id} {decision}
    alt duyệt
        Order->>Ship: CreateShipment (chiều ngược, FR-SHIP-06)
        Order->>Pay: Refund (toàn phần/một phần)
        Order->>Inv: CommitRestock (hàng nguyên vẹn)
        Order->>Order: status → returned/refunded
    else từ chối
        Order->>Order: status → completed<br/>(không hoàn tiền, không nhập kho)
    end
```

## 5. `order.completed` → hạch toán, cộng điểm, thông báo (fan-out)

```mermaid
sequenceDiagram
    autonumber
    participant Order as order-svc
    participant Kafka
    participant Fin as finance-svc
    participant User as user-svc
    participant Noti as notification-svc

    Order->>Kafka: publish order.completed
    par
        Kafka-->>Fin: consume
        Note right of Fin: JournalEntry kép:<br/>511 Doanh thu, 632 Giá vốn (FR-ACC-01/02)
    and
        Kafka-->>User: consume
        Note right of User: PointsEarned theo tierMeta multiplier,<br/>cập nhật spent12m (FR-LOY-02)
    and
        Kafka-->>Noti: consume
        Note right of Noti: Email "đơn hoàn tất", khảo sát đánh giá
    end
```

Một event, ba consumer độc lập — mỗi consumer tự chịu trách nhiệm idempotency theo `eventId`
(xem [04-service-contracts-conventions.md](04-service-contracts-conventions.md) §3). Nếu một
consumer lỗi, hai consumer còn lại không bị chặn (không phải saga, đây là fan-out thuần).
