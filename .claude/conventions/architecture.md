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
- `application` depends on **`domain` only**. It defines use cases and the **ports** (interfaces)
  it needs from the outside world.
- `infrastructure` and `interface` depend **inward** (on `application` and `domain`). They are the
  only layers allowed to import frameworks and talk to I/O.
- **Dependencies cross boundaries through interfaces (ports), never concrete classes.** In Go,
  wiring happens in `main.go` (manual constructor injection). In NestJS (order-service), wiring
  happens in the module file via the DI container.

If you ever feel the urge to import `pgx` or `go-redis` inside `domain/`, stop — that's the rule
breaking. Map at the boundary instead.

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

### TypeScript/NestJS services (auth, user, order, tenant, billing)

> auth-service and user-service omit `application/saga/` (no orchestration) and do not use
> Event Sourcing — plain CRUD hexagonal (ADR-011). order/tenant/billing use the full layout.

```text
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
├── infrastructure/              # DRIVEN ADAPTERS
│   ├── persistence/             # TypeORM entities, mappers, repositories, migrations
│   ├── messaging/               # Kafka producers/consumers, Outbox relay
│   ├── grpc/                    # gRPC clients (outbound)
│   ├── cache/                   # Redis adapters
│   └── config/                  # zod/joi env schema
│
├── interface/                   # DRIVING ADAPTERS
│   ├── rest/                    # NestJS controllers + class-validator DTOs
│   ├── grpc/                    # gRPC service handlers (inbound)
│   └── event/                   # Kafka consumers as inbound adapters
│
├── order.module.ts              # NestJS wiring: bind ports → adapters via DI
└── main.ts                      # bootstrap, OTel init, graceful shutdown
```

### What goes where — quick test

| If the code… | It belongs in… |
| --- | --- |
| enforces a business invariant ("an order can't be paid twice") | `domain/model` |
| describes an interface to the outside ("I need to load an Order") | `domain/port` |
| coordinates a use case ("create order: validate, save, emit event") | `application/command` |
| talks SQL, Kafka, Redis, gRPC, or HTTP | `infrastructure` |
| parses an HTTP/gRPC/Kafka request and calls a use case | `interface` |
| reads `os.Getenv` / `process.env` | `infrastructure/config` (nowhere else) |

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
