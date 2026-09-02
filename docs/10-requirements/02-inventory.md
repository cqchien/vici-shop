# FR — Tồn kho (`FR-INV`)

Service: **inventory-service**. Một kho duy nhất **mỗi tenant**.

> **Phạm vi tenant:** `StockItem`, `Reservation`, `StockMovement`, `PurchaseReceipt` mang
> `tenant_id`; RLS scoped ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md)).
> `sku` unique trong một tenant. gRPC `ReserveStock`/`CommitReservation` nhận `tenant_id` qua
> metadata `x-tenant-id` ([ADR-009](../20-architecture/adrs/ADR-009-tenant-context-propagation.md)).

> **Đối chiếu FE mock (2026-07):** FR-INV-02/03 (reservation TTL, atomic hold) là **quan trọng
> nhất và chưa hề implement thật** trong FE mock — `StockItem.reserved` chỉ là số tĩnh gán lúc
> seed, không service nào tăng/giảm nó; đồng hồ đếm ngược ở trang checkout chỉ là UI timer, hết
> giờ không tự nhả gì cả. Mock trừ thẳng `on_hand` tại thời điểm đặt hàng thành công
> (`placeOrder`), bỏ qua toàn bộ vòng đời reservation. Đây là cơ chế chống oversell cốt lõi của
> hệ thống (NFR-02) — **backend phải cài đúng theo spec**, không được copy hành vi rút gọn của
> mock. FR-INV-08 (kiểm kê định kỳ) chưa có UI/action nào trong mock dù enum `stocktake` tồn tại
> — giữ nguyên yêu cầu.

- **FR-INV-01 [M]** Theo dõi tồn theo **variant (SKU)**: `on_hand` (thực có), `reserved`
  (đang giữ cho checkout/đơn chưa hoàn tất), `available = on_hand − reserved`.
- **FR-INV-02 [M]** **Reservation**: khi khách vào checkout, giữ hàng trong TTL (mặc định
  15 phút); hết TTL hoặc huỷ checkout thì tự nhả. Đơn xác nhận thì trừ `on_hand`.
- **FR-INV-03 [M]** Không bao giờ bán vượt tồn: mọi thao tác trừ/giữ hàng là atomic
  (optimistic locking / `UPDATE … WHERE available >= n`); thất bại trả lỗi rõ ràng.
- **FR-INV-04 [M]** **Điều chỉnh tồn** thủ công phải kèm lý do (kiểm kê, hỏng, mất…) và người
  thao tác — mọi biến động tồn có audit trail (`stock_movement`).
- **FR-INV-05 [M]** **Phiếu nhập hàng** (purchase receipt): nhà cung cấp, danh sách SKU, số
  lượng, **đơn giá vốn** — nguồn dữ liệu cho giá vốn moving-average bên finance-service.
- **FR-INV-06 [M]** Ngưỡng cảnh báo sắp hết hàng theo SKU; bắn event `inventory.stock_low` cho admin
  dashboard và notification.
- **FR-INV-07 [S]** Hàng pre-order dùng **tồn ảo** (allocation theo campaign, không phải
  `on_hand`); khi hàng về nhập kho thì map allocation → reservation thật.
- **FR-INV-08 [S]** Kiểm kê định kỳ: tạo phiên kiểm kê, nhập số đếm thực tế, hệ thống sinh
  điều chỉnh chênh lệch.
