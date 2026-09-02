# Outbox — Khái niệm

> Vì sao quan trọng: đây là loại bug im lặng nhất và đắt nhất — event mất mà không ai biết cho
> tới khi finance thiếu doanh thu hoặc khách không nhận email. Outbox loại bỏ nó tận gốc.

## Dual-write hỏng thế nào

Nhiều nghiệp vụ cần làm hai việc "cùng lúc": đổi state **và** báo cho hệ thống khác.

```
// SAI — dual write
db.save(order)              // (1) commit vào Postgres
kafka.produce(OrderPlaced)  // (2) publish lên Kafka
```

Bốn kịch bản, hai kịch bản hỏng:

| (1) DB | (2) Kafka | Kết quả |
| --- | --- | --- |
| ✅ | ✅ | OK |
| ✅ | ❌ (Kafka down, network) | **Đơn có, event mất** → finance không ghi sổ, không gửi email |
| ❌ (rollback sau khi produce) | ✅ | **Event "ma"** → consumer xử lý đơn không tồn tại |
| ❌ | ❌ | OK (không có gì xảy ra) |

Không có thứ tự nào của (1) và (2) cứu được: đảo lại thì produce trước, DB fail sau → event ma.
Bọc trong "transaction" cũng không được — Kafka không tham gia transaction của Postgres.

> Hệ quả production: mất `order.completed` → doanh thu tháng thiếu, đối soát lệch, phải điều
> tra thủ công. Event ma → alert giả, consumer crash. Cả hai đều khó phát hiện vì "phần lớn
> thời gian nó chạy đúng".

## Ý tưởng outbox

Biến "phát event" thành **một phần của cùng transaction ghi state**, bằng cách ghi nó vào cùng
database:

```
BEGIN
  INSERT INTO orders ...           -- thay đổi state
  INSERT INTO outbox (event...)    -- event, CÙNG transaction
COMMIT
```

Hai `INSERT` này **atomic** — cùng commit hoặc cùng rollback. Không còn "đơn có event mất".

Sau đó, một **relay** (tiến trình riêng) làm phần "giao cho Kafka":

```
loop:
    rows = SELECT * FROM outbox WHERE sent_at IS NULL ORDER BY id LIMIT 100
    for row in rows:
        kafka.produce(row.topic, row.payload)
        UPDATE outbox SET sent_at = now() WHERE id = row.id
```

Kafka down? Relay retry mãi, event vẫn nằm trong bảng, không mất. Relay chết? Khởi động lại,
đọc tiếp từ chỗ chưa `sent`.

## Delivery semantics — at-least-once

Outbox cho **at-least-once**, không phải exactly-once:

- Relay produce Kafka thành công nhưng crash **trước khi** `UPDATE sent_at` → lần sau produce
  lại → **event trùng**.
- Đây là đánh đổi chấp nhận được: **thà trùng còn hơn mất**.
- Hệ quả bắt buộc: **mọi consumer phải idempotent** — nhận cùng event hai lần phải cho cùng kết
  quả (dedupe theo `eventId`). Đây là điều kiện đi kèm outbox, không tách rời.

Exactly-once "thật" cần transactional messaging phức tạp; ở quy mô Vici, at-least-once +
consumer idempotent là đủ và đơn giản hơn nhiều.

## Vì sao không dùng cách khác

- **2PC giữa Postgres và Kafka**: phức tạp, chậm, khoá; Kafka bản chất không hợp 2PC.
- **"Publish rồi mới commit, rollback thì gửi event huỷ"**: chồng chất, vẫn có cửa sổ hỏng.
- **Chấp nhận mất event**: không chấp nhận được cho doanh thu, thanh toán, email giao dịch.

## Glossary

| Term | Một câu |
| --- | --- |
| Dual-write | Ghi hai hệ thống trong một thao tác, không có cách làm atomic |
| Outbox table | Bảng trong DB của service, chứa event chờ publish |
| Relay / message relay | Tiến trình đọc outbox → publish broker → đánh dấu sent |
| Polling publisher | Relay kiểu quét bảng định kỳ |
| CDC (Change Data Capture) | Relay đọc từ WAL/binlog của DB (Debezium), không quét bảng |
| At-least-once | Message đến ít nhất một lần, có thể nhiều hơn |
| Idempotent consumer | Xử lý cùng message nhiều lần cho cùng kết quả |

> 🗣️ Nói thành lời: "Dual-write là ghi DB rồi produce Kafka — nếu Kafka fail thì state có mà
> event mất, không thứ tự nào cứu được. Outbox biến việc phát event thành INSERT vào một bảng
> trong cùng transaction ghi state, nên atomic. Một relay riêng đọc bảng đó và publish, Kafka
> down thì event vẫn nằm chờ. Đổi lại là at-least-once nên mọi consumer phải idempotent, dedupe
> theo event id. Ở dự án tôi làm đây là quy tắc bắt buộc, cấm produce Kafka inline."
