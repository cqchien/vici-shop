# API Gateway (Kong) — Áp dụng trong Vici

Nguồn chuẩn: [ADR-005](../../20-architecture/adrs/ADR-005-kong-api-gateway.md),
[`backend/gateway/kong/kong.yml`](../../../backend/gateway/kong/kong.yml),
[`backend/gateway/README.md`](../../../backend/gateway/README.md).

## Route public vs private

Từ `kong.yml` — cùng path, tách theo method:

| Route | Method | Plugin | Ví dụ |
| --- | --- | --- | --- |
| `product-public` | GET | rate-limiting (300/min) | duyệt catalog không cần token |
| `product-private` | POST/PUT/PATCH/DELETE | jwt | admin sửa sản phẩm |
| `auth-public` | POST | rate-limiting (10/min) | login/register/refresh — siết chặt chống brute-force |
| `auth-private` | GET/POST | jwt | logout, me, change-password |
| `order-routes` | * | jwt + rate-limiting (30/min) | mọi thao tác đơn cần đăng nhập |
| `payment-ipn` | POST/GET | (không jwt) | callback cổng thanh toán — auth bằng chữ ký, không JWT |
| `shipping-webhooks` | POST | (không jwt) | webhook tracking — auth bằng token trong payload |

## Platform-plane route (ADR-007/009)

Từ `kong.yml` (phần thêm cho đa tenant):

| Route | Auth | Ghi chú |
| --- | --- | --- |
| `tenant-onboarding-public` (`/tenants`, `/tenants/check-subdomain`) | rate-limiting (10/min) | đăng ký shop, chưa có tài khoản |
| `tenant-self` (`/me/tenant`) | jwt | chủ shop sửa thương hiệu/gói |
| `tenant-platform` (`/platform/tenants`, `/platform/overview`) | jwt + check `platform_admin` ở service | Operator |
| `billing-webhooks` (`/webhooks/payment`) | (chữ ký provider) | không JWT |

Platform-plane route **không** nhận `X-Tenant-Id` của tenant thường; chỉ `platform_admin`
(token không có `tid`).

## Tenant resolution (ADR-009)

Từ comment trong `kong.yml` và [`04-service-contracts-conventions.md`](../../20-architecture/04-service-contracts-conventions.md) §0:

1. Request có JWT → một bước post-auth copy claim `tid` → header `X-Tenant-Id` (đè giá trị client).
2. Route public storefront → tenant từ `Host` (`{sub}.vici.shop` / custom domain đã verify) qua
   `tenant.ResolveTenantByHost` (cache).

Trong DBless, đây là một plugin nhỏ (custom/serverless) + `request-transformer`; hiện khai báo
làm *ý định* trong `kong.yml` cho tới khi plugin được viết.

## RBAC vẫn ở service

Từ [ADR-005](../../20-architecture/adrs/ADR-005-kong-api-gateway.md): *"Service **vẫn tự kiểm tra
RBAC** (role trong JWT claim) — Kong chỉ verify chữ ký/hạn token; authorization là nghiệp vụ."*
Từ [`11-auth-users.md`](../../10-requirements/11-auth-users.md) FR-AUTH-03: role
`customer|staff|admin|tenant_admin|platform_admin`; khu `/admin` cho staff/admin/tenant_admin
của **đúng tenant**; khu `/platform` cho `platform_admin`. Enforce ở service.

## Global plugins

Từ `kong.yml`: `cors` (origins `localhost:3000` + domain production) và `request-id`
(`X-Request-ID`, `echo_downstream: true`) — dùng làm correlation id cho log/trace
([`11-observability-otel`](../11-observability-otel/README.md)).

## Serverless (ADR-010): Kong → AWS API Gateway

Từ [`06-serverless-aws.md`](../../20-architecture/06-serverless-aws.md) §0, §1:

| Kong | AWS API Gateway |
| --- | --- |
| Route theo path/method/host | HTTP API routes + Lambda proxy integration |
| jwt plugin | JWT authorizer |
| tenant resolve (Host/`tid` → `X-Tenant-Id`) | **Lambda authorizer** trả `context.tenantId` |
| rate-limiting theo tenant | Usage plan / throttling theo API key ảo = tenant |
| `kong.yml` | SAM / OpenAPI |

ADR-010 *thay* [ADR-005](../../20-architecture/adrs/ADR-005-kong-api-gateway.md) cho môi trường
serverless; vai trò gateway không đổi.

## Đọc tiếp

- Tenant context sau khi Kong gắn header → [`10-multi-tenancy-rls`](../10-multi-tenancy-rls/README.md)
- Correlation id → trace xuyên service → [`11-observability-otel`](../11-observability-otel/README.md)
- API GW serverless → [`13-serverless-aws`](../13-serverless-aws/README.md)
