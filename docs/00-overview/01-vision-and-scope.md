# Tầm nhìn & Phạm vi

## Sản phẩm

**Vici** là **nền tảng thương mại điện tử đa tenant** cho các cửa hàng art toy tại Việt Nam.
Mỗi tenant là một chủ shop: tự đăng ký, tự khởi tạo cửa hàng (`{tên-shop}.vici.shop`), tự vận
hành catalog, blind box, drop, đơn hàng, kho, khuyến mãi và sổ sách — trên một hạ tầng dùng
chung. Nền tảng cũng có **Platform Operator** vận hành toàn bộ tenant (gói dịch vụ, provisioning,
tạm ngưng/khôi phục, doanh thu nền tảng).

Cửa hàng đầu tiên — **VICI Saigon** (Pop Mart, 52TOYS, TOYCITY… và hàng độc quyền tự sản xuất)
— là **tenant tham chiếu**: mọi tính năng mới được chứng minh trên tenant này trước.

> Lịch sử: dự án khởi đầu là ý tưởng SaaS omnichannel, [ADR-001](../20-architecture/adrs/ADR-001-microservices-for-single-store.md)
> thu hẹp về một cửa hàng, rồi [ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md)
> (2026-08-30) mở lại thành nền tảng đa tenant với mô hình **pooled** (`tenant_id` + Postgres RLS)
> — nhẹ hơn nhiều so với SaaS omnichannel ban đầu.

## Vấn đề cần giải

**Cho người sưu tầm (khách của tenant):** mua hàng chủ yếu qua Facebook/Zalo và shop nhỏ lẻ —
không có nơi xem **tỉ lệ secret/chase** minh bạch, săn **drop giới hạn** phải canh bài đăng thủ
công, **pre-order** đặt cọc qua chuyển khoản tay không theo dõi được.

**Cho chủ shop (tenant):** quản lý tồn kho, đơn, khuyến mãi, sổ sách bằng Excel — sai sót, tốn
thời gian. Tự dựng website riêng thì quá tốn kém và không có sẵn nghiệp vụ art toy (blind box,
drop, waitlist, pre-order cọc).

**Cho nền tảng:** cần onboard chủ shop trong vài phút, cô lập dữ liệu giữa các shop tuyệt đối,
tính phí theo gói và hạn mức, mà chi phí hạ tầng trên mỗi shop phải thấp.

## Giải pháp

Ba nhóm người dùng trên cùng một hệ thống:

1. **Onboarding & Platform Console** — chủ shop đăng ký tại `/start`: tên shop → địa chỉ web →
   chọn gói → seed dữ liệu mẫu → nền tảng chạy **saga provisioning** (tạo workspace, seed catalog,
   cấu hình mặc định) → vào ngay trang quản trị. Platform Operator quản lý mọi tenant, gói dịch
   vụ, hạn mức và vòng đời tại `/platform`.
2. **Storefront (khách của tenant)** — mỗi tenant một storefront riêng thương hiệu: duyệt catalog
   theo brand/series, trang blind box hiển thị tỉ lệ secret, pre-order có đặt cọc, drop theo lịch
   với giới hạn mua, giỏ hàng → thanh toán (VNPay/Momo/ZaloPay/COD), theo dõi đơn & vận chuyển,
   tích điểm và hạng thành viên.
3. **Admin (chủ shop / tenant)** — quản lý sản phẩm & series blind box, tồn kho, đơn, vận chuyển,
   chiến dịch & lịch drop, khách hàng & hạng thành viên, sổ sách kế toán và báo cáo — tất cả
   **trong phạm vi tenant của mình**, cùng cài đặt thương hiệu và gói dịch vụ.

## Trong phạm vi (in scope)

- **Đa tenant (pooled)**: đăng ký & provisioning tự phục vụ, subdomain + tên miền riêng, cô lập
  dữ liệu bằng `tenant_id` + Postgres RLS ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md)),
  gói dịch vụ + subscription + hạn mức + đo lượng dùng, tạm ngưng/khôi phục/lưu trữ tenant.
- **Platform Console**: danh sách tenant, trạng thái provisioning, doanh thu nền tảng (MRR),
  impersonate tenant để hỗ trợ.
- Catalog: variant, brand, series, blind box (secret/chase), review, tìm kiếm — **theo tenant**.
- Tồn kho: stock, reservation khi checkout, điều chỉnh, phiếu nhập hàng — **theo tenant**.
- Bán hàng: giỏ, checkout, đơn (kể cả pre-order cọc), thanh toán, vận chuyển (GHN/GHTK), đổi trả.
- Marketing: voucher, flash sale, drop có lịch + waitlist + giới hạn mua, thông báo.
- Khách hàng: tài khoản, địa chỉ, điểm thưởng, hạng thành viên với quyền early access.
- Vận hành: kế toán (sổ cái, giá vốn, lãi/lỗ), báo cáo — **theo tenant**.

## Ngoài phạm vi (out of scope)

- **Database-per-tenant / schema-per-tenant** — đã cân nhắc và loại trong
  [ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md); pooled + RLS là mô hình
  v1. Silo cho tenant enterprise có thể bổ sung sau bằng ADR mới.
- **Bán đa kênh (omnichannel)** — không tích hợp Shopee/TikTok Shop/Lazada/POS/Facebook/Zalo inbox.
- **No-code storefront builder** — tenant tuỳ biến thương hiệu (logo, màu, tên miền), không
  kéo-thả layout; giao diện storefront do nền tảng xây.
- Chatbot, hệ gợi ý (recommendation) bằng ML — có thể bổ sung sau bằng ADR mới.

## Mục tiêu thành công (v1)

- Chủ shop đăng ký → có storefront chạy được trong **< 5 phút**, không cần thao tác của nền tảng.
- Cô lập tuyệt đối: không truy vấn nào của tenant này chạm được dữ liệu tenant khác (RLS
  fail-closed; test integration chứng minh).
- Khách của một tenant mua được end-to-end: duyệt → giỏ → thanh toán → nhận hàng, kể cả
  pre-order và drop.
- Chủ shop vận hành toàn bộ cửa hàng trên web: không cần Excel cho tồn kho/đơn/sổ sách.
- Drop 1.000 người truy cập đồng thời (trong một tenant) không bán vượt tồn kho, không quá
  giới hạn mua/người.
