# shipping-service

**Ports**: 3008 (REST) · 50058 (gRPC) · **Ngôn ngữ**: Go

## Trách nhiệm

Vận đơn GHN/GHTK, tính phí ship, webhook tracking, giao thất bại/hoàn hàng.

## Tài liệu

- Yêu cầu: [docs/10-requirements/06-shipping.md](../../../docs/10-requirements/06-shipping.md)
- Bounded context: [docs/30-domain/01-bounded-contexts.md](../../../docs/30-domain/01-bounded-contexts.md)
- Spec chi tiết: viết từ [template](../../../docs/40-services/service-spec-template.md) ngay trước khi code (chưa có)

## Cấu trúc

Theo chuẩn Hexagonal + DDD trong [.claude/conventions/architecture.md](../../../.claude/conventions/architecture.md).
Config qua env (validate lúc startup); xem `.env.example` khi service được implement.
