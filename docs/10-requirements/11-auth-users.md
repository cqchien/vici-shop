# FR — Tài khoản & Xác thực (`FR-AUTH`)

Services: **auth-service** (xác thực), **user-service** (hồ sơ). Cả hai dùng **TypeScript/NestJS**
([ADR-011](../20-architecture/adrs/ADR-011-identity-customer-plane-nestjs.md)) — `@nestjs/passport`
cho OAuth + JWT, **guard** cho RBAC; không CQRS/ES/Saga.

> **Phạm vi tenant:** auth-service là **nguồn của claim `tid`** — mọi JWT mang `tid` (tenant id)
> + `sub` + `role`; đăng nhập diễn ra trong phạm vi tenant của host
> ([ADR-009](../20-architecture/adrs/ADR-009-tenant-context-propagation.md)). `role` mới thêm:
> `tenant_admin` (chủ shop), `platform_admin` (Platform Operator — token **không** có `tid`).
> `Account` (credential) mang `tenant_id` (một email đăng ký riêng ở mỗi tenant); hồ sơ khách
> (`user-service`) scoped RLS theo tenant.

> **Đối chiếu FE mock (2026-07):** FR-AUTH-06 có hai gap thật cần backend implement đầy đủ (FE
> mock cắt góc vì không có backend thật):
>
> 1. `User` chưa có field **ngày sinh** — chặn luôn FR-LOY-07 (quà sinh nhật) phía sau.
> 2. **Không có CRUD địa chỉ nào** trong mock (`addAddress`/`editAddress`/`setDefault` không tồn
>    tại) — `addresses` chỉ gán cố định lúc seed; form địa chỉ ở checkout là text tự do, tỉnh là
>    `<select>` 5 lựa chọn cứng, quận/phường là input text thường, không theo danh mục hành chính
>    chuẩn. Backend + FE phải xây đúng CRUD + danh mục tỉnh/quận/phường thật.
>
> FR-AUTH-03's phân quyền theo action (chỉ `admin` được điều chỉnh tồn/hoàn tiền/sửa điểm) cũng
> **chưa hề được enforce** trong mock — mọi action gọi được bất kể role, vì mock không có session
> thật. Đây là việc bắt buộc phải làm đúng ở backend: **guard theo role** ở service NestJS
> (auth/user/order/tenant/billing) / **middleware theo role** ở service Go — không có gì để
> "đối chiếu" từ mock ngoài việc UI ẩn/hiện nút theo role.

## Xác thực

- **FR-AUTH-01 [M]** Đăng ký bằng email + mật khẩu (xác minh email bằng OTP/link); đăng nhập
  trả **JWT access token** (15 phút) + **refresh token** (30 ngày, rotate khi dùng).
- **FR-AUTH-02 [M]** Quên mật khẩu qua email; đổi mật khẩu thì thu hồi mọi refresh token.
- **FR-AUTH-03 [M]** Phân quyền: `customer`, `staff`, `admin`/`tenant_admin` (phạm vi một tenant),
  `platform_admin` (phạm vi nền tảng). Khu `/admin` chỉ cho `staff`/`admin`/`tenant_admin` của
  đúng tenant; các thao tác nhạy cảm (điều chỉnh tồn, hoàn tiền, sửa điểm) chỉ `admin`/
  `tenant_admin`. Khu `/platform` chỉ cho `platform_admin`. Service tự enforce RBAC (Kong chỉ
  verify token — ADR-005).
- **FR-AUTH-04 [S]** Đăng nhập Google (OAuth) cho khách.
- **FR-AUTH-05 [S]** Rate limit đăng nhập/OTP tại Kong; khoá tạm sau 5 lần sai.

## Hồ sơ khách

- **FR-AUTH-06 [M]** Hồ sơ: tên, điện thoại, ngày sinh; **nhiều địa chỉ giao hàng** (tỉnh/quận/
  phường chuẩn hoá theo danh mục hành chính VN), một địa chỉ mặc định.
- **FR-AUTH-07 [M]** Trang tài khoản: lịch sử đơn (kèm pre-order đang chờ), điểm & hạng thành
  viên, waitlist đã đăng ký, review đã viết.
- **FR-AUTH-08 [M]** Admin xem danh sách khách: tìm kiếm, lọc theo hạng, xem chi tiết lịch sử
  mua; khoá tài khoản vi phạm.
