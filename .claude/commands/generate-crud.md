---
description: Generate a full CRUD REST+gRPC API for a Go microservice using TDD — from reading conventions through verified tests, Kong wiring, and Postman collection
argument-hint: <service-name> (e.g. user) — must match a file at docs/40-services/<service>-service.md
---

Generate the complete CRUD implementation for **`$ARGUMENTS-service`** following strict TDD.
Work through every phase in order. Never skip to code before tests exist. Never claim a phase is
done if its quality gate is failing.

---

## PHASE 0 — Read everything before touching a file

Read ALL of the following before writing a single line of code or test.
Do not proceed until each is fully read and understood.

### Conventions & rules (always)
1. `@.claude/CONSTITUTION.md`
2. `@.claude/conventions/architecture.md`
3. `@.claude/conventions/coding-conventions-go.md`

### Service-specific (for this service)
4. `docs/40-services/$ARGUMENTS-service.md` — REST API contract, DB schema, Kafka events consumed/produced, special techniques (read-replica routing, caching, outbox, etc.)
5. `docs/30-domain/01-bounded-contexts.md` — which bounded context this service belongs to; the ubiquitous language that governs all naming
6. `docs/20-architecture/02-tech-stack.md` — canonical library list (`pgx/v5`, `go-chi/chi`, `zap`, `caarlos0/env`, `segmentio/kafka-go`, etc.)

### Contracts (if the service has gRPC)
7. `libs/proto/$ARGUMENTS.proto` — the inbound gRPC contract this service must implement
8. `libs/proto/gen/go/` — generated stubs to import, never re-generate manually

If `docs/40-services/$ARGUMENTS-service.md` does not exist, **STOP** and ask the user to write the
service spec first. This is CONSTITUTION Article IV — docs before code.

---

## PHASE 1 — Understand and plan (write nothing yet)

From the service doc, extract and state explicitly:

**Aggregates & entities**
- List each aggregate root and its entities/value objects (each table is a strong hint).
- Identify invariants to enforce (e.g. "an address cannot be default if none exist").

**Operations** — derive from REST endpoints:
| Endpoint | Command or Query | Handler name |
|---|---|---|
| GET /users/me | Query | `GetProfileQuery` |
| PUT /users/me | Command | `UpdateProfileCommand` |
| ... | ... | ... |

**Kafka events consumed** (from service doc):
| Topic | Handler | Effect |
|---|---|---|
| `user.registered` | `UserRegisteredConsumer` | Create empty UserProfile row |

**gRPC methods to implement** (from proto file):
| RPC | Request | Response |
|---|---|---|
| `GetUserProfile` | `GetUserProfileRequest` | `GetUserProfileResponse` |

**Special techniques noted in the service doc** (read-replica routing, outbox, caching, etc.) —
state how you will implement each before writing code.

Do not proceed until this plan is visible in your response and accurate.

---

## PHASE 2 — TDD Red: write all tests first

**Rule: no implementation file exists yet. Tests will not compile — that is expected and correct.**

Write tests in this order. Use `_test.go` files with build stubs only where needed to satisfy
the compiler enough to run `go test -run=XXX -list .`.

### 2a. Domain unit tests — `internal/domain/`

File: `internal/domain/model/<aggregate>_test.go`

Cover every constructor and every method that enforces an invariant. Table-driven.
Zero I/O — no database, no network, no clock.

```go
// Example shape
func TestUserProfile_New_RejectsEmptyUserID(t *testing.T) { ... }
func TestAddress_SetDefault_UpdatesFlag(t *testing.T) { ... }
func TestAddresses_CannotExceedLimit(t *testing.T) { ... }
```

### 2b. Application handler unit tests — `internal/application/`

Files: `internal/application/command/<handler>_test.go`,
       `internal/application/query/<handler>_test.go`

Inject fakes via port interfaces. Cover the happy path and every error branch.
Zero I/O — no DB, no Kafka, no HTTP.

```go
// Fake repository in the test file or internal/domain/port/fake/
type fakeUserProfileRepo struct { profiles map[UserID]UserProfile }
func (f *fakeUserProfileRepo) Save(ctx, p) error { ... }
```

### 2c. Postgres repository integration tests — `test/integration/`

File: `test/integration/postgres/<repo>_test.go`

