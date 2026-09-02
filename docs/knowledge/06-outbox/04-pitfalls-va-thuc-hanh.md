# Outbox — Pitfalls & thực hành

## 1. Publish Kafka inline "cho nhanh"

- **Triệu chứng**: `await repo.save(order); await kafka.produce(evt)` trong handler.
- **Vì sao hỏng**: đây chính là dual-write outbox sinh ra để loại bỏ. Kafka down → event mất;
  transaction rollback sau produce → event ma.
- **Cách đúng**: `INSERT outbox` trong cùng transaction; relay publish. ADR-004 cấm inline —
  đây không phải khuyến nghị.

## 2. Ghi outbox ngoài transaction ghi state

- **Triệu chứng**: `repo.save(order)` commit, rồi mở transaction mới `INSERT outbox`.
- **Vì sao hỏng**: hai transaction → lại là dual-write (state có, outbox có thể fail). Đúng
  nghĩa "outbox" mất.
- **Cách đúng**: cùng một transaction, cùng một connection. Application layer điều phối để repo
  và outbox writer nhận cùng `tx`.

## 3. Relay đảo thứ tự: update `sent_at` trước, produce sau

- **Triệu chứng**: `UPDATE outbox SET sent_at = now()` rồi mới `produce`.
- **Vì sao hỏng**: produce fail (Kafka timeout) → event đã đánh dấu "đã gửi" → **mất vĩnh viễn**.
- **Cách đúng**: produce trước, update sau. Chấp nhận trùng khi crash giữa chừng (at-least-once).

## 4. Consumer không idempotent

- **Triệu chứng**: consumer `order.completed` cộng doanh thu, không dedupe.
- **Vì sao hỏng**: relay redeliver (crash sau produce) → sổ cái cộng doanh thu hai lần; MRR sai;
  điểm thưởng khách gấp đôi.
- **Cách đúng**: bảng `processed_events(event_id)` unique, hoặc unique constraint tự nhiên
  (`journal.source_event_id`). Dedupe **trước khi** apply. Bắt buộc (ADR-004).

## 5. Không dọn bảng outbox

- **Triệu chứng**: outbox giữ mọi hàng từ ngày một, hàng chục triệu dòng.
- **Vì sao hỏng**: partial index vẫn nhanh, nhưng bảng phình → vacuum lâu, backup to, `SELECT`
  cho điều tra chậm.
- **Cách đúng**: job xoá `sent_at < now() - interval '7 days'`. Giữ vài ngày để trace/điều tra.

## 6. Một relay, không chạy song song được

- **Triệu chứng**: relay là singleton; scale service lên 3 instance thì 3 relay giẫm nhau,
  produce trùng ồ ạt.
- **Vì sao hỏng**: trùng nhiều (không chỉ khi crash) → tải consumer tăng, dedupe làm việc nhiều.
- **Cách đúng**: `SELECT ... FOR UPDATE SKIP LOCKED LIMIT N` — nhiều relay lấy các batch khác
  nhau, an toàn. Hoặc leader-election cho một relay active.

## 7. Ép thứ tự toàn cục

- **Triệu chứng**: tất cả event vào một partition để "giữ thứ tự".
- **Vì sao hỏng**: một partition = một consumer xử lý tuần tự → throughput trần thấp, không
  scale khi drop.
- **Cách đúng**: partition theo `aggregate_id` / `orderId`. Thứ tự chỉ đảm bảo *trong* một
  aggregate (đủ cho nghiệp vụ). Giữa aggregate: không cần.

## 8. Payload outbox thiếu thông tin, consumer phải gọi ngược lại

- **Triệu chứng**: `OrderCompleted { orderId }` — consumer finance phải gọi gRPC sang order-service
  lấy line item để ghi sổ.
- **Vì sao hỏng**: coupling đồng bộ ngược; order-service chết thì finance kẹt; mất tính "fire
  and forget".
- **Cách đúng**: event mang **snapshot đủ dùng** (line item, tổng tiền, cogs). Đánh đổi payload
  to hơn lấy độc lập.

## 9. Quên `tenant_id` trong outbox / header

- **Triệu chứng**: hàng outbox không có `tenant_id`; consumer không set `app.tenant_id`.
- **Vì sao hỏng**: consumer ghi read model với RLS → 0 dòng (fail-closed) hoặc ghi nhầm tenant.
  Với hệ đa tenant đây là bug bảo mật/đúng đắn.
- **Cách đúng**: cột `tenant_id` trên outbox; relay copy → header Kafka `tenant-id`; consumer
  đọc header → `SET app.tenant_id` trước khi ghi. (ADR-009.)

## 10. Coi outbox như hàng đợi công việc chung

- **Triệu chứng**: nhét cả "gửi email", "gọi API bên thứ ba", "resize ảnh" vào outbox.
- **Vì sao hỏng**: outbox là để **publish domain event** đảm bảo không mất; không phải job queue.
  Trộn vào làm relay phức tạp, retry semantics lẫn lộn.
- **Cách đúng**: outbox chỉ chứa domain event. Consumer của event mới là nơi làm side effect
  (email…), và nó có retry/DLQ riêng.

## Checklist — Definition of Done

- [ ] `INSERT outbox` nằm trong **cùng transaction, cùng connection** với thay đổi state
- [ ] Không có `kafka.produce` / `eventbridge.putEvents` nào trong request handler
- [ ] Relay: produce trước, đánh dấu `sent_at` sau
- [ ] Relay chạy song song an toàn (`FOR UPDATE SKIP LOCKED`) hoặc leader-election
- [ ] Partial index `(sent_at) WHERE sent_at IS NULL`; job dọn hàng đã gửi > 7 ngày
- [ ] Mọi consumer dedupe theo `eventId` trước khi apply; DLQ `<topic>.dlq` + alert
- [ ] Event mang `tenantId` (payload) + header `tenant-id`; cột `tenant_id` trên outbox
- [ ] Payload event đủ để consumer xử lý độc lập (snapshot), không phải gọi ngược
- [ ] Partition key = aggregate id; không ép thứ tự toàn cục
- [ ] Outbox chỉ chứa domain event, không phải job queue

> 🗣️ Nói thành lời: "Ba lỗi outbox: một là vẫn produce Kafka inline; hai là ghi outbox ở
> transaction khác với ghi state; ba là relay update `sent_at` trước khi produce nên produce
> fail thì mất event. Và consumer bắt buộc idempotent vì relay có thể redeliver. Payload event
> phải mang snapshot đủ dùng để consumer không phải gọi ngược lại."
