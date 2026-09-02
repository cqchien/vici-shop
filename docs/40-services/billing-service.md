# billing-service — Service Spec

Ngôn ngữ: TypeScript/NestJS ([ADR-008](../20-architecture/adrs/ADR-008-platform-plane-services-nestjs.md))
· REST `3013` · gRPC `50062` · FR: [FR-BIL-01..12](../10-requirements/14-billing.md)

## 1. Trách nhiệm & ranh giới

- Bounded context: **Billing** ([30-domain/01-bounded-contexts.md](../30-domain/01-bounded-contexts.md),
  [30-domain/05-tenant-lifecycle.md](../30-domain/05-tenant-lifecycle.md)).
- **Platform plane** — cross-tenant, DB role bỏ qua RLS. `Subscription` khoá theo `tenant_id`
  (1:1 với tenant).
- Sở hữu: `Plan` (danh mục gói), `Subscription`, `Invoice`, `UsageCounter` (read model lượng
  dùng), lịch dunning, `Entitlements` (DTO suy ra từ plan).
- **Không** sở hữu: bản ghi tenant & vòng đời (tenant-service — phản ứng qua event), dữ liệu
  nghiệp vụ dùng để đếm (các context — chỉ phát event).
- FR cover: toàn bộ FR-BIL.

## 2. API

### REST (qua Kong)

| Method | Path | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | /v1/plans | Danh mục gói `active` (dùng ở `/start` và trang nâng cấp) | public |
| GET | /v1/me/subscription | Subscription + lượng dùng vs hạn mức của tenant hiện tại (FR-TEN-13) | tenant_admin, staff |
| POST | /v1/me/subscription/change | Đổi gói (nâng ngay pro-rata / hạ kỳ sau — FR-BIL-04) | tenant_admin |
| POST | /v1/me/subscription/cancel | Huỷ (hiệu lực cuối kỳ) | tenant_admin |
| GET | /v1/me/invoices | Lịch sử hoá đơn của tenant | tenant_admin |
| POST | /v1/webhooks/payment/{provider} | Webhook nhà cung cấp thanh toán định kỳ (idempotent) | chữ ký provider |
| GET | /v1/platform/plans (+ POST/PATCH) | CRUD danh mục gói | platform_admin |
| GET | /v1/platform/billing/overview | MRR, doanh thu theo tháng, phân bố tenant theo gói, danh sách `past_due` (FR-BIL-11) | platform_admin |
| POST | /v1/platform/tenants/{id}/credit | Cấp coupon/credit cho tenant (FR-BIL-12) | platform_admin |

### gRPC (nội bộ)

| RPC | Request → Response | Ai gọi |
| --- | --- | --- |
| `CreateSubscription` | `{tenantId, planCode}` → `{subscriptionId, entitlements}` | tenant-service (saga provisioning) |
| `GetEntitlements` | `{tenantId}` → `{limits: {products, ordersMonth, imageMb, staffSeats}, features: {drop, preorder, customDomain}, txnFeePercent}` | product/inventory/promotion/user… (cache ngắn, enforce cục bộ) |
| `GetSubscriptionStatus` | `{tenantId}` → `{status, planCode, currentPeriodEnd}` | tenant-service, admin BFF |

### Events

| Phát (topic) | Payload | Khi nào |
| --- | --- | --- |
| `billing.subscription_created` | `{tenantId, subscriptionId, planCode}` | Tạo lúc provisioning |
| `billing.subscription_changed` | `{tenantId, fromPlan, toPlan, effectiveAt}` | Đổi gói |
| `billing.invoice_paid` | `{tenantId, invoiceId, amountVnd, periodEnd}` | Thanh toán kỳ thành công |
| `billing.payment_failed` | `{tenantId, invoiceId, attempt, willRetryAt?}` | Chốt kỳ / retry dunning thất bại |
| `billing.subscription_canceled` | `{tenantId, effectiveAt}` | Huỷ hoặc hết lịch dunning |
| `billing.usage_threshold_reached` | `{tenantId, metric, percent}` | Lượng dùng chạm 80%/100% (FR-BIL-10) |

| Tiêu thụ (topic) | Xử lý | Idempotency |
| --- | --- | --- |
| `product.created` / `product.archived` | `UsageCounter.products += / -=` theo `tenantId` | theo `eventId` |
| `order.placed` | `UsageCounter.orders_month += 1` (theo kỳ) | theo `eventId` |
| `tenant.provisioned` | Xác nhận subscription đã tồn tại (guard nếu saga retry) | theo `tenantId` |
| `tenant.archived` | Đóng subscription nếu chưa `canceled` | theo `eventId` |

