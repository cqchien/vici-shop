# user-service — Implementation Guide (TypeScript / NestJS)

> You are building this. I am here to show you **how to think**, not to think for you.
> Work through each phase yourself. Come back here when you get stuck.
>
> Stack: **TypeScript / NestJS** (ADR-011). Plain CRUD hexagonal — **no CQRS/ES/Saga**.

---

## How to use this guide

Each phase has: **What to do** → **What to look for** → **How you'll know you're done**.
Never move to the next phase until the current exit condition is met.

---

## Phase 0 — Read the docs (don't touch a file yet)

Read in order. For each, write down your answers — extract, don't skim.

### 1. `.claude/conventions/architecture.md`

- What are the four layers? What does each own?
- What is the "dependency rule"? Draw it as an arrow diagram.
- Where do DB queries go? Where do NestJS controllers go?
- Why can't `src/domain/` import `@nestjs/*` or an ORM?
- What is a *port*? What is an *adapter*? One example of each.
- Read the **"TypeScript/NestJS services"** section — note user-service **omits
  `application/saga/`** and does not use Event Sourcing.

> Litmus test: *"To swap PostgreSQL for another store tomorrow, which files change?"*
> If the answer is "only `src/infrastructure/`", you understood it.

### 2. `.claude/conventions/coding-conventions.md`

- `strict: true`, no `any`. Why `unknown` at trust boundaries?
- Value Object rules: immutable, constructor validates, no primitive obsession.
- Discriminated unions over string enums for state machines (tier).
- Typed domain errors extending a shared base — never `throw new Error('bad')`.
- Errors mapped to HTTP/gRPC at the **edge** (exception filter in `interface/`), never in domain.
- What does a behaviour-named test look like (`it('rejects ...')`)?

### 3. `docs/40-services/user-service.md`  — **this is your contract**

Extract:

**REST table** — for each endpoint: read or write? which role? (This is just a mental split for
naming — user-service has no CQRS command/query buses, one `use-case/` folder holds both.)
```
/v1/me                        GET   customer   read
/v1/me                        PATCH customer   write
/v1/me/addresses              GET/POST/PATCH/DELETE
/v1/me/addresses/:id/default  POST
/v1/me/points                 GET
/v1/admin/customers ...       admin/staff
/v1/admin/regions             public
```

**gRPC** — `GetTier`, `GetPointsBalance`, `ReservePoints` / `CommitPointsSpend` /
`ReleasePoints`, `EarnPoints`. Who calls each? Which are read-only, which have side-effects?

**DB schema** — `customers`, `addresses`, `point_entries`, `regions`. PKs? FKs? Which indexes
and why? Which columns carry `tenant_id`?

**Kafka** — consumes `auth.account_registered`, `order.completed`, `order.cancelled/returned`.
What does each consumer do? What is the idempotency key for each?

**Core business** — §4: point earn formula, tier recalc (promote now / demote next cycle),
point redemption reservation (like stock reservation), FIFO point expiry, one-default-address
invariant.

### 4. `docs/30-domain/01-bounded-contexts.md` + `04-data-models.md`

- Which context is user-service? What is its ubiquitous language
  (`Customer`, `Address`, `PointLedger`, `Tier`)? Those exact words become your type names.
- "Outside this context a customer is just a UUID + tenant_id" — what does that mean for the
  events you emit and the data you denormalize?

### 5. Multi-tenancy — `docs/20-architecture/adrs/ADR-007` + `ADR-009` + `docs/knowledge/10-multi-tenancy-rls/`

- Every business table has `tenant_id NOT NULL`; Postgres RLS; app role has **no `BYPASSRLS`**.
- A repository opens each transaction with `SET LOCAL app.tenant_id = $1`, read from a
  request-scoped provider (populated from the `X-Tenant-Id` header). The **domain never sees
  `tenant_id` as a parameter** — it's on the aggregate, set once at creation.
- Kafka consumers read the `tenant-id` message header → set the session var before writing.
- **One person buying at two tenants = two `Customer` rows, two point balances.**

### 6. `docs/20-architecture/04-service-contracts-conventions.md`

- REST envelope (`{data, meta}` / `{error: {code, message, field}}`), error `code` is stable
  SCREAMING_SNAKE_CASE.
- gRPC: `vici.customer.v1`; RPC = imperative verb; deadline via context; map domain errors to
  status codes in `interface/grpc/` only.
- Kafka: envelope with `tenantId`; consumer idempotent by `eventId`.

