# Vici — Multi-Tenant Art Toy Commerce Platform

**Vici** is a multi-tenant e-commerce platform for art-toy shops in the Vietnamese market. Each
tenant is a shop owner who self-serves onboarding (`{shop}.vici.shop`) and runs their own store:
catalog & variants, blind-box series, pre-orders & drops, inventory, cart/checkout, payment
(VNPay/Momo/ZaloPay/COD), shipping (GHN/GHTK), campaigns & vouchers, loyalty & membership,
accounting and business reports. A Platform Operator manages every tenant, plans and billing.
The first shop, **VICI Saigon**, is the reference tenant.

> Pivoted to multi-tenant on 2026-08-30 — pooled model (`tenant_id` + Postgres RLS):
> [ADR-007](docs/20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md),
> [ADR-008](docs/20-architecture/adrs/ADR-008-platform-plane-services-nestjs.md),
> [ADR-009](docs/20-architecture/adrs/ADR-009-tenant-context-propagation.md).

## Repository layout

```text
vici_shop/
├── docs/        # 📚 Source of truth — vision, requirements, architecture, domain, ADRs
├── backend/     # 13-service monorepo (services/, libs/, gateway/, infra/) — scaffold
└── frontend/    # Next.js app — storefront (/) + admin (/admin) + platform (/platform) + onboarding (/start) — mock-first
```

## Start here

Everything is documented before it is built. Entry point: **[docs/README.md](docs/README.md)**.

| To understand… | Read |
| --- | --- |
| What the product is & roadmap | [docs/00-overview/](docs/00-overview/01-vision-and-scope.md) |
| What it must do (FR/NFR) | [docs/10-requirements/](docs/10-requirements/README.md) |
| How it is built (system map, stack, ADRs) | [docs/20-architecture/](docs/20-architecture/README.md) |
| How the business behaves (contexts, lifecycles, data models) | [docs/30-domain/](docs/30-domain/README.md) |
| Which service owns what | [docs/40-services/](docs/40-services/README.md) |
| Frontend design system & sitemap | [docs/50-frontend/](docs/50-frontend/01-design-system.md) |

## The functional blocks

0. **Tenancy & Billing** *(platform plane)* — self-serve onboarding + provisioning saga, tenant
   lifecycle, plans/subscriptions, usage metering & quotas, the Platform Console
1. **Catalog & Blind Box** — products, variants, brands/series, blind-box sets with secret/chase figures, reviews, search
2. **Inventory** — stock, reservations, adjustments, purchase receipts
3. **Selling** — cart, checkout, orders (incl. pre-orders with deposit), payment, shipping
4. **Campaigns & Drops** — vouchers, flash sales, scheduled drops, waitlists, purchase limits
5. **Loyalty & Membership** — points, member tiers, early access to drops
6. **Finance & Reports** — ledger, costing, P&L, sales/inventory/best-seller reports

Blocks 1–6 are **tenant-scoped**: every aggregate carries `tenant_id`, isolated by Postgres RLS.

## Tech stack summary

**Backend**: 8 Go 1.22+ services (commerce/compute) + 5 TypeScript/NestJS services (auth, user,
order, tenant, billing) · PostgreSQL 16 (pooled multi-tenant, Row-Level Security) · Redis 7 ·
Apache Kafka (outbox) · gRPC + Buf · Kong · Kubernetes/Helm · Terraform · OpenTelemetry.
**Frontend**: Next.js 14+ App Router · React 18 · TypeScript strict · TailwindCSS.
Rationale for every choice: [docs/20-architecture/02-tech-stack.md](docs/20-architecture/02-tech-stack.md).

## Current state (2026-08)

- `docs/` — design documentation, pivoted to the multi-tenant platform (this is the contract;
  code that contradicts it is a bug)
- `frontend/` — mock-first simulation: storefront + admin + platform console + `/start`
  onboarding in one Next.js app, no backend calls yet
- `backend/` — folder scaffold only (13 services); implementation follows the roadmap in
  [docs/00-overview/03-roadmap.md](docs/00-overview/03-roadmap.md) (P0 → P0.5 Tenancy → P1 … P5),
  service specs are written just-in-time from [the template](docs/40-services/service-spec-template.md)

> Planned next: a serverless (AWS Lambda / EventBridge / SQS / SNS) delivery model — to be
> recorded as its own ADR with proposed per-flow designs before any code.

## Working agreements

- Engineering guardrails: [CLAUDE.md](CLAUDE.md) + [.claude/CONSTITUTION.md](.claude/CONSTITUTION.md)
- Architecture & coding conventions: [.claude/conventions/](.claude/conventions/)
- Any new technique, datastore or pattern requires an ADR **before** code:
  [docs/20-architecture/adrs/](docs/20-architecture/adrs/README.md)
