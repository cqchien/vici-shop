# billing-service

**Ports**: 3013 (REST) · 50062 (gRPC) · **Ngôn ngữ**: TypeScript / NestJS (ADR-008)

## Trách nhiệm

Platform plane — cross-tenant. Danh mục gói (`Plan`), `Subscription` (1:1 với tenant), hoá đơn,
**đo lượng dùng** (read model từ event các context), **entitlements** (`GetEntitlements` gRPC),
lịch **dunning**, webhook nhà cung cấp thanh toán định kỳ.

Không sở hữu: bản ghi tenant & vòng đời (tenant-service — phản ứng qua `billing.payment_failed`),
dữ liệu nghiệp vụ dùng để đếm (các context chỉ phát event).

## Tài liệu

- Yêu cầu: [docs/10-requirements/14-billing.md](../../../docs/10-requirements/14-billing.md)
- Vòng đời: [docs/30-domain/05-tenant-lifecycle.md](../../../docs/30-domain/05-tenant-lifecycle.md)
- Spec: [docs/40-services/billing-service.md](../../../docs/40-services/billing-service.md)

## Cấu trúc

Hexagonal + DDD (biến thể NestJS) — [.claude/conventions/architecture.md](../../../.claude/conventions/architecture.md).
Config validate bằng schema lúc startup — xem `.env.example`. Secret webhook nhà cung cấp thanh
toán từ secret manager, **không bao giờ** trong repo.
