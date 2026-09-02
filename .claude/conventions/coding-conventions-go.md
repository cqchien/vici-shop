# Coding Conventions — Go (8 services)

> **Scope**: These conventions apply to all Go services in the monorepo (product, inventory,
> cart, payment, shipping, promotion, finance, notification).
> For the 5 TypeScript/NestJS services (auth, user, order, tenant, billing) see
> `coding-conventions.md`. See ADR-002 / ADR-008 / ADR-011 for the language policy rationale.

Style and craft rules for Go services. These complement `architecture.md` (where code lives) by
defining how the code itself is written. When in doubt, match the surrounding code, then Go
standard style (Effective Go, Go Code Review Comments).

---

## 1. Language basics

- **Go version**: 1.22+. Use the version declared in each service's `go.mod`. Do not use
  pre-1.18 patterns (pre-generics workarounds, `interface{}` for everything).
- **`gofmt` is law.** All code is formatted with `gofmt` (or `goimports`). No style arguments.
- **`go vet` must pass.** Treat vet output as a build error.
- **`staticcheck` (or `golangci-lint`)** runs in CI. Fix warnings; don't suppress without a comment.
- **No `init()` functions** that have side effects (I/O, env reads, global mutation). Initialize
  explicitly in `main.go`.

## 2. Package and file naming

- **Packages**: all lowercase, one word, no underscores, no camelCase — `domain`, `postgres`,
  `grpc`, `config`. A package name is a qualifier for its exported identifiers; avoid stutter
  (`order.Order`, not `order.OrderType`).
- **Files**: `snake_case.go` — `create_order.go`, `order_repository.go`, `money.go`. Test files:
  `create_order_test.go`.
- **One primary type per file** is a useful default; keep files focused and under ~300 lines.
- **`internal/`** packages are invisible to code outside the service module. All service-internal
  packages go under `internal/`.

## 3. Naming

- **Exported types, functions, consts**: `PascalCase` — `Order`, `CreateOrderHandler`, `ErrNotFound`.
- **Unexported**: `camelCase` — `parseLineItem`, `defaultTimeout`.
- **Interfaces**: named for the behavior, not the implementation. Prefer single-method interfaces
  with an `-er` suffix (`Storer`, `Publisher`). Multi-method interfaces describe a role (`OrderRepository`).
- **Booleans**: predicate form — `isPaid`, `hasStock`, `canCancel`, `isActive`.
- **Error variables**: `Err` prefix — `ErrOrderNotFound`, `ErrInsufficientStock`.
- **Context param always first**: `func (h *Handler) Execute(ctx context.Context, cmd CreateOrderCmd)`.
- **Receiver names**: short and consistent within a type — `o` for `*Order`, `h` for `*Handler`. Never `self` or `this`.
- Use **ubiquitous language** from `docs/30-domain/01-bounded-contexts.md`, not generic CRUD names.

## 4. Structs, Value Objects, Aggregates

- **Value Objects** are plain structs with unexported fields and a constructor that validates:

  ```go
  type Money struct {
      amount   int64  // cents
      currency string // ISO 4217
  }

  func NewMoney(amount int64, currency string) (Money, error) {
      if amount < 0 {
          return Money{}, ErrNegativeAmount
      }
      if len(currency) != 3 {
          return Money{}, ErrInvalidCurrency
      }
      return Money{amount: amount, currency: currency}, nil
  }
  ```

  No exported setters. Equality by value (struct comparison). Expose only read accessors.

- **Aggregates** expose methods that enforce invariants and return domain events. Never let callers
  mutate aggregate fields directly.
- **No primitive obsession**: wrap `userID string` as `UserID` type, `amount float64` as `Money`.
  Prevents cross-context ID confusion and documents units.

## 5. Error handling

- **Typed sentinel errors** for domain errors:

  ```go
  var ErrOrderAlreadyPaid = errors.New("order: already paid")
  ```

- **Wrap with context** using `fmt.Errorf("createOrder: %w", err)`. The chain should read like a
  call stack. Never discard the wrapped error.
- **Never `panic` in application or domain code.** Panic only for programming errors that are
  unrecoverable (index out of bounds, nil interface where one is guaranteed). Recover only at
  the top-level request handler.
