# auth-service

**Port**: 3001 (REST, **not published** — reachable only via Kong or another container on the
same network, ADR-012) · **Language**: TypeScript / NestJS (ADR-011) · **Context**: Identity

Owns `Account` (email, password hash, lock state, email-verification state), `OtpCode`, and the
transactional `outbox`. Plain CRUD hexagonal — **no CQRS/ES/Saga** (ADR-011).

> **Status (2026-09-04):** first backend code in the repo. One endpoint is implemented end to
> end as the **reference vertical slice** every later NestJS service copies:
> **`POST /v1/auth/register`** (FR-AUTH-01). `login`, `verify-email`, `refresh`, OAuth, gRPC and
> `user-service` are scoped as follow-ups — see [the plan](../../../.claude/plans) / spec §follow-ups.

---

## What `POST /v1/auth/register` does

1. Validates `{ email, password }` (shape at the edge, strength policy in the `RawPassword` VO).
2. Hashes the password with **argon2id**.
3. Inserts an `accounts` row (`role=customer`, unverified, unlocked) scoped to `X-Tenant-Id`.
4. Generates a 6-digit OTP, stores **only its hash** in `otp_codes`.
5. Writes an `auth.otp_requested` row to `outbox` **in the same transaction** (ADR-004).
6. Returns `201` with the standard envelope. **No tokens.** **No email** — notification-service
   consumes the event and delivers the code.

```
201 → { "data": { "accountId": "…", "emailVerificationRequired": true }, "meta": { "requestId": "…" } }
409 EMAIL_ALREADY_REGISTERED · 400 WEAK_PASSWORD / VALIDATION_ERROR / MISSING_TENANT_CONTEXT
```

## Architecture (the precedent)

```
src/
  domain/          pure TS — model (Account, Email, RawPassword, OtpCode, TenantId), event, port, error
                   (barrel index.ts per folder); model/utils/ = validation + copyInstant (ADR-013)
  application/
    use-case/      RegisterAccountUseCase.execute() — plain hexagonal use case, NO CQRS bus (ADR-011)
    dto/           RegisterAccountInput / RegisterAccountResult (register-account.io.ts)
    config/        APP_CONFIG port (token + interface the use case needs)
  infrastructure/  adapters for THIS context's dependencies
    persistence/   AbstractEntity + entities, SnakeNamingStrategy, mappers, migrations + RLS,
                   tenant-transaction.ts, TypeormAccountRepository
    hashing/       Argon2Hasher      system/  SystemClock, CryptoOtpGenerator
    tenant/        ClsTenantContext   observability/  OtelInitializer
  interface/
    rest/          AuthController (thin), DTOs, decorators/field.decorators.ts (@EmailField/@PasswordField)
    http/          DomainExceptionFilter, ResponseTransformInterceptor, GatewayOnlyGuard (ADR-012)
  shared/          CROSS-CUTTING — same in every service, owned by no bounded context;
                   seed of a future backend/libs/common
    config/        ApiConfigService (typed env) + global ConfigModule; env.ts = zod schema
    logging/       logger.port.ts (LOGGER token + LoggerPort) + AppLogger (transient, auto
                   class-name context) + nestjs-pino wiring + LoggingModule
    errors/        DomainError base, MissingTenantContextError, DirectAccessForbiddenError
    http/          response envelope      tenant/  CLS keys      utils/  uuidV7 (ADR-013)
    index.ts       the PURE face of shared/ — only framework-free re-exports (see below)
```

- **Why `config/` and `logging/` sit in `shared/`, not `infrastructure/`**: they belong to the
  *service*, not to the Identity bounded context — identical in all 5 NestJS services, and no
  domain rule is expressed in terms of them. `infrastructure/` is reserved for adapters that
  implement a port this context defined (repository, hasher, clock, tenant context).
- **The one invariant that makes that safe**: `src/shared/index.ts` is imported by `domain/`, so
  it only re-exports pure things. `LOGGER`/`LoggerPort` come from `shared/logging/logger.port`
  (token + interface) and deliberately **not** from `shared/logging` (the barrel, which pulls
  `@nestjs/*` + pino); `shared/config` is not re-exported at all, since it reads `process.env`.
  `.eslintrc.cjs` enforces this — the `src/domain/**` override bans `**/shared/config` and
  `**/shared/logging` next to `**/infrastructure/*`.

- **Dependency rule**: `domain/` imports nothing outward — enforced by `.eslintrc.cjs`
  (`no-restricted-imports` under `src/domain/**`), which also runs type-aware
  (`no-floating-promises`).
