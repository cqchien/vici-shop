# inventory-service

**Ports**: 3004 (REST) · 50054 (gRPC) · **Ngôn ngữ**: Go

## Trách nhiệm

Tồn kho theo SKU, reservation TTL, điều chỉnh có audit, phiếu nhập hàng.

## Tài liệu

- Yêu cầu: [docs/10-requirements/02-inventory.md](../../../docs/10-requirements/02-inventory.md)
- Bounded context: [docs/30-domain/01-bounded-contexts.md](../../../docs/30-domain/01-bounded-contexts.md)
- Spec chi tiết: viết từ [template](../../../docs/40-services/service-spec-template.md) ngay trước khi code (chưa có)

## Cấu trúc

Theo chuẩn Hexagonal + DDD trong [.claude/conventions/architecture.md](../../../.claude/conventions/architecture.md).
Config qua env (validate lúc startup); xem `.env.example` khi service được implement.
