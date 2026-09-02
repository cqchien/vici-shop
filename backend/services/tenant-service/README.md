# tenant-service

**Ports**: 3012 (REST) · 50061 (gRPC) · **Ngôn ngữ**: TypeScript / NestJS (ADR-002, ADR-008)

## Trách nhiệm

Platform plane — cross-tenant. Onboarding tự phục vụ, **saga provisioning** (CQRS + Saga với
`@nestjs/cqrs`), vòng đời tenant (`provisioning → active → past_due → suspended → archived`),
thương hiệu, tên miền riêng, impersonate cho Platform Operator.

Không sở hữu: credential (auth-service), gói & subscription & hạn mức (billing-service), dữ liệu
nghiệp vụ của tenant (các context tự seed khi nhận `tenant.provisioned`).

## Tài liệu

- Yêu cầu: [docs/10-requirements/13-tenant.md](../../../docs/10-requirements/13-tenant.md)
- Vòng đời & saga: [docs/30-domain/05-tenant-lifecycle.md](../../../docs/30-domain/05-tenant-lifecycle.md)
- Spec: [docs/40-services/tenant-service.md](../../../docs/40-services/tenant-service.md)
- Đa tenant: [ADR-007](../../../docs/20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md) ·
  [ADR-009](../../../docs/20-architecture/adrs/ADR-009-tenant-context-propagation.md)

## Cấu trúc

Hexagonal + DDD (biến thể NestJS) — [.claude/conventions/architecture.md](../../../.claude/conventions/architecture.md);
style [coding-conventions.md](../../../.claude/conventions/coding-conventions.md). Config validate
bằng schema lúc startup — xem `.env.example`. DB dùng role có quyền cross-tenant (platform plane,
không set `app.tenant_id`).
