# Kafka / event-driven — Pitfalls & thực hành

## 1. Event thực chất là command

- **Triệu chứng**: topic `order.send_email`, `inventory.please_reserve`; publisher biết chính
  xác ai phải xử lý và mong một kết quả.
- **Vì sao hỏng**: bạn cưới coupling của command với eventual-consistency + at-least-once của
  event — tệ nhất cả hai. "Please reserve" qua Kafka: không biết reserve thành công chưa, không
  chờ được.
- **Cách đúng**: command cần kết quả → **gRPC** (`ReserveStock`). Event là **sự thật quá khứ**
  publisher không quan tâm ai xử lý (`order.completed`).

## 2. Không có DLQ — poison message chặn partition

- **Triệu chứng**: consumer gặp message không parse được, retry vô hạn, không tiến.
- **Vì sao hỏng**: partition đứng, consumer lag tăng vô hạn, **mọi event sau nó không được xử
  lý** — finance ngừng ghi sổ, email ngừng gửi. Sự cố lan rộng.
- **Cách đúng**: sau N retry → đẩy vào `<topic>.dlq` kèm lỗi + metadata, commit offset, alert.
  Xử lý DLQ riêng.

## 3. Consumer không idempotent

- Đã nói kỹ ở [`06-outbox/04`](../06-outbox/04-pitfalls-va-thuc-hanh.md#4-consumer-không-idempotent).
  Tóm: at-least-once → trùng → cộng doanh thu/điểm hai lần. Dedupe theo `eventId` trước khi apply.

## 4. Ép thứ tự toàn cục

- **Triệu chứng**: 1 partition cho topic "để mọi event đúng thứ tự".
- **Vì sao hỏng**: 1 partition = 1 consumer xử lý tuần tự = throughput trần thấp; drop 1.000
  người thì lag chồng chất.
- **Cách đúng**: partition theo `aggregate_id`/`orderId`. Thứ tự chỉ *trong* một aggregate.

## 5. Breaking schema change trên topic đang chạy

- **Triệu chứng**: thêm field bắt buộc / đổi kiểu / đổi tên field trong Avro schema của
  `order.completed`.
- **Vì sao hỏng**: consumer cũ (chưa deploy bản mới) đọc event mới → lỗi deserialize → vào DLQ
  hàng loạt. Hoặc consumer mới đọc event cũ (còn trong retention) → thiếu field.
- **Cách đúng**: chỉ **thêm field optional có default**. Breaking → `eventType` version mới
  (`OrderCompletedV2`), publish cả hai một thời gian, migrate consumer, rồi mới dừng V1. Buf/Schema
  Registry chặn breaking trong CI.

## 6. Xử lý message chậm → rebalance storm

- **Triệu chứng**: consumer gọi 3 API bên ngoài đồng bộ cho mỗi message, mất vài giây; vượt
  `max.poll.interval.ms` → Kafka coi consumer chết → rebalance → lặp lại.
- **Vì sao hỏng**: nhóm dành phần lớn thời gian rebalance, không xử lý; lag tăng.
- **Cách đúng**: xử lý message nhanh (chỉ update DB local); việc chậm (gọi API ngoài) đẩy sang
  bước sau / hàng đợi riêng. Batch hợp lý. Cooperative rebalancing.

## 7. Event notification thay vì event-carried state

- **Triệu chứng**: `OrderCompleted { orderId }` — finance phải gRPC ngược sang order-service lấy
  line item.
- **Vì sao hỏng**: coupling đồng bộ ngược; order-service chết → finance kẹt; mất "fire and
  forget".
- **Cách đúng**: event mang snapshot đủ dùng. Payload to hơn nhưng consumer độc lập.

## 8. Coi Kafka như database

- **Triệu chứng**: query Kafka để lấy "trạng thái hiện tại của đơn X".
- **Vì sao hỏng**: Kafka là log, không index theo thuộc tính; scan cả topic. Chậm, sai mục đích.
- **Cách đúng**: Kafka để **truyền** event; state hiện tại đọc từ read model / aggregate. Replay
  là để dựng lại read model, không phải để query ad-hoc.

## 9. Thiếu `tenant_id` trên event

- **Triệu chứng**: event không có `tenantId`; consumer không set `app.tenant_id`.
- **Vì sao hỏng**: RLS fail-closed → consumer ghi read model = 0 dòng, hoặc ghi nhầm tenant.
  Bug đúng đắn/bảo mật trong hệ đa tenant.
- **Cách đúng**: `tenantId` trong envelope + header `tenant-id`; consumer đọc header → set
  session var trước khi ghi. (ADR-009.)

## 10. Không giám sát consumer lag

- **Triệu chứng**: không có metric/alert cho `records-lag`.
- **Vì sao hỏng**: consumer chậm hoặc chết âm thầm → sổ sách/email trễ hàng giờ mà không ai
  biết cho tới khi khách phàn nàn.
- **Cách đúng**: export consumer lag lên Prometheus, alert khi lag vượt ngưỡng hoặc tăng liên tục.

## Checklist — Definition of Done

- [ ] Event là sự thật quá khứ (`x.completed`), không phải command trá hình (`x.please_do`)
- [ ] Consumer dedupe theo `eventId` trước khi apply
- [ ] Mỗi consumer có retry backoff giới hạn + DLQ `<topic>.dlq` + alert
- [ ] Partition key = aggregate id; không ép thứ tự toàn cục
- [ ] Schema Avro: chỉ thêm field optional; breaking → eventType version mới; CI chặn breaking
- [ ] Xử lý message nhanh; việc chậm/gọi API ngoài tách khỏi vòng consume
- [ ] Event mang snapshot đủ dùng (event-carried state), không bắt consumer gọi ngược
- [ ] `tenantId` trong envelope + header `tenant-id`; consumer set `app.tenant_id`
- [ ] Consumer lag có metric + alert
- [ ] Consumer group id ổn định, đặt theo `registry.md`

> 🗣️ Nói thành lời: "Lỗi nặng nhất là thiếu DLQ — một message hỏng chặn cả partition, mọi event
> sau nó không được xử lý, sự cố lan rộng. Thứ hai là breaking schema change trên topic đang
> chạy làm consumer cũ vào DLQ hàng loạt — tôi chỉ thêm field optional, breaking thì làm event
> version mới. Và luôn giám sát consumer lag, vì consumer chết âm thầm thì sổ sách trễ hàng giờ
> không ai biết."
