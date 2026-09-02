# product-service

**Ports**: 3003 (REST) · 50053 (gRPC) · **Ngôn ngữ**: Go

## Trách nhiệm

Catalog: sản phẩm, variant, brand/series, blind box lineup, review, tìm kiếm Postgres full-text.

## Tài liệu

- Yêu cầu: [docs/10-requirements/01-catalog.md](../../../docs/10-requirements/01-catalog.md)
- Bounded context: [docs/30-domain/01-bounded-contexts.md](../../../docs/30-domain/01-bounded-contexts.md)
- Spec chi tiết: viết từ [template](../../../docs/40-services/service-spec-template.md) ngay trước khi code (chưa có)

## Cấu trúc

Theo chuẩn Hexagonal + DDD trong [.claude/conventions/architecture.md](../../../.claude/conventions/architecture.md).
Config qua env (validate lúc startup); xem `.env.example` khi service được implement.