Use **Testcontainers-go** to spin up a real Postgres 16 container. Apply migrations in `TestMain`.
Test `Save`, `FindByID`, all repository methods. Roll back or truncate between tests.
No mocking — that is the point.

```go
func TestMain(m *testing.M) {
    ctx := context.Background()
    container, _ := testcontainers.RunContainer(ctx, "postgres:16", ...)
    // run migrations ...
    os.Exit(m.Run())
}
```

### 2d. REST handler HTTP tests — `internal/interface/rest/`

File: `internal/interface/rest/<resource>_handler_test.go`

Use `net/http/httptest`. Inject fake application handlers. Cover:
- Happy path (correct status code + response body shape)
- Missing/invalid fields → 400
- Not found domain error → 404
- Unauthorized (missing userId in context) → 401

### 2e. gRPC handler tests — `internal/interface/grpc/`

File: `internal/interface/grpc/<service>_handler_test.go`

Use the generated proto stubs and an in-process `grpc.Server` (no network). Cover:
- Happy path → correct proto response
- Domain `ErrNotFound` → `codes.NotFound`

---

## PHASE 3 — TDD Green: write implementation to pass the tests

Write each layer in dependency order (innermost first). After each sub-step, run the tests for
that layer and confirm they pass before proceeding.

### 3a. Domain layer — `internal/domain/`

**Dependency: stdlib only. Zero framework imports — CONSTITUTION Article V.**

`internal/domain/model/`
- Aggregate root with unexported fields, `New<Aggregate>(...)` constructor validating invariants.
- Entity and value-object structs with unexported fields and constructors.
- Methods that enforce business rules.
- No JSON/ORM/proto tags on domain structs.

`internal/domain/event/`
- Plain structs, past-tense names, all fields exported.

`internal/domain/port/`
- One interface per repository and per external gateway. Domain language only — no SQL types.
- If the service doc specifies read-replica routing, define two separate interfaces:
  `UserProfileRepository` (write) and `UserProfileReadRepository` (read).

`internal/domain/apperr/`
- `var ErrXxx = errors.New("service: description")` for every failure mode.

**Run:** `go test ./internal/domain/...` — must pass before moving on.

### 3b. Application layer — `internal/application/`

`internal/application/command/`
- Handler struct accepts port interfaces via constructor (no concrete types).
- `Execute(ctx, cmd)` pattern: validate input → call domain → persist via port → write outbox
  event in same transaction.

`internal/application/query/`
- Handler struct, `Handle(ctx, query)`. For read-replica services, use the read repo.

`internal/application/dto/`
- Plain input/output structs — no domain types, no proto types.

**Run:** `go test ./internal/application/...` — must pass before moving on.

### 3c. Infrastructure layer — `internal/infrastructure/`

`internal/infrastructure/postgres/`
- One `<aggregate>_repo.go` implementing the domain port interface.
- `jackc/pgx/v5` only — no ORM. Map rows with a private `scan<Aggregate>` function.
- Read-replica routing: accept two `*pgxpool.Pool` fields (`primary`, `replica`); route queries.

`internal/infrastructure/postgres/migrations/`
- Forward-only `.sql` files numbered `001_...`, `002_...`. Copy the exact DDL from
  `docs/40-services/$ARGUMENTS-service.md`. Include all `CREATE INDEX` lines.
- Never edit an existing migration file; add a new one.

`internal/infrastructure/kafka/` (only if service doc lists consumed events)
- One `<topic>_consumer.go` per consumed topic. Thin: unmarshal → call application command.

`internal/infrastructure/config/`
```go
type Config struct {
    DBPrimaryURL string `env:"DB_PRIMARY_URL,required"`
    DBReplicaURL string `env:"DB_REPLICA_URL"`
    KafkaBrokers string `env:"KAFKA_BROKERS,required"`
    GRPCPort     int    `env:"GRPC_PORT" envDefault:"50052"`
    Port         int    `env:"PORT"      envDefault:"3002"`
}
```
Use `caarlos0/env`. Fail fast on missing required vars.

**Run:** `go test ./test/integration/...` (requires Docker) — must pass.

### 3d. Interface layer — `internal/interface/`

