# 05 — Saga

Saga là cách chạy một **quy trình nghiệp vụ trải nhiều service** mà không dùng distributed
transaction. Chia thành các **bước cục bộ**, mỗi bước có một **bước bù (compensation)** để lùi
lại khi bước sau thất bại. Hệ thống đạt *eventual consistency*, không phải atomicity.

Hai kiểu điều phối: **orchestration** (một process manager ra lệnh từng bước) và **choreography**
(mỗi service phản ứng với event, không ai chỉ huy). Vici dùng orchestration cho checkout và
provisioning; choreography cho các fan-out đơn giản.

| File | Nội dung |
| --- | --- |
| [01-khai-niem.md](01-khai-niem.md) | Vì sao không dùng 2PC/distributed transaction, saga giải gì, orchestration vs choreography |
| [02-co-che.md](02-co-che.md) | Các bước + compensation, xử lý bước không đảo được, timeout, idempotency, retry, semantic lock |
| [03-ap-dung-trong-vici.md](03-ap-dung-trong-vici.md) | Checkout saga & provisioning saga, `@nestjs/cqrs` Saga vs Step Functions (ADR-010), bảng compensation |
| [04-pitfalls-va-thuc-hanh.md](04-pitfalls-va-thuc-hanh.md) | Compensation không idempotent, thứ tự bù sai, saga giữ state ở nhiều nơi… + checklist |

Đọc kèm: [`20-architecture/05-key-flows.md`](../../20-architecture/05-key-flows.md) §0–1 ·
[`30-domain/02-order-lifecycle.md`](../../30-domain/02-order-lifecycle.md) ·
[`40-services/tenant-service.md`](../../40-services/tenant-service.md) ·
[ADR-008](../../20-architecture/adrs/ADR-008-platform-plane-services-nestjs.md) ·
[ADR-010](../../20-architecture/adrs/ADR-010-serverless-aws-delivery.md) (Step Functions)
