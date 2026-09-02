# Multi-tenancy + RLS — Khái niệm

> Vì sao quan trọng: cô lập tenant sai = rò rỉ dữ liệu khách hàng này sang khách hàng khác —
> loại sự cố có thể chấm dứt một công ty SaaS. Mô hình isolation là quyết định kiến trúc khó
> đảo, phải chọn đúng từ đầu.

## Ba mô hình isolation

| Mô hình | Cách làm | Cô lập | Chi phí / tenant | Onboard |
| --- | --- | --- | --- | --- |
| **Pooled** (shared) | 1 DB, mọi bảng có `tenant_id`, RLS chặn chéo | Logic (tầng DB) | Rất thấp | `INSERT` một dòng — vài giây |
| **Schema-per-tenant** | 1 DB, mỗi tenant một Postgres schema | Khá | Trung bình | Tạo schema + chạy migration |
| **Database/silo-per-tenant** | Mỗi tenant một DB (hoặc cluster) | Tối đa | Cao | Provision DB + migration — chậm |

Trade-off:

- **Silo**: cô lập tuyệt đối, dễ export/restore/tính cost riêng, "blast radius" nhỏ. Nhưng
  onboard chậm, connection + catalog phình theo số tenant, chi phí vận hành cao. Chỉ hợp
  tenant enterprise.
- **Schema-per-tenant**: cô lập khá, nhưng **mọi migration phải fan-out qua N schema**,
  `pg_catalog` phình, pool khó chia. Rủi ro vận hành tăng tuyến tính theo số tenant.
- **Pooled**: rẻ nhất, onboard nhanh nhất, một migration cho mọi tenant. Rủi ro: "noisy
  neighbour" và nguy cơ rò rỉ nếu **quên scope**. Giảm bằng RLS (chặn ở DB, không chỉ app) +
  quota theo tenant.

## Vì sao Vici chọn pooled ([ADR-007](../../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md))

Hình dạng khách hàng của Vici: **hàng nghìn shop art toy nhỏ** (vài trăm SKU, vài nghìn
đơn/tháng). Với hình dạng đó:

- Onboard phải **< 5 phút** (NFR-14) — pooled: chỉ tạo bản ghi tenant.
- Chi phí hạ tầng **trên mỗi tenant phải rất thấp** — pooled chia sẻ tối đa.
- Giữ [ADR-003](../../20-architecture/adrs/ADR-003-postgres-only-datastores.md) (chỉ Postgres +
  Redis + Kafka) — RLS là tính năng sẵn có của Postgres, không thêm gì.

Có thể **bổ sung silo cho tenant lớn** sau bằng ADR mới — pooled không chặn hướng đó.

## Row-Level Security (RLS) là gì

Tính năng Postgres: gắn **policy** lên một bảng, mỗi câu `SELECT/INSERT/UPDATE/DELETE` tự động
thêm một điều kiện lọc (`USING`/`WITH CHECK`), **do database enforce**, app không bỏ qua được.

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

Từ đây, `SELECT * FROM products` chỉ trả hàng của tenant trong `app.tenant_id`. App role **không
có `BYPASSRLS`**.

**Fail-closed**: nếu `app.tenant_id` chưa set → `current_setting` lỗi hoặc rỗng → policy không
match hàng nào → truy vấn trả **0 dòng**, không phải "tất cả". Quên scope lộ ra ngay (test rỗng),
không rò rỉ.

> Hệ quả production: RLS là **hàng rào cuối cùng** ở tầng DB. Kể cả khi app có bug (quên
> `WHERE tenant_id`), RLS vẫn chặn. Không có RLS thì một câu query thiếu điều kiện = rò rỉ toàn
> bộ dữ liệu mọi tenant.

## "Noisy neighbour"

Rủi ro của pooled: một tenant tải cao (drop lớn, import 10k sản phẩm) làm chậm tenant khác dùng
chung DB/CPU.

Giảm bằng:

- **Quota theo gói** (số sản phẩm, đơn/tháng, dung lượng) — `billing-service` là nguồn hạn mức.
- **Rate limit theo tenant** ở Kong / API Gateway.
- Connection pool có giới hạn per-tenant nếu cần.
- Tenant thật sự lớn → cân nhắc promote sang silo (ADR mới).

## Glossary

| Term | Một câu |
| --- | --- |
| Tenant | Một khách hàng của nền tảng — với Vici là một shop |
| Pooled model | Nhiều tenant dùng chung bảng, phân biệt bằng `tenant_id` |
| RLS (Row-Level Security) | Postgres tự lọc hàng theo policy, DB enforce |
| `SET LOCAL app.tenant_id` | Đặt biến session (phạm vi transaction) cho RLS đọc |
| Fail-closed | Thiếu context → chặn hết (0 dòng), không mở hết |
| `BYPASSRLS` | Thuộc tính role bỏ qua RLS — app role KHÔNG được có |
| Platform plane | Service/thao tác cross-tenant (tenant-service, billing-service) |
| Noisy neighbour | Một tenant tải cao ảnh hưởng tenant khác trên hạ tầng chung |
| Tenant context propagation | Tenant id đi từ biên → DB qua header/metadata/session var |

> 🗣️ Nói thành lời: "Ba mô hình đa tenant: pooled dùng chung bảng với `tenant_id`, schema-per-tenant,
> và silo mỗi tenant một DB. Tôi chọn pooled vì khách là hàng nghìn shop nhỏ, cần onboard nhanh
> và chi phí thấp. Cô lập bằng Postgres Row-Level Security — mỗi query DB tự lọc theo
> `app.tenant_id`, app role không bypass được, và fail-closed: quên set context thì trả 0 dòng
> chứ không phải tất cả. Đó là hàng rào cuối ở tầng DB kể cả khi app có bug."
