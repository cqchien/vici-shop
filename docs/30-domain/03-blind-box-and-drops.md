# Blind Box, Drop & Waitlist

Ba cơ chế đặc trưng của cửa hàng art toy — nằm ở hai contexts: **Catalog** (cấu trúc blind box)
và **Promotion** (drop, waitlist, pre-order campaign).

## Blind box (Catalog)

- Một **Series** blind box (vd. "Skullpanda City of Night") có **FigureLineup**: danh sách
  figure kèm tỉ lệ xuất hiện, trong đó 0–n figure đánh dấu `secret` (tỉ lệ hiếm, vd. 1/144).
- Bán theo hai variant: `single_box` (một hộp ngẫu nhiên — shop không biết và không hứa figure
  nào) và `whole_set` (nguyên set các figure thường; secret không đảm bảo).
- **Minh bạch là nguyên tắc**: storefront luôn hiển thị đầy đủ lineup + tỉ lệ như công bố của
  hãng. Shop không "chọn hộp" cho khách.
- Tồn kho theo variant như hàng thường — hộp ngẫu nhiên là một SKU, nguyên set là một SKU.

## Drop (Promotion)

**Drop** = đợt mở bán giới hạn theo lịch cho sản phẩm hot (thường là hàng độc quyền/giới hạn).

- Cấu hình: `starts_at`, danh sách SKU + **allocation** (số lượng dành cho drop), **per-customer
  limit** theo SKU, tuỳ chọn early access cho hạng `Gold`/`Collector` (mở sớm X phút).
  > FE mock hiện đơn giản hoá allocation/limit theo **`product_id`** thay vì SKU (đủ cho demo vì
  > sản phẩm drop trong mock chỉ có một variant) — khi implement thật, giữ đúng thiết kế theo SKU
  > ở trên để không vỡ khi một sản phẩm drop có nhiều variant.
- Trước giờ mở: trang sản phẩm hiện đếm ngược; nút mua khoá; khách bấm "nhắc tôi" → waitlist.
- Từ giờ mở: mọi add-to-cart đi qua kiểm tra eligibility **atomic** (allocation còn + khách
  chưa chạm limit — tính cả số đã nằm trong đơn chưa huỷ). Đây là điểm nóng concurrency của
  toàn hệ thống (NFR-02): counter giữ trong Redis, chốt lại bằng reservation Postgres.
- Kết thúc: bán hết allocation hoặc đến `ends_at`. Số liệu sold-through về Finance để báo cáo.

Chống lách giới hạn: limit tính theo `customer_id` (bắt buộc đăng nhập để mua hàng drop);
huỷ đơn drop **không** hoàn lại allocation về pool (tránh bot giữ-nhả).

## Pre-order campaign (Promotion)

- Nhận đặt trước trong khoảng thời gian, thu **cọc** (% cấu hình, vd. 30%), hẹn ngày hàng về.
- Không giữ tồn thật (hàng chưa tồn tại) — dùng **allocation ảo** đếm số suất nhận đặt.
- Hàng về nhập kho (Inventory) → event `inventory.stock_restocked` map campaign → các đơn
  `awaiting_stock` chuyển `balance_due` (xem [02-order-lifecycle.md](02-order-lifecycle.md)).
- Chính sách bỏ cọc khai báo ngay khi tạo campaign và hiển thị rõ cho khách trước khi đặt.

## Waitlist (Promotion)

- Gắn với một SKU (hết hàng) hoặc một drop (chưa mở). Một khách một entry.
- Kích hoạt: `inventory.stock_restocked` hoặc trước `drop.starts_at` (cấu hình, vd. 30 phút) →
  notification gửi email theo thứ tự đăng ký.
- Waitlist **không giữ chỗ** — chỉ là kênh thông báo; ai đến trước mua trước. Quy mô waitlist
  là tín hiệu nhập hàng cho admin (FR-PROMO-08).
