# FR — Thanh toán (`FR-PAY`)

Service: **payment-service**.

> **Phạm vi tenant:** `PaymentTransaction`, `Refund` mang `tenant_id`, RLS scoped. Cấu hình cổng
> thanh toán (merchant id, secret) là **theo tenant** — lưu ở secret manager có khoá theo
> `tenant_id`, không bao giờ trong UI/repo ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md),
> NFR-06). IPN/webhook phân giải tenant từ tham số giao dịch trước khi xử lý.

> **Đối chiếu FE mock (2026-07):** toàn bộ cổng thanh toán thật (FR-PAY-01/02/07) chưa tồn tại
> trong mock — thanh toán online được đánh dấu `succeeded` ngay lập tức, không có trạng thái
> `expired` (`PaymentTx.status` FE chỉ có `pending|succeeded|failed`). Đây là gap kỳ vọng (mock
> không giả lập cổng thật) — giữ nguyên toàn bộ yêu cầu cho payment-service thật, không rút gọn
> theo hành vi mock.

- **FR-PAY-01 [M]** Phương thức: **VNPay**, **Momo**, **ZaloPay** (redirect/QR sandbox trước) và
  **COD**. Mỗi giao dịch gắn 1 đơn hàng (hoặc 1 khoản cọc/phần còn lại của pre-order).
- **FR-PAY-02 [M]** Nhận kết quả qua **IPN/webhook** với verify chữ ký; idempotent — IPN trùng
  không ghi nhận hai lần. Trạng thái giao dịch: `pending → succeeded / failed / expired`.
- **FR-PAY-03 [M]** Đối chiếu: mỗi giao dịch lưu mã tham chiếu cổng thanh toán; admin xem danh
  sách giao dịch theo cổng/trạng thái/ngày.
- **FR-PAY-04 [M]** **Hoàn tiền** (toàn phần/một phần) qua API cổng nếu hỗ trợ, hoặc đánh dấu
  hoàn thủ công (chuyển khoản tay) kèm chứng từ; phát event `payment.refunded`.
- **FR-PAY-05 [M]** COD: xác nhận thu tiền khi shipping báo `delivered`; đơn COD thất bại giao
  thì ghi nhận hoàn hàng, không ghi nhận doanh thu.
- **FR-PAY-06 [M]** Pre-order: hỗ trợ 2 khoản thanh toán trên 1 đơn (cọc + phần còn lại), mỗi
  khoản một giao dịch độc lập.
- **FR-PAY-07 [S]** Timeout thanh toán online (30 phút): giao dịch `expired`, đơn quay về
  `pending_payment` cho phép thử lại phương thức khác.
