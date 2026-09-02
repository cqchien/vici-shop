# 07 — Event-driven Architecture với Kafka

Kiến trúc hướng sự kiện: một service phát **sự thật đã xảy ra** (`order.completed`) và **không
biết ai tiêu thụ**; các service khác tự đăng ký nghe và phản ứng. Coupling lỏng, service thêm/bớt
consumer mà không ai phải sửa. Kafka là log phân tán bền, có replay, consumer group để scale.

Đây là "mũi tên đứt" trong mọi sơ đồ Vici (async), đối lập với gRPC (mũi tên liền, đồng bộ).
Nguyên tắc chọn: **mặc định event; chỉ gRPC khi caller cần kết quả ngay để đi tiếp**.

| File | Nội dung |
| --- | --- |
| [01-khai-niem.md](01-khai-niem.md) | Event vs command vs gRPC, vì sao Kafka (không RabbitMQ/Redis pub-sub), event notification vs event-carried state |
| [02-co-che.md](02-co-che.md) | Topic/partition/offset, consumer group, ordering, at-least-once, retry/DLQ, Avro schema evolution, replay |
| [03-ap-dung-trong-vici.md](03-ap-dung-trong-vici.md) | Topic catalog, naming, consumer group, tenant header, envelope, EventBridge (ADR-010) |
| [04-pitfalls-va-thuc-hanh.md](04-pitfalls-va-thuc-hanh.md) | Event as command, poison message, rebalance storm, schema breaking, ordering nhầm… + checklist |

Đọc kèm: [ADR-004](../../20-architecture/adrs/ADR-004-kafka-outbox-events.md) ·
[`20-architecture/04-service-contracts-conventions.md`](../../20-architecture/04-service-contracts-conventions.md) §3 ·
[`backend/libs/events/registry.md`](../../../backend/libs/events/registry.md) ·
[`20-architecture/01-system-overview.md`](../../20-architecture/01-system-overview.md) (góc nhìn async)
