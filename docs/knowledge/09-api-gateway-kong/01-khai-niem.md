# API Gateway — Khái niệm

> Vì sao quan trọng: đặt trách nhiệm sai giữa gateway và service là lỗi kiến trúc khó sửa —
> hoặc gateway biến thành "God service" chứa business logic, hoặc mỗi service tự làm auth/rate
> limit theo kiểu khác nhau và lệch.

## Vấn đề nó giải

13 service, mỗi service đều cần: verify chữ ký JWT, chặn brute-force / rate limit, thêm CORS
header, gắn request ID để trace, và (Vici) biết request thuộc tenant nào.

Nếu **mỗi service tự làm**:

- Code + config trùng lặp 13 lần, dễ lệch (service A verify iat, service B quên).
- Đổi chính sách rate limit → sửa + deploy lại 13 service.
- Một service cấu hình sai CORS → lỗ hổng.

**API Gateway** làm những việc này **một lần, ở biên**. Service phía sau nhận request đã được
xác thực + gắn context, chỉ lo nghiệp vụ.

> Hệ quả production: thay đổi chính sách bảo mật (siết rate limit khi bị tấn công, xoay JWT key)
> chỉ sửa một chỗ, không cần deploy service. Giảm bề mặt lỗi cấu hình.

## Cross-cutting concerns — cái gì thuộc gateway

| Ở gateway | Ở service |
| --- | --- |
| Verify **chữ ký + hạn** JWT | **Authorization** (RBAC: role này được làm gì) |
| Rate limiting, throttling | Business rule, invariant |
| CORS, request ID | Idempotency của thao tác nghiệp vụ |
| Routing theo path / host | Xử lý dữ liệu, gọi DB |
| Phân giải tenant từ Host/JWT → header | Dùng tenant context để scope truy vấn |
| TLS termination | — |

Nguyên tắc phân định: gateway làm cái **giống nhau cho mọi service** và **không cần biết nghiệp
vụ**. Bất cứ gì cần biết "role X có được huỷ đơn không" là **authorization = nghiệp vụ = ở
service** ([ADR-005](../../20-architecture/adrs/ADR-005-kong-api-gateway.md): *"Service **vẫn tự
kiểm tra RBAC** — Kong chỉ verify chữ ký/hạn token"*).

## Gateway vs Service Mesh

- **API Gateway**: biên **Bắc-Nam** (traffic ngoài → vào hệ thống). Một điểm.
- **Service Mesh** (Istio, Linkerd): traffic **Đông-Tây** (service ↔ service nội bộ) — mTLS,
  retry, circuit breaker, observability giữa các service.

Vici: có gateway (Kong), **không** có mesh — gọi nội bộ là gRPC trực tiếp + interceptor tự viết.
Mesh là quyết định riêng cần ADR nếu thêm.

## Vì sao Kong DBless (ADR-005)

- **DBless**: cấu hình là **file YAML khai báo** (`kong.yml`), commit + review trong repo, chạy
  local giống production. Không cần Postgres cho Kong.
- Plugin JWT / rate-limiting / CORS / request-id **có sẵn**, cộng đồng lớn.
- So với Nginx/Traefik: hệ plugin auth trưởng thành hơn. So với API Gateway managed: chạy local y hệt.

## Những gì KHÔNG để ở gateway

- **Business logic / orchestration**: gateway không gọi 3 service rồi tổng hợp (đó là
  BFF/aggregator, một component riêng nếu cần).
- **Authorization theo nghiệp vụ**: role → hành động, ở service.
- **Transform payload phức tạp**: chỉ header nhẹ (thêm `X-Tenant-Id`), không viết lại body.
- **State**: gateway stateless; rate-limit counter ở Redis, không ở gateway.

## Glossary

| Term | Một câu |
| --- | --- |
| Service (Kong) | Một upstream (một microservice) Kong proxy tới |
| Route | Điều kiện (path, method, host) map request → service |
| Plugin | Chức năng cắm vào route/service/global (jwt, rate-limiting, cors…) |
| DBless / declarative | Cấu hình toàn bộ trong file YAML, không cần DB |
| Consumer (Kong) | Danh tính gọi API (Vici: dùng nhẹ, RBAC ở service) |
| North-South traffic | Client ↔ hệ thống (việc của gateway) |
| East-West traffic | Service ↔ service (việc của mesh / gRPC interceptor) |

> 🗣️ Nói thành lời: "API Gateway là một cửa cho traffic ngoài, làm những việc giống nhau cho
> mọi service: verify chữ ký JWT, rate limit, CORS, request ID, routing, và phân giải tenant từ
> Host hoặc claim rồi gắn header. Service phía sau chỉ lo nghiệp vụ. Ranh giới quan trọng: gateway
> verify token, còn authorization — role này được làm gì — là nghiệp vụ nên ở service. Tôi dùng
> Kong DBless để cấu hình là file YAML review được trong repo."
