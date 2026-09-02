# Hexagonal — Áp dụng trong Vici

Nguồn chuẩn: [`.claude/conventions/architecture.md`](../../../.claude/conventions/architecture.md)
§1–2 và [`20-architecture/03-clean-architecture-ddd.md`](../../20-architecture/03-clean-architecture-ddd.md).

## Cấu trúc thư mục — mọi service theo đúng khuôn này

**Go (8/13 service):**

```
backend/services/<name>-service/
├── cmd/server/main.go              # wiring: OTel init, graceful shutdown, ráp adapter
├── internal/
│   ├── domain/                     # LÕI — pure Go, chỉ stdlib
│   │   ├── model/                  # aggregate, entity, value object
│   │   ├── event/                  # domain event (struct, quá khứ)
│   │   ├── service/                # domain service (logic xuyên aggregate)
│   │   ├── port/                   # driven port = interface (chỉ interface)
│   │   └── apperr/                 # typed domain error
│   ├── application/                # use case
│   │   ├── command/ query/ dto/
│   ├── infrastructure/             # driven adapter
│   │   ├── postgres/ redis/ kafka/ grpc/ config/
│   └── interface/                  # driving adapter
│       ├── rest/ grpc/ event/
└── .env.example
```

**NestJS (auth, user, order, tenant, billing):** `src/{domain,application,infrastructure,interface}/`
+ `<name>.module.ts` (wiring qua DI) + `main.ts`. Bố cục ở
[`architecture.md`](../../../.claude/conventions/architecture.md) mục "TypeScript/NestJS service".
auth/user bỏ `application/saga/` (không orchestrate); order/tenant/billing có.

Scaffold có sẵn: `backend/services/{auth,user,order,tenant,billing}-service/src/…` (các thư mục
`.gitkeep`, chưa có code).

## "Code này ở đâu" — quick test

| Nếu code… | Thuộc |
| --- | --- |
| Bảo vệ invariant ("đơn không thanh toán hai lần") | `domain/model` |
| Mô tả một nhu cầu ra ngoài ("tôi cần load một Order") | `domain/port` |
| Điều phối một use case ("tạo đơn: validate, save, emit event") | `application/command` |
| Nói SQL, Kafka, Redis, gRPC, HTTP | `infrastructure/` |
| Parse request HTTP/gRPC/Kafka rồi gọi use case | `interface/` |
| Đọc `os.Getenv` / `process.env` | `infrastructure/config` (không nơi nào khác) |
| Map lỗi domain → HTTP 4xx / gRPC code | `interface/` (domain không import `net/http`) |

## `tenant_id` sống ở đâu (ADR-007 / ADR-009)

Hexagonal cho phép "cắm" cơ chế cô lập tenant mà không đụng domain:

- **domain**: aggregate có `tenantID TenantId` (value object), gán một lần lúc tạo, không setter.
  Method domain **không** nhận `tenant_id` làm tham số.
- **application**: nhận `context.Context` (Go) / request-scoped provider (Nest) do `interface/`
  nạp từ header `X-Tenant-Id`. Không đọc `tenant_id` từ payload client.
- **infrastructure**: repository mở transaction bằng `SET LOCAL app.tenant_id = $1` (đọc từ
  context) — RLS lo phần chặn. Repo **không** tự thêm `WHERE tenant_id = ...`.

Litmus: đổi RLS sang cơ chế cô lập khác chỉ nên đụng `infrastructure/`. Chi tiết:
[`03-clean-architecture-ddd.md`](../../20-architecture/03-clean-architecture-ddd.md) §4.1 và
[`knowledge/10-multi-tenancy-rls`](../10-multi-tenancy-rls/README.md).

## Ví dụ đầy đủ: `Order` qua 4 lớp

Xem code sketch chi tiết ở
[`03-clean-architecture-ddd.md`](../../20-architecture/03-clean-architecture-ddd.md) §3 — bao gồm
`domain/model/order.go`, `domain/port/order_repository.go`,
`application/command/place_order`, `infrastructure/postgres/order_event_store.go`,
`interface/rest/order_controller.go`, và sequence diagram outbox relay chạy *tách khỏi*
transaction ghi domain.

## Ràng buộc từ CONSTITUTION & conventions

- [CONSTITUTION](../../../.claude/CONSTITUTION.md) Article V.1: dependency rule là tuyệt đối,
  **không framework import trong `domain`**.
- [`coding-conventions-go.md`](../../../.claude/conventions/coding-conventions-go.md) §7: định
  nghĩa interface phía tiêu thụ; wire trong `main.go`; không global var, không `sync.Once`
  singleton cho business dependency.
- §1: **không `init()` có side effect** (I/O, env, global mutation) — khởi tạo tường minh trong `main.go`.

## Đọc tiếp

- Bên trong `application/` khi có tách đọc/ghi → [`03-cqrs`](../03-cqrs/README.md)
- Adapter Kafka + outbox → [`06-outbox`](../06-outbox/README.md), [`07-event-driven-kafka`](../07-event-driven-kafka/README.md)
- Cách hexagonal giúp chuyển sang Lambda → [`13-serverless-aws`](../13-serverless-aws/README.md)
