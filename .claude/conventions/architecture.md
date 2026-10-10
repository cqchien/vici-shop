# Architecture Conventions — Hexagonal + DDD

Every Vici Shop service follows **Hexagonal Architecture (Ports & Adapters)** with **Domain-Driven
Design** tactical patterns. This is our practical expression of Clean Architecture: the same
dependency rule applies regardless of language.

**Language context** (ADR-002 / ADR-008 / ADR-011): 8 services are Go (product, inventory, cart,
payment, shipping, promotion, finance, notification); 5 are TypeScript/NestJS (auth, user, order,
tenant, billing). The folder structure and layer rules below apply to both. Language-specific
wiring differences are called out inline; full Go coding conventions are in
`coding-conventions-go.md`, NestJS in `coding-conventions.md`.

> **Why hexagonal?** Dependencies point inward toward the domain. Hexagonal names the seams
> explicitly as *ports* (interfaces the domain owns) and *adapters* (framework/IO code that
> implements or drives them). In Go this wiring is manual (constructor injection); in NestJS it
> uses the DI container. The architecture rule is identical either way.

---

## 1. The Dependency Rule (non-negotiable)

```text
            ┌─────────────────────────────────────────────────────┐
  drives    │                                                     │  drives
 (inbound)  │   interface/        domain          infrastructure/ │ (outbound impl)
            │   adapters    ──►  (the core)  ◄──   adapters        │
            │  REST/gRPC/Kafka   pure logic       Postgres/Redis   │
            │  controllers       no framework     Kafka/gRPC client│
            └─────────────────────────────────────────────────────┘
                         ▲                              ▲
                         └────────── application ───────┘
                              (use cases orchestrate the domain)
```

- `domain` depends on **nothing** — no framework, no ORM, no SDK, no env reads. Pure Go structs
  and interfaces (or pure TypeScript for order-service).
  - **Two named exceptions (ADR-013), TypeScript only**: `date-fns` (every date calculation and
    comparison; the instant itself stays a native `Date`) and `uuid` (`v7` for identity). Both are
    pure — no I/O, no config, no runtime coupling — and neither introduces a type of its own, so
    nothing has to be converted at a boundary. Nothing else joins this list without a new ADR. Go
    needs no exception: `time` and `github.com/google/uuid` cover it.
- `application` depends on **`domain` only**. It defines use cases and the **ports** (interfaces)
  it needs from the outside world.
- `infrastructure` and `interface` depend **inward** (on `application` and `domain`). They are the
  only layers allowed to import frameworks and talk to I/O.
- **Dependencies cross boundaries through interfaces (ports), never concrete classes.** In Go,
  wiring happens in `main.go` (manual constructor injection). In NestJS (order-service), wiring
  happens in the module file via the DI container.

If you ever feel the urge to import `pgx` or `go-redis` inside `domain/`, stop — that's the rule
breaking. Map at the boundary instead.

The test for a would-be exception is not "is it small?" but **"does it do I/O, read config, or
tie the domain to a runtime?"** `date-fns` fails none of those; a date library that fetched a
timezone database over the network would.

---

## 2. Standard service folder structure

### Go services (8/13 services)

Every `backend/services/<name>-service/` looks like this.

```text
backend/services/<name>-service/
├── cmd/
│   └── server/
│       └── main.go              # bootstrap, OTel init, graceful shutdown, wire adapters
├── internal/
│   ├── domain/                  # THE CORE — pure Go, no imports outside stdlib
│   │   ├── model/               # Aggregates, Entities, Value Objects
│   │   │   ├── order.go         # Order aggregate + methods
│   │   │   ├── line_item.go     # LineItem entity
│   │   │   └── money.go         # Money value object
│   │   ├── event/               # Domain events (past-tense facts, plain structs)
│   │   │   └── order_created.go
│   │   ├── service/             # Domain services (logic spanning aggregates)
│   │   ├── port/                # OUTBOUND ports = interfaces the domain needs
│   │   │   ├── order_repository.go   # interface only
│   │   │   └── payment_gateway.go    # interface only
│   │   └── apperr/              # Typed domain errors (e.g. ErrOrderAlreadyPaid)
│   │
│   ├── application/             # USE CASES — orchestrates the domain
│   │   ├── command/             # Write side: CreateOrder, CancelOrder …
│   │   │   └── create_order.go  # handler func or struct with Execute method
│   │   ├── query/               # Read side: GetOrder, ListOrders …
│   │   └── dto/                 # Application-level input/output structs
│   │
│   ├── infrastructure/          # DRIVEN ADAPTERS — implement domain/application ports
│   │   ├── postgres/            # pgx repositories + migrations
│   │   │   ├── order_repo.go    # implements domain/port.OrderRepository
│   │   │   └── migrations/
│   │   ├── redis/               # go-redis adapters
│   │   ├── kafka/               # segmentio/kafka-go producers + consumers (outbox relay)
│   │   ├── grpc/                # gRPC CLIENTS to other services (outbound)
│   │   └── config/              # env loading via caarlos0/env; fail fast on bad config
│   │
│   └── interface/               # DRIVING ADAPTERS — entry points into the app
│       ├── rest/                # chi router handlers + request/response structs
│       ├── grpc/                # gRPC server handlers (inbound)
│       └── event/               # Kafka consumer handlers as inbound adapters
│
├── go.mod
├── go.sum
└── .env.example
```

