# finance-service

**Ports**: 3010 (REST) · 50060 (gRPC) · **Ngôn ngữ**: Go

## Trách nhiệm

Sổ cái bút toán kép từ event, giá vốn moving-average, P&L, read model báo cáo.

## Tài liệu

- Yêu cầu: [docs/10-requirements/09-accounting.md](../../../docs/10-requirements/09-accounting.md)
- Bounded context: [docs/30-domain/01-bounded-contexts.md](../../../docs/30-domain/01-bounded-contexts.md)
- Spec chi tiết: viết từ [template](../../../docs/40-services/service-spec-template.md) ngay trước khi code (chưa có)

## Cấu trúc

Theo chuẩn Hexagonal + DDD trong [.claude/conventions/architecture.md](../../../.claude/conventions/architecture.md).
Config qua env (validate lúc startup); xem `.env.example` khi service được implement.
