# Tech Stack — chọn gì và vì sao

| Lớp | Công nghệ | Vì sao |
| --- | --- | --- |
| Ngôn ngữ backend | **8 Go 1.22+** (commerce/compute) + **5 TypeScript/NestJS** (auth, user, order, tenant, billing) | Go nhẹ, concurrency tốt cho drop spike; NestJS cho identity/customer/platform/ordering (passport, guards, CQRS/ES/Saga) — ADR-002, ADR-008, ADR-011 |
| Frontend | **Next.js 14+ App Router, React 18, TS strict, TailwindCSS** | SSR/SSG cho SEO trang sản phẩm; một app ba zone (storefront / admin / platform) — ADR-006 |
| CSDL chính | **PostgreSQL 16** (database-per-service) | Đủ cho mọi nhu cầu v1 kể cả full-text search tiếng Việt (`unaccent` + `tsvector`) — ADR-003 |
| Đa tenant | **Pooled: `tenant_id` mọi bảng + Row-Level Security** | Rẻ, onboard nhanh, hợp shop nhỏ; cô lập fail-closed ở tầng DB — ADR-007, ADR-009 |
| Cache / realtime | **Redis 7** | Giỏ hàng, checkout session, drop allocation counter, rate limit |
| Message broker | **Apache Kafka** + outbox pattern | Event bất đồng bộ giữa contexts; replay cho read model finance — ADR-004 |
| RPC nội bộ | **gRPC + Buf** | Contract-first, typed, breaking-change check trong CI |
| API Gateway | **Kong** (DBless) | JWT verify, rate limit, CORS, request-id tập trung — ADR-005 |
| Event schema | **Avro** (`backend/libs/events/schemas/`) | Schema registry, tương thích tiến hoá |
| Observability | **OpenTelemetry** → Jaeger, Prometheus, Grafana, Loki | Trace xuyên gRPC + Kafka; một chuẩn instrument duy nhất |
| Hạ tầng | Docker Compose (local) → Kubernetes + Helm, Terraform (AWS) | Local một lệnh; production về sau (P5) |
| Load test | k6 | Kịch bản drop spike (NFR-02) |

## Những gì đã loại bỏ so với thiết kế cũ (omnichannel SaaS)

| Bỏ | Lý do |
| --- | --- |
| Elasticsearch | Catalog mỗi tenant < 10k SKU — Postgres full-text đủ (ADR-003) |
| ClickHouse | Khối lượng analytics nhỏ — read model Postgres trong finance-service đủ (ADR-003) |
| Database/schema-per-tenant | Chọn **pooled + RLS** thay thế — rẻ và onboard nhanh hơn (ADR-007) |
| search / recommendation / chatbot / analytics / review services | Gộp về product-service & finance-service hoặc ngoài phạm vi |

**Multi-tenancy đã được thêm lại** (2026-08-30) bằng [ADR-007](adrs/ADR-007-multi-tenancy-pooled-rls.md)
ở dạng pooled `tenant_id` + RLS — nhẹ hơn nhiều so với SaaS omnichannel ban đầu (không Elasticsearch,
không database-per-tenant).

Muốn thêm lại bất kỳ thứ gì khác ở trên → viết ADR mới trước (Problem → Why → Solution).
