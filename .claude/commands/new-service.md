---
description: Scaffold a new microservice in the standard Hexagonal + DDD layout
argument-hint: <service-name> (e.g. wishlist) and its bounded context
---

Scaffold a new service named `$ARGUMENTS-service` under `services/`, following the project's
architecture exactly. Do not improvise the structure.

## Before scaffolding

1. Read @.claude/conventions/architecture.md — the folder layout and dependency rule are
   authoritative.
2. Read @.claude/conventions/coding-conventions.md for naming and file-suffix rules.
3. Confirm the service has a spec at `docs/40-services/$ARGUMENTS-service.md` and a bounded context in
   `docs/30-domain/01-bounded-contexts.md`. If either is missing, STOP and ask the user whether to write
   the doc/ADR first (per CONSTITUTION Article IV — docs before code).
4. Check `docs/20-architecture/02-tech-stack.md` and existing services for the current build tooling
   (pnpm workspace, tsconfig.base.json). Match whatever the first implemented service established;
   if none exists yet, create the minimal `package.json` + `tsconfig.json` that extends the root
   config, and note that you did so.

## Create this structure

```
services/$ARGUMENTS-service/
├── src/
│   ├── domain/
│   │   ├── model/            # aggregates, entities, value objects
│   │   ├── event/            # domain events (past tense)
│   │   ├── service/          # domain services
│   │   ├── port/             # outbound port interfaces (repositories, gateways)
│   │   └── error/            # typed domain errors
│   ├── application/
│   │   ├── command/          # CQRS write handlers
│   │   ├── query/            # CQRS read handlers
│   │   └── dto/
│   ├── infrastructure/
│   │   ├── persistence/{entity,mapper,repository,migration}/
│   │   ├── messaging/        # Kafka producers/consumers, outbox relay
│   │   ├── grpc/             # outbound gRPC clients
│   │   ├── cache/            # Redis adapters
│   │   └── config/           # env loading + validation schema
│   ├── interface/
│   │   ├── rest/             # controllers + transport DTOs + validation
│   │   ├── grpc/             # inbound gRPC handlers
│   │   └── event/            # inbound Kafka consumers
│   ├── $ARGUMENTS.module.ts  # bind ports -> adapters here
│   └── main.ts               # bootstrap, OTel init, graceful shutdown
├── test/{unit,integration,e2e}/
├── .env.example              # every env var with placeholder values + comments
├── package.json
├── tsconfig.json
└── README.md                 # link to docs/40-services/$ARGUMENTS-service.md
```

## Rules while scaffolding

- Add only the folders the service actually needs (e.g. skip `grpc/` if the service has no internal
  callers per its doc) — don't create empty ceremony, but keep the layer names exact.
- Apply the patterns the service doc specifies (CQRS / Event Sourcing / Saga / Outbox) and ONLY
  those. Don't add Event Sourcing to a service that doesn't call for it.
- `.env.example` must contain placeholders only — never real values (CONSTITUTION Article II).
- Do NOT add a new runtime dependency, datastore, or framework without an ADR.
- After scaffolding, run lint/typecheck/build if tooling exists, and report what you created.
