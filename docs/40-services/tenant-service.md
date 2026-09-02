# tenant-service — Service Spec

Ngôn ngữ: TypeScript/NestJS (`@nestjs/cqrs` — CQRS + Saga, [ADR-008](../20-architecture/adrs/ADR-008-platform-plane-services-nestjs.md))
· REST `3012` · gRPC `50061` · FR: [FR-TEN-01..14](../10-requirements/13-tenant.md)

## 1. Trách nhiệm & ranh giới

- Bounded context: **Tenant** ([30-domain/01-bounded-contexts.md](../30-domain/01-bounded-contexts.md),
  vòng đời: [30-domain/05-tenant-lifecycle.md](../30-domain/05-tenant-lifecycle.md)).
- **Platform plane** — chạy cross-tenant, DB role có quyền bỏ qua RLS. Aggregate root `Tenant`
  có `tenant_id` là **khoá**, không phải cột lọc.
- Sở hữu: `Tenant` (subdomain, display name, status, branding), `ProvisioningTask`,
  `CustomDomain`, `TenantMember` (map account ↔ tenant + role trong tenant).
- **Không** sở hữu: credential đăng nhập (auth-service — gọi `AttachTenant`), gói & subscription
  & hạn mức (billing-service), dữ liệu nghiệp vụ của tenant (các context tự seed khi nhận
  `tenant.provisioned`).
- FR cover: toàn bộ FR-TEN.

## 2. API

### REST (qua Kong)