- **Multi-tenancy (ADR-007/009)**: every table has `tenant_id` + RLS (`ENABLE` + `FORCE`,
  fail-closed). The repo only ever calls `set_config('app.tenant_id', …, true)` at the top of the
  transaction (`tenant-transaction.ts`) — never a manual `WHERE tenant_id`. Tenant id is ambient
  context (nestjs-cls), populated from the `X-Tenant-Id` header the Kong edge injects.
- **Response shape**: controllers return their payload; `ResponseTransformInterceptor` wraps it in
  `{ data, meta: { requestId } }`; `DomainExceptionFilter` maps thrown `DomainError`s to the error
  envelope. Controllers never build either.
- **Aggregate owns its tenant**: the repository stamps every row from `account.tenantId`, while
  `TenantTransactionRunner` sets `app.tenant_id` from ambient context. If the two disagree, RLS
  `WITH CHECK` rejects the write — the mechanisms cross-check instead of silently diverging.
- **Events clear only after commit** (`domainEvents` getter + `clearEvents()`), so a failed write
  stays retryable instead of losing the outbox row. The `outbox` row is written in the same
  transaction (ADR-004); a Kafka relay that drains it is a follow-up (F8) — rows just accumulate
  `sent_at IS NULL` for now.
- **Identifiers & time (ADR-013)**: every id is a **UUID v7**, minted only through
  `uuidV7()` (`src/shared/utils/uuid.ts`) — time-ordered, so inserts land at the right edge of each
  `tenant_id`-prefixed index instead of scattering. `randomUUID()` appears nowhere: `node:crypto`
  is v4-only and ignores a `{ version: 7 }` option rather than rejecting it. Validation still
  accepts any well-formed UUID, because `tenant_id` arrives as request input. `uuid` is pinned
  to **11.x** — 12+ is ESM-only and will not load under CJS Jest/Nest. An instant is a native
  **`Date`** at every layer (`Clock.now()`), so the persistence mapper converts nothing; every
  calculation and comparison goes through **`date-fns`** (`addMinutes`, `isBefore`, `isEqual` —
  never `getTime()` arithmetic or `===`), and ESLint enforces that inside `domain/`
  + `application/`. Because `Date` is mutable, aggregates hand out copies (`copyInstant`).
- **Logging**: `pino` via `nestjs-pino` — JSON always, `pino-pretty` only in dev. Inject the
  `LOGGER` port (never `new Logger('X')`); `AppLogger` is transient and reads the class name from
  `INQUIRER`, so `context` is set automatically. `reqId` (= Kong's `X-Request-Id` = the envelope
  `requestId`) is attached inside every request. `pino-http` logs one line per request; the
  filter adds error detail for 5xx only. Secrets/PII redacted at the sink. `LOG_LEVEL` env.