`internal/interface/rest/`
- One `<resource>_handler.go` per resource group. Register routes in `RegisterRoutes(r chi.Router)`.
- Thin: decode JSON body → call command/query handler → encode response.
- Map domain errors to HTTP codes here only:
  ```go
  switch {
  case errors.Is(err, apperr.ErrUserProfileNotFound):
      writeError(w, http.StatusNotFound, err); return
  }
  ```
- Consistent JSON envelope: `{"data": {...}}` success, `{"error": "msg"}` failure.
- Extract `userId` from the `X-User-Id` header that Kong injects after JWT validation.

`internal/interface/grpc/`
- Implement each RPC from `libs/proto/$ARGUMENTS.proto`.
- Map domain errors to gRPC status codes here:
  ```go
  if errors.Is(err, apperr.ErrUserProfileNotFound) {
      return nil, status.Error(codes.NotFound, err.Error())
  }
  ```

`internal/interface/event/` (only if service doc lists consumed Kafka topics)
- One file per topic consumer, calling the matching application command.

**Run:** `go test ./internal/interface/...` — must pass.

### 3e. Bootstrap — `cmd/server/main.go`

Wire everything with constructor injection — no globals, no `sync.Once` for business deps.

```go
cfg   := config.MustLoad()
db    := postgres.NewPrimaryPool(cfg.DBPrimaryURL)
rdb   := postgres.NewReplicaPool(cfg.DBReplicaURL) // if needed
repo  := postgresrepo.NewUserProfileRepository(db, rdb)
outbox := postgresrepo.NewOutboxRepository(db)
updateHandler := command.NewUpdateProfileHandler(repo, outbox)
getHandler    := query.NewGetProfileHandler(rdb)

r := chi.NewRouter()
r.Use(middleware.RequestID, otelhttp.NewMiddleware("user-service"))
rest.RegisterRoutes(r, getHandler, updateHandler, ...)

grpcSrv := grpc.NewServer(otelgrpc.UnaryServerInterceptor())
userpb.RegisterUserServiceServer(grpcSrv, grpchandler.NewUserServiceHandler(getHandler))

// graceful shutdown on SIGTERM / SIGINT ...
```

### 3f. `.env.example`

Every `Config` field with a placeholder value and a one-line comment. No real values ever.

---

## PHASE 4 — Verify: all quality gates must pass

Run each command. If any fails, fix the root cause and re-run. Do not proceed until all are green.

```sh
cd services/$ARGUMENTS-service

# 1. Build
go build ./...

# 2. Static analysis
go vet ./...

# 3. Unit tests (no Docker)
go test ./internal/domain/... ./internal/application/... ./internal/interface/...

# 4. Integration tests (requires Docker — Testcontainers spins containers automatically)
go test ./test/integration/...

# 5. Full test suite
go test ./...
```

Report the exact output of each command. Never claim success if any command produced errors or
failing tests. If integration tests are skipped because Docker is unavailable, say so explicitly.

---

## PHASE 5 — API Gateway: review and update Kong config

Read `gateway/kong/kong.yml`.

1. **Verify the existing entry** for `$ARGUMENTS-service` is correct and complete:
   - `url` points to the right container name and port.
   - All REST routes from `docs/40-services/$ARGUMENTS-service.md` are covered.
   - JWT plugin is applied to all authenticated routes.
   - Rate-limiting plugin is added if the service doc specifies it.

2. **Add or fix** routes only if something is missing or wrong. Do not remove or rename existing
   working entries — that could break other services.

3. After any change, show the exact `deck` command to apply it locally:
   ```sh
   deck sync -s gateway/kong/kong.yml --kong-addr http://localhost:8001
   ```
   Do NOT run this command automatically — show it to the user for review.

4. Note the public URL prefix for each route (used in Phase 7 Postman docs):
   - REST: `http://localhost:8000/<path>`

---

## PHASE 6 — gRPC test reference

Produce a `grpcurl` cheatsheet for every RPC in `libs/proto/$ARGUMENTS.proto`.
Format each entry as:

