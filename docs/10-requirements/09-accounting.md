# FR — Kế toán (`FR-ACC`)

Service: **finance-service**. Sổ sách ghi **từ event** (order, payment, inventory) — không nhập
tay số liệu bán hàng; chỉ chi phí vận hành là nhập tay.

> **Phạm vi tenant:** `JournalEntry`, `JournalLine`, `CostLot`, `Expense` mang `tenant_id`, RLS
> scoped. Mỗi tenant có sổ cái riêng, `entry_no` riêng. Consumer event set `app.tenant_id` từ
> header `tenant-id` trước khi ghi ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md),
> [ADR-009](../20-architecture/adrs/ADR-009-tenant-context-propagation.md)). Phí giao dịch nền
> tảng (theo gói) là một loại chi phí trong sổ tenant.

> **Đối chiếu FE mock (2026-07):** FR-ACC-01/02/03 đã khớp mock khá sát (bút toán kép khi
> `order.completed`/nhập hàng, giá vốn moving-average đúng công thức) — dùng làm tham chiếu hành
> vi khi viết use case thật. FR-ACC-05 (đối soát), FR-ACC-06 (công nợ NCC — `paymentStatus` phiếu
> nhập trong mock chỉ set một lần lúc tạo, không có action cập nhật), FR-ACC-07 (xuất CSV) đều
> **chưa có trong mock** — giữ nguyên yêu cầu, đúng như roadmap P4/P5.

- **FR-ACC-01 [M]** **Sổ cái (ledger)**: mỗi sự kiện tài chính sinh bút toán kép bất biến
  (immutable, append-only) — ghi nhận doanh thu khi đơn `completed`, tiền về theo giao dịch
  payment, giá vốn khi xuất kho, hoàn tiền, tiền cọc pre-order (ghi nhận là **khoản khách trả
  trước**, chưa phải doanh thu).
- **FR-ACC-02 [M]** **Giá vốn** theo **moving average** trên mỗi SKU, cập nhật từ phiếu nhập
  hàng (FR-INV-05); mỗi dòng đơn bán ra chốt giá vốn tại thời điểm xuất kho.
- **FR-ACC-03 [M]** **Chi phí vận hành** nhập tay theo danh mục (thuê mặt bằng, marketing,
  đóng gói…) để tính lãi/lỗ đầy đủ.
- **FR-ACC-04 [M]** **Báo cáo P&L** theo tháng/quý: doanh thu thuần − giá vốn − phí ship chịu −
  phí cổng thanh toán − chi phí vận hành = lợi nhuận. Drill-down xuống bút toán gốc.
- **FR-ACC-05 [M]** **Đối soát COD & cổng thanh toán**: so khớp tiền về thực tế (đối tác vận
  chuyển chuyển khoản COD, cổng settle) với số ghi sổ; chênh lệch được liệt kê để xử lý.
- **FR-ACC-06 [S]** Công nợ nhà cung cấp từ phiếu nhập (đã trả/còn nợ).
- **FR-ACC-07 [S]** Xuất dữ liệu CSV theo kỳ cho kế toán thuế bên ngoài.
