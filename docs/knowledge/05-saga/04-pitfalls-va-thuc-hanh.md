# Saga — Pitfalls & thực hành

## 1. Compensation không idempotent

- **Triệu chứng**: `RefundPayment` gọi lại (do retry) → hoàn tiền hai lần.
- **Vì sao hỏng**: mất tiền thật của shop; đối soát lệch; khách nhận thừa.
- **Cách đúng**: compensation nhận khoá idempotent (`paymentId` / `sagaId`), lưu "đã hoàn",
  request lặp là no-op trả kết quả cũ.

## 2. Chạy compensation sai thứ tự

- **Triệu chứng**: forward Reserve → Charge, bù theo cùng thứ tự (Release trước Refund).
- **Vì sao hỏng**: nhả tồn trước khi hoàn tiền → có cửa sổ khách "mất tiền + mất chỗ giữ hàng";
  hoặc bù một bước chưa từng chạy.
- **Cách đúng**: compensation theo **thứ tự ngược** với forward, và chỉ cho các bước **đã
  `done`**.

## 3. Đặt bước không-đảo-được trước bước hay-fail

- **Triệu chứng**: saga gửi hàng cho shipper rồi mới charge payment.
- **Vì sao hỏng**: payment fail → hàng đã đi, không đòi lại tự động được → kẹt, xử lý tay.
- **Cách đúng**: bước compensatable (Charge — bù bằng Refund) **trước** bước không đảo (Ship).
  Xác định **pivot step** rõ ràng.

## 4. Saga giữ state ở nhiều nơi

- **Triệu chứng**: order-service giữ một phần state saga, inventory-service giữ một phần, không
  ai có bức tranh đầy đủ.
- **Vì sao hỏng**: không biết saga đang ở đâu khi có sự cố; recovery không chạy được; hai nơi
  lệch nhau.
- **Cách đúng**: **một orchestrator** giữ toàn bộ state (`checkout.saga.ts` cho checkout,
  `provisioning.saga.ts` cho provisioning). Service khác chỉ nhận lệnh và trả kết quả.

## 5. Không có timeout cho bước chờ async

- **Triệu chứng**: saga chờ `payment.succeeded` mãi mãi; khách bỏ đi giữa chừng.
- **Vì sao hỏng**: reservation giữ tồn vô thời hạn → oversell tính sai; saga "treo" tích tụ.
- **Cách đúng**: mọi bước wait có timeout (`payment.expired` sau 30'). Timeout → nhánh
  compensation, đơn về `pending_payment` cho thử lại (FR-PAY-07).

## 6. Retry lỗi nghiệp vụ như thể lỗi tạm thời

- **Triệu chứng**: `ReserveStock` trả `INSUFFICIENT_STOCK`, saga retry 5 lần với backoff.
- **Vì sao hỏng**: phí thời gian + tài nguyên; kết quả vẫn fail; khách chờ lâu vô ích.
- **Cách đúng**: phân biệt qua contract. Lỗi domain (`INSUFFICIENT_STOCK`, `DROP_LIMIT_EXCEEDED`
  — xem [`04-service-contracts-conventions.md`](../../20-architecture/04-service-contracts-conventions.md) §4)
  → compensation ngay. Lỗi hạ tầng (timeout, 503) → retry backoff có giới hạn.

## 7. Dùng orchestration cho fan-out đơn giản (over-engineering)

- **Triệu chứng**: `order.completed` → finance/user/notification làm bằng một saga với state
  machine.
- **Vì sao hỏng**: thêm orchestrator + state cho việc không cần thứ tự, không cần bù. Ba
  consumer vốn độc lập.
- **Cách đúng**: choreography — một event, ba consumer idempotent. Xem
  [`05-key-flows.md`](../../20-architecture/05-key-flows.md) §5.

## 8. Choreography cho luồng cần phối hợp (under-engineering)

- **Triệu chứng**: checkout làm bằng chuỗi event, mỗi service tự phát event tiếp; không ai biết
  toàn cảnh.
- **Vì sao hỏng**: "đơn kẹt ở đâu?" không trả lời được; dễ tạo vòng lặp event; compensation rải
  rác không phối hợp được.
- **Cách đúng**: luồng ≥ 3 bước có compensation → orchestration.

## 9. Compensation cố "xoá dấu vết"

- **Triệu chứng**: bù bằng `DELETE FROM payments WHERE ...`.
- **Vì sao hỏng**: mất audit; kế toán không khớp (NFR-04: sổ cái append-only); tranh chấp với
  khách không có bằng chứng.
- **Cách đúng**: compensation là **giao dịch đảo có record** (`Refund` với `amount = -X`,
  `status = succeeded`), để lại lịch sử đầy đủ.

## 10. Bỏ qua semantic lock

- **Triệu chứng**: trong lúc saga chạy, thao tác khác vẫn sửa đơn/tồn như bình thường.
- **Vì sao hỏng**: hai luồng cùng đụng dữ liệu "đang chốt" → kết quả không xác định, oversell.
- **Cách đúng**: đánh dấu trạng thái trung gian (`reservation.held`, `order.pending_payment`);
  thao tác khác đọc trạng thái này và xử lý phù hợp.

## Checklist — Definition of Done

- [ ] Có đúng một orchestrator giữ toàn bộ state saga (không rải nhiều nơi)
- [ ] Mỗi bước compensatable có compensation tường minh; compensation chạy theo thứ tự ngược
- [ ] Pivot step xác định rõ; bước không-đảo-được nằm sau bước hay-fail
- [ ] Mọi forward action + compensation là idempotent (khoá theo sagaId/orderId)
- [ ] Bước chờ async có timeout + nhánh xử lý timeout
- [ ] Phân biệt lỗi nghiệp vụ (→ compensation) vs lỗi hạ tầng (→ retry backoff giới hạn)
- [ ] Compensation để lại dấu vết (giao dịch đảo), không xoá record
- [ ] Trạng thái trung gian đánh dấu bằng semantic lock; thao tác khác tôn trọng nó
- [ ] Chọn orchestration/choreography đúng: ≥3 bước + bù → orchestration; fan-out độc lập → choreography

> 🗣️ Nói thành lời: "Ba lỗi saga tôi hay thấy: compensation không idempotent nên retry hoàn
> tiền hai lần; đặt bước không đảo được trước bước hay fail nên kẹt phải xử lý tay; và state
> saga rải ở nhiều service nên không biết đang ở đâu khi có sự cố. Tôi luôn có một orchestrator
> giữ state, chia saga thành vùng compensatable trước pivot, và mọi bước idempotent với timeout
> cho bước chờ."
