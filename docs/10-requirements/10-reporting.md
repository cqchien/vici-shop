# FR — Báo cáo (`FR-REP`)

Service: **finance-service** (read models từ event, tách khỏi sổ cái kế toán).

> **Phạm vi tenant:** mọi read model báo cáo mang `tenant_id`, RLS scoped; báo cáo chủ shop chỉ
> thấy số liệu tenant mình. Báo cáo **cross-tenant** (MRR, doanh thu nền tảng) thuộc
> `billing-service` / Platform Console, không phải module này
> ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md)).

> **Đối chiếu FE mock (2026-07):** FR-REP-03/04/06 đã có mock tương đối đầy đủ, dùng làm tham
> chiếu bố cục màn hình. Ba gap cần backend hoàn thiện đúng spec:
>
> - FR-REP-01 thiếu "so cùng kỳ" (period-over-period) — mock chỉ hiện doanh thu hôm nay + tổng
>   14 ngày, không có % so sánh.
> - FR-REP-02 thiếu bóc tách theo brand/series/loại sản phẩm/phương thức thanh toán — mock chỉ
>   bóc theo ngày và theo hạng khách.
> - FR-REP-05 thiếu khách mới-vs-quay-lại và LTV top khách.
> - FR-REP-07 (CSV) chưa có ở bất kỳ bảng nào.
>
> Ngoài ra mock có một KPI ops chưa được đặc tả ở đâu: **SLA đóng gói 4 giờ** kể từ lúc đơn
> `confirmed` (cảnh báo "sắp trễ SLA" trên dashboard, hằng số `PACK_SLA_HOURS = 4`) — chính thức
> hoá thành **FR-REP-08 [S]** dưới đây vì nó là một chỉ số vận hành thật đang dùng, không phải chi
> tiết UI vụn vặt.

- **FR-REP-01 [M]** **Dashboard admin**: doanh thu hôm nay/tuần/tháng (so cùng kỳ), số đơn theo
  trạng thái, đơn chờ xử lý, SKU sắp hết hàng, drop/pre-order đang chạy.
- **FR-REP-02 [M]** **Báo cáo doanh thu** theo ngày/tuần/tháng; bóc tách theo brand, series,
  loại sản phẩm, phương thức thanh toán; biểu đồ xu hướng.
- **FR-REP-03 [M]** **Bán chạy**: top sản phẩm/variant theo số lượng & doanh thu trong kỳ;
  tỉ lệ bán hết của từng drop (sold-through).
- **FR-REP-04 [M]** **Tồn kho**: giá trị tồn hiện tại (theo giá vốn), hàng chậm luân chuyển
  (không bán được sau N ngày), vòng quay tồn kho.
- **FR-REP-05 [M]** **Khách hàng**: khách mới vs quay lại, phân bố theo hạng thành viên, giá
  trị vòng đời (LTV) top khách.
- **FR-REP-06 [S]** **Hiệu quả campaign**: doanh thu quy cho voucher/flash sale/drop; tỉ lệ
  chuyển đổi waitlist → mua.
- **FR-REP-07 [S]** Mọi bảng báo cáo xuất được CSV.
- **FR-REP-08 [S]** **SLA đóng gói**: cảnh báo đơn `confirmed` quá 4 giờ chưa chuyển `packing`
  trên dashboard (đếm "đơn sắp/đã trễ SLA"); ngưỡng giờ cấu hình được (mặc định 4h).