- **OpenAPI** at `GET /docs` (Swagger UI) / `GET /docs-json`, proxied through Kong. `helmet` is on.
- **Direct-access lockdown (ADR-012), two independent layers:**
  1. **Network isolation** — the service has no published port. In the central compose it's only
     reachable by another container on the same network (i.e. Kong); it doesn't exist for the
     outside world at all.
  2. **`GatewayOnlyGuard`** (global `APP_GUARD`) — every request must carry the exact
     `X-Gateway-Secret` value Kong stamps on it (`pre-function` plugin reading Kong's own
     container env, never written to `kong.yml`). Rejects with `403 DIRECT_ACCESS_FORBIDDEN`
     otherwise — this is what actually stops a compromised or misconfigured neighbour container
     on the same network, which network isolation alone does not. `@SkipGatewayCheck()` exempts
     `/health` and `/health/ready` (the orchestrator's own probes hit the container directly).
     `GATEWAY_SHARED_SECRET` is a required env var with no default — missing it stops the
     service from starting rather than silently disabling the check.

### Conventions borrowed from [awesome-nest-boilerplate](https://github.com/NarHakobyan/awesome-nest-boilerplate)

Adopted (fit our hexagonal layout): `ApiConfigService` typed-config pattern; composed
`@EmailField()` / `@PasswordField()` field decorators; `AbstractEntity` base (id + createdAt,
**no `toDto`/`@UseDto`** — we keep the mapper boundary); `SnakeNamingStrategy` so entities carry no
`{ name: … }` noise; UUID **v7** for row ids (time-ordered, ADR-013); type-aware ESLint;
`helmet` + Swagger.
Not adopted (conflict with `.claude/conventions/architecture.md` / ADR-011): CommandBus /
`@CommandHandler` / `*.handler.ts` (auth is plain CRUD — use cases are `*.use-case.ts`),
entity-as-domain-model, `@UseDto`, i18n.

## Run it

This service ships **only a `Dockerfile`** — no per-service compose. The one central stack is
`backend/infra/docker/docker-compose.yml` (Postgres + Kong + every service).

A `Makefile` wraps everything below — `make` on its own lists every target, `make bootstrap` does
the first-time setup (`.env` + deps + infra + migrations), `make dev` is the host dev loop, and
`make verify` runs the quality gates. The raw commands it shells out to are spelled out here so
neither form is the only documentation.

**Everything in containers** (the service runs its own migrations on start):

```bash
cd ../../infra/docker
cp .env.example .env
docker compose up -d --build          # postgres + kong :8000 + auth-service :3001
```

**Host dev loop** (edit + `pnpm start:dev`, infra in Docker). Running this way, the service is
your own `localhost:3001` — not a deployed container, so ADR-012's network-isolation layer
doesn't apply; the `GatewayOnlyGuard` still does (it checks a header, not the network), so set
any value and send it yourself:

```bash
cd ../../infra/docker && cp .env.example .env && docker compose -f docker-compose.infra.yml up -d
cd ../../services/auth-service
cp .env.example .env                   # defaults point at localhost:5432
pnpm install && pnpm migration:run
pnpm start:dev                          # :3001, OpenAPI at /docs
```

**Call it** — through Kong (the only way once it's a deployed/containerized service; Kong injects
both `X-Tenant-Id` and `X-Gateway-Secret`):

```bash
curl -sX POST localhost:8000/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"alice@saigon.test","password":"Passw0rd!"}'
```

Against the **host dev loop** only (see above — not the containerized stack, where :3001 isn't
reachable at all), you supply both headers yourself:

```bash
curl -sX POST localhost:3001/v1/auth/register \
  -H 'content-type: application/json' \
  -H 'X-Tenant-Id: 11111111-1111-4111-8111-111111111111' \
  -H 'X-Gateway-Secret: <your GATEWAY_SHARED_SECRET>' \
  -d '{"email":"bob@saigon.test","password":"Passw0rd!"}'
```

## Quality gates

`make verify` runs all four in order; individually:

```bash
pnpm lint
pnpm typecheck
pnpm test               # unit — zero I/O
pnpm test:integration   # Testcontainers Postgres (needs Docker)
pnpm test:e2e           # Nest + supertest + Testcontainers Postgres
pnpm build
```

Latest run: **6 unit passed**; `lint`, `typecheck` and `build` clean. The suite is currently
`test/unit/domain/otp-code.spec.ts` only — the earlier integration/e2e specs were stripped from
the tree and have not been rewritten yet (follow-up below).

## Reference notes for the next NestJS service

- `src/shared/` is deliberately in-service. Extract it to `backend/libs/common` when the second
  NestJS service needs it — decide the packaging (workspace vs `file:` vs published) then, with a
  real second consumer to design against.
- Every config file lives in this folder (no shared `backend/` root config) — services are
  self-contained.
- Copy verbatim: the layer layout + barrels, `ApiConfigService` + `ConfigModule`,
  `LoggingModule` + `AppLogger` + the `LOGGER` port, `tenant-transaction.ts` + the RLS migration,
  `AbstractEntity` + `SnakeNamingStrategy`, `DomainExceptionFilter` + `ResponseTransformInterceptor`,
  `field.decorators.ts`, the three-project `jest.config.js`, and
  `GatewayOnlyGuard` + `SkipGatewayCheck()` (ADR-012) —
  the `pre-function` plugin in `kong.yml` is already global, so a new service only needs its
  own copy of the guard + `GATEWAY_SHARED_SECRET` env var + the two `docker-compose.yml` lines
  wiring it in (no `ports:`, and the shared secret).

## Docs

- Spec: [`docs/40-services/auth-service.md`](../../../docs/40-services/auth-service.md) ·
  FR: [`docs/10-requirements/11-auth-users.md`](../../../docs/10-requirements/11-auth-users.md)
- Multi-tenancy: [ADR-007](../../../docs/20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md) ·
  [ADR-009](../../../docs/20-architecture/adrs/ADR-009-tenant-context-propagation.md) ·
  Gateway: [ADR-005](../../../docs/20-architecture/adrs/ADR-005-kong-api-gateway.md) ·
  Outbox: [ADR-004](../../../docs/20-architecture/adrs/ADR-004-kafka-outbox-events.md) ·
  Direct-access lockdown: [ADR-012](../../../docs/20-architecture/adrs/ADR-012-service-direct-access-lockdown.md)