### 7. `backend/libs/proto/user.proto` + `backend/libs/events/schemas/`

Both are **placeholders** right now (backend is scaffold-only). The real message shapes live in
the spec's §2. Part of this task is filling the proto/avsc in from the spec.

---

## Phase 1 — Plan before coding

Answer in writing. No `.ts` files yet.

### 1. Aggregates & value objects

- `customers` and `addresses`: which is the aggregate **root**? Which is an **entity** owned by
  it? (`Address` loads/saves through `Customer` — no `AddressRepository`.)
- `point_entries` is an **append-only ledger** — model it as entities appended to the `Customer`
  aggregate, or as its own small aggregate? Decide and justify.
- Which IDs get a VO? `CustomerId`, `AddressId`, `TenantId`. Why not bare `string`?
  (Cross-tenant ID confusion in a multi-tenant system = data leak.)
- `Tier` — discriminated union or enum? What behaviour hangs off it (multiplier, thresholds)?
- `PointBalance` / `Money` VO — non-negative invariant, integer VND.

### 2. Invariants — write each as one sentence

- "At most one address per customer has `is_default = true`."
- "A point redemption reservation cannot exceed the current balance."
- "Tier promotion takes effect immediately; demotion only at the next 12-month review."
- "`point_entries` is append-only — expiry/spend create new rows, never update/delete."

### 3. Map endpoints → use cases

For each REST endpoint and each RPC, name the use case:
`UpdateProfileUseCase`, `GetProfileUseCase`, `ReservePointsUseCase`, … (one class, `execute()`).

### 4. Ports the domain needs

Write the interface signatures in plain TypeScript first:

```ts
// src/domain/port/customer.repository.ts
export interface CustomerRepository {
  save(c: Customer): Promise<void>;
  findByAccountId(accountId: AccountId): Promise<Customer | null>;
  findById(id: CustomerId): Promise<Customer | null>;
}

export interface PointLedgerPort {
  append(entry: PointEntry): Promise<void>;
  balance(customerId: CustomerId): Promise<number>;
  reserve(customerId: CustomerId, points: number, ref: string): Promise<void>;   // like stock reservation
  commitReservation(ref: string): Promise<void>;
  releaseReservation(ref: string): Promise<void>;
}

export interface RegionCatalogPort {
  isValid(province: string, district: string, ward: string): Promise<boolean>;
}
```

Injection tokens (`CUSTOMER_REPOSITORY`, …) live next to the interface; the concrete adapter is
bound in `user.module.ts`.

### 5. What goes in `package.json`

From the conventions: `@nestjs/*` core, `@nestjs/microservices` (gRPC), `class-validator` +
`class-transformer`, a Postgres client (TypeORM with entities mapped **to** domain models — the
domain model is never an ORM entity), `zod` for env, `kafkajs`.

> **No `@nestjs/cqrs`.** user-service (like auth-service) is plain CRUD hexagonal (ADR-011).
> Use cases live in `src/application/use-case/<verb-noun>.use-case.ts` as
> `class <VerbNoun>UseCase { execute(input) }` — no command bus, no `*.handler.ts`, no `*Command`
> types. See `backend/services/auth-service/` for the worked reference (folder layout, RLS
> `tenant-transaction.ts`, `ApiConfigService`, exception filter, response interceptor, jest setup).

---

## Phase 2 — TDD Red: tests before implementation

> Rule: if a source file has no matching `.spec.ts`, you wrote it in the wrong order.

### Step 1 — Domain model specs (`src/domain/model/*.spec.ts`)

Before `customer.ts`, describe the behaviour:

```ts
describe('Customer', () => {
  it('rejects an empty accountId', () => {
    expect(() => Customer.create(AccountId(''), TenantId(validUuid))).toThrow(InvalidAccountIdError);
  });

  it('setDefaultAddress clears the previous default', () => {
    const c = seedCustomerWithTwoAddresses();  // addr A default, addr B not
    c.setDefaultAddress(addrBId);
    expect(c.addresses.filter(a => a.isDefault)).toHaveLength(1);
    expect(c.defaultAddress().id).toEqual(addrBId);
  });

  it('redeemPoints cannot exceed balance', () => {
    const c = seedCustomer({ points: 100 });
    expect(() => c.reservePoints(150, 'checkout-1')).toThrow(InsufficientPointsError);
  });
});
```

Then `Tier` recalc: `promotes immediately when 12m spend crosses a threshold`,
`demotion is deferred to tierReviewAt`.

