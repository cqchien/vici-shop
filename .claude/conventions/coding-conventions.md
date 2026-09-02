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

- **Files**: `kebab-case` with a role suffix — `create-order.handler.ts`, `order.aggregate.ts`,
  `money.vo.ts`, `order.repository.ts`, `order-created.event.ts`, `order.controller.ts`.
- **Classes/types**: `PascalCase`. **Variables/functions**: `camelCase`. **Constants & injection
  tokens**: `UPPER_SNAKE_CASE`.
- **Domain events**: past tense (`OrderCreated`). **Commands**: imperative (`CreateOrder`).
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

## 5. Logging & observability

- **Structured JSON logs** only (no `console.log`). Use the shared logger; include the trace/request
  ID on every line. Pick a level deliberately: `error` (needs attention), `warn` (recoverable),
  `info` (business milestones), `debug` (dev only).
- **Never log secrets or PII** (passwords, tokens, full card numbers, emails in plaintext where
  avoidable). Redact at the boundary.
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
