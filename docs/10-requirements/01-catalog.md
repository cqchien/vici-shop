# FR — Catalog & Blind Box (`FR-CAT`)

Service: **product-service**. Domain: [30-domain/03-blind-box-and-drops.md](../30-domain/03-blind-box-and-drops.md).

> **Phạm vi tenant:** mọi bảng/aggregate của module này mang `tenant_id`; truy vấn luôn scoped
> qua Postgres RLS ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md)). Khoá
> unique (`slug`, `sku`…) chỉ unique **trong một tenant**. Số sản phẩm active bị chặn theo hạn
> mức gói (`FR-BIL-09`).

> **Đối chiếu FE mock (2026-07):** FR-CAT-08 hiện chỉ mô phỏng lọc brand/loại/còn hàng/tìm kiếm +
> sắp xếp mới nhất/giá — **thiếu lọc theo series, khoảng giá, sắp xếp bán chạy và phân trang**;
> đây là phần backend + FE phải hoàn thiện đúng spec, không phải yêu cầu đã lỗi thời. FR-CAT-10
> (ảnh kèm review) cũng chưa có trong FE mock (`Review` không có field ảnh) — giữ nguyên yêu cầu,
> bổ sung khi có upload service thật.

## Sản phẩm & variant

- **FR-CAT-01 [M]** Admin tạo/sửa/lưu trữ (archive) sản phẩm: tên, slug, mô tả, ảnh, brand,
  series, tags, trạng thái (`draft` / `active` / `archived`). Sản phẩm `archived` không hiển thị
  storefront nhưng giữ nguyên trong đơn hàng cũ.
- **FR-CAT-02 [M]** Sản phẩm có nhiều **variant** (size, phiên bản màu…); mỗi variant có SKU
  riêng, giá riêng, ảnh riêng. Giá lưu bằng VND (số nguyên).
- **FR-CAT-03 [M]** Loại sản phẩm: `regular` (bán thường), `blind_box` (mua theo hộp/nguyên set),
  `preorder` (đặt trước — xem FR-ORD), `drop_exclusive` (chỉ bán trong drop — xem FR-PROMO).
- **FR-CAT-04 [M]** Phân loại theo **brand** (Pop Mart, 52TOYS…) và **series** (Skullpanda,
  Molly…); một series thuộc một brand.

## Blind box

- **FR-CAT-05 [M]** Series blind box khai báo danh sách figure kèm **tỉ lệ xuất hiện**, đánh dấu
  figure `secret`/`chase`. Storefront hiển thị đầy đủ danh sách + tỉ lệ (minh bạch với khách).
- **FR-CAT-06 [M]** Blind box bán theo hai đơn vị: **1 hộp ngẫu nhiên** hoặc **nguyên set**
  (đủ các figure thường, không gồm secret) với giá set riêng.
- **FR-CAT-07 [S]** Trang series hiển thị figure nào còn hàng khi mua lẻ hộp đã khui (live sale
  về sau — chỉ cần cấu trúc dữ liệu hỗ trợ).

## Hiển thị, tìm kiếm & review

- **FR-CAT-08 [M]** Danh sách sản phẩm lọc theo brand, series, loại, khoảng giá, còn hàng;
  sắp xếp theo mới nhất/giá/bán chạy. Phân trang.
- **FR-CAT-09 [M]** Tìm kiếm full-text tiếng Việt không dấu (Postgres `tsvector` + unaccent).
- **FR-CAT-10 [M]** Khách đã mua mới được review (1–5 sao + nội dung + ảnh); admin ẩn review vi
  phạm. Điểm trung bình hiển thị trên trang sản phẩm.
- **FR-CAT-11 [S]** Sản phẩm liên quan: cùng series/brand (rule-based, không cần ML).
- **FR-CAT-12 [S]** Review sản phẩm blind-box cho phép khách gắn **nhân vật đã bốc được** (figure
  đã mua và mở, kể cả secret) vào bài review — hiển thị pill "Ra {tên figure}" trên storefront.
  Tính năng đã có trên FE mock (`Review.pulled`) nhưng chưa được đặc tả — chính thức hoá tại đây.
