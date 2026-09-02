# CQRS — Pitfalls & thực hành

## 1. CQRS ở mọi service

- **Triệu chứng**: `inventory-service`, `notification-service` cũng có command/query bus, read
  model riêng.
- **Vì sao hỏng**: với CRUD đối xứng, bạn nhân đôi lớp (một command handler + một query handler
  + một mapper + một read model) cho việc mà một repository làm xong. Chậm phát triển, nhiều
  chỗ bug, nhiều thứ phải giữ đồng bộ.
- **Cách đúng**: CQRS chỉ nơi đọc/ghi thật sự khác nhu cầu (ADR-002/008 giới hạn ở
  order/tenant/billing). auth/user tuy là NestJS (ADR-011) vẫn CRUD thường. Nghi ngờ → dùng
  repository thường.

## 2. Query đi qua aggregate

- **Triệu chứng**: `GetOrderQuery` load `Order` aggregate (hoặc replay event stream) rồi map sang DTO.
- **Vì sao hỏng**: replay/hydrate aggregate mỗi query đọc là đắt; đường đọc (nhiều request) làm
  chậm cả hệ thống; mất luôn lợi ích chính của CQRS.
- **Cách đúng**: query đọc **read model** đã denormalize. Nếu chưa có read model cho truy vấn
  đó → tạo nó, đừng "mượn tạm" aggregate.

## 3. Command trả về DTO để hiển thị

- **Triệu chứng**: `PlaceOrderCommand` trả về full `OrderDetailDto`.
- **Vì sao hỏng**: ép write side phải biết hình dạng màn hình; khi UI đổi, command đổi theo.
  Trộn hai trách nhiệm.
- **Cách đúng**: command trả `orderId` (hoặc void). Client dùng id đó gọi một query nếu cần
  hiển thị chi tiết.

## 4. Quên độ trễ projection (eventual consistency)

- **Triệu chứng**: sau khi tạo tenant ở `/start`, chuyển sang danh sách `/platform/tenants`
  ngay và mong thấy nó — nhưng projection chưa cập nhật.
- **Vì sao hỏng**: "tôi vừa làm mà không thấy" → người dùng bấm lại, tạo trùng; support ticket.
- **Cách đúng**: quyết định *có chủ đích*. UI lạc quan (hiển thị từ dữ liệu client), hoặc query
  "cái tôi vừa tạo" đọc write side, hoặc hiển thị trạng thái "đang xử lý". Trong FE mock thì
  cùng store nên thấy ngay; backend thật phải để ý.

## 5. Read model là "một bảng cho mọi query"

- **Triệu chứng**: một `order_read_model` khổng lồ 40 cột phục vụ 8 màn hình khác nhau.
- **Vì sao hỏng**: mỗi màn hình đổi thì bảng đổi, ảnh hưởng 7 màn còn lại; index phình; write
  path (cập nhật projection) chậm.
- **Cách đúng**: read model theo **use case**. Có thể có `order_list_row`, `order_detail`,
  `order_admin_search` riêng — mỗi cái nhỏ, tối ưu cho một truy vấn.

## 6. Projection không idempotent

- **Triệu chứng**: consumer `order.placed` làm `usage.orders_month += 1` không dedupe; Kafka
  redeliver → đếm gấp đôi.
- **Vì sao hỏng**: hạn mức tính sai → chặn nhầm tenant, hoặc tính phí sai. Số liệu MRR lệch.
- **Cách đúng**: consumer lưu `eventId` đã xử lý (bảng `processed_events`), hoặc dùng
  `INSERT ... ON CONFLICT DO NOTHING` theo `(tenant_id, event_id)`. Xem
  [`07-event-driven-kafka/04`](../07-event-driven-kafka/04-pitfalls-va-thuc-hanh.md).

## 7. Rebuild projection không có kế hoạch

- **Triệu chứng**: đổi hình dạng read model nhưng không có cách dựng lại từ đầu; phải viết
  migration thủ công đau đớn.
- **Vì sao hỏng**: read model *phải* coi là dữ liệu phái sinh, vứt đi dựng lại được. Nếu không,
  mỗi thay đổi schema đọc là một dự án.
- **Cách đúng**: giữ khả năng **replay** — với ES thì replay event store; với consume-Kafka thì
  reset consumer offset + truncate read model. Test đường rebuild.

## 8. Command handler làm quá nhiều (God handler)

- **Triệu chứng**: `PlaceOrderHandler` vừa validate, vừa gọi 3 service ngoài, vừa gửi email,
  vừa update read model.
- **Vì sao hỏng**: transaction dài, khoá lâu; khó test; trộn orchestration vào command.
- **Cách đúng**: handler chỉ: load aggregate → gọi domain → save + outbox. Orchestration đa bước
  → **Saga**. Side effect (email) → consumer của event.

## Checklist — Definition of Done

- [ ] Service này thật sự cần CQRS (đọc/ghi khác nhu cầu), không phải "cho hiện đại"
- [ ] Command đi qua aggregate, bảo vệ invariant, trả về tối thiểu (id/void)
- [ ] Query đọc read model, **không** load/replay aggregate, không side effect
- [ ] Read model thiết kế theo use case, nhỏ và nhiều, không phải một bảng cho tất cả
- [ ] Projection cập nhật idempotent (dedupe theo eventId)
- [ ] Mỗi query đã quyết định strong hay eventual; UI xử lý cửa sổ trễ có chủ đích
- [ ] Có đường rebuild projection và đã test nó
- [ ] Command handler mỏng; orchestration đa bước tách sang saga; side effect tách sang consumer

> 🗣️ Nói thành lời: "Hai lỗi CQRS tôi thấy nhiều nhất: một là áp cho mọi service kể cả CRUD
> thuần, nhân đôi lớp vô ích; hai là query vẫn đi qua aggregate nên mất hết lợi ích. Query phải
> đọc read model denormalize theo màn hình. Và luôn phải nghĩ tới độ trễ projection — quyết
> định từng query là strong hay eventual, đừng để người dùng 'vừa tạo mà không thấy'."
