# Vici — Tài liệu thiết kế (Source of Truth)

**Nền tảng thương mại điện tử đa tenant bán art toy** (designer toy, blind box, figure giới hạn)
tại thị trường Việt Nam: mỗi tenant là một chủ shop tự đăng ký và vận hành cửa hàng riêng
(`{shop}.vici.shop`) trên hạ tầng dùng chung; cửa hàng đầu tiên **VICI Saigon** là tenant tham
chiếu. Mọi thứ được tài liệu hoá **trước khi** viết code — code mâu thuẫn với tài liệu là bug.

> Pivot 2026-08-30 sang đa tenant: [ADR-007](20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md)
> (mô hình pooled `tenant_id` + Postgres RLS), [ADR-008](20-architecture/adrs/ADR-008-platform-plane-services-nestjs.md)
> (tenant + billing service dùng NestJS), [ADR-009](20-architecture/adrs/ADR-009-tenant-context-propagation.md)
> (lan truyền tenant context).

## Bản đồ tài liệu

| Thư mục | Nội dung | Đọc khi nào |
| --- | --- | --- |
| [00-overview/](00-overview/01-vision-and-scope.md) | Tầm nhìn, phạm vi, personas, roadmap | Bắt đầu dự án, lập kế hoạch |
| [10-requirements/](10-requirements/README.md) | Yêu cầu chức năng (FR) theo module + NFR | Trước khi thiết kế/viết bất kỳ tính năng nào |
| [20-architecture/](20-architecture/README.md) | Kiến trúc hệ thống, tech stack, ADRs | Trước khi chọn công nghệ hoặc thay đổi kiến trúc |
| [30-domain/](30-domain/README.md) | Bounded contexts, vòng đời nghiệp vụ, data models | Trước khi viết domain logic |
| [40-services/](40-services/README.md) | Danh mục service + spec đầy đủ 13/13 | Trước khi code một service |
| [50-frontend/](50-frontend/01-design-system.md) | Design system, sitemap storefront + admin + platform | Trước khi làm frontend |
| [knowledge/](knowledge/README.md) | Giải thích các kỹ thuật (DDD, Hexagonal, CQRS, Saga, Outbox, Kafka, gRPC, Kong, RLS, OTel, testing, serverless) — khái niệm → cơ chế → cách Vici áp dụng → pitfalls | Khi cần hiểu sâu một pattern trước khi code |

## Điểm vào nhanh

- Sản phẩm là gì? → [00-overview/01-vision-and-scope.md](00-overview/01-vision-and-scope.md)
- Làm theo thứ tự nào? → [00-overview/03-roadmap.md](00-overview/03-roadmap.md)
- Đa tenant hoạt động ra sao? → [20-architecture/adrs/ADR-007](20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md)
  + [ADR-009](20-architecture/adrs/ADR-009-tenant-context-propagation.md) + [30-domain/05-tenant-lifecycle.md](30-domain/05-tenant-lifecycle.md)
- Service nào sở hữu nghiệp vụ nào? → [30-domain/01-bounded-contexts.md](30-domain/01-bounded-contexts.md)
- Vì sao chọn kiến trúc/công nghệ này? → [20-architecture/adrs/README.md](20-architecture/adrs/README.md)
- Kỹ thuật X (CQRS, Saga, Outbox, RLS…) hoạt động ra sao và Vici dùng ở đâu? → [knowledge/](knowledge/README.md)
- Blind box / drop / pre-order hoạt động ra sao? → [30-domain/03-blind-box-and-drops.md](30-domain/03-blind-box-and-drops.md)
- Bắt đầu code service đầu tiên thì đọc gì theo thứ tự? →
  [20-architecture/03-clean-architecture-ddd.md](20-architecture/03-clean-architecture-ddd.md) →
  [20-architecture/04-service-contracts-conventions.md](20-architecture/04-service-contracts-conventions.md) →
  spec service trong [40-services/](40-services/README.md)
- FE mock hiện có gì khác/thiếu so với spec? → mỗi file `10-requirements/*.md` có khối trích dẫn
  "Đối chiếu FE mock" ở đầu bài nêu rõ chỗ nào mock đơn giản hoá, chỗ nào là bug cần sửa khi code
  backend thật.

## Quy ước tài liệu

- Tiếng Việt cho nội dung; thuật ngữ kỹ thuật, tên code, identifier giữ tiếng Anh.
- "Tenant" = một cửa hàng trên nền tảng. "Platform" = cấp nền tảng (vận hành mọi tenant).
  Mọi FR từ P0.5 trở đi ngầm hiểu **trong phạm vi một tenant** trừ khi ghi rõ "platform".
- Mỗi quyết định kiến trúc theo cấu trúc **Problem → Why → Solution**, lưu thành ADR
  trong [20-architecture/adrs/](20-architecture/adrs/README.md) **trước khi** code.
- Yêu cầu chức năng đánh số `FR-<MODULE>-<NN>` (ví dụ `FR-CAT-01`), tham chiếu được từ spec và test.
