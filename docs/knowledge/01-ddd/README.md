# 01 — Domain-Driven Design (DDD)

DDD là cách chia và mô hình hoá hệ thống **theo ngôn ngữ của nghiệp vụ**, không theo bảng
database hay tầng kỹ thuật. Hai nửa: **strategic** (chia thành bounded context, mỗi context một
mô hình + một database) và **tactical** (bên trong một context: aggregate, entity, value object,
domain event, repository, domain service).

Với Vici, DDD là lý do có **13 bounded context** thay vì một schema khổng lồ, và là lý do
`Order` trong Ordering khác `Order` trong Finance.

| File | Nội dung |
| --- | --- |
| [01-khai-niem.md](01-khai-niem.md) | Vấn đề DDD giải, ubiquitous language, strategic vs tactical, khi nào KHÔNG cần DDD |
| [02-co-che.md](02-co-che.md) | Bounded context & context map; aggregate/entity/VO/domain event/repository; quy tắc thiết kế aggregate |
| [03-ap-dung-trong-vici.md](03-ap-dung-trong-vici.md) | 13 context của Vici, bảng aggregate, cách gán `tenant_id`, chỗ Vici cố ý đơn giản hoá |
| [04-pitfalls-va-thuc-hanh.md](04-pitfalls-va-thuc-hanh.md) | Anemic model, aggregate quá to, chia sẻ type chéo context, CRUD-naming… + checklist |

Đọc kèm: [`.claude/conventions/architecture.md`](../../../.claude/conventions/architecture.md) §3 ·
[`30-domain/01-bounded-contexts.md`](../../30-domain/01-bounded-contexts.md) ·
[`30-domain/04-data-models.md`](../../30-domain/04-data-models.md) ·
[`20-architecture/03-clean-architecture-ddd.md`](../../20-architecture/03-clean-architecture-ddd.md) §4
