# Data Models (aggregate chính theo context)

Mức khái niệm — đủ để thiết kế schema và types; chi tiết cột/index nằm trong spec từng service.
Quy ước chung: khoá chính UUID; tiền VND kiểu số nguyên; timestamp UTC (`created_at`,
`updated_at`); soft-archive bằng trạng thái, không xoá vật lý dữ liệu nghiệp vụ.

> **`tenant_id` ngầm định trên MỌI bảng tenant plane** (Catalog, Inventory, Ordering, Payment,
> Shipping, Promotion, Customer, Finance, Notification, Cart, Identity): cột `tenant_id uuid
> NOT NULL`, RLS bật, index và unique constraint **dẫn đầu bằng `tenant_id`** (`slug`, `sku`,
> `entry_no`, `voucher.code`… chỉ unique trong một tenant). Các ER dưới đây **không vẽ lại** cột
> này cho gọn — xem [ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md). Bảng
> của Tenant/Billing (platform plane) thì `tenant_id` là **khoá tham chiếu**, không phải cột lọc.

## Tenant (tenant-service) — platform plane

```mermaid
erDiagram
    TENANT ||--o{ PROVISIONING_TASK : "has (during onboarding)"
    TENANT ||--o{ CUSTOM_DOMAIN : "may have"
    TENANT ||--o{ TENANT_MEMBER : "chủ shop + staff"

    TENANT {
        uuid id PK
        string subdomain UK "{subdomain}.vici.shop"
        string display_name
        enum status "provisioning,provisioning_failed,active,past_due,suspended,archived"
        json branding "logo, accent_token, timezone, contact"
        uuid subscription_id "reference — billing-service"
        timestamp activated_at
        timestamp archived_at "optional — xoá cứng sau +90d"
    }
    PROVISIONING_TASK {
        uuid id PK
        uuid tenant_id FK
        enum step "account,subscription,seed_config,seed_catalog,subdomain,notify"
        enum status "pending,running,done,failed,compensated"
        string error "optional"
        int attempts
    }
    CUSTOM_DOMAIN {
        uuid id PK
        uuid tenant_id FK
        string domain UK
        enum status "pending_dns,verifying,active,failed"
        string cert_ref "optional"
    }
    TENANT_MEMBER {
        uuid id PK
        uuid tenant_id FK
        uuid account_id "reference — auth-service"
        enum role "tenant_admin,staff"
    }
```

## Billing (billing-service) — platform plane

```mermaid
erDiagram
    PLAN ||--o{ SUBSCRIPTION : "chosen by"
    SUBSCRIPTION ||--o{ INVOICE : "billed as"
    SUBSCRIPTION ||--o{ USAGE_COUNTER : "metered by"

    PLAN {
        string code PK "starter,shop,collector"
        string name
        bigint price_vnd_month
        json limits "products, orders_month, image_mb, staff_seats"
        json features "drop, preorder, custom_domain"
        decimal txn_fee_percent
        enum status "active,archived"
    }
    SUBSCRIPTION {
        uuid id PK
        uuid tenant_id "reference — 1:1 với tenant"
        string plan_code FK
        enum status "trialing,active,past_due,canceled"
        date current_period_end
        json dunning_state "retries, next_attempt_at"
    }
    INVOICE {
        uuid id PK
        uuid subscription_id FK
        bigint amount_vnd
        enum status "open,paid,failed,void"
        string provider_ref
        timestamp issued_at
    }
    USAGE_COUNTER {
        uuid subscription_id FK
        string metric "products,orders_month,image_mb"
        bigint value
        date period
    }
```

`Entitlements` (không phải bảng — là DTO gRPC `GetEntitlements` trả về): `limits` + `features`
của plan hiện hành, các service cache ngắn và enforce cục bộ (`QUOTA_EXCEEDED`).

## Catalog (product-service)

```mermaid
erDiagram
    BRAND ||--o{ SERIES : has
    BRAND ||--o{ PRODUCT : has
    SERIES ||--o{ PRODUCT : "has (optional)"
    SERIES ||--o{ FIGURE : "lineup"
    PRODUCT ||--o{ VARIANT : has
    PRODUCT ||--o{ REVIEW : has
    FIGURE ||--o{ REVIEW : "pulled_figure (optional, blind box)"

    BRAND {
        uuid id PK
        string name
        string slug
    }
    SERIES {
        uuid id PK
        uuid brand_id FK
        string name
        string slug
        int release_year
    }
    FIGURE {
        uuid id PK
        uuid series_id FK
        string name
        decimal rarity_ratio
        bool is_secret
    }
    PRODUCT {
        uuid id PK
        uuid series_id FK "optional"
        uuid brand_id FK
        enum type "regular,blind_box,preorder,drop_exclusive"
        string slug UK
        enum status "draft,active,archived"
        decimal rating_avg
        int rating_count
        tsvector search_vector
    }
    VARIANT {
        uuid id PK
        uuid product_id FK
        string sku UK
        bigint price_vnd
        bigint compare_at_price_vnd "optional"
        enum kind "standard,single_box,whole_set"
    }
    REVIEW {
        uuid id PK
        uuid product_id FK
        uuid customer_id "reference"
        uuid order_id "reference"
        int stars "1..5"
        uuid pulled_figure_id FK "optional — FR-CAT-12"
        enum status "visible,hidden"
    }
```

