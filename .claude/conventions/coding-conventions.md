# Coding Conventions — TypeScript / NestJS (auth, user, order, tenant, billing)

> **Scope**: These conventions apply to the **5 TypeScript/NestJS services** — `auth-service`,
> `user-service`, `order-service`, `tenant-service`, `billing-service`. The other 8 services are
> Go and follow `coding-conventions-go.md`. See ADR-002 / ADR-008 / ADR-011 for the language
> policy rationale.
>
> **CQRS/ES/Saga scope**: `order-service` (CQRS + Event Sourcing + Saga), `tenant-service` (Saga),
> `billing-service` (CQRS) use `@nestjs/cqrs` fully. **`auth-service` and `user-service` are plain
> CRUD hexagonal** — no event store, no saga; `@nestjs/cqrs` optional for command/query split only.

Style and craft rules for order-service. These complement `architecture.md` (where code lives) by
defining how the code itself is written. When in doubt, match the surrounding code.

---

## 1. TypeScript

- **`strict: true` always.** `strictNullChecks`, `noImplicitAny`, `noUncheckedIndexedAccess` on.
  Inherit from the root `tsconfig.base.json`; services only override `paths`/`outDir`.
- **No `any`.** Model the type. Use `unknown` at trust boundaries and narrow it. `@ts-ignore` /
  `@ts-expect-error` require a one-line comment explaining why it's unavoidable.
- **Prefer immutability**: `readonly` fields, `as const`, return new objects over mutating inputs.
  Value Objects are always immutable.
- **No primitive obsession.** Wrap meaningful primitives in Value Objects (`Money`, `Email`,
  `OrderId`) rather than passing bare `string`/`number` around the domain.
- **Discriminated unions over enums of strings** for state machines; exhaustive `switch` with a
  `never` default so adding a case is a compile error.
- Use `async/await`, never raw `.then()` chains. Never leave a floating promise — `await` it or
  explicitly `void` it with a comment.
- Public functions get explicit return types. Let inference handle locals.

## 2. NestJS

- **One module per bounded responsibility.** The service module wires ports to adapters — this is
  where `provide: ORDER_REPOSITORY, useClass: PostgresOrderRepository` lives.
- **Inject ports by token, depend on the interface.** Define an injection token + interface in the
  domain/application layer; bind the concrete adapter in the module. Handlers never `new` an
  adapter or import a concrete infrastructure class.
- **Controllers are thin.** A REST/gRPC controller validates input, calls one use case
  (command/query handler), and maps the result to a response DTO. No business logic in controllers.
- **Validation at the edge** with `class-validator` + a global `ValidationPipe`
  (`whitelist: true, forbidNonWhitelisted: true`). Transport DTOs live in `interface/`, are
  validated, then mapped to domain inputs.
- Use NestJS lifecycle hooks for resource setup/teardown; ensure **graceful shutdown**
  (`enableShutdownHooks`) so Kafka consumers and DB pools close cleanly.

## 3. Naming & files

- **Files**: `kebab-case` with a role suffix — `order.aggregate.ts`, `money.vo.ts`,
  `order.repository.ts`, `order-created.event.ts`, `order.controller.ts`.
- **Application entry points**:
  - CQRS services (order/tenant/billing): `create-order.handler.ts` → `CreateOrderHandler`
    (`@CommandHandler`), input `CreateOrderCommand`.
  - Plain CRUD services (**auth, user**): `register-account.use-case.ts` → `RegisterAccountUseCase`
    with `execute(input)`, input/output in `register-account.io.ts` as `RegisterAccountInput` /
    `RegisterAccountResult`. **Do not** use `*.handler.ts` / `*Command` here — that vocabulary is
    reserved for CQRS (see `docs/knowledge/03-cqrs/`).
- **Classes/types**: `PascalCase`. **Variables/functions**: `camelCase`. **Constants & injection
  tokens**: `UPPER_SNAKE_CASE`.
- **Domain events**: past tense (`OrderCreated`). **CQRS commands**: imperative (`CreateOrder`).
  **Queries**: `Get*` / `List*`.
- **Booleans** read as predicates: `isPaid`, `hasStock`, `canCancel`.
- Name after the **ubiquitous language** of the service's bounded context, not generic CRUD terms.

