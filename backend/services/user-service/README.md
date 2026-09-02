# user-service

**Ports**: 3002 (REST) · 50052 (gRPC) · **Ngôn ngữ**: TypeScript / NestJS (ADR-011)

## Trách nhiệm

Bounded context **Customer**. Hồ sơ khách (`Customer`: tên, tier, points_balance), `Address[]`
(chuẩn hoá tỉnh/quận/phường), `PointEntry` (ledger append-only). Loyalty: tích/tiêu điểm, xét
hạng lại (job hằng ngày), hết hạn điểm FIFO. Admin xem/khoá khách.

gRPC: `GetTier`, `GetPointsBalance`, `ReservePoints`/`CommitPointsSpend`/`ReleasePoints`,
`EarnPoints`. Consume `auth.account_registered` (tạo `Customer`), `order.completed` (cộng điểm),
`tenant.provisioned` (seed settings).

**Không** sở hữu credential đăng nhập — đó là `auth-service`; `Customer.account_id` là tham chiếu.

## Kiến trúc

Hexagonal + DDD, biến thể NestJS — [.claude/conventions/architecture.md](../../../.claude/conventions/architecture.md);
style [coding-conventions.md](../../../.claude/conventions/coding-conventions.md).
**CRUD thường** — không CQRS/ES/Saga (ADR-011); `class-validator` cho DTO hồ sơ/địa chỉ. Không
có `application/saga/`.

`Customer`, `Address`, `PointEntry`, `Tier` có `tenant_id`, RLS scoped (ADR-007) — một người
mua ở hai tenant có hai hồ sơ, hai số dư điểm. Tham số tích/tiêu điểm là `settings` theo tenant.
Config validate schema lúc startup — xem `.env.example`.

## Tài liệu

- Yêu cầu: [docs/10-requirements/11-auth-users.md](../../../docs/10-requirements/11-auth-users.md)
  (hồ sơ) + [docs/10-requirements/08-loyalty.md](../../../docs/10-requirements/08-loyalty.md) (điểm)
- Spec: [docs/40-services/user-service.md](../../../docs/40-services/user-service.md)
- Hướng dẫn implement từng bước (dạng dạy học): [guide.md](guide.md)
- Đa tenant: [ADR-007](../../../docs/20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md) ·
  [ADR-009](../../../docs/20-architecture/adrs/ADR-009-tenant-context-propagation.md)
