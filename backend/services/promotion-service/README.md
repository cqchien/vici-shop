# promotion-service

**Ports**: 3009 (REST) · 50059 (gRPC) · **Ngôn ngữ**: Go

## Trách nhiệm

Voucher, flash sale, drop (allocation + giới hạn mua/khách), waitlist, pre-order campaign.

## Tài liệu

- Yêu cầu: [docs/10-requirements/07-promotion.md](../../../docs/10-requirements/07-promotion.md)
- Bounded context: [docs/30-domain/01-bounded-contexts.md](../../../docs/30-domain/01-bounded-contexts.md)
- Spec chi tiết: viết từ [template](../../../docs/40-services/service-spec-template.md) ngay trước khi code (chưa có)

## Cấu trúc

Theo chuẩn Hexagonal + DDD trong [.claude/conventions/architecture.md](../../../.claude/conventions/architecture.md).
Config qua env (validate lúc startup); xem `.env.example` khi service được implement.
