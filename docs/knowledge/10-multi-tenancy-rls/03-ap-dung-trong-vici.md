# Multi-tenancy + RLS — Áp dụng trong Vici

Nguồn chuẩn: [ADR-007](../../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md),
[ADR-009](../../20-architecture/adrs/ADR-009-tenant-context-propagation.md),
[`30-domain/05-tenant-lifecycle.md`](../../30-domain/05-tenant-lifecycle.md),
[`10-requirements/13-tenant.md`](../../10-requirements/13-tenant.md).

## Hai tầng

| | Service | `tenant_id` là… | DB role |
| --- | --- | --- | --- |
| **Platform plane** | `tenant-service`, `billing-service` | Khoá của aggregate (`Tenant`, `Subscription` 1:1 tenant) | Role cross-tenant, **không** set `app.tenant_id` |
| **Tenant plane** | 11 service còn lại (auth, user, product, inventory, cart, order, payment, shipping, promotion, finance, notification) | Cột trên mọi bảng, RLS scoped | App role, **không** `BYPASSRLS` |

## `tenant_id` sống ở đâu (ADR-007, `03-clean-architecture-ddd.md` §4.1)

- **domain**: `TenantId` VO trên aggregate, gán lúc tạo, không setter; method domain không nhận
  `tenant_id`.
- **application**: nhận từ `context` / request-scoped provider (do `interface/` nạp từ
  `X-Tenant-Id`); không đọc từ payload client.
- **infrastructure**: repo `SET LOCAL app.tenant_id = $1`; không tự `WHERE tenant_id`.
- Litmus: đổi RLS → cơ chế khác chỉ đụng `infrastructure/`.

## Lan truyền (ADR-009) — bảng chuẩn

Xem [`04-service-contracts-conventions.md`](../../20-architecture/04-service-contracts-conventions.md) §0
và [ADR-009](../../20-architecture/adrs/ADR-009-tenant-context-propagation.md) "Lan truyền":

- REST: header `X-Tenant-Id` (Kong bảo đảm, đè giá trị client)
- gRPC: metadata `x-tenant-id` (interceptor); thiếu → `InvalidArgument`
- Kafka: envelope `tenantId` + header `tenant-id`; cột `outbox.tenant_id`; relay copy cột → header
- Consumer: đọc header → `SET app.tenant_id` trước khi ghi read model

## Từng service — ghi chú "Phạm vi tenant"

Mỗi service spec có khối "Phạm vi tenant" ở đầu:
[`product-service`](../../40-services/product-service.md) (`slug`/`sku` unique trong tenant),
[`inventory-service`](../../40-services/inventory-service.md) (gRPC metadata),
[`order-service`](../../40-services/order-service.md) (stream id `(tenant_id, order_id)`, mã đơn
`VC-1001` unique trong tenant),
[`payment-service`](../../40-services/payment-service.md) (merchant secret theo tenant ở secret
manager),
[`auth-service`](../../40-services/auth-service.md) (nguồn của claim `tid`; `platform_admin`
không có `tid`),
[`user-service`](../../40-services/user-service.md) (một người mua ở 2 tenant có 2 hồ sơ, 2 số
dư điểm),
[`notification-service`](../../40-services/notification-service.md) (danh tính người gửi theo
tenant), …

## Migration path (mỗi service, forward-only — ADR-007 §6)

```
1. ADD COLUMN tenant_id uuid                       (nullable)
2. backfill mọi dòng hiện có → tenant 'vici-saigon'
3. ALTER COLUMN tenant_id SET NOT NULL
4. CREATE POLICY tenant_isolation ...
5. ENABLE (+ FORCE) ROW LEVEL SECURITY
6. đổi unique/index sang dạng (tenant_id, <khoá cũ>)
7. tạo app role không BYPASSRLS; cấp quyền; app dùng role này
```

## Impersonate (FR-TEN-09, NFR-06b)

Từ [`tenant-service.md`](../../40-services/tenant-service.md) §2/§4: chỉ `platform_admin`; token
có `tid` mục tiêu, `exp ≤ 30'`, ghi `impersonation_audit{operatorId, tenantId, reason, at}`,
không refresh được. FE: `frontend/src/app/admin/layout.tsx` hiện **banner** "Đang xem với tư cách
{tenant} — Thoát"; store action `impersonateTenant` / `stopImpersonating`.

## FE mock

`frontend/src/lib/mock/seed.ts`: `REFERENCE_TENANT_ID = "t_vici"` — mọi dữ liệu nghiệp vụ mock
thuộc tenant tham chiếu; `state.tenants` là registry cho `/platform`; `currentTenant()` =
tenant đang impersonate / theo user / mặc định `t_vici`. Đây là mô phỏng — backend thật scope
bằng RLS.

## Quota / noisy-neighbour

`billing.GetEntitlements(tenant_id)` là nguồn hạn mức; service cache ngắn, enforce cục bộ, trả
`QUOTA_EXCEEDED`. Xem [`14-billing.md`](../../10-requirements/14-billing.md) FR-BIL-09 và
[`knowledge/03-cqrs`](../03-cqrs/README.md) (billing usage projection).

## Serverless (ADR-010)

RLS **không đổi**. Cần **RDS Proxy** (pool connection cho Lambda; `SET LOCAL` mỗi transaction)
hoặc Aurora Serverless v2. Tenant context: API GW **Lambda authorizer** trả `context.tenantId`;
EventBridge `detail.tenantId`; SQS `MessageAttributes["tenant-id"]`. Xem
[`06-serverless-aws.md`](../../20-architecture/06-serverless-aws.md) §0.

## Đọc tiếp

- Context đi qua Kong → [`09-api-gateway-kong`](../09-api-gateway-kong/README.md)
- Event mang `tenant_id` → [`06-outbox`](../06-outbox/README.md), [`07-event-driven-kafka`](../07-event-driven-kafka/README.md)
- `TenantId` VO → [`01-ddd`](../01-ddd/README.md)
- RDS Proxy + authorizer → [`13-serverless-aws`](../13-serverless-aws/README.md)
