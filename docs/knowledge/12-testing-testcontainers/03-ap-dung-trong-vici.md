# Testing & Testcontainers — Áp dụng trong Vici

Nguồn chuẩn: [`coding-conventions-go.md`](../../../.claude/conventions/coding-conventions-go.md) §11,
[`coding-conventions.md`](../../../.claude/conventions/coding-conventions.md) §6,
[`03-clean-architecture-ddd.md`](../../20-architecture/03-clean-architecture-ddd.md) §6,
[CONSTITUTION](../../../.claude/CONSTITUTION.md) Article VI.

## Test theo lớp (`03-clean-architecture-ddd.md` §6)

| Lớp | Loại test | I/O | Vị trí |
| --- | --- | --- | --- |
| `domain/` | Unit, table-driven | Không | `*_test.go` cạnh code |
| `application/` | Unit, fake port qua interface | Không | `*_test.go` hoặc `test/unit/` |
| `infrastructure/` | Integration, Testcontainers | Có (Postgres/Redis/Kafka thật) | `test/integration/` |
| Toàn service | E2E (vài kịch bản chính) | Có | `test/e2e/` |

Scaffold: mỗi service có `test/unit/` + `test/integration/` (hiện `.gitkeep`), ví dụ
`backend/services/order-service/test/`, `backend/services/tenant-service/test/`.

## Conventions §11 (Go)

- Unit: **zero I/O** — no database, no network, no clock, no file system. Inject fake qua port.
- Integration: **Testcontainers-go**, dep thật — *"No mocking infrastructure — that's the point
  of an integration test."*
- Cô lập: transaction rollback **hoặc** truncate trong `TestMain`.
- Chạy:
  ```sh
  go test ./internal/domain/... ./internal/application/...   # unit only, nhanh
  go test ./...                                              # + integration (cần Docker)
  ```
- Bug fix bắt đầu bằng test đỏ tái hiện bug.

## Conventions §6 (NestJS — auth, user, order, tenant, billing)

- Unit cover `domain/` + `application/` **zero I/O**, fake/stub qua port, nhanh + deterministic.
- Integration cover adapter với **real deps via Testcontainers**, không mock.
- Tên test theo hành vi: `it('rejects cancellation once the order has shipped')`.

## Case bắt buộc phải có

| Case | Yêu cầu | File |
| --- | --- | --- |
| **Oversell dưới concurrent** | NFR-05 — reserve/voucher atomic; integration test song song | `inventory-service`, `promotion-service` |
| **Cross-tenant read trả rỗng** | NFR-13 — cho **mỗi repository** tenant-plane; case "thiếu tenant context → thao tác từ chối" | mọi service tenant-plane |
| **Saga compensation** | Mỗi kịch bản fail của checkout / provisioning → compensation đúng | `order-service`, `tenant-service` |
| **Provisioning < 5 phút** | NFR-14 — e2e đo duration | `tenant-service` |
| **Drop spike** | NFR-02 — k6 load test (P5), không phải unit; tái hiện 1.000 user | `backend/tools/k6/load-tests` |
| **Idempotent consumer** | Redeliver cùng event → cùng kết quả | mọi consumer |
| **Full-text tiếng Việt không dấu** | FR-CAT-09 — Testcontainers Postgres + `unaccent` | `product-service` |

## Quality gates (CONSTITUTION VI.3, conventions)

Trước khi coi một thay đổi là xong, **chạy** (không giả định):

- Go: `go vet ./...`, `staticcheck ./...` (hoặc `golangci-lint run`), `go test ./...`, `go build ./...`
- NestJS: `lint`, `typecheck`, `test`, `build`
- Proto: `buf lint` + `buf breaking`
- Frontend: `npm run lint && npx tsc --noEmit && npm run build` (đã xanh — xem `frontend/README.md`)

Report trung thực: test fail thì nói + show output; skip bước nào thì nói (CONSTITUTION VI.2).

## FE mock — cách verify hiện tại

Từ memory dự án: business flow verify bằng cách drive `actions` trong
`frontend/src/lib/mock/store.ts` qua một script tsx (chạy headless — store DOM-guarded). Ví dụ
đã dùng: tạo tenant → provisioning → đổi gói (guard) → lifecycle transition.

## Đọc tiếp

- Vì sao unit zero-I/O khả thi → [`02-hexagonal`](../02-hexagonal/README.md)
- Test RLS → [`10-multi-tenancy-rls`](../10-multi-tenancy-rls/README.md)
- Test saga → [`05-saga`](../05-saga/README.md)
- Test idempotent consumer → [`06-outbox`](../06-outbox/README.md), [`07-event-driven-kafka`](../07-event-driven-kafka/README.md)