## 3. Data model

Bảng chính: `plans`, `subscriptions`, `invoices`, `usage_counters`, `dunning_attempts`,
`credits`, `processed_events`, `outbox`. ER:
[30-domain/04-data-models.md](../30-domain/04-data-models.md#billing-billing-service--platform-plane).

- `subscriptions.tenant_id` unique (1:1). `usage_counters(subscription_id, metric, period)` unique.
- `plans.code` PK — chuỗi ổn định (`starter`/`shop`/`collector`).
- Migration đầu tiên: `plans` (+ seed 3 gói mẫu), `subscriptions`, `invoices`, `usage_counters`,
  `outbox`, `processed_events`.

## 4. Nghiệp vụ cốt lõi

- **Subscription state machine** (`trialing → active → past_due → canceled`) — enforce chuyển
  hợp lệ; gói miễn phí vào thẳng `active`.
- **Đổi gói (FR-BIL-04)**: nâng → tính pro-rata phần còn lại của kỳ, hiệu lực ngay, phát
  `subscription_changed`; hạ → so lượng dùng hiện tại với `limits` gói mới, nếu vượt →
  `QUOTA_EXCEEDED` (yêu cầu giảm trước), nếu ổn thì lên lịch hiệu lực đầu kỳ sau.
- **Dunning (FR-BIL-05)**: chốt kỳ tạo `Invoice{open}` → charge; fail → `dunning_attempts` theo
  lịch (`+1d, +3d, +5d`), mỗi lần fail phát `billing.payment_failed`; hết lịch → `past_due` +
  event cuối (tenant-service suspend).
- **Webhook idempotent (FR-BIL-06)**: dedupe theo `provider_event_id`; verify chữ ký + đối soát
  số tiền với `Invoice` trước khi đổi trạng thái.
- **Entitlements (FR-BIL-09)**: `GetEntitlements` suy từ `plan.limits` + `plan.features` +
  override từ `credits`. Service gọi cache TTL ngắn (30–60s); khi `subscription_changed` phát,
  có thể chủ động invalidate.
- **Đo lượng dùng (FR-BIL-08)**: cộng dồn từ event; `orders_month` reset theo kỳ; cảnh báo
  80%/100% một lần mỗi kỳ.

Mã lỗi domain: `PLAN_NOT_FOUND` (404), `QUOTA_EXCEEDED` (422 — khi hạ gói), `INVOICE_ALREADY_PAID`
(409), `WEBHOOK_SIGNATURE_INVALID` (401), `DOWNGRADE_BLOCKED` (422).

## 5. Config (env)

| Biến | Bắt buộc | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `DB_URL` | có | — | DB role cross-tenant |
| `KAFKA_BROKERS` | có | — | Publish `billing.*`, consume usage events |
| `PAYMENT_PROVIDER` | có | — | Nhà cung cấp thanh toán định kỳ (sandbox trước) |
| `PAYMENT_WEBHOOK_SECRET` | có | — | Verify chữ ký webhook — **secret manager**, không repo |
| `DUNNING_SCHEDULE_DAYS` | không | `1,3,5` | Lịch retry |
| `ENTITLEMENTS_CACHE_TTL_S` | không | `45` | Gợi ý cho client cache |

## 6. Kiểm thử

- Unit: state machine subscription, tính pro-rata nâng gói, guard `DOWNGRADE_BLOCKED`, dedupe
  webhook, suy `Entitlements` từ plan + credit.
- Integration (Testcontainers): dunning chạy hết lịch → `past_due` + event; consumer usage
  cộng dồn đúng qua redelivery; `GetEntitlements` phản ánh đổi gói.
- E2E: provisioning tạo subscription → `GetEntitlements` chặn tạo sản phẩm thứ N+1 ở
  product-service (giả lập).

## 7. Observability

- Span: `ChangePlan`, `RunDunning`, `HandleWebhook`, `GetEntitlements`. Metric:
  `billing_mrr_vnd` (gauge), `billing_invoices_failed_total`, `billing_dunning_active` (gauge),
  `entitlements_rpc_duration_seconds`.
- Log milestone: subscription created/changed/canceled, invoice paid/failed (kèm tenantId,
  không log số thẻ / secret provider).