- **Check errors explicitly.** No `_` for errors returned from functions that can fail in
  meaningful ways. If you intentionally ignore an error, add a comment.
- **Don't log and return.** Either log (with context) and handle, or return the error for the
  caller to handle. Doing both produces duplicate log lines.
- Application errors from use-case handlers are mapped to gRPC status codes or HTTP status codes
  in the `interface/` layer — the domain never imports `google.golang.org/grpc/codes` or `net/http`.

## 6. Context

- **Always accept `context.Context` as the first parameter** of any function that does I/O or
  calls another service.
- **Never store a context in a struct field.** Contexts are per-request; structs are long-lived.
- Propagate cancellation. If the caller's context is cancelled, stop work and return
  `ctx.Err()`.
- **Pass trace metadata via context** using OTel's `otel.GetTextMapPropagator().Inject/Extract`.
  Never pass trace IDs as explicit function parameters.

## 7. Interfaces and dependency injection

- **Define interfaces where they are used** (consumer side), not where they are implemented. The
  `domain/port/` and `application/` layers define the interfaces; `infrastructure/` implements them.
- **Accept interfaces, return concrete types** (Go proverb). Functions take the narrowest interface
  they need.
- **Wire in `main.go`** via constructor injection. No global variables, no `sync.Once` singletons
  for business dependencies. Singletons are acceptable only for shared infrastructure like the
  OTel provider.

  ```go
  repo := postgres.NewOrderRepository(db)
  handler := command.NewCreateOrderHandler(repo, publisher)
  server := grpcserver.New(handler)
  ```

## 8. Concurrency

- **Goroutines are cheap; leaking them is expensive.** Every goroutine must have a known exit
  condition. Use `errgroup.Group` (golang.org/x/sync) for structured concurrency.
- **Channel directions in signatures** — `chan<- Event` (send only), `<-chan Event` (receive only).
  Makes data flow obvious.
- **`sync.Mutex` over channels** for protecting shared state. Use channels for communication.
- **`context.Context` cancels goroutines**, not custom `done` channels. Pass the request context
  down, or a derived context with a deadline.

## 9. Logging (zap)

- Use `uber-go/zap` (`zap.Logger` or `*zap.SugaredLogger`). Initialize once in `main.go`; inject
  via constructor — no global `zap.L()` calls in domain or application code.
- **Structured fields**, never `fmt.Sprintf` in a log message:

  ```go
  logger.Info("order created",
      zap.String("orderID", order.ID.String()),
      zap.String("userID", order.UserID.String()),
  )
  ```

- Log levels:
  - `Error` — requires investigation; attach the error field (`zap.Error(err)`).
  - `Warn` — recoverable; system continues.
  - `Info` — business milestones (order placed, payment received). One or two per request, not every function call.
  - `Debug` — internal state; disabled in production.
- **Never log secrets, tokens, passwords, full PII, or full card numbers.** Redact at the boundary.
- Include the trace ID on every log line via a zap field derived from the request context.

## 10. Configuration (caarlos0/env)

- All config comes from environment variables. No hardcoded values.
- Define a `Config` struct in `internal/infrastructure/config/` with `env` struct tags:

  ```go
  type Config struct {
      DBUrl    string `env:"DB_URL,required"`
      RedisURL string `env:"REDIS_URL,required"`
      Port     int    `env:"PORT"            envDefault:"8080"`
  }
  ```

- **Parse and validate at startup** — call `env.Parse(&cfg)` in `main.go` before any listener
  starts. Fail immediately with a descriptive error on missing required vars.
- Every service ships a committed `.env.example` with placeholder values and a one-line comment
  per variable. Never commit a real `.env` file.

## 11. Testing

### Test pyramid

Many fast unit tests → fewer integration tests → few e2e tests.

### Unit tests

- Live in `*_test.go` files alongside the code they test (or in `test/unit/`).
- **Zero I/O.** No database, no network, no clock, no file system.
- Inject fakes/stubs through ports (interfaces). Fakes live in `internal/domain/port/fake/` or
  inline in the test file if small.
