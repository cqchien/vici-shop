# Design System

Một Next.js app ba zone (ADR-006 + ADR-007): **storefront** hướng cảm xúc sưu tầm, **admin**
(tenant) hướng mật độ thông tin, **platform console** (nền tảng) cùng khung admin nhưng accent
`viol`; kèm wizard **onboarding** `/start`. Chung một bộ token và component để giữ nhất quán và
tái dùng.

> **Nguồn chuẩn chi tiết: [`frontend/DESIGN.md`](../../frontend/DESIGN.md)** — trích xuất từ
> Claude Design "Vici Shop v3" và là hợp đồng UI/UX cho mọi thay đổi frontend. File này chỉ tóm
> tắt nguyên tắc; token/hex, typography, chuyển động và pattern từng màn nằm bên đó.

## Nguyên tắc

1. **Mobile-first cho storefront** (đa số khách mua bằng điện thoại), desktop-first cho admin.
2. **Ảnh sản phẩm là nhân vật chính** — nền trung tính, component không tranh chú ý với ảnh.
3. Trạng thái khan hiếm (drop, giới hạn, hết hàng) phải nổi bật và **trung thực** — không dark
   pattern (đếm ngược giả, tồn kho giả).
4. Theme sáng/tối bằng token (`html[data-theme]`, lưu localStorage); hai theme cùng đạt contrast AA.
5. **Số liệu nghiệp vụ luôn mono** (IBM Plex Mono): giá, mã đơn, SKU, countdown, tỉ lệ secret —
   nhận diện đặc trưng "sưu tầm nghiêm túc" của Vici.

## Tokens (CSS variables → Tailwind `@theme inline`)

| Token | Vai trò |
| --- | --- |
| `bg` `card` `card2` `line` `line2` | Nền trang / card / nền lõm / viền nhạt / viền đậm |
| `tx` `tx2` `tx3` | Chữ chính / phụ / mờ |
| `pri` + `pri-soft` (hồng) | Hành động mua chính, blind box |
| `sky` + `sky-soft` | Pre-order / cọc / thông tin |
| `drop` + `drop-soft` (cam) | Drop giới hạn, lỗi, chi phí |
| `viol` + `viol-soft` (tím) | Secret, series, Collector |
| `gold` + `gold-soft` | Loyalty Gold, cảnh báo nhẹ, "sắp mở" |
| `mint` + `mint-soft` | Thành công, còn hàng, dòng tiền vào |
| `ink` | Nút "đen" cho bước trung gian (chữ trên nó là `bg`) |

Font: **Be Vietnam Pro** (body — hỗ trợ tiếng Việt tốt, quen thuộc e-commerce VN),
**Plus Jakarta Sans** (heading), **IBM Plex Mono** (số liệu), **Material Symbols Rounded** (icon
qua component `<Icon />` — không dùng emoji cho icon UI).

## Component chung (`src/components/ui/`)

`Button` (primary/dark/secondary/ghost/danger, size sm/md/lg) · `Card` · `Badge` (pill mono
UPPERCASE) · `Icon` · `PlaceholderArt` (ảnh mock sọc chéo — thay bằng `<Image />` khi có API) ·
`Input/Select/Textarea` + `FormField` · `Toggle` · `Stepper` · `Dialog` · `Table` (header mono) ·
`Tabs` (segmented) · `Chip` (filter pill) · `StatTile` (KPI admin) · `EmptyState` · `Toast`
(pill ink giữa đáy) · `Countdown` (ô card2, ô giây màu pri) · `ProgressBar` (+`striped` cho drop
live) · `Price` · `OrderStatusBadge`/`ShipmentStatusBadge` (map trạng thái → màu qua
`toneClasses` trong `src/lib/labels.ts`).

## Zone riêng

- **Storefront**: `ProductCard` (ảnh 1:1 + tag pill, hãng, giá mono, dòng cọc sky cho
  pre-order), `SeriesLineup` (grid nhân vật + tỉ lệ; secret viền tím + "?" + hiệu ứng sheen),
  `DropCard` (accent trái, pill live pulse, progress sọc chạy, countdown), nghi thức **lắc hộp**
  3 bước ở màn xác nhận blind box, thẻ loyalty Gold gradient + sheen. Header hiển thị **tên +
  logo tenant hiện tại** (`currentTenant`), không hard-code "VICI".
- **Admin**: `AdminShell` (sidebar 236px nhóm theo section mono: Tổng quan / Sản phẩm / Vận hành
  / Tăng trưởng / Tài chính / Hệ thống), topbar có **chip tenant** (emoji + tên, pill `card2`
  mono), `RevenueChart` (bar chart SVG-free, cột cuối màu pri), kanban giao vận 4 cột,
  `OrderTimeline`, sổ sách ± xanh/cam mono. Khi impersonate: **banner `viol-soft`** full-width
  trên `<main>` ("Đang xem với tư cách {tenant} — Thoát").
- **Platform Console** (`/platform`, role `platform_admin`): shell **cùng khung hình với
  AdminShell** nhưng accent = **`viol`** (logo phụ đề `PLATFORM`, item active `viol-soft`).
  `StatTile` KPI, `Table` tenant, badge trạng thái tenant (map trong `tenantStatusMeta`), bar
  lượng dùng (mint < 80% → gold ≥ 80% → drop ≥ 100%). Ô logo tenant = emoji trên nền
  `{accentToken}-soft` (helper `accentPair` trong `labels.ts`).
- **Onboarding wizard** (`/start`, công khai, layout tối giản): card giữa `max-w-[560px]`, thanh
  progress = N vạch `h-1` (`bg-pri` khi ≤ step), một bước một màn, nút "Quay lại / Tiếp tục" ·
  bước cuối "Tạo cửa hàng". Bước provisioning = **stepper saga**: mỗi bước một dòng, chấm tròn
  `running` nền `pri-soft` + `animate-pulse`, `done` nền `mint-soft` + icon `check`. Xong →
  nút lớn "Vào trang quản trị". Pill `MOCK` nhắc provisioning mô phỏng bằng timer.
- **Plan / pricing card**: `Card` cột, tên `font-display`, giá `font-data` lớn ("Miễn phí" khi
  0₫), danh sách hạn mức + tính năng (icon `check_circle` mint / `cancel` + gạch ngang khi
  không có).

## Ngôn ngữ & format

- UI tiếng Việt, xưng "bạn", giọng gọn và chơi ("Săn secret. Sưu tầm nghiêm túc.").
- Nhãn trạng thái tập trung tại `src/lib/labels.ts` (chưa cần framework i18n — NFR-12).
- Tiền: `Intl.NumberFormat('vi-VN')` + `₫`; ngày: `dd/MM/yyyy HH:mm` (UTC+7).
