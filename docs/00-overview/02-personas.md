# Personas

Vici là nền tảng đa tenant ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md)):
persona 1–2 là **khách của một tenant**, persona 3–4 là **chủ/nhân viên của một tenant**,
persona 5–6 là **cấp nền tảng**.

## 1. Người sưu tầm — "Minh" (khách hàng chính)

25–35 tuổi, nhân viên văn phòng, chơi art toy 2–3 năm, chi 2–10 triệu/tháng.

- Muốn xem **tỉ lệ secret**, danh sách figure trong series trước khi mua blind box.
- Săn drop giới hạn: cần biết **lịch drop chính xác**, được nhắc trước giờ mở bán, và tin rằng
  giới hạn mua/người được thực thi công bằng.
- Sẵn sàng **đặt cọc pre-order** 2–4 tháng trước hàng về nếu trạng thái minh bạch.
- Quan tâm điểm thưởng và quyền early access của hạng thành viên.

## 2. Người mua quà — "Lan" (khách hàng phụ)

Mua art toy làm quà tặng, không rành thuật ngữ (secret, chase, proto…).

- Cần điều hướng đơn giản: theo giá, theo nhân vật/brand nổi tiếng.
- Thanh toán nhanh, ưu tiên COD; cần chính sách đổi trả rõ ràng.

## 3. Chủ cửa hàng — "Vy" (admin chính)

Chủ shop art toy, hiện quản lý bằng Excel + Facebook.

- Cần một dashboard nhìn thấy: doanh thu hôm nay, đơn chờ xử lý, hàng sắp hết, drop sắp diễn ra.
- Tạo và vận hành chiến dịch: voucher, flash sale, **lên lịch drop**, mở pre-order có đặt cọc.
- Cuối tháng xem lãi/lỗ theo giá vốn thực (không đoán mò), đối chiếu sổ cái với tiền về.

## 4. Nhân viên vận hành — "Tú" (admin phụ)

Xử lý đơn hằng ngày: xác nhận đơn, đóng gói, đẩy đơn sang GHN/GHTK, xử lý đổi trả.

- Cần danh sách đơn lọc theo trạng thái, thao tác chuyển trạng thái ít click.
- Cập nhật tồn kho khi nhập hàng, kiểm kê định kỳ; mọi thay đổi tồn phải có lý do (audit).

## 5. Chủ shop mới — "Hải" (Shop Owner / Tenant Admin khi onboard)

Đang bán art toy qua Facebook, muốn có website riêng nhưng không rành kỹ thuật, ngại chi phí.

- Cần đăng ký nhanh: nhập tên shop, chọn địa chỉ web `{shop}.vici.shop`, chọn gói (bắt đầu
  miễn phí), có sẵn dữ liệu mẫu để hình dung — rồi vào quản trị ngay.
- Muốn storefront mang thương hiệu mình (logo, màu, sau này gắn tên miền riêng).
- Quan tâm hạn mức của gói (số sản phẩm, số đơn/tháng) và khi nào cần nâng cấp.

## 6. Platform Operator — "Ngân" (vận hành nền tảng)

Nhân sự của Vici, phụ trách toàn bộ tenant trên nền tảng.

- Cần bảng tổng: số tenant, tenant đang active/tạm ngưng, MRR, hàng chờ provisioning, đăng ký mới.
- Xử lý vòng đời tenant: tạm ngưng khi quá hạn thanh toán, khôi phục, lưu trữ và xoá dữ liệu
  theo chính sách lưu trữ.
- Hỗ trợ chủ shop: **impersonate** vào trang quản trị của một tenant (có giới hạn thời gian +
  ghi audit) để tái hiện lỗi.
- **Không bao giờ** thấy dữ liệu nghiệp vụ chi tiết của tenant trừ khi impersonate có lý do.
