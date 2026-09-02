# Quy ước contract: REST · gRPC · Event

Mọi spec trong [40-services/](../40-services/README.md) tuân theo đúng quy ước ở đây — mục tiêu là
13 service (viết ở thời điểm khác nhau, có thể bởi người/AI khác nhau) trông như **một hệ thống**,
không phải 13 API rời rạc ghép lại. Lệch quy ước là bug, sửa quy ước thì sửa file này trước.

## 0. Tenant context (ADR-007 / ADR-009) — áp cho MỌI service nghiệp vụ

- **REST**: không có `tenant_id` trong path/body của client. Kong suy ra tenant (JWT claim `tid`,
  hoặc `Host` cho route public) và gửi header **`X-Tenant-Id`** xuống service. Service tin header
  này, set `app.tenant_id` cho transaction. Endpoint platform-plane (`/v1/tenants`, `/v1/billing`,
  `/v1/platform/*`) **không** nhận `X-Tenant-Id` của tenant thường — chỉ `platform_admin`.
- **gRPC**: tenant đi trong metadata **`x-tenant-id`** (interceptor inject/extract cùng chỗ OTel).
  RPC thiếu metadata này → `InvalidArgument`.
- **Kafka**: envelope thêm field **`tenantId`**; message có header **`tenant-id`**; bảng `outbox`
  có cột `tenant_id`; relay copy cột → header; consumer set `app.tenant_id` trước khi ghi.
- **DB**: repository mở transaction bằng `SET LOCAL app.tenant_id = $1`; RLS fail-closed (thiếu →
  0 dòng). App role không có `BYPASSRLS`. Platform-plane service dùng DB role riêng cho thao tác
  cross-tenant.

## 1. REST (qua Kong — public, client-facing)

- **Path**: danh từ số nhiều, không verb — `GET /products`, `POST /orders`, `PATCH /orders/{id}`.
  Hành động không phải CRUD thuần dùng sub-resource động từ ở dạng danh từ:
  `POST /orders/{id}/cancel`, `POST /orders/{id}/return-requests`.
- **Version**: prefix `/v1/...` ngay từ đầu (kể cả v1 chưa có v2) — tránh migrate path sau này.
  Đủ dạng: `https://api.vici.shop/v1/products`.
- **Auth**: header `Authorization: Bearer <JWT>`, verify tại Kong (ADR-005); claims tối thiểu
  `sub` (account id), `role` (`customer|staff|admin|tenant_admin|platform_admin`), và **`tid`**
  (tenant id — vắng mặt với `platform_admin`). Route public (browse catalog) không yêu cầu token
  nhưng vẫn cần tenant từ `Host`; route customer/staff/admin khai báo rõ trong bảng API của từng
  spec (cột **Auth**).
- **Response envelope** (thành công):

  ```json
  { "data": { ... }, "meta": { "requestId": "..." } }
  ```

  Danh sách phân trang:

  ```json
  { "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "total": 137, "requestId": "..." } }
  ```

- **Response envelope** (lỗi) — mọi service trả cùng một hình dạng để FE xử lý chung một chỗ:

  ```json
  { "error": { "code": "INSUFFICIENT_STOCK", "message": "Không đủ hàng trong kho", "field": null } }
  ```

  `code` là **mã lỗi domain dạng SCREAMING_SNAKE_CASE**, ổn định (FE match theo `code`, không
  match theo `message` tiếng Việt vì message có thể đổi câu chữ). `field` khác `null` khi lỗi gắn
  với một field cụ thể của request (validation).
- **HTTP status**: `400` lỗi validate/nghiệp vụ (kèm `code`), `401` chưa auth, `403` sai quyền,
  `404` không tìm thấy, `409` xung đột trạng thái (VD huỷ đơn đã `packing`), `422` request hợp lệ
  cú pháp nhưng vi phạm invariant nghiệp vụ, `500` lỗi hệ thống (không rò rỉ chi tiết ra `message`).
- **Idempotency**: mọi POST tạo tài nguyên có side-effect tiền/tồn kho (`POST /orders`,
  `POST /payments/{id}/confirm`) **bắt buộc** nhận header `Idempotency-Key` (UUID do client sinh);
  service lưu key kèm response 24h, request lặp lại trả cùng response, không tạo lại side effect.
- **Phân trang**: query `?page=1&pageSize=20` (mặc định `pageSize=20`, tối đa `100`). Không dùng
  cursor trừ khi spec của service nói rõ lý do (dataset lớn, sort theo thời gian thực).

## 2. gRPC (nội bộ — service gọi service, không bao giờ qua Kong)

- **Package/service naming**: `vici.<context>.v1`, ví dụ `vici.inventory.v1.InventoryService`.
  Proto sống ở `backend/libs/proto/<context>/v1/<context>.proto`.
- **RPC naming**: động từ mệnh lệnh — `ReserveStock`, `CommitReservation`, `ReleaseReservation`,
  `ValidateVoucher`, `CheckDropEligibility`, `CreatePayment`, `CreateShipment`. Request/response
  message đặt tên `<Rpc>Request` / `<Rpc>Response`.
- **Lỗi**: dùng `google.golang.org/grpc/status` + `codes` chuẩn (`NotFound`, `FailedPrecondition`
  cho vi phạm invariant, `AlreadyExists`, `ResourceExhausted` khi hết allocation/tồn kho) — map ở
  `interface/grpc/`, domain không import package này (xem `coding-conventions-go.md` §12).
- **Timeout & retry**: caller đặt deadline theo `context.Context` (khuyến nghị 2s cho các RPC
  đồng bộ trong saga: `ReserveStock`, `CreatePayment`); không retry tự động ở tầng gRPC cho RPC có
  side-effect (retry là quyết định của saga, có thể cần compensation trước).
