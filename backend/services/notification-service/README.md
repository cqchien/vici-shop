# notification-service

**Ports**: 3011 (REST — health/preference) · **Ngôn ngữ**: Go

## Trách nhiệm

Tiêu thụ event Kafka và gửi email (v1): giao dịch (đơn/thanh toán/vận chuyển), nhắc drop,
waitlist, nhắc thanh toán pre-order. Template tập trung, retry + DLQ, idempotent theo event id.

## Tài liệu

- Yêu cầu: [docs/10-requirements/12-notification.md](../../../docs/10-requirements/12-notification.md)
- Bounded context: [docs/30-domain/01-bounded-contexts.md](../../../docs/30-domain/01-bounded-contexts.md)
- Spec chi tiết: viết từ [template](../../../docs/40-services/service-spec-template.md) ngay trước khi code (chưa có)

## Cấu trúc

Theo chuẩn Hexagonal + DDD trong [.claude/conventions/architecture.md](../../../.claude/conventions/architecture.md).
Config qua env (validate lúc startup); xem `.env.example` khi service được implement.
