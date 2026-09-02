# ADR-009: Lan truyền và phân giải tenant context xuyên hệ thống

- **Trạng thái**: Accepted
- **Ngày**: 2026-08-30
- **Quan hệ**: mở rộng [ADR-005](ADR-005-kong-api-gateway.md) (Kong) và
  [ADR-004](ADR-004-kafka-outbox-events.md) (event); phục vụ
  [ADR-007](ADR-007-multi-tenancy-pooled-rls.md).

## Problem

Mô hình pooled ([ADR-007](ADR-007-multi-tenancy-pooled-rls.md)) bắt mọi truy vấn phải chạy trong
phạm vi đúng một tenant (`SET LOCAL app.tenant_id`). Vậy: request đến từ đâu mang thông tin
tenant, ai xác định nó, và làm sao nó theo được qua Kong → REST → gRPC → Kafka → relay mà không
bị giả mạo hay thất lạc?

## Why

- **Không để client tự khai `tenant_id` trong body** — giả mạo được. Tenant phải suy ra từ thứ
  đã xác thực: subdomain đã đăng ký + claim trong JWT.
- **Không truyền `tenant_id` như tham số hàm rải khắp domain** — giống trace ID, đây là
  ambient context; truyền qua `context.Context` (Go) / `AsyncLocalStorage` hoặc request scope
  (NestJS), set biến session DB ở tầng repository.
- Một chỗ quên set → RLS fail-closed (0 dòng), lỗi lộ ra sớm ở integration test thay vì rò rỉ.

## Solution

**Phân giải (resolution) — tại biên:**

1. Storefront/Admin chạy trên `{subdomain}.vici.shop` (hoặc tên miền riêng đã verify). Edge
   (Kong route theo `Host`, hoặc frontend BFF) tra `host → tenant_id` và gắn header
   `X-Tenant-Id`.
2. Đăng nhập: `auth-service` xác thực trong phạm vi tenant của host, phát JWT có claim
   **`tid`** (tenant id) + `sub`, `role`. Refresh token gắn tenant.
3. Kong: JWT plugin verify chữ ký/hạn; một plugin nhỏ copy `tid` claim → header `X-Tenant-Id`
   gửi xuống service (đè giá trị client tự đặt). Route công khai chưa đăng nhập (xem catalog)
   lấy tenant từ `Host`.

**Lan truyền (propagation) — trong hệ thống:**

| Chặng | Mang tenant bằng |
| --- | --- |
| REST vào service | Header `X-Tenant-Id` (Kong bảo đảm) |
| Trong process | `context.Context` value (Go) / request-scoped provider (NestJS) — không phải tham số |
| Repository → DB | `SET LOCAL app.tenant_id = $1` mở đầu mỗi transaction |
| gRPC nội bộ | Metadata `x-tenant-id` (interceptor inject/extract, cùng chỗ với OTel) |
| Kafka | Header message `tenant-id`; **cột `tenant_id` trong bảng `outbox`**; relay copy cột → header |
| Consumer | Đọc header `tenant-id` → set context → set `app.tenant_id` trước khi ghi read model |

**Platform-plane (cross-tenant):** `tenant-service` và `billing-service` dùng **DB role riêng**
có quyền bỏ qua RLS cho các thao tác quản trị (liệt kê mọi tenant, provisioning, chốt billing).
API của chúng không nhận `X-Tenant-Id` từ tenant thường; chỉ Platform Operator (role
`platform_admin` trong JWT, không có `tid`) gọi được. Khi Operator "impersonate" một tenant, hệ
thống cấp token có `tid` của tenant đó, giới hạn thời gian, ghi audit.

**Quy tắc cứng:** service nghiệp vụ **không bao giờ** đọc/ghi mà thiếu `app.tenant_id`; test
integration phải có case "thiếu tenant context → thao tác từ chối".