- **Buf**: mọi thay đổi `.proto` chạy `buf lint` + `buf breaking` trong CI trước khi merge (xem
  [ADR-005](adrs/ADR-005-kong-api-gateway.md) về Kong, proto contract nói ở
  [architecture.md](../../.claude/conventions/architecture.md) §6).

## 3. Kafka events (bất đồng bộ — outbox pattern bắt buộc, ADR-004)

- **Topic naming**: `<context>.<aggregate>.<event>` thì tá thành **`<context>.<event-past-tense>`**
  phẳng một cấp để dễ subscribe theo domain fact — quy ước thực tế của dự án (xem ví dụ đã dùng
  trong `40-services/*.md`): `order.completed`, `order.cancelled`, `payment.succeeded`,
  `payment.refunded`, `payment.failed`, `inventory.stock_restocked`, `inventory.stock_low`,
  `shipment.status_changed`, `inventory.purchase_receipt_created`, `product.updated`. **Danh mục
  đầy đủ + owner + schema**: `backend/libs/events/registry.md` (một dòng mỗi topic, cập nhật khi
  thêm topic mới — cho tới lúc đó, mục **Events** của từng spec trong `40-services/` là nguồn
  đúng).
- **Schema**: Avro trong `backend/libs/events/schemas/<topic>.avsc`; mọi event có envelope chung:

  ```json
  {
    "eventId": "uuid",
    "eventType": "order.completed",
    "tenantId": "uuid",
    "occurredAt": "2026-07-11T10:00:00Z",
    "version": 1,
    "payload": { "...": "..." }
  }
  ```

  `tenantId` bắt buộc trên mọi event của service nghiệp vụ; cũng đặt trong header Kafka
  `tenant-id` để consumer route/scoped mà không cần deserialize payload.

- **Outbox bắt buộc**: service publish event ghi vào bảng `outbox` trong **cùng transaction** với
  thay đổi state; một relay process (goroutine riêng hoặc Debezium — quyết định ở ADR nếu đổi)
  đọc `outbox` chưa gửi → publish Kafka → đánh dấu `sent_at`. Không bao giờ publish Kafka trực
  tiếp trong request handler (mất event nếu Kafka down giữa lúc DB đã commit).
- **Idempotency phía consumer**: mọi consumer lưu `eventId` đã xử lý (bảng `processed_events` hoặc
  unique constraint tương đương) — nhận trùng event (redelivery) thì bỏ qua, không xử lý hai lần.
  Ghi rõ ở mỗi spec service, mục **Events → Tiêu thụ → Idempotency**.
- **Versioning**: field `version` trong envelope tăng khi thay đổi **breaking** (xoá/đổi kiểu
  field) — thêm field mới optional không cần tăng version (Avro schema evolution, backward
  compatible). Không bao giờ đổi ý nghĩa một field đã publish.
- **Retry & DLQ**: consumer lỗi thì retry với backoff (giới hạn số lần, cấu hình per-consumer);
  hết retry → đẩy vào topic `<context>.dlq` kèm lỗi gốc, không rơi âm thầm (notification-service
  làm mẫu ở FR-NOTI-04, các service khác theo cùng pattern).

## 4. Mã lỗi domain dùng chung

Một số mã lỗi xuất hiện ở nhiều service — giữ tên thống nhất để FE chỉ cần một bảng dịch:

| Code | Khi nào | HTTP |
| --- | --- | --- |
| `INSUFFICIENT_STOCK` | Không đủ tồn khả dụng (inventory-service) | 422 |
| `RESERVATION_EXPIRED` | Hết TTL giữ hàng, hết bước checkout | 409 |
| `INVALID_STATE_TRANSITION` | Chuyển trạng thái không hợp lệ (order state machine) | 409 |
| `VOUCHER_INVALID` / `VOUCHER_EXHAUSTED` | Voucher không hợp lệ / hết lượt (promotion-service) | 422 |
| `DROP_LIMIT_EXCEEDED` | Vượt giới hạn mua/khách trong drop | 422 |
| `INSUFFICIENT_POINTS` | Không đủ điểm để tiêu (user-service) | 422 |
| `PAYMENT_DECLINED` | Cổng thanh toán từ chối | 402 |
| `UNAUTHORIZED` / `FORBIDDEN` | Thiếu/ sai quyền | 401 / 403 |
| `QUOTA_EXCEEDED` | Vượt hạn mức gói của tenant (billing-service `GetEntitlements`) | 422 |
| `TENANT_SUSPENDED` | Tenant đang `suspended`/`archived` — chặn ghi | 403 |
| `SUBDOMAIN_TAKEN` | Subdomain đã có tenant khác dùng (onboarding) | 409 |

Service cần mã lỗi riêng thì đặt tên theo cùng convention (`SCREAMING_SNAKE_CASE`, mô tả invariant
vi phạm) và liệt kê trong spec của service đó, mục **Nghiệp vụ cốt lõi**.

## 5. Ghi chú cho FE (đã có mock — xem khi map sang API thật)

`frontend/src/lib/mock/store.ts` hiện trả `Result = { ok: true } | { ok: false; error: string }`
với `error` là câu tiếng Việt hiển thị thẳng cho user. Khi nối API thật, FE đổi sang đọc
`error.code` để quyết định hành vi (VD: `RESERVATION_EXPIRED` → tự động quay về giỏ hàng) và dùng
`error.message` chỉ để hiển thị — không còn hard-code câu thông báo trong component nữa.
