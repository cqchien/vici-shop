# Event-driven & Kafka — Khái niệm

> Vì sao quan trọng: chọn sai giữa "gọi đồng bộ" và "phát event" là nguồn gốc của hệ thống
> phân tán giòn — một service chậm kéo sập cả chuỗi. Hiểu đúng ranh giới này quyết định
> availability của toàn hệ.

## Ba kiểu giao tiếp

| | Ai biết ai | Chờ kết quả? | Ví dụ Vici |
| --- | --- | --- | --- |
| **REST qua Kong** | Client → service | Có | `GET /products`, `POST /orders` |
| **gRPC nội bộ** | Service A gọi đích danh service B | Có | order → inventory `ReserveStock` |
| **Kafka event** | Publisher **không biết** ai consume | Không | `order.completed` → finance, user, notification |

Command (`ReserveStock`, `PlaceOrder`) = "hãy làm việc này", có người nhận cụ thể, chờ kết quả.
Event (`OrderPlaced`, `StockReserved`) = "việc này đã xảy ra rồi", ai quan tâm thì nghe.

## Vấn đề event-driven giải

Nếu order-service phải **gọi trực tiếp** finance + user + notification mỗi khi đơn hoàn tất:

- **Coupling thời gian**: notification chậm/chết → `POST /orders` chậm/lỗi theo, dù việc gửi
  email chẳng liên quan đến việc đặt đơn thành công.
- **Coupling thay đổi**: thêm một consumer mới ("cập nhật analytics") → phải sửa order-service.
- **order-service phải biết** finance/user/notification tồn tại, địa chỉ, contract của chúng.

Event-driven đảo lại: order-service phát `order.completed` rồi xong. Ba service kia tự nghe.
Thêm service thứ tư → chỉ nó tự đăng ký, order-service không đổi.

> Hệ quả production: availability của `POST /orders` không còn phụ thuộc availability của
> notification-service. Mỗi consumer chết độc lập, xử lý bù độc lập (Kafka giữ message chờ).

## Vì sao Kafka (không RabbitMQ / Redis pub-sub)

Từ [ADR-004](../../20-architecture/adrs/ADR-004-kafka-outbox-events.md):

- **Replay**: cần dựng lại read model finance từ đầu → đọc lại toàn bộ event từ offset 0.
  RabbitMQ xoá message sau khi ack; Redis pub-sub không lưu.
- **Consumer group**: nhiều instance notification-service chia nhau partition để scale.
- **Retention dài**: giữ event nhiều ngày–tuần cho audit và cho consumer mới "bắt đầu từ đầu".
- **Log, không phải queue**: Kafka là commit log append-only có thứ tự trong partition — hợp
  với "chuỗi sự thật".

Đánh đổi: Kafka nặng vận hành hơn (broker, ZooKeeper/KRaft, partition planning). ADR-010 đề
xuất thay bằng **EventBridge + SQS** (managed) khi lên serverless — cùng mô hình event-driven,
khác phương tiện.

## Event notification vs Event-carried state transfer

- **Notification**: event chỉ mang ID (`OrderCompleted { orderId }`); consumer gọi ngược lại
  lấy chi tiết. → payload nhỏ, nhưng coupling đồng bộ ngược.
- **Event-carried state transfer**: event mang **snapshot đủ dùng** (line item, tổng tiền,
  cogs). → payload to hơn, nhưng consumer xử lý **độc lập hoàn toàn**, không gọi ngược.

Vici chọn **event-carried state** (xem [`06-outbox/04`](../06-outbox/04-pitfalls-va-thuc-hanh.md#8-payload-outbox-thiếu-thông-tin-consumer-phải-gọi-ngược-lại))
— giữ tính "fire and forget".

## At-least-once — hệ quả bắt buộc

Kafka (+ outbox) cho at-least-once. Consumer **phải idempotent** (dedupe theo `eventId`). Đây
là điều kiện đi kèm, không phải tuỳ chọn. Xem [`06-outbox/01`](../06-outbox/01-khai-niem.md).

## Khi nào KHÔNG dùng event

- Caller **cần kết quả ngay để đi tiếp**: `ReserveStock` phải biết còn hàng không *trước khi*
  cho thêm vào giỏ → gRPC, không event.
- Nghiệp vụ cần **strong consistency** tức thì giữa hai bên → không hợp event (eventual).
- Chỉ có một consumer, một producer, quan hệ 1-1 chặt → gRPC đơn giản hơn.

## Glossary

| Term | Một câu |
| --- | --- |
| Topic | Kênh event theo tên (`order.completed`); chia thành partition |
| Partition | Một shard của topic; thứ tự đảm bảo *trong* partition |
| Offset | Vị trí một message trong partition; consumer commit offset đã xử lý |
| Consumer group | Nhóm instance chia nhau partition của topic để xử lý song song |
| Rebalance | Kafka phân lại partition khi consumer vào/ra nhóm |
| DLQ (dead-letter queue) | Topic chứa message xử lý fail hết retry, kèm lỗi gốc |
| Schema Registry | Nơi giữ + kiểm tương thích schema Avro |
| Replay | Đọc lại event từ offset cũ để dựng lại state |

> 🗣️ Nói thành lời: "Event-driven là publisher phát sự thật đã xảy ra và không biết ai nghe;
> consumer tự đăng ký. Nó cắt coupling thời gian — `POST /orders` không còn phụ thuộc
> notification-service sống hay chết. Tôi dùng Kafka vì cần replay để dựng read model, consumer
> group để scale, và retention dài cho audit. Nguyên tắc chọn: mặc định event, chỉ dùng gRPC
> khi caller cần kết quả ngay để đi tiếp như reserve stock."
