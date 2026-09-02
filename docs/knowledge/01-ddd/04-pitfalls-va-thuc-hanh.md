# DDD — Pitfalls & thực hành

Mỗi pitfall: **triệu chứng → vì sao hỏng (hệ quả production) → cách đúng**.

## 1. Anemic domain model

- **Triệu chứng**: aggregate chỉ có getter/setter; mọi logic nằm trong "service" class
  (`OrderService.confirm(order)` set `order.status = "confirmed"` từ bên ngoài).
- **Vì sao hỏng**: invariant không được bảo vệ — bất kỳ ai cũng set được `status` sang giá trị
  bậy. Logic trùng lặp ở nhiều service. Khó test vì phải dựng cả service graph.
- **Cách đúng**: hành vi nằm **trong** aggregate. `order.Confirm()` tự kiểm "đang ở
  `pending_payment`?" rồi đổi state + trả event. Bên ngoài không set field trực tiếp.

## 2. Aggregate quá to ("God aggregate")

- **Triệu chứng**: `Tenant` chứa luôn toàn bộ catalog, đơn, khách của tenant đó.
- **Vì sao hỏng**: mỗi lần sửa một sản phẩm phải load + lock cả tenant → contention, optimistic
  lock conflict liên tục dưới tải, latency ghi tăng. Một transaction giữ lock lâu chặn mọi
  người khác.
- **Cách đúng**: `Tenant` chỉ chứa những gì phải nhất quán tức thì với chính nó (subdomain,
  status, branding). Catalog là aggregate riêng ở context Catalog, nối bằng `tenant_id` + event
  `tenant.provisioned`.

## 3. Chia sẻ type/model chéo bounded context

- **Triệu chứng**: một package `shared/models` có `Order` struct, cả order-service lẫn
  finance-service import.
- **Vì sao hỏng**: đổi `Order` cho nhu cầu Ordering làm compile lỗi Finance; hai context dính
  chặt, không deploy độc lập được. Vi phạm ranh giới context.
- **Cách đúng**: mỗi context tự định nghĩa type của mình. Dữ liệu chéo đi qua **contract** (proto
  / Avro event) và giữ **bản sao denormalized** cục bộ. Xem
  [`bounded-contexts.md`](../../30-domain/01-bounded-contexts.md) quy tắc 3.

## 4. Tên theo CRUD kỹ thuật thay vì ngôn ngữ nghiệp vụ

- **Triệu chứng**: `updateOrderStatus`, `createPartialPayment`, `PATCH /orders/{id}`.
- **Vì sao hỏng**: mất thông tin *ý định*. `updateOrderStatus` không nói được đây là "khách
  huỷ" hay "admin duyệt trả hàng" — hai việc có quy tắc + side-effect khác hẳn. Audit log vô nghĩa.
- **Cách đúng**: `order.Cancel(reason)`, `order.PayDeposit()`, `POST /orders/{id}/cancel`. Tên
  = ngôn ngữ trong [`bounded-contexts.md`](../../30-domain/01-bounded-contexts.md).

## 5. Một transaction sửa nhiều aggregate

- **Triệu chứng**: handler load `Order` + `Customer` + `StockItem`, sửa cả ba, commit một lần.
- **Vì sao hỏng**: khoá nhiều bảng cùng lúc → deadlock, contention. Khi tách service sau này
  thì không còn transaction chung → phải viết lại.
- **Cách đúng**: sửa một aggregate, phát event, aggregate khác phản ứng (eventual). Nếu bắt buộc
  đồng bộ nhiều bước → **Saga** với compensation, không phải transaction to.

## 6. Áp full tactical DDD cho sub-domain generic / CRUD thuần

- **Triệu chứng**: `NotificationTemplate` có aggregate root, domain service, 3 value object cho
  một việc là "lưu text + render".
- **Vì sao hỏng**: lớp map + abstraction thừa làm chậm phát triển, tăng chỗ để bug, không đổi
  lấy được gì (không có invariant phức tạp để bảo vệ).
- **Cách đúng**: DDD **đậm cho core domain** (Ordering, Promotion, Finance, Tenant), **nhẹ cho
  supporting** (Notification), **mua/dùng lib cho generic** (gửi email, PDF).

## 7. Nhầm Value Object thành Entity (và ngược lại)

- **Triệu chứng**: `Address` có `id` và `AddressRepository`; hoặc `LineItem` bị so sánh bằng giá trị.
- **Vì sao hỏng**: `Address` có id → có thể sửa "tại chỗ" một địa chỉ đã snapshot vào đơn cũ →
  đơn cũ đổi địa chỉ giao, sai lịch sử. `LineItem` so sánh bằng giá trị → hai dòng cùng SKU bị
  coi là một.
- **Cách đúng**: VO bất biến, không id, thay thế toàn bộ khi đổi. Entity có id, sửa tại chỗ.

## 8. Bỏ qua Anti-Corruption Layer khi tích hợp bên ngoài

- **Triệu chứng**: field `vnp_ResponseCode`, `momo_resultCode` lọt thẳng vào `PaymentTransaction`
  domain.
- **Vì sao hỏng**: model domain bị hình dạng của VNPay/Momo chi phối; đổi cổng thanh toán phải
  sửa domain; hai cổng có schema khác nhau nên domain đầy `if gateway == ...`.
- **Cách đúng**: adapter ở `infrastructure/` dịch response của từng cổng về một `PaymentResult`
  trung lập của domain trước khi vào trong.

## Checklist — Definition of Done khi mô hình một context

- [ ] Tên aggregate/method/event lấy từ ngôn ngữ trong [`bounded-contexts.md`](../../30-domain/01-bounded-contexts.md), không phải CRUD
- [ ] Mỗi aggregate bảo vệ ít nhất một invariant thật; hành vi nằm trong aggregate, không ở service ngoài
- [ ] Aggregate tham chiếu aggregate khác bằng ID; một transaction sửa đúng một aggregate instance
- [ ] Primitive nghiệp vụ (tiền, ID, email) bọc thành Value Object có validate; `tenant_id` là `TenantId`
- [ ] Không có package type dùng chung chéo context; dữ liệu chéo qua proto/event + bản sao denormalized
- [ ] Domain layer không import framework/ORM/SDK (xem [`02-hexagonal`](../02-hexagonal/README.md))
- [ ] Domain event đặt tên quá khứ, chứa snapshot đủ để consumer xử lý độc lập
- [ ] Mức độ DDD tương xứng: đậm cho core, nhẹ cho supporting, không cho generic

> 🗣️ Nói thành lời: "Lỗi DDD hay gặp nhất tôi thấy là anemic model — aggregate chỉ có
> getter/setter, logic nằm ngoài — và aggregate quá to gây contention dưới tải. Tôi kiểm bằng
> hai câu hỏi: aggregate này bảo vệ invariant gì, và một transaction có đang đụng nhiều
> aggregate không. Nếu cần đổi nhiều aggregate thì tôi dùng event hoặc saga chứ không mở
> transaction to."