These won't compile — that's the Red phase. Run `pnpm test src/domain` and write the compile
errors down: that's your implementation TODO list.

### Step 2 — Application use-case specs (fakes, zero I/O)

`src/application/use-case/update-profile.use-case.spec.ts` — a fake repo:

```ts
class FakeCustomerRepo implements CustomerRepository {
  private byId = new Map<string, Customer>();
  async save(c: Customer) { this.byId.set(c.id.value, c); }
  async findById(id: CustomerId) { return this.byId.get(id.value) ?? null; }
  async findByAccountId(a: AccountId) { /* ... */ }
}

it('UpdateProfileUseCase persists the change', async () => { /* seed → execute → assert fake */ });
it('UpdateProfileUseCase throws CustomerNotFound when absent', async () => { /* empty fake */ });
```

Same pattern for `AddAddressUseCase`, `DeleteAddressUseCase`, `SetDefaultAddressUseCase`,
`ReservePointsUseCase`, `AdjustPointsUseCase`, `GetProfileUseCase`, `ListAddressesUseCase`,
`GetPointsHistoryUseCase`.

### Step 3 — Persistence integration specs (`test/integration/`)

Testcontainers (Node) — a real Postgres 16:

```ts
let container: StartedPostgreSqlContainer;
let repo: PgCustomerRepository;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  const pool = new Pool({ connectionString: container.getConnectionUri() });
  await runMigrations(pool);              // real migrations
  repo = new PgCustomerRepository(pool);
});
afterAll(() => container.stop());

it('save then findById round-trips every field', async () => { /* ... */ });
it('findById of an unknown id returns null', async () => { /* ... */ });

it('cross-tenant read returns empty (RLS, NFR-13)', async () => {
  await withTenant(tenantA, () => repo.save(customerA));
  const got = await withTenant(tenantB, () => repo.findByAccountId(customerA.accountId));
  expect(got).toBeNull();                 // RLS blocks it
});

it('missing app.tenant_id → 0 rows (fail-closed)', async () => { /* no SET LOCAL → empty */ });
```

The last two are **mandatory** (ADR-007 / NFR-13). Also test the `is_default` invariant at the
SQL level (partial unique index `WHERE is_default`).

### Step 4 — Controller specs (`src/interface/rest/*.spec.ts`)

Nest testing module, no real DB — inject fake use cases. Assert: 200/201/204 happy paths, 401
when the tenant/identity context is missing, 404 mapped from `CustomerNotFoundError`, 422 from
`InsufficientPointsError`. The exception filter does the mapping — test it once, separately.

### Step 5 — gRPC inbound-adapter specs (`src/interface/grpc/*.spec.ts`)

```ts
it('GetTier returns the customer tier', async () => { /* fake query → assert response */ });
it('GetTier maps CustomerNotFound → status NOT_FOUND', async () => { /* ... */ });
it('ReservePoints without x-tenant-id metadata → INVALID_ARGUMENT', async () => { /* ADR-009 */ });
```

---

## Phase 3 — TDD Green: implement to pass, layer by layer

Write in this order; run each layer's tests before the next.

```
1. src/domain/error/*.ts                  ← typed errors extending DomainError (libs/common)
2. src/domain/model/value-objects.ts      ← CustomerId, AddressId, TenantId, Money, Tier
3. src/domain/model/customer.ts            ← aggregate root: create(), setDefaultAddress(),
                                             reservePoints(), recalculateTier(), apply-style mutators
4. src/domain/model/address.ts             ← entity
5. src/domain/port/*.ts                    ← interfaces + injection tokens ONLY
6. src/application/dto/*.io.ts              ← plain <verb-noun>Input / <verb-noun>Result types
7. src/application/use-case/*.use-case.ts   ← one file per use case; class …UseCase { execute() }
                                             (no command bus, no *.handler.ts — ADR-011)
9. src/infrastructure/config/env.ts         ← zod schema, throws on missing var at startup
10. src/infrastructure/persistence/         ← migrations (SQL) + PgCustomerRepository + mapper
11. src/infrastructure/persistence/tenant-context.ts  ← request-scoped provider + SET LOCAL helper
12. src/infrastructure/messaging/            ← Kafka consumers (auth.account_registered, order.*)
13. src/infrastructure/grpc/                 ← outbound gRPC clients (auth, order) if needed
14. src/interface/rest/                      ← controllers + class-validator DTOs
15. src/interface/grpc/                      ← @GrpcMethod handlers (inbound)
16. src/interface/filter/domain-exception.filter.ts  ← domain error → HTTP/gRPC status
17. src/user.module.ts                       ← wire ports → adapters via DI
18. src/main.ts                              ← bootstrap: REST + gRPC transport, OTel, shutdown hooks
```

