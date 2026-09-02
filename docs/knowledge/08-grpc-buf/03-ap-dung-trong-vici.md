# gRPC + Buf — Áp dụng trong Vici

Nguồn chuẩn: [`04-service-contracts-conventions.md`](../../20-architecture/04-service-contracts-conventions.md) §2,
[`.claude/conventions/coding-conventions-go.md`](../../../.claude/conventions/coding-conventions-go.md) §12,
[`.claude/conventions/architecture.md`](../../../.claude/conventions/architecture.md) §6.

## Naming (§2)

- Package/service: `vici.<context>.v1`, ví dụ `vici.inventory.v1.InventoryService`.
- Proto file: `backend/libs/proto/<context>/v1/<context>.proto` (scaffold hiện dùng dạng phẳng
  `libs/proto/<context>.proto` — sẽ chuyển sang có `v1/` khi code).
- RPC = động từ mệnh lệnh: `ReserveStock`, `CommitReservation`, `ReleaseReservation`,
  `ValidateVoucher`, `CheckDropEligibility`, `CreatePayment`, `CreateShipment`.
- Message = `<Rpc>Request` / `<Rpc>Response`.

## Proto hiện có

`backend/libs/proto/`: `auth.proto`, `user.proto`, `product.proto`, `inventory.proto`,
`order.proto`, `payment.proto`, và mới thêm **`tenant.proto`**, **`billing.proto`**
(xem [`tenant-service.md`](../../40-services/tenant-service.md) §2,
[`billing-service.md`](../../40-services/billing-service.md) §2).

RPC tiêu biểu:

| RPC | Ai gọi | Kiểu |
| --- | --- | --- |
| `inventory.ReserveStock` / `CommitReservation` / `ReleaseReservation` | cart, order (saga) | side-effect |
| `promotion.CheckDropEligibility` / `ValidateVoucher` | cart | side-effect (atomic) |
| `payment.CreatePayment` | order (saga) | side-effect |
| `shipping.CreateShipment` | order (saga) | side-effect |
| `billing.GetEntitlements` | product, inventory, promotion… | đọc (cache ngắn) |
| `billing.CreateSubscription` | tenant (provisioning saga) | side-effect |
| `tenant.AttachTenant` | tenant → auth (provisioning) | side-effect |
| `tenant.ResolveTenantByHost` | edge / Kong | đọc |
| `order.GetOrderStatus` / `ListUserOrders` | các service cần trạng thái đơn | đọc |

## Tenant context qua metadata (ADR-009)

Từ [`04-service-contracts-conventions.md`](../../20-architecture/04-service-contracts-conventions.md) §0:
*"gRPC: tenant đi trong metadata **`x-tenant-id`** (interceptor inject/extract cùng chỗ OTel).
RPC thiếu metadata này → `InvalidArgument`."*

Message request cũng mang `string tenant_id` ở nơi cross-tenant không mong muốn (xem
`tenant.proto` / `billing.proto`) — dùng làm khoá, không thay cho metadata.

## Interface layer mỏng

Từ [`coding-conventions-go.md`](../../../.claude/conventions/coding-conventions-go.md) §12:
*"gRPC handlers ở `internal/interface/grpc/`. Thin: validate proto request, gọi một use-case
handler, map result → proto response. Map domain errors → gRPC status codes ở đây."*

```
internal/interface/grpc/inventory_server.go   # server handler (inbound), thin
internal/infrastructure/grpc/payment_client.go # client (outbound), implement domain port
```

## Timeout trong saga

Từ §2: *"caller đặt deadline theo `context.Context` (khuyến nghị 2s cho các RPC đồng bộ trong
saga: `ReserveStock`, `CreatePayment`); không retry tự động ở tầng gRPC cho RPC có side-effect
(retry là quyết định của saga, có thể cần compensation trước)."*

## Buf trong CI

Từ §2 + [`architecture.md`](../../../.claude/conventions/architecture.md) §6: *"mọi thay đổi
`.proto` chạy `buf lint` + `buf breaking` trong CI trước khi merge."* Contract là source-of-truth
và được review cho breaking change ([CONSTITUTION](../../../.claude/CONSTITUTION.md) Article IV.4).

## Serverless (ADR-010)

Từ [`06-serverless-aws.md`](../../20-architecture/06-serverless-aws.md) §0: gRPC nội bộ đồng bộ
→ **Lambda `Invoke` (RequestResponse)** hoặc private API Gateway. **Port interface giữ nguyên**,
đổi adapter `infrastructure/grpc` → `infrastructure/awsinvoke`. Proto vẫn dùng làm định nghĩa
message; Avro schema tái dùng cho `detail` của EventBridge.

## Đọc tiếp

- Khi nào event thay vì gRPC → [`07-event-driven-kafka`](../07-event-driven-kafka/README.md)
- Bước gRPC trong saga → [`05-saga`](../05-saga/README.md)
- Domain không import grpc/codes → [`02-hexagonal`](../02-hexagonal/README.md)