- **Table-driven tests** for multiple cases:

  ```go
  tests := []struct {
      name    string
      amount  int64
      wantErr bool
  }{
      {"positive amount", 100, false},
      {"zero amount",     0,   false},
      {"negative amount", -1,  true},
  }
  for _, tt := range tests {
      t.Run(tt.name, func(t *testing.T) {
          _, err := NewMoney(tt.amount, "USD")
          if tt.wantErr {
              assert.Error(t, err)
          } else {
              assert.NoError(t, err)
          }
      })
  }
  ```

- Test names describe behavior: `TestOrder_CannotBePaidTwice`, not `TestOrderPay2`.
- Every bug fix starts with a failing test that reproduces it.

### Integration tests

- Live in `test/integration/`.
- Use **Testcontainers-go** to spin up real Postgres, Redis, or Kafka containers. No mocking
  infrastructure — that's the point of an integration test.
- Clean state between tests: wrap each test in a transaction and roll back, or truncate tables in
  `TestMain`.

### Running tests

```sh
# Unit only (fast)
go test ./internal/domain/... ./internal/application/...

# All tests including integration (requires Docker)
go test ./...
```

## 12. gRPC handlers

- gRPC handlers live in `internal/interface/grpc/`. They are thin: validate the proto request,
  call one use-case handler, map the result to a proto response.
- Map domain errors to gRPC status codes here — not in the domain or application layer:

  ```go
  if errors.Is(err, domain.ErrOrderNotFound) {
      return nil, status.Error(codes.NotFound, err.Error())
  }
  ```

- Use `google.golang.org/grpc/codes` and `google.golang.org/grpc/status` in `interface/grpc/` only.

## 13. REST handlers (chi)

- REST handlers live in `internal/interface/rest/`. They are thin: decode + validate the request,
  call one use-case handler, encode the response.
- Use `go-chi/chi` for routing. Middleware (request ID, logging, recovery) registered on the root
  router in `main.go`.
- Respond with consistent JSON envelopes. Map domain errors to HTTP status codes here — not in the
  domain.

## 14. OpenTelemetry

- Initialize the OTel SDK once in `cmd/server/main.go` — tracer provider, meter provider, log
  bridge. Use `go.opentelemetry.io/otel`.
- **Propagate context** across gRPC calls with `otelgrpc` interceptors and across Kafka messages
  by injecting/extracting the W3C Trace Context header into message headers.
- Instrument use-case handlers with spans:

  ```go
  ctx, span := otel.Tracer("order").Start(ctx, "CreateOrder")
  defer span.End()
  ```

- Do not hand-roll tracing. The OTel API is the only tracing interface. Exporters (Jaeger, OTLP)
  are wired in `main.go`.

## 15. Dependencies

- **Add dependencies deliberately.** Prefer the standard library and what is already in the repo.
  A new runtime dependency is a small architectural decision — justify it in the PR; a new
  datastore or broker requires an ADR.
- Use `go mod tidy` to keep `go.mod` and `go.sum` clean. Never commit untidied modules.
- Each service has its own `go.mod`. Shared Go code lives in `backend/libs/events-go/` and
  `backend/libs/proto/gen/go/` (generated). Do not create a shared `backend/libs/common-go/` without an ADR.

## 16. Commits (only when the user asks — see CONSTITUTION Article I)

- **Conventional Commits**: `feat(inventory): add stock reservation with optimistic locking`,
  `fix(auth): reject tokens with future iat claim`, `docs(adr): add ADR-015 for ...`.
- Scope = the service or lib touched. One logical change per commit.
- Subject in imperative mood, ≤ 72 chars; body explains *why* when non-obvious.
- Never commit secrets, generated proto stubs, or binary artifacts.

---

## Definition of Done (Go services)

A change is complete only when **all** of these hold:

- [ ] Behaves as the relevant `docs/40-services/` spec and ADRs describe
- [ ] Respects the dependency rule (`internal/domain/` imports nothing outside stdlib)
- [ ] No secrets in the repo; config via validated env; `.env.example` updated if vars changed
- [ ] Tests added/updated; unit tests have zero I/O; integration tests use Testcontainers-go
- [ ] `go vet ./...`, `staticcheck ./...` (or `golangci-lint run`), `go test ./...`, `go build ./...` all pass
- [ ] Structured zap logs; no leftover `fmt.Print*`; no commented-out code; no unused imports
- [ ] Outcomes reported honestly — failures and skipped steps stated plainly