| Method | Path | Mô tả | Auth |
| --- | --- | --- | --- |
| POST | /v1/tenants | Đăng ký tenant mới (onboarding) — body: shopName, subdomain, planCode, seedCatalog | public (rate-limit chặt) |
| GET | /v1/tenants/check-subdomain?value= | Kiểm tra subdomain khả dụng | public |
| GET | /v1/tenants/{id}/provisioning | Tiến độ saga provisioning (poll từ `/start`) | tenant_admin (của tenant đó) |
| GET | /v1/me/tenant | Thông tin tenant của người đang đăng nhập (branding, status, plan ref) | tenant_admin, staff |
| PATCH | /v1/me/tenant/branding | Sửa tên hiển thị, logo, màu nhấn, múi giờ, liên hệ (FR-TEN-11) | tenant_admin |
| POST | /v1/me/tenant/custom-domains | Thêm tên miền riêng → trả bản ghi DNS cần tạo (FR-TEN-12) | tenant_admin |
| POST | /v1/me/tenant/custom-domains/{id}/verify | Kiểm tra DNS + phát hành cert | tenant_admin |
| POST | /v1/me/tenant/export | Yêu cầu export dữ liệu tenant (FR-TEN-14) | tenant_admin |
| DELETE | /v1/me/tenant | Yêu cầu xoá tenant (xác nhận 2 bước → `archived`) | tenant_admin |
| GET | /v1/platform/tenants | Danh sách mọi tenant: lọc status/plan, tìm tên/subdomain (FR-TEN-07) | platform_admin |
| GET | /v1/platform/tenants/{id} | Chi tiết + lượng dùng + provisioning tasks | platform_admin |
| POST | /v1/platform/tenants/{id}/suspend | Tạm ngưng (FR-TEN-08) | platform_admin |
| POST | /v1/platform/tenants/{id}/resume | Khôi phục | platform_admin |
| POST | /v1/platform/tenants/{id}/archive | Lưu trữ | platform_admin |
| POST | /v1/platform/tenants/{id}/impersonate | Cấp token `tid` tạm (≤30') + audit (FR-TEN-09, NFR-06b) | platform_admin |
| GET | /v1/platform/overview | KPI nền tảng: đếm theo status, đăng ký 30 ngày, hàng chờ provisioning | platform_admin |

### gRPC (nội bộ)

| RPC | Request → Response | Ai gọi |
| --- | --- | --- |
| `ResolveTenantByHost` | `{host}` → `{tenantId, status}` | Kong plugin / edge — map subdomain/domain → tenant |
| `GetTenantBranding` | `{tenantId}` → `{displayName, logoUrl, accentToken, timezone}` | (thường denormalize qua event; RPC cho trường hợp cần đọc thẳng) |
| `AssertTenantActive` | `{tenantId}` → `{active bool, status}` | các service khi cần chặn ghi cứng ngoài event (tuỳ chọn) |

### Events

| Phát (topic) | Payload | Khi nào |
| --- | --- | --- |
| `tenant.provisioned` | `{tenantId, subdomain, planCode, seedCatalog, ownerAccountId}` | Saga bước `seed_config` — mọi context consume để seed |
| `tenant.branding_updated` | `{tenantId, displayName, logoUrl, accentToken}` | Chủ shop đổi thương hiệu — storefront/notification denormalize |
| `tenant.suspended` / `tenant.resumed` | `{tenantId, reason}` | Đổi trạng thái — context bật/tắt cổng ghi |
| `tenant.archived` | `{tenantId}` | Lưu trữ — context chuyển dữ liệu sang chỉ-đọc |
| `tenant.purge_requested` | `{tenantId}` | Sau 90 ngày / yêu cầu xoá — context `DELETE WHERE tenant_id` |

| Tiêu thụ (topic) | Xử lý | Idempotency |
| --- | --- | --- |
| `billing.payment_failed` | Nếu quá hạn dunning → chuyển tenant `suspended` | theo `eventId` + guard theo `status` hiện tại |
| `billing.subscription_canceled` | Chuyển tenant `archived` (cuối kỳ) | theo `eventId` |

## 3. Data model

Bảng chính: `tenants`, `provisioning_tasks`, `custom_domains`, `tenant_members`,
`impersonation_audit`, `reserved_subdomains` (seed tĩnh). Xem ER trong
[30-domain/04-data-models.md](../30-domain/04-data-models.md#tenant-tenant-service--platform-plane).

- `tenants.subdomain` **globally unique** (không có `tenant_id` scoping — đây là platform plane).
- `provisioning_tasks(tenant_id, step)` unique — saga idempotent.
- Event store (CQRS/ES cho `Tenant` aggregate) hoặc bảng trạng thái + outbox — quyết định khi
  code; tối thiểu phải append-only cho lịch sử vòng đời + `impersonation_audit`.
- Migration đầu tiên: `tenants`, `reserved_subdomains`, `tenant_members`, `outbox`,
  `processed_events`.

## 4. Nghiệp vụ cốt lõi

- **Đăng ký (FR-TEN-01/02)**: validate subdomain (`^[a-z0-9-]{3,40}$`, không trùng, không trong
  `reserved_subdomains`) → `SUBDOMAIN_TAKEN` nếu trùng. Tạo `Tenant{status: provisioning}` +
  `TenantMember` chờ account.
- **ProvisioningSaga (FR-TEN-05)**: process manager (`application/saga/provisioning.saga.ts`),
  6 bước, mỗi bước một `ProvisioningTask`, compensation ngược khi fail (bảng compensation ở
  [05-tenant-lifecycle.md](../30-domain/05-tenant-lifecycle.md)). Retry có backoff; toàn saga
  < 5 phút (NFR-14). Bước seed idempotent theo `tenantId` để context xử lý lại an toàn.
- **State machine (FR-TEN-08)**: enforce chuyển trạng thái hợp lệ (`INVALID_STATE_TRANSITION`);
  mỗi lần chuyển phát event tương ứng.
- **Impersonate (FR-TEN-09)**: chỉ `platform_admin`; gọi auth-service cấp token có `tid` mục
  tiêu, `exp ≤ 30'`, ghi `impersonation_audit{operatorId, tenantId, reason, at}`. Token này
  không refresh được.
- **Custom domain (FR-TEN-12)**: tạo bản ghi `pending_dns` + hướng dẫn CNAME → `verify` kiểm
  DNS → ACME phát cert → `active`; Kong thêm route theo `Host`.
- **Xoá (FR-TEN-14)**: `archived` ngay, phát `tenant.purge_requested` sau 90 ngày (job nền) →
  giữ bản ghi `tenants` tối thiểu để không tái dùng subdomain.

Mã lỗi domain: `SUBDOMAIN_TAKEN` (409), `SUBDOMAIN_INVALID` (422), `TENANT_NOT_FOUND` (404),
`INVALID_STATE_TRANSITION` (409), `PROVISIONING_IN_PROGRESS` (409), `RESERVED_SUBDOMAIN` (422).

## 5. Config (env)

| Biến | Bắt buộc | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| `DB_URL` | có | — | DB role có quyền cross-tenant (platform plane) |
| `KAFKA_BROKERS` | có | — | Publish `tenant.*` |
| `AUTH_GRPC_ADDR` | có | — | Gọi `AttachTenant`, cấp token impersonate |
| `BILLING_GRPC_ADDR` | có | — | `CreateSubscription` trong saga |
| `KONG_ADMIN_URL` | có | — | Đăng ký route subdomain khi provisioning |
| `ROOT_DOMAIN` | không | `vici.shop` | Ghép `{subdomain}.{ROOT_DOMAIN}` |
| `PROVISIONING_TIMEOUT_MS` | không | `300000` | Ngưỡng NFR-14 |
| `IMPERSONATION_TTL_MIN` | không | `30` | NFR-06b |

## 6. Kiểm thử

- Unit: validate subdomain, state machine tenant, chọn bước compensation của saga, TTL token
  impersonate.
- Integration (Testcontainers): saga provisioning happy path + mỗi kịch bản fail → compensation
  đúng; idempotency consumer `billing.payment_failed`; `ResolveTenantByHost` với subdomain +
  custom domain.
- E2E: `POST /v1/tenants` → poll `/provisioning` → `active`; các context seed đã có dữ liệu dưới
  `tenant_id` mới.

## 7. Observability

- Span: `RegisterTenant`, `ProvisioningSaga.step`, `Impersonate`. Metric:
  `tenant_provisioning_duration_seconds` (histogram — theo dõi NFR-14),
  `tenant_provisioning_failed_total{step}`, `tenants_active` (gauge).
- Log milestone: tenant provisioned, suspended/resumed (kèm operator), impersonation started
  (kèm reason).
