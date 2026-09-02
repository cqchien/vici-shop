# 06 — Transactional Outbox

Outbox giải bài toán **dual-write**: khi một thao tác vừa phải đổi state (DB) vừa phải phát
event (Kafka), làm sao để **không bao giờ có cái này mà thiếu cái kia**. Giải pháp: ghi event
vào bảng `outbox` **trong cùng transaction** với thay đổi state; một **relay** đọc bảng đó,
publish lên broker, đánh dấu đã gửi.

Đây là [ADR-004](../../20-architecture/adrs/ADR-004-kafka-outbox-events.md) — **bắt buộc cho
mọi service**, không có ngoại lệ. Cấm publish Kafka inline trong request handler.

| File | Nội dung |
| --- | --- |
| [01-khai-niem.md](01-khai-niem.md) | Dual-write hỏng thế nào, outbox giải gì, delivery semantics (at-least-once) |
| [02-co-che.md](02-co-che.md) | Bảng outbox, ghi cùng transaction, relay (polling vs CDC), đánh dấu sent, dedupe consumer, ordering |
| [03-ap-dung-trong-vici.md](03-ap-dung-trong-vici.md) | Cột `tenant_id` trong outbox, relay → Kafka header, envelope, chỗ dùng, serverless (ADR-010) |
| [04-pitfalls-va-thuc-hanh.md](04-pitfalls-va-thuc-hanh.md) | Publish inline, relay không idempotent, outbox không dọn, ordering nhầm… + checklist |

Đọc kèm: [ADR-004](../../20-architecture/adrs/ADR-004-kafka-outbox-events.md) ·
[`20-architecture/04-service-contracts-conventions.md`](../../20-architecture/04-service-contracts-conventions.md) §3 ·
[`backend/libs/events/registry.md`](../../../backend/libs/events/registry.md) ·
[`20-architecture/06-serverless-aws.md`](../../20-architecture/06-serverless-aws.md) §6
