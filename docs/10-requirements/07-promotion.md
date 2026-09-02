# FR — Khuyến mãi, Drop & Waitlist (`FR-PROMO`)

Service: **promotion-service**. Domain: [30-domain/03-blind-box-and-drops.md](../30-domain/03-blind-box-and-drops.md).

> **Phạm vi tenant:** `Voucher`, `FlashSale`, `Drop`, `DropAllocation`, `WaitlistEntry`,
> `PreOrderCampaign` mang `tenant_id`, RLS scoped. `voucher.code` unique trong một tenant.
> Counter allocation drop trên Redis mang tiền tố `tenant_id`. Drop & pre-order chỉ bật khi gói
> tenant cho phép (`FR-BIL-01`). ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md))

> **Đối chiếu FE mock (2026-07):** ba điểm cần backend cài **đúng** spec, không theo mock:
>
> 1. FR-PROMO-04 nói rõ allocation/giới hạn tính **theo SKU** — FE mock đơn giản hoá thành theo
>    `productId` (đủ cho demo vì mỗi sản phẩm drop hiện chỉ có một variant), nhưng với sản phẩm
>    có nhiều variant (single_box/whole_set) thì phải tách theo SKU như spec gốc.
> 2. FR-PROMO-01's điều kiện phạm vi áp dụng (brand/series/sản phẩm, hạng thành viên) chưa có
>    trong `Voucher` của FE mock — mọi voucher demo áp dụng toàn shop, mọi hạng. Giữ nguyên yêu
>    cầu, bổ sung field `scope`/`tier_required` khi implement thật.
> 3. FR-PROMO-02's "lượt dùng hoàn lại khi đơn bị huỷ trước thanh toán" — mock tăng `usedCount`
>    lúc đặt hàng nhưng **không bao giờ giảm lại** khi `cancelOrder`. Đây là bug trong mock, không
>    phải quyết định nghiệp vụ — backend phải hoàn lượt dùng đúng spec.

## Voucher & giảm giá

- **FR-PROMO-01 [M]** Admin tạo **voucher**: mã, loại (% / số tiền cố định / free ship), điều
  kiện (đơn tối thiểu, brand/series/sản phẩm áp dụng, hạng thành viên), tổng lượt dùng, lượt
  dùng/khách, thời gian hiệu lực. Trạng thái: `draft → active → paused/expired`.
- **FR-PROMO-02 [M]** Validate + ghi nhận lượt dùng voucher là atomic (không vượt tổng lượt khi
  nhiều người dùng đồng thời). Lượt dùng hoàn lại khi đơn bị huỷ trước thanh toán.
- **FR-PROMO-03 [M]** **Flash sale**: khung giờ + danh sách sản phẩm với giá sale + số lượng
  giới hạn mỗi sản phẩm; hiển thị đồng hồ đếm ngược và thanh "đã bán x%".

## Drop (mở bán giới hạn theo lịch)

- **FR-PROMO-04 [M]** Admin lên lịch **drop**: thời điểm mở bán, danh sách sản phẩm + số lượng
  phân bổ, **giới hạn mua/khách** (theo SKU), tuỳ chọn **early access** cho hạng thành viên
  (mở sớm X phút — FR-LOY-05).
- **FR-PROMO-05 [M]** Tại giờ mở bán: sản phẩm chuyển mua được; hệ thống thực thi giới hạn
  mua/khách và số lượng phân bổ **chính xác dưới tải đồng thời** (không oversell, không lách
  giới hạn bằng nhiều đơn). Trước giờ mở: trang sản phẩm hiện đếm ngược, không cho thêm giỏ.

## Pre-order campaign

- **FR-PROMO-06 [M]** Admin mở **pre-order campaign**: khoảng thời gian nhận đặt, % cọc, ngày
  hàng về dự kiến, số lượng nhận đặt (hoặc không giới hạn), chính sách cọc khi khách bỏ
  (mất cọc/hoàn một phần). Đơn sinh ra theo FR-ORD-07..09.

## Waitlist

- **FR-PROMO-07 [M]** Sản phẩm hết hàng hoặc drop chưa mở: khách bấm **"nhận thông báo"** →
  vào waitlist; khi có hàng lại/sắp mở bán, notification-service gửi email (FR-NOTI-03).
- **FR-PROMO-08 [S]** Admin xem quy mô waitlist theo sản phẩm — tín hiệu quyết định nhập thêm
  hàng/mở drop mới.