## Inventory (inventory-service)

```mermaid
erDiagram
    STOCK_ITEM ||--o{ RESERVATION : "reserves (theo sku)"
    STOCK_ITEM ||--o{ STOCK_MOVEMENT : "audit log"
    PURCHASE_RECEIPT ||--o{ STOCK_ITEM : "restocks (lines[])"

    STOCK_ITEM {
        string sku PK
        int on_hand
        int reserved "available = on_hand - reserved"
        int low_stock_threshold
    }
    RESERVATION {
        uuid id PK
        string sku FK
        int qty
        string ref "checkout_session_id | order_id"
        timestamp expires_at
        enum status "held,committed,released"
    }
    STOCK_MOVEMENT {
        uuid id PK
        string sku FK
        int delta
        enum reason "sale,return,adjustment,receipt,stocktake"
        uuid actor_id "optional"
        string ref_id "optional"
    }
    PURCHASE_RECEIPT {
        uuid id PK
        string supplier
        json lines "sku, qty, unit_cost_vnd"
        timestamp received_at
        enum payment_status "unpaid,partial,paid"
    }
```

## Ordering (order-service — event-sourced)

```mermaid
erDiagram
    ORDER ||--o{ ORDER_LINE : contains
    ORDER ||--o{ RETURN_REQUEST : "may have"

    ORDER {
        uuid id PK
        uuid customer_id "reference"
        enum kind "standard,preorder"
        enum status
        json address_snapshot
        bigint shipping_fee_vnd
        bigint discount_total_vnd
        int points_used
        bigint total_vnd
        string voucher_code "optional"
        uuid drop_id "optional, reference"
        uuid preorder_campaign_id "optional, reference"
        bigint deposit_vnd "optional"
        int version "optimistic concurrency"
    }
    ORDER_LINE {
        string sku
        string name_snapshot
        int qty
        bigint unit_price_vnd
        bigint discount_vnd
        bigint cost_locked_vnd "optional"
    }
    RETURN_REQUEST {
        uuid id PK
        uuid order_id FK
        json lines
        string reason
        enum status "pending,approved,rejected"
        bigint refund_vnd
        bool restock
    }
```

`Order` là aggregate **event-sourced** — bảng trên là hình chiếu (projection) đọc được từ chuỗi
event, không phải nguồn sự thật. Nguồn sự thật là chuỗi event append-only:

```mermaid
flowchart LR
    A[OrderPlaced] --> B["DepositPaid (chỉ pre-order)"]
    B --> C["StockArrived (chỉ pre-order)"]
    C --> D["BalancePaid (chỉ pre-order)"]
    A --> E[OrderConfirmed]
    D --> E
    E --> F[OrderPacked] --> G[OrderShipped] --> H[OrderDelivered] --> I[OrderCompleted]
    H --> J[ReturnRequested] --> K[ReturnResolved]
    A -.-> L[OrderCancelled]
    E -.-> L
```

## Payment / Shipping

```mermaid
erDiagram
    PAYMENT_TRANSACTION ||--o{ REFUND : "may have"
    SHIPMENT ||--o{ TRACKING_EVENT : has

    PAYMENT_TRANSACTION {
        uuid id PK
        uuid order_id "reference — khác database, không phải FK"
        enum purpose "full,deposit,balance"
        enum method "vnpay,momo,zalopay,cod"
        bigint amount_vnd
        string gateway_ref
        enum status "pending,succeeded,failed,expired"
        json ipn_raw
    }
    REFUND {
        uuid id PK
        uuid transaction_id FK
        bigint amount_vnd
        enum method "gateway,manual"
        string evidence "optional"
        enum status
    }
    SHIPMENT {
        uuid id PK
        uuid order_id "reference — khác database, không phải FK"
        enum carrier "ghn,ghtk"
        string tracking_code
        bigint fee_vnd
        bool protective_box
        enum status "pending,picked_up,in_transit,out_for_delivery,delivered,failed,returned"
        int attempts
    }
    TRACKING_EVENT {
        uuid id PK
        uuid shipment_id FK
        string status
        json raw_payload
        timestamp occurred_at
    }
```

