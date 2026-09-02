# order-service

**Ports**: 3006 (REST) · 50056 (gRPC) · **Ngôn ngữ**: TypeScript / NestJS (ADR-002)

## Trách nhiệm

Đơn hàng event-sourced (CQRS + Event Sourcing với `@nestjs/cqrs`): vòng đời đơn thường và
pre-order (cọc → chờ hàng → thanh toán phần còn lại), saga checkout với compensation, đổi trả.

## Tài liệu

- Yêu cầu: [docs/10-requirements/04-order.md](../../../docs/10-requirements/04-order.md)
- Vòng đời & saga: [docs/30-domain/02-order-lifecycle.md](../../../docs/30-domain/02-order-lifecycle.md)
- Spec chi tiết: viết từ [template](../../../docs/40-services/service-spec-template.md) ngay trước khi code (chưa có)

## Cấu trúc

Theo chuẩn Hexagonal + DDD (biến thể NestJS) trong
[.claude/conventions/architecture.md](../../../.claude/conventions/architecture.md);
style theo [coding-conventions.md](../../../.claude/conventions/coding-conventions.md).
Config validate bằng schema lúc startup; xem `.env.example` khi service được implement.
