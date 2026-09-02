# cart-service

**Ports**: 3005 (REST) · 50055 (gRPC) · **Ngôn ngữ**: Go

## Trách nhiệm

Giỏ hàng (Redis) và checkout session điều phối reserve/voucher/điểm.

## Tài liệu

- Yêu cầu: [docs/10-requirements/03-cart-checkout.md](../../../docs/10-requirements/03-cart-checkout.md)
- Bounded context: [docs/30-domain/01-bounded-contexts.md](../../../docs/30-domain/01-bounded-contexts.md)
- Spec chi tiết: viết từ [template](../../../docs/40-services/service-spec-template.md) ngay trước khi code (chưa có)

## Cấu trúc

Theo chuẩn Hexagonal + DDD trong [.claude/conventions/architecture.md](../../../.claude/conventions/architecture.md).
Config qua env (validate lúc startup); xem `.env.example` khi service được implement.
