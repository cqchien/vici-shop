# Event Sourcing — Pitfalls & thực hành

## 1. Event mang ý định lưu trữ, không phải sự thật nghiệp vụ

- **Triệu chứng**: event `OrderTableRowUpdated { column: "status", value: "shipped" }`, hoặc
  `OrderFieldsChanged { diff: {...} }`.
- **Vì sao hỏng**: đây là "CRUD trá hình event". Mất thông tin ý định (huỷ? duyệt trả hàng?);
  event vô nghĩa với nghiệp vụ; không viết projection tử tế được.
- **Cách đúng**: event là **sự thật nghiệp vụ quá khứ**: `OrderCancelled { reason }`,
  `ReturnResolved { refundVnd, restock }`. Đặt tên theo ngôn ngữ trong
  [`bounded-contexts.md`](../../30-domain/01-bounded-contexts.md).

## 2. Kiểm invariant trong `apply(event)`

- **Triệu chứng**: `apply(OrderCancelled)` throw nếu `status == "shipped"`.
- **Vì sao hỏng**: replay event **cũ** (đã hợp lệ khi ghi) giờ bị chặn vì luật đổi → không load
  được aggregate nữa → hỏng cả stream.
- **Cách đúng**: `apply` chỉ set state, **không kiểm gì**. Invariant kiểm trong **command
  method** (trước khi tạo event). Event đã ghi là quá khứ, không phán xét lại.

## 3. Đổi ý nghĩa / kiểu field của event đã publish

- **Triệu chứng**: `OrderPlaced.total` từng là "chưa gồm ship", đổi thành "đã gồm ship".
- **Vì sao hỏng**: mọi event cũ trong store giờ bị diễn giải sai; projection replay ra số sai;
  consumer Kafka khác cũng hiểu sai.
- **Cách đúng**: field đã publish là **bất biến về ý nghĩa**. Cần khác → thêm field mới
  (`totalWithShipping`) hoặc `OrderPlacedV2`. Giữ upcaster cho bản cũ.

## 4. Không có snapshot cho aggregate sống lâu

- **Triệu chứng**: một aggregate 5.000 event; mỗi lần load replay từ 0 mất ~giây.
- **Vì sao hỏng**: latency ghi tệ (mỗi command phải load trước), CPU phí; dưới tải thì tệ hơn.
- **Cách đúng**: snapshot mỗi N event, load từ snapshot + replay phần đuôi. Snapshot là cache —
  xoá được, không phải nguồn sự thật. (Vici: đơn < 20 event, chưa cần — nhưng biết khi nào cần.)

## 5. Projection coi là nguồn sự thật

- **Triệu chứng**: sửa dữ liệu bằng `UPDATE orders_read_model`; hoặc không có cách dựng lại
  projection.
- **Vì sao hỏng**: read model và event store lệch nhau; không rebuild được khi đổi schema đọc.
- **Cách đúng**: projection là **phái sinh, vứt đi dựng lại được**. Mọi thay đổi state qua
  event. Có đường rebuild (truncate + replay) và test nó.

## 6. Publish event inline thay vì qua outbox

- **Triệu chứng**: sau `append(event)`, gọi thẳng `kafka.produce(event)`.
- **Vì sao hỏng**: append thành công nhưng Kafka down → event lọt khỏi hệ thống; hoặc Kafka OK
  nhưng transaction rollback → event "ma". Dual-write.
- **Cách đúng**: ghi `outbox` cùng transaction với `append`; relay publish sau. Xem
  [`06-outbox`](../06-outbox/README.md). Đây là ADR-004, bắt buộc.

## 7. Event store thành "dumping ground"

- **Triệu chứng**: ghi cả event kỹ thuật (`CacheInvalidated`, `EmailSent`) vào event store của
  aggregate.
- **Vì sao hỏng**: stream phình, replay chậm, lẫn lộn "sự thật nghiệp vụ" với "log kỹ thuật".
- **Cách đúng**: event store chỉ chứa **domain event của aggregate**. Log kỹ thuật đi nơi khác
  (OTel, log thường).

## 8. Chọn ES cho nghiệp vụ không cần lịch sử

- **Triệu chứng**: catalog sản phẩm hoặc hồ sơ khách làm event-sourced "cho đồng bộ với order".
- **Vì sao hỏng**: gánh toàn bộ chi phí ES (version, snapshot, rebuild, onboarding) cho nghiệp
  vụ mà "state hiện tại" là đủ; mọi query cần projection.
- **Cách đúng**: ES chỉ nơi lịch sử là **yêu cầu** (đơn, thanh toán, sổ cái). Chỗ khác: CRUD +
  audit table nếu cần dấu vết. Vici làm đúng vậy (chỉ order-service).

## 9. Bỏ optimistic concurrency

- **Triệu chứng**: append event không kèm `expectedVersion`.
- **Vì sao hỏng**: hai request đồng thời cùng đọc version 5, cả hai append version 6 → mất một
  thay đổi (lost update), hoặc hai event mâu thuẫn cùng version.
- **Cách đúng**: unique `(stream_id, version)`; append với `expectedVersion`; conflict → retry
  (load lại) hoặc trả lỗi cho client.

## Checklist — Definition of Done

- [ ] Nghiệp vụ này thật sự cần lịch sử đầy đủ (không phải "cho đồng bộ")
- [ ] Event đặt tên quá khứ, là sự thật nghiệp vụ (không phải diff cột/field)
- [ ] `apply(event)` chỉ set state; invariant kiểm ở command method
- [ ] Append kèm `expectedVersion`; unique `(stream_id, version)`; xử lý conflict
- [ ] Stream id có `tenant_id` (`(tenant_id, aggregate_id)`); event mang `tenant_id`
- [ ] Publish qua outbox cùng transaction, không inline
- [ ] Projection là phái sinh; có đường rebuild và đã test
- [ ] Kế hoạch schema evolution: field mới optional / upcaster / event version mới; không đổi ý nghĩa field cũ
- [ ] Có ngưỡng snapshot xác định (kể cả khi chưa cần)

> 🗣️ Nói thành lời: "Lỗi ES kinh điển: một là kiểm invariant trong `apply`, làm replay event cũ
> bị chặn khi luật đổi — `apply` chỉ set state thôi. Hai là đổi ý nghĩa field event đã publish,
> làm mọi event cũ bị hiểu sai. Ba là coi projection là nguồn sự thật thay vì phái sinh. Và
> luôn phải publish qua outbox chứ không produce Kafka inline."
