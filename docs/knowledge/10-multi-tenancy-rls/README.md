# 10 — Multi-tenancy + Postgres Row-Level Security

Multi-tenancy: nhiều khách hàng (tenant = một shop) dùng chung hạ tầng, dữ liệu **cô lập tuyệt
đối**. Vici chọn mô hình **pooled** ([ADR-007](../../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md)):
một database mỗi service, **mọi bảng nghiệp vụ có cột `tenant_id`**, và **Postgres Row-Level
Security (RLS)** chặn truy vấn chéo tenant **ở tầng database** (fail-closed — quên scope thì trả
0 dòng, không rò rỉ).

Tenant context lan truyền từ biên vào tận DB ([ADR-009](../../20-architecture/adrs/ADR-009-tenant-context-propagation.md)):
JWT `tid` → header `X-Tenant-Id` → gRPC metadata → Kafka header → `SET LOCAL app.tenant_id`.

| File | Nội dung |
| --- | --- |
| [01-khai-niem.md](01-khai-niem.md) | 3 mô hình isolation (pooled/schema/silo), vì sao pooled, RLS là gì, "noisy neighbour" |
| [02-co-che.md](02-co-che.md) | Cột `tenant_id`, policy RLS, `SET LOCAL`, RDS Proxy, unique/index, lan truyền context, quota |
| [03-ap-dung-trong-vici.md](03-ap-dung-trong-vici.md) | ADR-007/009, platform plane vs tenant plane, `TenantId` VO, migration, impersonate, FE mock |
| [04-pitfalls-va-thuc-hanh.md](04-pitfalls-va-thuc-hanh.md) | Quên `SET LOCAL`, app role có BYPASSRLS, tin tenant_id client, unique thiếu tenant_id, pool connection… + checklist |

Đọc kèm: [ADR-007](../../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md) ·
[ADR-009](../../20-architecture/adrs/ADR-009-tenant-context-propagation.md) ·
[`10-requirements/13-tenant.md`](../../10-requirements/13-tenant.md) ·
[`30-domain/05-tenant-lifecycle.md`](../../30-domain/05-tenant-lifecycle.md) ·
[`20-architecture/03-clean-architecture-ddd.md`](../../20-architecture/03-clean-architecture-ddd.md) §4.1