## 4. Errors

- **Typed domain errors** extending a shared base (`DomainError` in `backend/libs/common`). Throw
  `OrderAlreadyPaidError`, not `new Error('bad')`.
- **Map errors at the edge**: an exception filter in `interface/` translates domain errors to the
  right HTTP status / gRPC code. The domain never imports HTTP concepts.
- **Never swallow errors.** No empty `catch`. If you catch, you handle, rethrow, or log-with-context
  and rethrow.
- **Fail fast on bad config** at startup (validate env with a schema) rather than crashing mid-request.
- Validate inputs and **guard invariants inside the aggregate** — an aggregate should be impossible
  to construct in an invalid state.

## 4b. Identifiers & time (ADR-013)

- **UUID v7, never v4.** Every id goes through the service's single factory — `uuidV7()` in
  `src/shared/utils/uuid.ts`, wrapping `v7` from `uuid`. **No `randomUUID()` anywhere**, not even for a
  request id: `node:crypto` only does v4, and `randomUUID({ version: 7 })` silently returns a v4
  instead of failing. v7 leads with a millisecond timestamp, so ids sort by creation time and
  index inserts stay at the right edge of the B-tree — it matters for every `tenant_id`-prefixed
  index in the pooled schema (ADR-007).
  - Pin `uuid@11` — 12 and later are **ESM-only** and will not load under the CJS Jest/Nest runtime.
  - **Mint narrowly, accept widely.** `isUuid()` keeps accepting version nibbles `1–8`: a
    `tenant_id` arrives as request input and may be any valid UUID. Reject only nil, max, and
    malformed values.
  - Aggregates generate their own id; Postgres never does. No `DEFAULT gen_random_uuid()` on a
    primary key, and test fixtures use `uuidV7()` so they exercise the production format.
- **Native `Date` is the one instant type, at every layer.** `Clock.now(): Date`; aggregates and
  entities hold `Date`; the persistence mapper converts nothing, because a `timestamptz` column is
  a `Date` on both sides. A second time type would mean a conversion at every boundary (mapper,
  response DTO, event payload, gRPC) — that layer *is* the debt, and it fails silently.
