# FR — Tenant & Onboarding (`FR-TEN`)

Service: **tenant-service** (NestJS — CQRS + Saga, [ADR-008](../20-architecture/adrs/ADR-008-platform-plane-services-nestjs.md)).
Domain: [30-domain/05-tenant-lifecycle.md](../30-domain/05-tenant-lifecycle.md).
Cô lập: [ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md) ·
[ADR-009](../20-architecture/adrs/ADR-009-tenant-context-propagation.md).

> **Đối chiếu FE mock (2026-08):** wizard `/start` mô phỏng đủ 5 bước và saga provisioning bằng
> timer; console `/platform` mô phỏng danh sách tenant, suspend/resume, impersonate. FE giữ dữ
> liệu một tenant "đang xem" + registry `tenants[]` — backend thật scope bằng RLS.

## Đăng ký & khởi tạo (self-serve onboarding)

- **FR-TEN-01 [M]** Khách vãng lai đăng ký tenant tại `/start` (không cần tài khoản trước):
  tên shop, mô tả ngắn, thị trường, email chủ shop. Tạo luôn tài khoản chủ shop (role
  `tenant_admin`) gắn tenant mới.
- **FR-TEN-02 [M]** Chọn **địa chỉ web** `{subdomain}.vici.shop`: kiểm tra trùng realtime,
  chỉ `[a-z0-9-]`, 3–40 ký tự, chặn danh sách reserved (`www`, `admin`, `api`, `platform`…).
  Tên miền riêng thêm sau ở cài đặt (FR-TEN-11).
- **FR-TEN-03 [M]** Chọn **gói dịch vụ** (từ `billing-service`, FR-BIL-01); mặc định gói khởi
  đầu miễn phí, không cần thẻ.
- **FR-TEN-04 [S]** Chọn **seed dữ liệu mẫu**: có/không tạo sẵn 1 brand + 1 series blind box +
  vài sản phẩm demo để chủ shop hình dung (xoá được sau).
- **FR-TEN-05 [M]** Sau khi submit, chạy **saga provisioning** với các bước có compensation:
  1. tạo bản ghi tenant (`status = provisioning`) + tài khoản chủ shop;
  2. khởi tạo cấu hình mặc định mỗi context (settings ship/point/hold, template email);
  3. seed catalog mẫu (nếu chọn);
  4. đăng ký subdomain (route Kong theo `Host`);
  5. phát `tenant.provisioned` → các context khác chuẩn bị dữ liệu khởi đầu của mình;
  6. `status = active`, gửi email "cửa hàng đã sẵn sàng".
  Bước nào fail → compensation ngược lại, tenant về `provisioning_failed`, hiển thị lý do, cho
  retry. Toàn saga đạt **NFR-14** (< 5 phút p95).
- **FR-TEN-06 [M]** Trong lúc provisioning, `/start` hiển thị tiến độ từng bước; xong thì nút
  "Vào trang quản trị" dẫn tới `/admin` của tenant.

## Vòng đời tenant (Platform Operator)

- **FR-TEN-07 [M]** Platform Operator (role `platform_admin`) xem danh sách mọi tenant: tên,
  subdomain, gói, `status`, MRR, ngày tạo, lượng dùng so với hạn mức. Lọc theo `status`/gói,
  tìm theo tên/subdomain.
- **FR-TEN-08 [M]** Chuyển trạng thái tenant theo state machine
  (`provisioning → active → past_due → suspended → archived`, xem
  [05-tenant-lifecycle.md](../30-domain/05-tenant-lifecycle.md)):
  - **suspend** (thủ công hoặc do `billing.payment_failed` quá hạn): storefront trả trang
    "cửa hàng tạm ngưng", `/admin` chỉ còn trang thanh toán; dữ liệu giữ nguyên.
  - **resume**: khôi phục về `active`.
  - **archive**: chỉ-đọc 90 ngày (NFR-16) rồi xoá cứng theo yêu cầu.
- **FR-TEN-09 [M]** **Impersonate**: Operator mở `/admin` của một tenant để hỗ trợ — cấp token
  có `tid` của tenant đó, hạn ≤ 30 phút, ghi audit (ai/tenant/lý do), banner hiển thị trong
  `/admin` suốt phiên (NFR-06b).
- **FR-TEN-10 [S]** Bảng tổng nền tảng: số tenant theo `status`, đăng ký mới 30 ngày, hàng chờ
  provisioning, tenant sắp tới hạn thanh toán.

## Cài đặt tenant (chủ shop, trong `/admin`)

- **FR-TEN-11 [M]** Chủ shop sửa **thương hiệu**: tên hiển thị, logo, màu nhấn (chọn từ token
  hệ thống), múi giờ, thông tin liên hệ. Storefront áp dụng ngay.
- **FR-TEN-12 [S]** Gắn **tên miền riêng**: nhập domain → hiển thị bản ghi DNS cần tạo →
  verify → phát hành chứng chỉ (mock ở FE; backend thật dùng ACME).
- **FR-TEN-13 [M]** Xem **gói hiện tại + lượng dùng** so với hạn mức; nút nâng/hạ gói dẫn sang
  luồng `billing-service` (FR-BIL-04).
- **FR-TEN-14 [S]** **Export dữ liệu tenant** (JSON) và yêu cầu **xoá tenant** — xác nhận hai
  bước; xoá đưa tenant sang `archived`.

## Ranh giới

- tenant-service **sở hữu**: bảng `tenants`, tài khoản chủ shop ↔ tenant, cấu hình thương hiệu,
  tên miền, tiến trình provisioning, audit impersonate.
- **Không sở hữu**: gói dịch vụ & subscription & hạn mức (billing-service), credential đăng nhập
  (auth-service — nhận `tid` để gắn claim), dữ liệu nghiệp vụ của tenant (các context tự seed
  khi nhận `tenant.provisioned`).
