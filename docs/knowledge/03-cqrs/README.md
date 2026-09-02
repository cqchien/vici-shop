# 03 — CQRS (Command Query Responsibility Segregation)

CQRS tách **đường ghi** (command: thay đổi state qua aggregate, bảo vệ invariant) khỏi **đường
đọc** (query: trả dữ liệu từ **projection / read model**, không đụng aggregate). Hai bên có thể
dùng model khác nhau, thậm chí store khác nhau, và scale độc lập.

CQRS **không** bắt buộc đi kèm Event Sourcing, và **không** phải áp cho mọi service. Vici chỉ
dùng CQRS ở `order-service`, `tenant-service`, `billing-service` (ADR-002/008).

| File | Nội dung |
| --- | --- |
| [01-khai-niem.md](01-khai-niem.md) | Vấn đề nó giải, command vs query, CQRS "nhẹ" vs "nặng", khi nào KHÔNG dùng |
| [02-co-che.md](02-co-che.md) | Command bus, query bus, projection cập nhật thế nào, consistency giữa write & read |
| [03-ap-dung-trong-vici.md](03-ap-dung-trong-vici.md) | `@nestjs/cqrs` ở order/tenant/billing, folder command/query, ví dụ, chỗ Go + auth/user không dùng |
| [04-pitfalls-va-thuc-hanh.md](04-pitfalls-va-thuc-hanh.md) | CQRS ở mọi nơi, query đi qua aggregate, quên độ trễ projection… + checklist |

Đọc kèm: [`20-architecture/03-clean-architecture-ddd.md`](../../20-architecture/03-clean-architecture-ddd.md) §5 ·
[`40-services/order-service.md`](../../40-services/order-service.md) ·
[`40-services/billing-service.md`](../../40-services/billing-service.md) ·
[ADR-002](../../20-architecture/adrs/ADR-002-go-first-language-policy.md) ·
[ADR-008](../../20-architecture/adrs/ADR-008-platform-plane-services-nestjs.md)
