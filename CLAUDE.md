# Vici Shop — Engineering Instructions for Claude

Vici is a **multi-tenant e-commerce platform for art-toy shops** (Vietnamese market). Each tenant
is a shop owner who self-serves onboarding (`{shop}.vici.shop`) and runs their own store; a
Platform Operator manages every tenant. The first shop, **VICI Saigon**, is the reference tenant.
Per-tenant scope: catalog & variants, blind-box series with secret figures, pre-orders & scheduled
drops, inventory, cart/checkout, payment (VNPay/Momo/ZaloPay/COD), shipping (GHN/GHTK), campaigns &
vouchers, loyalty & membership, accounting and business reports. Platform scope: onboarding &
provisioning, plans/subscriptions, usage quotas.

It is a monorepo — `backend/` (13 microservices by DDD bounded context; **8 Go** + **5 NestJS**
— `auth`, `user`, `order`, `tenant`, `billing`), `frontend/` (one Next.js app: storefront `/`, admin `/admin`, platform
console `/platform`, onboarding `/start`), `docs/` (the source of truth). Internal calls use
**gRPC**; public APIs are **REST via Kong**; services communicate asynchronously over **Apache
Kafka** (outbox pattern mandatory). State lives in PostgreSQL 16 and Redis 7.

**Multi-tenancy (ADR-007 / ADR-009):** pooled model — one database per service, every business
table carries `tenant_id` with Postgres Row-Level Security (fail-closed). Tenant context flows via
the `X-Tenant-Id` header (Kong, from the JWT `tid` claim or `Host`), gRPC metadata `x-tenant-id`,
and the Kafka `tenant-id` header. `tenant-service` + `billing-service` are the platform plane
(cross-tenant, RLS-exempt role). Read ADR-007/008/009 before any service work.

**Language policy (ADR-002 / ADR-008 / ADR-011):** two languages. **NestJS** for the identity /
customer / platform / ordering plane — `auth`, `user`, `order`, `tenant`, `billing` (5). **Go**
for the commerce/compute plane — `product`, `inventory`, `cart`, `payment`, `shipping`,
`promotion`, `finance`, `notification` (8). CQRS/ES/Saga (`@nestjs/cqrs`) is used fully only in
`order`/`tenant`/`billing`; `auth`/`user` are plain CRUD hexagonal NestJS. A **sixth** NestJS
service, or a third language, needs a new ADR.

**Current state:** documentation (`docs/`, pivoted to the platform) + backend folder scaffold (no
backend code yet, 13 services) + frontend mock-first simulation (`frontend/`, storefront + admin
+ platform + onboarding, builds clean). A **serverless (AWS Lambda / EventBridge / SQS / SNS)**
delivery model is planned next — its own ADR + per-flow designs before code. When you write the
first code for a service, you are setting the precedent every later service copies. Make it
exemplary.

## How to work here

1. **Documentation is the source of truth.** Start at `docs/README.md` (navigation hub). Before
   implementing anything, read the relevant docs:
   - Requirements: `docs/10-requirements/` (FR per module + NFRs)
   - Decision rationale: `docs/20-architecture/adrs/`
   - Domain behavior: `docs/30-domain/` (bounded contexts, lifecycles, data models)
   - Tech choices: `docs/20-architecture/02-tech-stack.md`
   - Service catalog & spec template: `docs/40-services/`
2. **Decisions follow Problem → Why → Solution** and are recorded as ADRs. A new technique or a
   departure from an existing ADR requires a new ADR in `docs/20-architecture/adrs/` *before* code.
3. **Respect bounded-context boundaries.** See `docs/30-domain/01-bounded-contexts.md`. A service
   never reaches into another context's database or domain model — only its public contract
   (gRPC proto, Kafka event, or REST).
4. **Build in roadmap order** (P0 Foundation → P1 Catalog & Inventory → P2 Cart, Order, Payment &
   Shipping → P3 Blind Box, Drops, Campaigns & Loyalty → P4 Finance & Reports → P5 Hardening; see
   `docs/00-overview/03-roadmap.md`) unless the user directs otherwise. Write the service spec
   (from `docs/40-services/service-spec-template.md`) just before coding a service.

## Read these before writing code

- @.claude/CONSTITUTION.md — non-negotiable guardrails (git, secrets, safety, quality bar)
- @.claude/conventions/architecture.md — Hexagonal / Ports & Adapters + DDD layering and the
  per-service folder structure every service must follow
- **Per-language style rules load automatically** when you work inside a service directory
  (each `backend/services/*-service/CLAUDE.md` imports the right one):
  `.claude/conventions/coding-conventions.md` — TypeScript/NestJS (auth, user, order, tenant,
  billing) · `.claude/conventions/coding-conventions-go.md` — Go style, naming, errors, logging,
  testing, commits (the 8 Go services). Read either file directly when you need it outside a
  service folder.

## The five rules that override convenience

1. **Never `git commit` or `git push` unless the user explicitly asks.**
2. **Never write a secret into the repo.** Config comes from environment variables, validated at
   startup. `.env` files are git-ignored; commit `.env.example` with placeholder values only.
3. **The domain layer imports no framework.** No `@nestjs/*`, no ORM, no SDK inside `src/domain/` (TypeScript) or `internal/domain/` (Go). Pure business logic only.
4. **Respect context boundaries.** Cross-service data comes via contracts (proto/event/REST),
   never a shared database.
5. **If a doc or ADR contradicts what you're about to do, stop and surface it** rather than
   silently diverging.
