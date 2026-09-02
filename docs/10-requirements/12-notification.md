# FR — Thông báo (`FR-NOTI`)

Service: **notification-service**. Kênh v1: **email**; kiến trúc chừa chỗ cho Zalo ZNS/push sau.

> **Phạm vi tenant:** `NotificationTemplate`, `Delivery`, `Preference` mang `tenant_id`, RLS
> scoped. Template và **danh tính người gửi** (tên hiển thị, địa chỉ reply-to, sau này domain
> gửi) là **theo tenant** — email khách của tenant A mang thương hiệu A. Consumer set
> `app.tenant_id` từ header `tenant-id`
> ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md),
> [ADR-009](../20-architecture/adrs/ADR-009-tenant-context-propagation.md)). Email cấp nền tảng
> (chào mừng tenant, cảnh báo hạn mức, dunning) dùng template hệ thống.

- **FR-NOTI-01 [M]** Email giao dịch: xác minh tài khoản, đặt đơn thành công, thanh toán thành
  công/thất bại, đơn chuyển trạng thái lớn (shipped/delivered), hoàn tiền, nhắc thanh toán phần
  còn lại pre-order.
- **FR-NOTI-02 [M]** Tiêu thụ event Kafka từ các service (không service nào tự gửi email);
  template quản lý tập trung, biến số theo event schema.
- **FR-NOTI-03 [M]** **Nhắc drop & waitlist**: email trước giờ drop (đăng ký nhận), khi sản
  phẩm trong waitlist có hàng lại, khi pre-order campaign sắp đóng.
- **FR-NOTI-04 [M]** Retry với backoff khi gửi thất bại; DLQ cho message hỏng; không gửi trùng
  (idempotency theo event id).
- **FR-NOTI-05 [S]** Khách bật/tắt từng nhóm thông báo marketing (nhắc drop, khuyến mãi);
  email giao dịch luôn gửi.
- **FR-NOTI-06 [C]** Thông báo nội bộ cho admin: đơn mới, hàng sắp hết, chênh lệch đối soát.
