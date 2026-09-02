# 02 — Hexagonal Architecture (Ports & Adapters)

Hexagonal là cách sắp xếp code sao cho **domain ở giữa và không biết gì về thế giới bên ngoài**
(HTTP, SQL, Kafka, gRPC). Domain khai báo các **port** (interface nó cần); **adapter** (code
framework/IO) implement hoặc gọi vào các port đó. Dependency luôn chỉ **vào trong**.

Đây là biểu hiện thực dụng của Clean Architecture. Với Vici, quy tắc này áp cho **cả Go và
NestJS**, và là lý do đổi PostgreSQL → datastore khác chỉ cần viết adapter mới, không đụng
`domain/`.

| File | Nội dung |
| --- | --- |
| [01-khai-niem.md](01-khai-niem.md) | Vấn đề nó giải, port vs adapter, dependency rule, driving vs driven |
| [02-co-che.md](02-co-che.md) | 4 lớp, hướng phụ thuộc, ai định nghĩa port, wiring (Go manual vs NestJS DI), luồng một request |
| [03-ap-dung-trong-vici.md](03-ap-dung-trong-vici.md) | Cấu trúc thư mục service, bảng "code này ở đâu", ví dụ Order qua 4 lớp, `tenant_id` |
| [04-pitfalls-va-thuc-hanh.md](04-pitfalls-va-thuc-hanh.md) | Framework lọt vào domain, port định nghĩa sai phía, adapter chứa logic… + checklist |

Đọc kèm: [`.claude/conventions/architecture.md`](../../../.claude/conventions/architecture.md) §1–2 ·
[`20-architecture/03-clean-architecture-ddd.md`](../../20-architecture/03-clean-architecture-ddd.md) §2–3 ·
[`coding-conventions-go.md`](../../../.claude/conventions/coding-conventions-go.md) §7