### Things to get right

**Domain model — `src/domain/model/customer.ts`**

`readonly` fields, private constructor, static `create()` validates, mutations go through
methods that enforce invariants — never a public setter.

```ts
export class Customer {
  private constructor(
    private readonly _id: CustomerId,
    private readonly _tenantId: TenantId,
    private readonly _accountId: AccountId,
    private _name: string,
    private _tier: Tier,
    private _points: number,
    private _addresses: Address[],
  ) {}

  static create(accountId: AccountId, tenantId: TenantId): Customer {
    if (!accountId.value) throw new InvalidAccountIdError();
    return new Customer(CustomerId.generate(), tenantId, accountId, '', Tier.Standard, 0, []);
  }

  setDefaultAddress(id: AddressId): void {
    const target = this._addresses.find(a => a.id.equals(id));
    if (!target) throw new AddressNotFoundError(id);
    this._addresses = this._addresses.map(a => a.withDefault(a.id.equals(id)));
  }

  reservePoints(points: number, ref: string): PointReservation {
    if (points > this._points) throw new InsufficientPointsError();
    // returns a value describing the reservation; infra persists it
  }

  get tenantId(): TenantId { return this._tenantId; }   // read accessors only
}
```

No `@nestjs/*`, no `pg`, no `TypeORM` in this file — ever.

**Repository — `src/infrastructure/persistence/pg-customer.repository.ts`**

```ts
@Injectable()
export class PgCustomerRepository implements CustomerRepository {
  constructor(private readonly pool: Pool, private readonly tenant: TenantContext) {}

  async findByAccountId(accountId: AccountId): Promise<Customer | null> {
    return this.pool.connect().then(async (client) => {
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL app.tenant_id = $1', [this.tenant.id]);   // RLS
        const { rows } = await client.query(
          `SELECT c.*, coalesce(json_agg(a.*) FILTER (WHERE a.id IS NOT NULL), '[]') AS addresses
             FROM customers c LEFT JOIN addresses a ON a.customer_id = c.id
            WHERE c.account_id = $1 GROUP BY c.id`, [accountId.value]);
        await client.query('COMMIT');
        return rows[0] ? toCustomer(rows[0]) : null;    // mapper row → domain model
      } finally { client.release(); }
    });
  }
}
```

Note: `SET LOCAL` (not `SET`) — the pool reuses connections; a leaked `app.tenant_id` is a
cross-tenant leak. The repo does **not** add `WHERE tenant_id = ...` — RLS does that.

**Controller — `src/interface/rest/me.controller.ts`**

Thin: validate DTO (class-validator), call one handler, return. Identity + tenant come from a
request-scoped provider populated by a guard/middleware from the Kong-injected headers
(`X-Tenant-Id`, and the account id from the verified JWT). Error mapping is the exception
filter's job, not the controller's.

```ts
@Controller('v1/me')
@UseGuards(JwtContextGuard)
export class MeController {
  constructor(private readonly getProfile: GetProfileUseCase,
              private readonly updateProfile: UpdateProfileUseCase) {}

  @Get()
  get(@CurrentAccount() acc: AccountId) {
    return this.getProfile.execute({ accountId: acc });
  }

  @Patch()
  update(@CurrentAccount() acc: AccountId, @Body() dto: UpdateProfileDto) {
    return this.updateProfile.execute({ accountId: acc, ...dto });
  }
}
```

**Kafka consumer — `src/infrastructure/messaging/account-registered.consumer.ts`**

Read the `tenant-id` header → set tenant context → create the `Customer` → dedupe by `eventId`
(insert into `processed_events` in the same transaction; `ON CONFLICT DO NOTHING`). The unique
constraint `customers (tenant_id, account_id)` is your second safety net.

**`src/main.ts`** — bootstrap both transports:

```ts
async function bootstrap() {
  initOtel();                                   // ADOT / OTel SDK, once
  const app = await NestFactory.create(UserModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new DomainExceptionFilter());
  app.connectMicroservice<GrpcOptions>({
    transport: Transport.GRPC,
    options: { package: 'vici.customer.v1', protoPath: 'user.proto', url: `0.0.0.0:${env.GRPC_PORT}` },
  });
  app.enableShutdownHooks();                    // Kafka consumers + pool close cleanly
  await app.startAllMicroservices();
  await app.listen(env.PORT);
}
```