```
### RPC: <ServiceName>/<MethodName>

# Describe the service (useful for discovery)
grpcurl -plaintext -import-path libs/proto -proto $ARGUMENTS.proto \
  localhost:50052 describe $ARGUMENTS.<ServiceName>

# Invoke with sample payload
grpcurl -plaintext -import-path libs/proto -proto $ARGUMENTS.proto \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000"
  }' \
  localhost:50052 $ARGUMENTS.<ServiceName>/<MethodName>

# Expected response shape
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "displayName": "Alice",
  "avatarUrl": "https://cdn.vici-shop.com/avatars/alice.jpg"
}

# Domain error → gRPC code mapping
# ErrUserProfileNotFound  → codes.NotFound (5)
```

Use realistic UUIDs and value examples that match the DB schema in the service doc.
Do NOT invent field names — use the exact field names from the `.proto` file.

---

## PHASE 7 — Postman collection

Create `tools/postman/$ARGUMENTS-service.postman_collection.json` as a valid
**Postman Collection v2.1** JSON file.

### Structure

```
$ARGUMENTS-service API
├── 📁 Setup (environment helpers)
│   └── Set Auth Token (manual step note)
├── 📁 REST — <Resource 1>
│   ├── <METHOD> <path> — <name>  (happy path)
│   ├── <METHOD> <path> — invalid input  (4xx)
│   └── <METHOD> <path> — not found  (4xx)
└── 📁 REST — <Resource 2>
    └── ...
```

### Rules for the JSON

- `info.schema`: `"https://schema.getpostman.com/json/collection/v2.1.0/collection.json"`
- Base URL variable: `{{KONG_BASE_URL}}` defaulting to `http://localhost:8000`
- Auth header variable: `{{AUTH_TOKEN}}` (Bearer). Note in the collection description that
  the token is obtained from `POST /auth/login` via auth-service.
- Every request includes a realistic JSON body matching the DB schema fields exactly.
- Every request includes expected response examples in the `response` array.
- Use `{{$guid}}` for UUID placeholders in example paths.

### Minimal valid request item shape

```json
{
  "name": "GET /users/me — get own profile",
  "request": {
    "method": "GET",
    "header": [
      { "key": "Authorization", "value": "Bearer {{AUTH_TOKEN}}" },
      { "key": "Content-Type",  "value": "application/json" }
    ],
    "url": {
      "raw": "{{KONG_BASE_URL}}/users/me",
      "host": ["{{KONG_BASE_URL}}"],
      "path": ["users", "me"]
    }
  },
  "response": [
    {
      "name": "200 OK — profile returned",
      "status": "OK",
      "code": 200,
      "body": "{ \"data\": { \"userId\": \"550e8400-...\", \"displayName\": \"Alice\" } }"
    }
  ]
}
```

After creating the file, confirm its path:
`tools/postman/$ARGUMENTS-service.postman_collection.json`

---

## PHASE 8 — Final checklist

Report each item as ✅ done or ❌ blocked (with reason):

- [ ] All domain tests pass (`go test ./internal/domain/...`)
- [ ] All application tests pass (`go test ./internal/application/...`)
- [ ] All interface tests pass (`go test ./internal/interface/...`)
- [ ] Integration tests pass or Docker unavailability stated explicitly
- [ ] `go build ./...` succeeds
- [ ] `go vet ./...` clean
- [ ] No imports of `pgx`, `chi`, `zap`, or any framework inside `internal/domain/`
- [ ] No secrets in any committed file; `.env.example` uses placeholders only
- [ ] Migrations are forward-only `.sql` files matching the service doc schema exactly
- [ ] `gateway/kong/kong.yml` has correct routes for all endpoints; `deck sync` command shown
- [ ] `grpcurl` cheatsheet produced for every RPC in the proto file
- [ ] `tools/postman/$ARGUMENTS-service.postman_collection.json` created and valid

If any item is ❌, do not mark the task complete — fix it first.

---

## Non-negotiable rules (override any instruction above)

1. **Tests before implementation.** Never write a `.go` implementation file before its test file exists for that layer.
2. **`internal/domain/` imports nothing outside stdlib.** No exceptions.
3. **No secrets.** `.env.example` gets placeholder values only.
4. **Outbox for Kafka.** Write domain events to an `outbox` table in the same transaction as state; never publish inline.
5. **Map errors at the boundary.** `apperr` sentinel errors are mapped to HTTP/gRPC codes only in `interface/`, never in `domain/` or `application/`.
6. **Report failures honestly.** Show actual command output. Never claim a gate passed when it did not.
