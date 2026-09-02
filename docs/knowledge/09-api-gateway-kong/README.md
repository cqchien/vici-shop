# 09 — API Gateway (Kong)

API Gateway là **một cửa duy nhất** cho mọi traffic từ ngoài vào. Nó xử lý các mối quan tâm
**xuyên suốt** (cross-cutting) một lần cho tất cả service: verify JWT, rate limiting, CORS,
request ID, routing theo path/host, và — với Vici — **phân giải tenant** (Host/JWT → `X-Tenant-Id`).
Service phía sau chỉ còn business logic.

Vici dùng **Kong DBless** ([ADR-005](../../20-architecture/adrs/ADR-005-kong-api-gateway.md)):
cấu hình khai báo trong `kong.yml`, review được trong repo. [ADR-010](../../20-architecture/adrs/ADR-010-serverless-aws-delivery.md)
đề xuất thay bằng **AWS API Gateway** khi lên serverless — cùng vai trò, khác sản phẩm.

| File | Nội dung |
| --- | --- |
| [01-khai-niem.md](01-khai-niem.md) | Vấn đề nó giải, cross-cutting concerns, gateway vs service mesh, những gì KHÔNG để ở gateway |
| [02-co-che.md](02-co-che.md) | Route/service/plugin, DBless declarative, JWT plugin, rate limit, tenant resolution, order of plugins |
| [03-ap-dung-trong-vici.md](03-ap-dung-trong-vici.md) | `kong.yml` thật, route public vs private, tenant resolve (ADR-009), platform-plane route, API GW (ADR-010) |
| [04-pitfalls-va-thuc-hanh.md](04-pitfalls-va-thuc-hanh.md) | Gateway làm authz, business logic ở gateway, tin `X-Tenant-Id` client gửi, single point of failure… + checklist |

Đọc kèm: [ADR-005](../../20-architecture/adrs/ADR-005-kong-api-gateway.md) ·
[`backend/gateway/kong/kong.yml`](../../../backend/gateway/kong/kong.yml) ·
[`backend/gateway/README.md`](../../../backend/gateway/README.md) ·
[ADR-009](../../20-architecture/adrs/ADR-009-tenant-context-propagation.md) ·
[ADR-010](../../20-architecture/adrs/ADR-010-serverless-aws-delivery.md)
