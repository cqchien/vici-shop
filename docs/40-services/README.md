# Danh mục services

13 services — **8 Go** (product, inventory, cart, payment, shipping, promotion, finance,
notification) + **5 TypeScript/NestJS** (auth, user, order, tenant, billing — ADR-002, ADR-008,
ADR-011). Spec chi tiết viết từ [service-spec-template.md](service-spec-template.md) — đọc spec
service trước khi code, spec là contract.

**Platform plane** (cross-tenant): tenant-service, billing-service. **Tenant plane** (11 service
còn lại): mọi bảng có `tenant_id` + Postgres RLS ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md)),
tenant context qua header/metadata/Kafka header ([ADR-009](../20-architecture/adrs/ADR-009-tenant-context-propagation.md)).
*Ngôn ngữ độc lập với plane*: auth/user là NestJS nhưng thuộc tenant plane.

| Service | Ngôn ngữ | REST | gRPC | Trách nhiệm | FR |
| --- | --- | --- | --- | --- | --- |
| [tenant-service](tenant-service.md) | TS/NestJS | 3012 | 50061 | Onboarding, provisioning saga, vòng đời tenant, thương hiệu, tên miền | FR-TEN |
| [billing-service](billing-service.md) | TS/NestJS | 3013 | 50062 | Gói, subscription, hạn mức/entitlements, đo lượng dùng, dunning | FR-BIL |
| [auth-service](auth-service.md) | TS/NestJS | 3001 | 50051 | Đăng ký/đăng nhập, JWT (claim `tid`), refresh, role | FR-AUTH-01..05 |
| [user-service](user-service.md) | TS/NestJS | 3002 | 50052 | Hồ sơ khách, địa chỉ, điểm thưởng, hạng thành viên | FR-AUTH-06..08, FR-LOY |
| [product-service](product-service.md) | Go | 3003 | 50053 | Catalog, variant, brand/series, blind box, review, search | FR-CAT |
| [inventory-service](inventory-service.md) | Go | 3004 | 50054 | Tồn kho, reservation, biến động, phiếu nhập | FR-INV |
| [cart-service](cart-service.md) | Go | 3005 | 50055 | Giỏ hàng, checkout session | FR-CART |
| [order-service](order-service.md) | TS/NestJS | 3006 | 50056 | Đơn hàng event-sourced, pre-order, saga, đổi trả | FR-ORD |
| [payment-service](payment-service.md) | Go | 3007 | 50057 | VNPay/Momo/ZaloPay/COD, IPN, refund | FR-PAY |
| [shipping-service](shipping-service.md) | Go | 3008 | 50058 | Vận đơn GHN/GHTK, phí ship, tracking | FR-SHIP |
| [promotion-service](promotion-service.md) | Go | 3009 | 50059 | Voucher, flash sale, drop, waitlist, pre-order campaign | FR-PROMO |
| [finance-service](finance-service.md) | Go | 3010 | 50060 | Sổ cái, giá vốn, P&L, báo cáo | FR-ACC, FR-REP |
| [notification-service](notification-service.md) | Go | 3011 | — | Email từ event, template, preference | FR-NOTI |

Quy ước port: REST `30xx`, gRPC `500xx` — giữ ổn định, docker-compose và Kong tham chiếu theo bảng này.

Trước khi code service tenant plane, đọc thêm mục **0. Tenant context** trong
[04-service-contracts-conventions.md](../20-architecture/04-service-contracts-conventions.md) và
[30-domain/05-tenant-lifecycle.md](../30-domain/05-tenant-lifecycle.md).

Trước khi đọc spec từng service, đọc 3 file nền tảng ở
[20-architecture/](../20-architecture/README.md):
[03-clean-architecture-ddd.md](../20-architecture/03-clean-architecture-ddd.md) (aggregate/layer
mỗi context), [04-service-contracts-conventions.md](../20-architecture/04-service-contracts-conventions.md)
(quy ước REST/gRPC/event mọi spec dưới đây tuân theo), và
[05-key-flows.md](../20-architecture/05-key-flows.md) (sequence diagram các luồng xuyên service
mà nhiều RPC/event trong spec tham chiếu tới).

## Contract

- Proto: `backend/libs/proto/*.proto` (Buf lint + breaking-change check trong CI).
- Event Avro: `backend/libs/events/schemas/`, đăng ký tại `backend/libs/events/registry.md` — danh
  mục topic đầy đủ hiện nằm rải rác trong mục **Events** của từng spec service dưới đây; khi bắt
  đầu code, gom lại thành `registry.md` thật trong `backend/libs/events/` (chưa tồn tại vì chưa có
  code backend).
- Route công khai: `backend/gateway/kong/kong.yml`.

## Thứ tự implement theo roadmap

Không nhất thiết viết spec theo thứ tự bảng trên khi code — bám theo
[00-overview/03-roadmap.md](../00-overview/03-roadmap.md) (P0 auth+user → **P0.5 tenant+billing +
RLS rollout** → P1 product+inventory → P2 cart+order+payment+shipping+notification → P3 promotion
(+ hoàn thiện user/order cho pre-order/loyalty) → P4 finance).
