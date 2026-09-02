# auth-service

**Ports**: 3001 (REST) · 50051 (gRPC) · **Ngôn ngữ**: TypeScript / NestJS (ADR-011)

## Trách nhiệm

Bounded context **Identity**. Đăng ký/đăng nhập email + password, xác minh OTP, JWT access
(15') + refresh token (30', rotate + reuse-detection), OAuth Google, khoá tài khoản, cấp token
impersonate cho Platform Operator.

Phát `auth.otp_requested` / `auth.account_registered` / `auth.password_changed`. **Nguồn của
claim `tid`** — JWT mang `tid` + `sub` + `role`; `platform_admin` không có `tid` (ADR-009).

**Không** sở hữu hồ sơ khách (tên/điện thoại/địa chỉ/điểm/hạng) — đó là `user-service`.

## Kiến trúc

Hexagonal + DDD, biến thể NestJS — [.claude/conventions/architecture.md](../../../.claude/conventions/architecture.md)
("TypeScript/NestJS services"); style [coding-conventions.md](../../../.claude/conventions/coding-conventions.md).
**CRUD thường** — không CQRS/ES/Saga (ADR-011); dùng `@nestjs/passport` (JWT + Google strategy),
`@nestjs/jwt`, **guard** cho RBAC, `class-validator` cho DTO. Không có `application/saga/`.

Config validate bằng schema (zod/joi) lúc startup — xem `.env.example`. `Account` (credential) +
refresh token có `tenant_id`, RLS scoped theo tenant (ADR-007). Đăng nhập trong phạm vi tenant
của host.

## Tài liệu

- Yêu cầu: [docs/10-requirements/11-auth-users.md](../../../docs/10-requirements/11-auth-users.md)
- Spec: [docs/40-services/auth-service.md](../../../docs/40-services/auth-service.md)
- Đa tenant: [ADR-007](../../../docs/20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md) ·
  [ADR-009](../../../docs/20-architecture/adrs/ADR-009-tenant-context-propagation.md)
- RBAC: [ADR-005](../../../docs/20-architecture/adrs/ADR-005-kong-api-gateway.md) (Kong verify,
  service authorize) · [docs/knowledge/09-api-gateway-kong/](../../../docs/knowledge/09-api-gateway-kong/)
