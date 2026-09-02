# payment-service

**Ports**: 3007 (REST) · 50057 (gRPC) · **Ngôn ngữ**: Go

## Trách nhiệm

Giao dịch VNPay/Momo/ZaloPay/COD, IPN idempotent, hoàn tiền, hai khoản cho pre-order.

## Tài liệu

- Yêu cầu: [docs/10-requirements/05-payment.md](../../../docs/10-requirements/05-payment.md)
- Bounded context: [docs/30-domain/01-bounded-contexts.md](../../../docs/30-domain/01-bounded-contexts.md)
- Spec chi tiết: viết từ [template](../../../docs/40-services/service-spec-template.md) ngay trước khi code (chưa có)

## Cấu trúc

Theo chuẩn Hexagonal + DDD trong [.claude/conventions/architecture.md](../../../.claude/conventions/architecture.md).
Config qua env (validate lúc startup); xem `.env.example` khi service được implement.
