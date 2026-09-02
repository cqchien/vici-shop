# ADR-007: Multi-tenancy — mô hình pooled (`tenant_id` + Postgres RLS)

- **Trạng thái**: Accepted
- **Ngày**: 2026-08-30
- **Quan hệ**: thay thế dòng "Multi-tenancy (`tenant_id` mọi nơi)" trong
  [02-tech-stack.md](../02-tech-stack.md); thay thế một phần
  [ADR-001](ADR-001-microservices-for-single-store.md) (phần "một cửa hàng duy nhất" —
  quyết định microservices vẫn giữ nguyên).

## Problem

Dự án pivot lần nữa: từ website cho **một cửa hàng** sang **nền tảng đa tenant** — mỗi tenant
(chủ shop art toy) tự đăng ký, tự khởi tạo cửa hàng, tự vận hành; một Platform Operator quản lý
toàn bộ tenant. Câu hỏi: cô lập dữ liệu giữa các tenant bằng cách nào?

Ràng buộc: giữ [ADR-003](ADR-003-postgres-only-datastores.md) (chỉ PostgreSQL + Redis + Kafka),
giữ database-per-service, đa số tenant là shop nhỏ (vài trăm SKU, vài nghìn đơn/tháng), cần
onboarding trong vài phút và chi phí hạ tầng thấp trên mỗi tenant.

## Why

Ba phương án cô lập:

- **Database-per-tenant (silo)** — cô lập tối đa, dễ export/restore/tính chi phí riêng, nhưng
  onboarding chậm (tạo DB + chạy migration), số connection và catalog phình theo số tenant, chi
  phí vận hành cao. Chỉ hợp lý cho tenant enterprise.
- **Schema-per-tenant** — cô lập khá, nhưng mọi migration phải fan-out qua N schema, `pg_catalog`
  phình, pool khó chia. Rủi ro vận hành tăng tuyến tính theo số tenant.
- **Pooled: một database mỗi service, mọi bảng có `tenant_id`, chặn chéo bằng Row-Level
  Security** — rẻ nhất, onboarding chỉ là `INSERT` một dòng tenant, migration chạy một lần cho
  mọi tenant, hợp với hàng nghìn shop nhỏ. Rủi ro chấp nhận: "noisy neighbour" và nguy cơ rò rỉ
  nếu quên scope — bù lại bằng RLS (chặn ở tầng DB, không chỉ tầng app) và quota theo tenant.

Pooled là lựa chọn mặc định đúng cho hình dạng khách hàng của Vici. Có thể bổ sung silo cho
tenant lớn về sau bằng ADR mới — không chặn hướng đó.

## Solution

**Mô hình pooled cho toàn bộ 13 service:**

1. **Không đổi database-per-service.** Mỗi service vẫn một database riêng; thêm cột
   `tenant_id uuid NOT NULL` vào **mọi bảng nghiệp vụ** (kể cả `outbox`, read model, search
   index). Bảng cấu hình toàn nền tảng (danh mục plan, bản thân bảng `tenants`) không có
   `tenant_id` và chỉ platform-plane service sở hữu.
2. **Row-Level Security bật trên mọi bảng có `tenant_id`:**
   ```sql
   ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
   CREATE POLICY tenant_isolation ON <t>
     USING (tenant_id = current_setting('app.tenant_id')::uuid);
   ```
   Mỗi transaction mở đầu bằng `SET LOCAL app.tenant_id = '<uuid>'` (xem
   [ADR-009](ADR-009-tenant-context-propagation.md)). App role **không** có `BYPASSRLS`.
3. **Index dẫn đầu bằng `tenant_id`** (`(tenant_id, sku)`, `(tenant_id, status, created_at)`…);
   unique constraint đổi thành `(tenant_id, <khoá cũ>)` — ví dụ `slug`, `sku`, `voucher.code`
   chỉ unique trong phạm vi tenant.
4. **Domain layer mang `TenantId` value object**, gán vào aggregate lúc tạo; RLS là mối lo hạ
   tầng (repository set biến session), domain không biết SQL. Xem
   [03-clean-architecture-ddd.md](../03-clean-architecture-ddd.md).
5. **Quota theo tenant** theo plan (số sản phẩm, số đơn/tháng, dung lượng ảnh, rate limit API tại
   Kong) — `billing-service` là nguồn hạn mức, các service enforce cục bộ.
6. **Migration path** (mỗi service, forward-only): `ADD COLUMN tenant_id` (nullable) → backfill
   toàn bộ dòng hiện có về tenant tham chiếu `vici-saigon` → `SET NOT NULL` → tạo policy →
   `ENABLE ROW LEVEL SECURITY` → đổi unique/index sang dạng có `tenant_id`.

Hệ quả tiêu cực cần theo dõi: một truy vấn quên `SET LOCAL` sẽ **không trả dòng nào** (fail
closed) — tốt cho bảo mật, nhưng phải test kỹ. Báo cáo cross-tenant của Platform Operator chạy
qua platform-plane service với role riêng, không đi qua app role.