Mirror this in `test/` with `unit/`, `integration/`, and `e2e/`.

### TypeScript/NestJS services

Two sub-layouts share everything except the `application/` folder:

| Services | `application/` layout | Why |
| --- | --- | --- |
| **order, tenant, billing** | `command/` + `query/` (+ `saga/` for order & tenant) | CQRS / ES / Saga with `@nestjs/cqrs` (ADR-002/008) |
| **auth, user** | `use-case/` | Plain CRUD hexagonal — no `@nestjs/cqrs`, no command bus, no event store, no saga (ADR-011) |

> **Never name a plain use case `command/` + `*.handler.ts`.** Those names mean "CQRS command
> handler dispatched by a bus" everywhere else in this repo and in `docs/knowledge/03-cqrs/`.
> A plain use case is `application/use-case/<verb-noun>.use-case.ts` exporting a
> `class <VerbNoun>UseCase { execute(input): Promise<result> }` that the controller calls
> directly. Its input/output types live in `application/dto/<verb-noun>.io.ts` as
> `<VerbNoun>Input` / `<VerbNoun>Result` — not `<VerbNoun>Command`.

```text
# CQRS layout — order-service (tenant/billing similar)
services/order-service/src/
├── domain/                      # THE CORE — pure TypeScript, no NestJS imports
│   ├── model/                   # Aggregates, Entities, Value Objects
│   ├── event/                   # Domain events
│   ├── service/                 # Domain services
│   ├── port/                    # OUTBOUND port interfaces
│   └── error/                   # Typed domain errors
│
├── application/                 # USE CASES
│   ├── command/                 # CQRS write side (@nestjs/cqrs CommandHandler)
│   ├── query/                   # CQRS read side (@nestjs/cqrs QueryHandler)
│   ├── saga/                    # Saga process managers (@nestjs/cqrs Saga)
│   └── dto/                     # Application-level DTOs
│
├── infrastructure/              # DRIVEN ADAPTERS — one per bounded-context dependency
│   ├── persistence/             # TypeORM entities, mappers, repositories, migrations
│   ├── messaging/               # Kafka producers/consumers, Outbox relay
│   ├── grpc/                    # gRPC clients (outbound)
│   └── cache/                   # Redis adapters
│
├── interface/                   # DRIVING ADAPTERS
│   ├── rest/                    # NestJS controllers + class-validator DTOs
│   ├── grpc/                    # gRPC service handlers (inbound)
│   └── event/                   # Kafka consumers as inbound adapters
│
├── shared/                      # CROSS-CUTTING — not tied to this context's domain
│   ├── config/                  # zod env schema + typed ApiConfigService (the only env reader)
│   ├── logging/                 # LOGGER port + pino/nestjs-pino adapter + LoggingModule
│   ├── errors/                  # DomainError base and transport-agnostic error types
│   ├── http/                    # response envelope
│   ├── tenant/                  # CLS keys
│   ├── utils/                   # pure helpers (uuid v7 factory — ADR-013)
│   └── index.ts                 # the PURE face of shared/ — see the warning below
│
├── order.module.ts              # NestJS wiring: bind ports → adapters via DI
└── main.ts                      # bootstrap, OTel init, graceful shutdown
```

> **`shared/` is where cross-cutting concerns live, not where "miscellaneous" goes.** Config and
> logging belong to the *service*, not to its bounded context — they are the same in every
> service, and nothing in `domain/` is expressed in terms of them. Two rules keep this from
> eroding the dependency rule:
>
> 1. **`shared/index.ts` must stay importable by `domain/`** — so it may only re-export pure
>    things. The logger is re-exported from `shared/logging/logger.port` (token + interface) and
>    explicitly *not* from `shared/logging` (the barrel, which pulls `@nestjs/*` and pino).
>    `shared/config` is never re-exported at all: it reads `process.env`, so the composition root
>    imports it by path.
> 2. **Lint enforces it.** The `src/domain/**` override in `.eslintrc.cjs` names
>    `**/shared/config`, `**/shared/logging` and the concrete logging adapters alongside
>    `**/infrastructure/*`. Without that, moving framework code into `shared/` silently reopens
>    the door that `**/infrastructure/*` used to close.

```text
# Plain CRUD layout — auth-service, user-service — differs only under application/
├── application/
│   ├── use-case/                # <verb-noun>.use-case.ts — class …UseCase { execute() }, no bus
│   ├── dto/                     # <verb-noun>.io.ts — …Input / …Result
│   └── config/                  # application-facing config port (token + interface)
```

