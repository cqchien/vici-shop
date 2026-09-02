# FR — Giỏ hàng & Checkout (`FR-CART`)

Service: **cart-service** (giỏ trên Redis; checkout session điều phối gọi các service khác).

> **Phạm vi tenant:** key Redis giỏ/checkout mang tiền tố `tenant_id`; mọi gRPC downstream
> (inventory, promotion) truyền `x-tenant-id`. Giỏ của cùng một người ở hai tenant là **tách
> biệt** ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md), [ADR-009](../20-architecture/adrs/ADR-009-tenant-context-propagation.md)).

> **Đối chiếu FE mock (2026-07):** FR-CART-01's guest-cart-merge không áp dụng được cho mock vì
> mock bắt đăng nhập mới vào được checkout (không có khái niệm guest cart riêng) — giữ nguyên yêu
> cầu cho backend thật (giỏ hàng nên hoạt động trước khi đăng nhập). FR-CART-05 phụ thuộc
> reservation thật (FR-INV-02) — như ghi ở [02-inventory.md](02-inventory.md), mock hiện chưa có
> reservation, đồng hồ giữ hàng ở checkout chỉ là timer hiển thị, hết giờ không tự nhả gì. Đây là
> phần bắt buộc backend phải cài đúng.

## Giỏ hàng

- **FR-CART-01 [M]** Khách (kể cả chưa đăng nhập — guest cart theo cookie) thêm/sửa số
  lượng/xoá item. Đăng nhập thì merge guest cart vào cart tài khoản.
- **FR-CART-02 [M]** Giỏ hiển thị tính khả dụng theo thời gian thực: item hết hàng/ngưng bán
  được đánh dấu và không cho checkout.
- **FR-CART-03 [M]** Item thuộc drop/pre-order mang theo ràng buộc của campaign (giới hạn số
  lượng/người, thời gian hiệu lực) — vượt giới hạn bị chặn ngay khi thêm vào giỏ.

## Checkout

- **FR-CART-04 [M]** Checkout session theo bước: địa chỉ giao → phương thức vận chuyển (phí
  từ shipping-service) → phương thức thanh toán → xem lại & xác nhận.
- **FR-CART-05 [M]** Bắt đầu checkout thì **reserve** tồn kho (FR-INV-02); hiển thị đồng hồ giữ
  hàng; hết hạn thì quay về giỏ với thông báo.
- **FR-CART-06 [M]** Áp voucher tại checkout: validate qua promotion-service (điều kiện, lượt
  dùng, thời hạn); hiển thị số tiền giảm từng dòng.
- **FR-CART-07 [M]** Dùng điểm thưởng trừ tiền (quy đổi theo FR-LOY-03) — chọn số điểm tại checkout.
- **FR-CART-08 [M]** Tổng kết đơn: tạm tính + phí ship − giảm giá − điểm = phải trả. Mọi con số
  từ server tính, client chỉ hiển thị.
