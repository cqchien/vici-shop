# gRPC + Buf — Pitfalls & thực hành

## 1. Gọi REST giữa các service

- **Triệu chứng**: order-service `fetch("http://inventory-service/reserve")`.
- **Vì sao hỏng**: contract chỉ là tài liệu, dễ lệch; không typed; mỗi team format khác; không
  có deadline/status code chuẩn; khó trace. Vici cấm dứt khoát
  ([`01-system-overview.md`](../../20-architecture/01-system-overview.md)).
- **Cách đúng**: gRPC với `.proto` contract, hoặc Kafka event nếu không cần kết quả.

## 2. RPC không có deadline

- **Triệu chứng**: `client.ReserveStock(ctx, req)` với `ctx` không timeout.
- **Vì sao hỏng**: inventory chậm → order-service treo → goroutine + connection tích tụ → order
  cạn tài nguyên → **cascading failure** lan ra Kong, client. Một service chậm giết cả hệ.
- **Cách đúng**: `context.WithTimeout` mọi RPC (2s trong saga); deadline propagate xuống RPC con.

## 3. Auto-retry RPC có side-effect

- **Triệu chứng**: gRPC client config `retry: 3` cho `CreatePayment`.
- **Vì sao hỏng**: request đầu thực ra thành công nhưng response mất → retry → **charge hai
  lần**. Hoặc reserve hai reservation cho một đơn.
- **Cách đúng**: RPC side-effect không auto-retry ở tầng gRPC. Retry là quyết định của saga, và
  chỉ khi RPC **idempotent** (`Idempotency-Key` hoặc khoá theo `orderId`).

## 4. Breaking change trong `.proto`

- **Triệu chứng**: đổi `int32 qty` → `int64 qty`; xoá field số 2; đổi field number.
- **Vì sao hỏng**: service chưa deploy bản mới decode sai → dữ liệu rác (qty thành số khổng lồ),
  hoặc RPC lỗi. Với side-effect như reserve/charge, dữ liệu rác = mất tiền/tồn.
- **Cách đúng**: chỉ **thêm** field (number mới, optional). Bỏ field → `reserved`. Breaking thật
  → `vici.<ctx>.v2`, giữ v1, migrate. `buf breaking` trong CI chặn.

## 5. Domain import `grpc/codes` / `grpc/status`

- **Triệu chứng**: `domain/model/order.go` trả `status.Error(codes.NotFound, ...)`.
- **Vì sao hỏng**: domain dính transport gRPC; không tái dùng cho REST/Lambda; vi phạm hexagonal.
- **Cách đúng**: domain trả **typed error** (`apperr.ErrOrderNotFound`); `interface/grpc/` map
  sang `codes.NotFound`. Chỉ `interface/grpc/` import `grpc/codes`.

## 6. Server handler chứa business logic

- **Triệu chứng**: `InventoryServer.ReserveStock` tự tính "available = onHand - reserved" và
  quyết định.
- **Vì sao hỏng**: logic trùng với REST handler; không test qua use case; handler phình.
- **Cách đúng**: handler thin — validate proto → gọi use case → map response/lỗi. Logic ở domain.

## 7. Commit generated stub như code viết tay và sửa nó

- **Triệu chứng**: sửa trực tiếp `gen/go/inventory.pb.go`.
- **Vì sao hỏng**: `buf generate` lần sau ghi đè; hoặc stub lệch `.proto`.
- **Cách đúng**: stub sinh từ `.proto`, không sửa tay. Cần hành vi khác → sửa `.proto` hoặc bọc
  ở adapter.

## 8. Dùng gRPC để "thông báo đã xảy ra việc X"

- **Triệu chứng**: order-service gọi `finance.NotifyOrderCompleted` (gRPC) sau mỗi đơn.
- **Vì sao hỏng**: coupling — finance chậm/chết → order chậm/lỗi; thêm consumer (analytics) →
  sửa order-service.
- **Cách đúng**: phát Kafka event `order.completed`; finance/user/notification tự nghe. gRPC chỉ
  khi cần kết quả.

## 9. Không truyền metadata tenant / trace

- **Triệu chứng**: RPC nội bộ không set `x-tenant-id`, không propagate `traceparent`.
- **Vì sao hỏng**: bên nhận không biết tenant → RLS fail-closed hoặc ghi nhầm; trace đứt đoạn
  ở mỗi hop → không debug được luồng xuyên service.
- **Cách đúng**: interceptor inject/extract `x-tenant-id` + trace context cho mọi RPC (cùng chỗ
  với OTel — xem [`11-observability-otel`](../11-observability-otel/README.md)).

## 10. `.proto` phân tán mỗi service một bản

- **Triệu chứng**: mỗi service copy proto của service khác vào repo mình.
- **Vì sao hỏng**: các bản lệch nhau theo thời gian; không có source of truth; breaking check vô nghĩa.
- **Cách đúng**: `.proto` sống **một chỗ** (`backend/libs/proto/`); mọi service sinh stub từ đó.

## Checklist — Definition of Done

- [ ] Gọi nội bộ đồng bộ = gRPC; không có REST giữa service; "thông báo" = Kafka event
- [ ] `.proto` ở `backend/libs/proto/`, package `vici.<context>.v1`, RPC = động từ mệnh lệnh
- [ ] `buf lint` + `buf breaking --against main` chạy trong CI, chặn merge nếu fail
- [ ] Chỉ thêm field (number mới, optional); bỏ field → `reserved`; breaking → `v2`
- [ ] Mọi RPC có deadline qua `context`; deadline propagate xuống RPC con
- [ ] RPC side-effect không auto-retry ở tầng gRPC; retry ở saga + chỉ khi idempotent
- [ ] Server handler thin; map domain error → status code chỉ ở `interface/grpc/`
- [ ] Domain không import `grpc/codes` / `grpc/status`
- [ ] Interceptor inject/extract `x-tenant-id` + trace context cho mọi RPC
- [ ] Generated stub không sửa tay

> 🗣️ Nói thành lời: "Ba lỗi gRPC nặng nhất: gọi RPC không deadline gây cascading failure khi
> service kia chậm; auto-retry RPC có side-effect làm charge hai lần; và breaking change trong
> proto làm service chưa deploy decode sai. Tôi luôn set timeout 2s trong saga, để saga quyết
> định retry chứ không auto ở tầng gRPC, và Buf chặn breaking trong CI — breaking thật thì làm
> package v2."
