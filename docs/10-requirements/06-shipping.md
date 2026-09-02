# FR — Vận chuyển (`FR-SHIP`)

Service: **shipping-service**. Đối tác: **GHN**, **GHTK** (sandbox trước).

> **Phạm vi tenant:** `Shipment`, `ShippingRate`, `TrackingEvent` mang `tenant_id`, RLS scoped.
> Tài khoản đối tác vận chuyển (shop id, token) và địa chỉ lấy hàng là **theo tenant**. Ngưỡng
> freeship (`FR-SHIP-07`) là cài đặt theo tenant ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md)).

> **Đối chiếu FE mock (2026-07):** FR-SHIP-01 cần khối lượng/kích thước từ sản phẩm để tính phí —
> `Product`/`Variant` phía FE **chưa có** field `weight_grams`/`box_dimensions` nào cả, nên mock
> dùng phí cố định theo gói dịch vụ (nhanh/tiết kiệm/nhận tại shop). Product-service thật phải bổ
> sung hai field này (xem [30-domain/04-data-models.md](../30-domain/04-data-models.md)) trước khi
> shipping-service tính phí đúng spec. FR-SHIP-04 (giao thất bại 3 lần → `returned`) và FR-SHIP-06
> (vận đơn chiều ngược cho đổi trả) cũng chưa có cơ chế thật trong mock (chỉ có số `attempts` tĩnh
> ở seed) — giữ nguyên yêu cầu cho backend.

- **FR-SHIP-01 [M]** Tính phí ship tại checkout theo địa chỉ nhận + khối lượng/kích thước gói
  (từ thông số sản phẩm); khách chọn giữa các gói dịch vụ (nhanh/tiết kiệm).
- **FR-SHIP-02 [M]** Tạo **vận đơn** trên GHN/GHTK khi đơn sang `packing` xong; lưu mã vận đơn,
  in phiếu gửi.
- **FR-SHIP-03 [M]** Nhận **webhook tracking** từ đối tác, map về trạng thái nội bộ
  (`picked_up → in_transit → out_for_delivery → delivered / failed`); cập nhật đơn hàng qua event.
- **FR-SHIP-04 [M]** Giao thất bại: tối đa 3 lần phát; quá thì hàng hoàn về, đơn chuyển
  `returned`, COD không ghi doanh thu.
- **FR-SHIP-05 [M]** Khách theo dõi trạng thái giao hàng trên trang đơn hàng (timeline).
- **FR-SHIP-06 [S]** Đổi trả: sinh vận đơn chiều ngược (khách gửi về shop) cho yêu cầu đổi trả
  được duyệt.
- **FR-SHIP-07 [S]** Free ship theo ngưỡng giá trị đơn (cấu hình), cộng hưởng được với voucher.
- **FR-SHIP-08 [C]** Art toy dễ móp hộp — flag "gói bảo vệ hộp" (double box) tính thêm phí,
  lưu vào yêu cầu đóng gói của đơn.