`order_id` trong `PaymentTransaction`/`Shipment` là **tham chiếu chéo context** (denormalized ID
nhận từ event/gRPC), không phải khoá ngoại vật lý — Payment và Shipping có database riêng, không
join thẳng sang Ordering (ADR-001, xem [architecture.md §5](../../.claude/conventions/architecture.md)).

## Promotion (promotion-service)

```mermaid
erDiagram
    DROP ||--o{ DROP_ALLOCATION : "items (theo sku)"
    FLASH_SALE ||--o{ FLASH_SALE_ITEM : items

    VOUCHER {
        uuid id PK
        string code UK
        enum kind "percent,fixed,freeship"
        bigint value
        bigint min_order_vnd
        json scope "brands[]/series[]/products[], optional"
        enum tier_required "optional"
        int total_uses
        int per_customer
        int used_count
        enum status "draft,active,paused,expired"
    }
    FLASH_SALE {
        uuid id PK
        string name
        timestamp starts_at
        timestamp ends_at
    }
    FLASH_SALE_ITEM {
        string sku
        bigint sale_price_vnd
        int qty_cap
        int sold
    }
    DROP {
        uuid id PK
        string name
        timestamp starts_at
        timestamp ends_at "optional"
        int early_access_minutes
        json tiers_early
        enum status "scheduled,early_access,live,sold_out,ended"
    }
    DROP_ALLOCATION {
        uuid drop_id FK
        string sku
        int allocation
        int per_customer_limit
        int sold
    }
    PRE_ORDER_CAMPAIGN {
        uuid id PK
        uuid product_id "reference"
        timestamp opens_at
        timestamp closes_at
        decimal deposit_percent
        date eta_date
        int slots "optional"
        int taken
        json forfeit_policy "full or partial-with-percent"
        enum status "draft,open,closed"
    }
    WAITLIST_ENTRY {
        uuid id PK
        uuid customer_id "reference"
        string target "sku | drop_id"
        timestamp notified_at "optional"
    }
```

## Customer & Finance

```mermaid
erDiagram
    CUSTOMER ||--o{ ADDRESS : has
    CUSTOMER ||--o{ POINT_ENTRY : "earn/spend"
    JOURNAL_ENTRY ||--o{ JOURNAL_LINE : "bút toán kép"

    CUSTOMER {
        uuid id PK
        uuid account_id "reference — auth-service"
        string name
        string phone
        date birthday "optional"
        enum tier "standard,silver,gold,collector"
        timestamp tier_review_at
        int points_balance
    }
    ADDRESS {
        uuid id PK
        uuid customer_id FK
        string recipient
        string province
        string district
        string ward
        string street
        bool is_default
    }
    POINT_ENTRY {
        uuid id PK
        uuid customer_id FK
        int delta
        enum reason "earn,spend,expire,adjust"
        uuid order_id "optional, reference"
        timestamp expires_at "optional"
    }
    JOURNAL_ENTRY {
        uuid id PK
        string entry_no UK
        timestamp occurred_at
        string source "event_type + ref_id"
        string memo
    }
    JOURNAL_LINE {
        string account "mã kế toán"
        bigint debit_vnd
        bigint credit_vnd
    }
    COST_LOT {
        string sku PK
        bigint moving_avg_cost_vnd
        int on_hand_qty
        timestamp updated_at
    }
    EXPENSE {
        uuid id PK
        string category
        bigint amount_vnd
        timestamp occurred_at
        uuid actor_id
    }
```

## Cấu hình vận hành (mỗi service sở hữu khoá của mình)

Không có một aggregate "Settings" dùng chung — mỗi service tự sở hữu tham số nghiệp vụ của nó
(tránh context nào cũng phải biết toàn bộ config). Bảng dưới ánh xạ từng khoá cấu hình đang tồn
tại trong FE mock (`Settings` gộp chung ở đó vì mock chỉ có một "database" duy nhất) sang service
thật sẽ sở hữu nó:

| Khoá (FE mock) | Service sở hữu | Ghi chú |
| --- | --- | --- |
| `freeShipThresholdVnd` | shipping-service | FR-SHIP-07, **theo tenant** (bảng `settings` có `tenant_id`) |
| `holdMinutes` | inventory-service | TTL reservation, FR-INV-02, theo tenant |
| `pointEarnRate`, `pointValueVnd`, `maxPointPercent` | user-service | FR-LOY-01/03, theo tenant |
| `tenant.displayName`, `branding`, `subdomain`, `customDomain` | tenant-service | FR-TEN-11/12 |
| `plan`, `limits`, lượng dùng | billing-service | FR-BIL, hỏi qua `GetEntitlements` |

Mỗi khoá là bảng `settings` 1-dòng **mỗi tenant** trong service tương ứng — **không** một service
trung tâm giữ hết config của toàn hệ thống (vi phạm bounded context). Cấu hình cấp nền tảng
(danh mục plan, subdomain reserved) thuộc platform plane.
