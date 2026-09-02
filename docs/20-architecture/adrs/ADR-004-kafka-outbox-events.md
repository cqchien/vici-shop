# ADR-004: Kafka + Outbox pattern cho mọi domain event

- **Trạng thái**: Accepted
- **Ngày**: 2026-07-05

## Problem

Nhiều nghiệp vụ chạy theo sự kiện: đơn hoàn tất → ghi sổ, cộng điểm, gửi email; nhập hàng →
cập nhật giá vốn; hàng về → mở thanh toán pre-order. Cần cơ chế truyền sự kiện giữa services
mà **không mất event** khi broker/consumer chết, và không tạo dual-write (ghi DB xong publish
fail → hai hệ thống lệch nhau).

## Why

- Publish trực tiếp trong transaction handler là dual-write cổ điển: DB commit nhưng Kafka
  fail (hoặc ngược lại) → lệch dữ liệu không tự lành.
- Outbox giải quyết tận gốc: event ghi vào bảng `outbox` **cùng transaction** với thay đổi
  state; relay đọc bảng, publish, đánh dấu đã gửi. Broker chết bao lâu cũng không mất event.
- Kafka (thay vì Redis pub/sub hay RabbitMQ): cần replay để build lại read model finance,
  consumer group để scale notification, và retention dài cho audit.
- Chi phí: at-least-once delivery → **mọi consumer phải idempotent** (dedupe theo event id).

## Solution

- Mọi domain event publish qua **outbox table + relay** — cấm publish inline. Topic đặt tên
  `<context>.<event>` (vd. `order.completed`, `inventory.stock_low`).
- Schema Avro trong `backend/libs/events/schemas/`, đăng ký trong
  [registry](../../../backend/libs/events/registry.md); struct Go tương ứng trong
  `backend/libs/events-go/`.
- Consumer idempotent bắt buộc (bảng `processed_events` hoặc unique constraint theo event id);
  message hỏng đi vào DLQ `<topic>.dlq` kèm alert.