- **Every date calculation and comparison goes through `date-fns`.** `Date` has no arithmetic and
  no equality of its own, and that gap is exactly what produced `getTime() + n * 60_000`:

  | Never | Always |
  | --- | --- |
  | `new Date(now.getTime() + ttl * 60_000)` | `addMinutes(now, ttl)` |
  | `a.getTime() === b.getTime()` — or worse, `a === b` (reference equality, silently wrong) | `isEqual(a, b)` |
  | `a.getTime() < b.getTime()` | `isBefore(a, b)` |
  | `(b.getTime() - a.getTime()) / 60_000` | `differenceInMinutes(b, a)` |

  The unit belongs in the function name, not in a multiplication you have to read twice. ESLint
  (`no-restricted-syntax` over `src/domain/**` and `src/application/**`) makes `.getTime()`,
  `Date.now()` and bare `new Date()` build errors, so the millisecond path cannot reopen.
  - **`Date` is mutable** (Luxon's `DateTime` was not), so an aggregate stores and returns
    **copies** — `copyInstant()` in `domain/model/utils/instant.ts`, never the field itself.
    That one helper is the whole price of not introducing a second type.
  - **Store UTC, always** (`timestamptz`). A `Date` is an instant with no zone of its own; a
    tenant's `branding.timezone` interprets or renders it (`startOfDay` on a `TZDate`) and never
    decides how it is persisted. Add `@date-fns/tz` when the first tenant-timezone feature needs
    it — `TZDate` subclasses `Date`, so it still crosses every boundary unchanged.
  - `Clock` stays a port. The library is pure; the wall clock is I/O. Unit tests inject a fixed
    instant (`test/helpers/time.ts` → `at(iso)` / `fixedClock(iso)`, parsed with `parseISO` so the
    test does not depend on the machine's timezone).

## 5. Logging & observability

- **`pino` via `nestjs-pino`** is the logger for every NestJS service. JSON to stdout always;
  `pino-pretty` (colour, single line) only when `NODE_ENV=development`. Level names not numbers,
  ISO timestamps, `message` as the text key, `{ service, env }` base fields.
- **Inject the `LOGGER` port, never `new Logger('Name')`.** It is bound to a transient `AppLogger`
  that reads the injecting class's name from `INQUIRER` — the `context` field is set automatically,
  so no file hard-codes its own name. `main.ts` (pre-DI) is the one exception: `app.get(Logger)`
  from `nestjs-pino` with an explicit `'bootstrap'` context.
- **Message first, structured fields second** — `logger.info('account registered', { accountId })`,
  never string interpolation. `reqId` is attached automatically inside a request (it is the
  inbound `X-Request-Id` / Kong correlation id, and equals the response envelope's `requestId`).
- **One line per HTTP request** is emitted by `pino-http` (method, url, status, duration); health
  probes are excluded. The exception filter adds the error detail for 5xx only — 4xx is already
  covered by that request line.
- Level: `error` (needs attention), `warn` (recoverable), `info` (business milestones), `debug`
  (dev only). `LOG_LEVEL` env overrides; default `debug` in dev, `info` otherwise.
- **Never log secrets or PII** (passwords, tokens, OTP codes, full card numbers, emails where
  avoidable). The pino `redact` list censors known-sensitive header and field names at the sink;
  do not rely on it as the only guard — don't put the value in the log in the first place.
- **Instrument with OpenTelemetry** (see `docs/20-architecture/02-tech-stack.md`): initialize the OTel SDK once in `main.ts`; propagate
  context across gRPC/Kafka so traces span services. Don't hand-roll tracing.

## 6. Testing

- **Test pyramid**: many fast unit tests, fewer integration tests, few e2e.
- **Unit tests** cover `domain/` and `application/` with **zero I/O** — no DB, no network, no clock.
  Inject fakes/stubs through ports. These must be fast and deterministic.
- **Integration tests** cover adapters against **real dependencies via Testcontainers** (real
  Postgres/Redis/Kafka), not mocks — that's the point of an integration test.
- **Name tests by behavior**: `it('rejects cancellation once the order has shipped')`, not
  `it('test cancel')`. Follow Arrange-Act-Assert.
- Every bug fix starts with a failing test that reproduces it.
- A change is not done until `lint`, `typecheck`, `test`, and `build` pass.

## 7. Data, contracts & migrations

- **Migrations are forward-only.** Never edit an applied migration — add a new one. Review before
  running; never auto-run a destructive migration against a shared environment.
- ORM entities live in `infrastructure/persistence/entity` and are **mapped** to domain models —
  the domain model is never an ORM entity.
- **`.proto` and event schemas are reviewed contracts.** Run Buf lint + breaking-change check.
  A schema change updates all consumers in the same change set.

## 8. Dependencies

- **Add a dependency deliberately.** Prefer the standard library and what's already in the repo.
  A new runtime dependency in a service is a small architectural decision — justify it; a new
  datastore/broker/framework needs an ADR.
- Pin versions via the pnpm lockfile. Root `package.json` holds only shared dev tooling; service
  deps live in the service's `package.json`.
- Run `pnpm` from the workspace root; scope work with `pnpm --filter <service>`.

## 9. Commits (only when the user asks — see CONSTITUTION Article I)

- **Conventional Commits**: `feat(order): add cancellation saga compensation`,
  `fix(auth): reject expired refresh tokens`, `docs(adr): add ADR-013 for ...`.
- Scope = the service or lib touched. One logical change per commit.
- Subject in imperative mood, ≤ 72 chars; body explains *why* when non-obvious.
- Never commit secrets, generated code, or `node_modules`. Never commit unless explicitly asked.

---

## Definition of Done

A change is complete only when **all** of these hold:

- [ ] Behaves as the relevant `docs/40-services/` spec and ADRs describe
- [ ] Respects the dependency rule (`domain` framework-free) and context boundaries
- [ ] No secrets in the repo; config via validated env; `.env.example` updated if vars changed
- [ ] Tests added/updated; unit tests have no I/O; integration tests use real deps
- [ ] `lint`, `typecheck`, `test`, `build` (+ Buf checks if protos changed) all pass
- [ ] Structured logs, no leftover `console.log`, no commented-out code, no `any` escape hatches
- [ ] Outcomes reported honestly (failures and skipped steps stated plainly)