### What goes where — quick test

| If the code… | It belongs in… |
| --- | --- |
| enforces a business invariant ("an order can't be paid twice") | `domain/model` |
| describes an interface to the outside ("I need to load an Order") | `domain/port` |
| coordinates a use case ("create order: validate, save, emit event") | `application/command` (CQRS) · `application/use-case` (plain) |
| talks SQL, Kafka, Redis, gRPC, or HTTP | `infrastructure` |
| parses an HTTP/gRPC/Kafka request and calls a use case | `interface` |
| reads `os.Getenv` / `process.env` | Go: `internal/infrastructure/config` · TS: `src/shared/config` (nowhere else, either way) |
| logs, traces, or meters (the adapter, not the call site) | Go: `infrastructure/observability` · TS: `src/shared/logging` |

---

## 3. DDD tactical patterns

- **Aggregate**: the consistency boundary and transaction unit. External code references an
  aggregate only by its **root** and only by **ID**. One repository per aggregate root.
- **Entity**: has identity and a lifecycle (`LineItem`). Equality by ID.
- **Value Object**: immutable, no identity, equality by value (`Money`, `Address`, `Email`). In Go,
  implement as structs with no exported setters and a constructor that validates. Prefer VOs over
  bare primitives — they carry validation and meaning.
- **Domain Event**: an immutable, past-tense fact (`OrderCreated`). Raised by aggregates; published
  to Kafka by infrastructure via the **Outbox pattern** — never publish inline with the write.
- **Domain Service**: stateless logic that doesn't naturally belong to one aggregate.
- **Repository**: a *port* in `domain/port` (interface), *implemented* in `infrastructure`. The
  interface speaks the domain language (`Save(ctx, order)`, `FindByID(ctx, id)`), not SQL.
- **Ubiquitous Language**: name code after the bounded context's vocabulary in
  `docs/30-domain/01-bounded-contexts.md`. An `Order` in Ordering is not an `Order` in Finance — don't
  share types across contexts.

## 4. CQRS, Event Sourcing, Saga (where the docs specify them)

These are per-service decisions recorded in ADRs and `docs/40-services/`. Apply them only where
specified (order-service per ADR-002), not everywhere.

- **CQRS**: commands mutate aggregates; queries read **projections / read models**, never replay
  aggregates. Keep command and query handlers in separate folders.
- **Event Sourcing**: the event store is the source of truth; current state is derived by replaying
  events. Use optimistic concurrency via the `version` column.
- **Outbox**: write the domain event to an `outbox` table in the **same transaction** as the state
  change; a relay publishes to Kafka and marks it sent. This is the only sanctioned way to publish
  events — it guarantees no event is lost if Kafka is down. Applies to all services.
- **Saga**: model multi-service workflows (checkout: ReserveStock → ChargePayment) as a process
  manager in `application/saga`, with explicit compensation steps. Sagas coordinate via
  events/gRPC, never by reaching into another service's data. order-service uses `@nestjs/cqrs`
  SagaManager; other services coordinate via Kafka event reactions.

## 5. Cross-service rules

- **Public REST** (via Kong) for client-facing endpoints; **gRPC** for internal service-to-service
  calls; **Kafka** for asynchronous domain events. Pick per the service doc.
- A service's gRPC contract lives in `backend/libs/proto/`; its events live in `backend/libs/events/` (TypeScript)
  or `backend/libs/events-go/` (Go). These are the **only** ways another service may depend on it.
- **No shared database** between contexts (ADR-001). Need another context's data? Consume its
  events and keep a local denormalized copy.
- Cross-cutting concerns (auth validation, rate limiting, CORS, request IDs) live in **Kong**
  (ADR-005), not in service code.

## 6. Shared libraries (`backend/libs/`)

- `backend/libs/common/` — TypeScript error types, pagination, health checks, OTel setup. Used by
  the 5 NestJS services (auth, user, order, tenant, billing).
- `backend/libs/proto/` — `.proto` contracts (single source of truth for gRPC), linted with Buf. Buf
  generates both Go stubs (`backend/libs/proto/gen/go/`) and TypeScript stubs (`backend/libs/proto/gen/ts/`).
- `backend/libs/events/` — Kafka event schemas (Avro) + TypeScript typed event registry (5 NestJS services).
- `backend/libs/events-go/` — Go structs matching the Avro schemas; used by all 8 Go services.
- A `lib` may not import from a `service`. Services import from libs, never the reverse.

---

> **The litmus test for any change:** Could you swap PostgreSQL for another store, or REST for
> gRPC, by writing a new adapter and changing only the wiring in `main.go` (Go) or the NestJS
> module (TypeScript) — without touching `domain/` or `application/`? If yes, the architecture
> holds. If no, the dependency rule was broken.
