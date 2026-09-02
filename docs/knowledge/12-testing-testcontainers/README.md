# 12 — Testing strategy & Testcontainers

Chiến lược test của Vici là **test pyramid**: rất nhiều **unit test** (domain + application,
**zero I/O**, chạy mili-giây), ít hơn là **integration test** (adapter chạy với Postgres / Redis
/ Kafka **thật** qua **Testcontainers**), và rất ít **e2e**.

Hexagonal ([`02-hexagonal`](../02-hexagonal/README.md)) là cái làm pyramid này khả thi: vì
domain/application không import I/O, test chúng không cần Docker.

| File | Nội dung |
| --- | --- |
| [01-khai-niem.md](01-khai-niem.md) | Test pyramid vs ice-cream cone, unit vs integration vs e2e, vì sao real deps (không mock), TDD |
| [02-co-che.md](02-co-che.md) | Fake qua port, table-driven test, Testcontainers lifecycle, cô lập state, test concurrency, test RLS |
| [03-ap-dung-trong-vici.md](03-ap-dung-trong-vici.md) | conventions §11/§6, test/ folder, quality gates, case bắt buộc (oversell, cross-tenant, saga compensation) |
| [04-pitfalls-va-thuc-hanh.md](04-pitfalls-va-thuc-hanh.md) | Mock cái nên chạy thật, test giòn, không test concurrency, quên rollback state… + checklist |

Đọc kèm: [`.claude/conventions/coding-conventions-go.md`](../../../.claude/conventions/coding-conventions-go.md) §11 ·
[`.claude/conventions/coding-conventions.md`](../../../.claude/conventions/coding-conventions.md) §6 ·
[`20-architecture/03-clean-architecture-ddd.md`](../../20-architecture/03-clean-architecture-ddd.md) §6 ·
[`10-requirements/99-nfr.md`](../../10-requirements/99-nfr.md) NFR-05, NFR-13 ·
[`.claude/CONSTITUTION.md`](../../../.claude/CONSTITUTION.md) Article VI