---

## Phase 4 — Quality gates

Run each; fix before the next.

```sh
pnpm --filter user-service lint
pnpm --filter user-service typecheck        # tsc --noEmit, strict
pnpm --filter user-service test              # unit — zero I/O
pnpm --filter user-service test:integration  # Testcontainers — needs Docker
pnpm --filter user-service build
```

If a gate fails:
- Did a `src/domain/` file import `@nestjs/*` / `pg` / `TypeORM`? → move the logic outward.
- `any` slipped in to dodge a type error? → model the type.
- A domain method threw a raw `Error`? → typed domain error + map at the edge.
- Integration test leaks state between tests? → truncate in `afterEach`, or wrap in a rolled-back
  transaction (but RLS + `SET LOCAL` usually means truncate).

---

## Phase 5 — Contracts

- Fill in `backend/libs/proto/user.proto` from spec §2 (`package vici.customer.v1`, the 4 RPCs,
  request/response messages — every request that isn't cross-tenant carries `string tenant_id`).
  Run `buf lint`.
- Fill in `backend/libs/events/schemas/*.avsc` for the topics user-service **emits**
  (`customer.tier_changed`, `customer.points_earned`, `customer.points_adjusted`) — envelope
  with `tenantId`. Add them to `backend/libs/events/registry.md`.
- Add the `user-service` route to `backend/gateway/kong/kong.yml` (`/v1/me`, `/v1/admin/customers`,
  `/v1/admin/regions`) — JWT plugin on all but `/v1/admin/regions` (public). `deck sync` command —
  write it, don't run it.

---

## Phase 6 — gRPC smoke reference

Document each RPC with a `grpcurl` example (describe + one call) and the error mapping
(`CustomerNotFoundError → codes.NotFound`). Keep it short — it's a reference, not a test suite;
the real tests are in Phase 2 Step 5.

---

## Common mistakes to avoid

| Mistake | Why it hurts | Fix |
|---|---|---|
| `@Entity()` / `@Column()` on the domain model | Domain now depends on the ORM | ORM entity in `infrastructure/persistence/entity`, mapped to a plain domain class |
| `SET` instead of `SET LOCAL app.tenant_id` | Pooled connection leaks the tenant → cross-tenant read | Always `SET LOCAL`, inside a transaction |
| Repo adds `WHERE tenant_id = $ctx` "to be safe" | False confidence; two mechanisms drift | One mechanism: RLS. Repo only `SET LOCAL` |
| Reading `tenant_id` from the request body | Client can forge it | Only from `X-Tenant-Id` (Kong sets it from the JWT `tid` / Host) |
| `any` to pass `tsc` | Bypasses the whole point of strict | Model the type; `unknown` + narrow at boundaries |
| Two default addresses | Invariant violation | Enforce in `Customer.setDefaultAddress`, and a partial unique index as backstop |
| Consumer not idempotent | Redelivery double-counts points | Dedupe by `eventId` before applying |
| `throw new Error('not found')` | Can't map to a status code cleanly | Typed `CustomerNotFoundError extends DomainError` |
| Business logic in the controller | Can't test through the use case; duplicated across REST/gRPC | Controller: validate → one handler → return |

---

## Exit criteria (all true before "done")

- [ ] `pnpm lint`, `typecheck`, `test`, `test:integration`, `build` — all clean
- [ ] No `@nestjs/*` / ORM / `pg` import anywhere under `src/domain/`
- [ ] No `any`; `strict` on; no `@ts-ignore` without a one-line reason
- [ ] Every domain invariant has a unit test; every adapter has an integration test
- [ ] **Cross-tenant read returns empty** + **missing `app.tenant_id` → 0 rows** integration tests pass (NFR-13)
- [ ] Concurrency test: two parallel `reservePoints` on the same balance don't over-reserve
- [ ] Kafka consumers idempotent by `eventId`; verified with a redelivery test
- [ ] Migrations match `docs/40-services/user-service.md` §3 exactly; `tenant_id` on every business table + RLS policy
- [ ] `user.proto` / `*.avsc` / `registry.md` / `kong.yml` entries filled from the spec
- [ ] No secrets; `.env.example` placeholders only; env validated at startup
- [ ] Domain errors mapped to HTTP/gRPC status in the exception filter, not in domain/application
