# Vici Shop — Design System (v3, re-base VICI Home DS)

Nguồn gốc: Claude Design "Vici Shop v3" (`claude.ai/design`, project `07be295a`), đã re-base lên
**VICI Home design system** (`_ds/vici-home-design-system-336be769`): neutral ấm (không xám lạnh),
pastel hồng/mint/lavender, shadow nâu nhạt, font Be Vietnam Pro + Inter. File này là
**hợp đồng UI/UX** cho toàn bộ frontend — storefront lẫn admin. Mọi component, màu, khoảng cách
mới phải bám theo đây; nếu cần chệch khỏi hệ thống, cập nhật file này trước rồi mới sửa code.

Định vị thương hiệu: cửa hàng art toy Sài Gòn cho người **sưu tầm nghiêm túc** — chơi (pastel,
hồng, animation nhẹ) nhưng đáng tin (số liệu Inter tabular, tỉ lệ công bố, kiểm seal on-cam).

**Đa tenant (ADR-007):** app có ba zone — storefront `/` + admin `/admin` (phạm vi một *tenant*,
lấy thương hiệu từ `currentTenant`), platform console `/platform` (cấp nền tảng, accent `viol`),
và wizard onboarding `/start`. Mỗi tenant tuỳ biến logo (emoji), màu nhấn (token), tên miền —
**không** kéo-thả layout.

---

## 1. Màu — design tokens

Token là CSS variable trong `src/app/globals.css`, ánh xạ vào Tailwind qua `@theme inline`.
**Không dùng palette mặc định của Tailwind** (`zinc-*`, `red-*`…) trong page/component — chỉ dùng
token. Dark mode đổi giá trị token qua `html[data-theme="dark"]`, vì vậy **không cần viết
`dark:`** cho màu token.

| Token | Light | Dark | Dùng cho |
| --- | --- | --- | --- |
| `bg` | `#FBFAF9` (neutral-50) | `#121110` | Nền trang — trắng ấm, không trắng tinh |
| `card` | `#FFFFFF` | `#1B1A18` | Nền card, bảng, input trên nền trang |
| `card2` | `#F5F3F1` (neutral-100) | `#232220` | Nền lõm: track progress, ô input trong card, hover row |
| `line` | `#EAE6E2` (neutral-200) | `#2A2926` | Viền mặc định, divider |
| `line2` | `#D8D2CC` (neutral-300) | `#3B3934` | Viền đậm hơn: nút secondary, dashed border |
| `tx` | `#201B17` (neutral-900) | `#F1EFEA` | Chữ chính |
| `tx2` | `#6E655F` (neutral-600) | `#ABA79D` | Chữ phụ (mô tả, label bảng) |
| `tx3` | `#918780` (neutral-500) | `#787468` | Chữ mờ (meta, placeholder, đơn vị) |
| `pri` / `pri-soft` | `#FA6FA0` / `#FFF5F8` (pink-500/50) | `#FF8FB8` / `#3A2430` | Hành động chính, blind box, giá trị nổi bật |
| `gold` / `gold-soft` | `#C98A1E` / `#FDEDD3` | `#E8A33D` / `#332B18` | Hạng Gold, cảnh báo nhẹ, "sắp mở" |
| `mint` / `mint-soft` | `#4EB98D` / `#F1FBF6` (mint-500/50) | `#74CFA9` / `#18291F` | Thành công, còn hàng, doanh thu |
| `sky` / `sky-soft` | `#9270DC` / `#F8F6FE` (lavender-500/50) | `#AC8EEA` / `#1B2536` | Pre-order, thông tin |
| `drop` / `drop-soft` | `#EF6F6F` / `#FBE2E2` (danger) | `#F08A8A` / `#361D16` | Drop, lỗi, chi phí, nguy hiểm |
| `viol` / `viol-soft` | `#7856C0` / `#F8F6FE` (lavender-600/50) | `#C6B0F3` / `#241E38` | Secret, series, Collector |
| `ink` | `#201B17` | `#F1EFEA` | Nút "đen" (CTA phụ mạnh) — chữ trên nó là `bg` |

Quy ước ngữ nghĩa (quan trọng — giữ nhất quán toàn app):

- **pri (hồng pastel)** = hành động mua chính + mọi thứ thuộc blind box.
- **sky (lavender)** = pre-order/cọc — re-base đổi từ xanh dương sang lavender-500.
  **drop (đỏ san hô)** = drop giới hạn + trạng thái lỗi/chi âm.
- **viol (lavender đậm)** = secret/series. **gold** = loyalty/chờ duyệt. **mint** = thành công/dòng tiền vào.
- Nút `ink` dùng cho bước trung gian (Tiếp tục, Xác nhận, Gửi); nút `pri` dành cho hành động
  chốt (Thêm vào giỏ, Đặt hàng, Mua ngay, Lưu).

Shadow: `--shadow-soft` (card nghỉ) và `--shadow-lift` (hover/overlay) — **nâu ấm**
(`rgba(111,79,62,…)`) ở light, đen ở dark; không bao giờ đen thuần ở light. Card hover:
`translateY(-2..3px)` + đổi sang `shadow-lift`.

## 2. Chữ

| Vai trò | Font | Tailwind | Ghi chú |
| --- | --- | --- | --- |
| Body / UI | **Be Vietnam Pro** | `font-sans` (mặc định) | Font Việt hoá tốt, quen thuộc với e-commerce VN |
| Heading / tên sản phẩm lớn | **Be Vietnam Pro** | `font-display` | Re-base: display = body (bỏ Plus Jakarta Sans); h1–h3 tự áp qua CSS; tracking âm nhẹ (`-.01em`…`-.025em`) |
| Số liệu, giá, mã đơn, SKU, countdown, pill kỹ thuật | **Inter** | `font-data` | Re-base: thay IBM Plex Mono; `.font-data` tự bật `tabular-nums` nên số vẫn thẳng cột |
| Icon | **Material Symbols Rounded** | component `<Icon />` | Không dùng emoji cho icon UI (emoji chỉ còn là "ảnh" sản phẩm mock) |

Cỡ chữ điển hình: hero 54/26px (desktop/mobile), h1 trang 28–30px, h2 section 22–24px, tiêu đề
card 14–16px, body 13–13.5px, meta 11–12px, pill data 9.5–10.5px + `tracking .08–.14em` + UPPERCASE.

## 3. Hình khối & khoảng cách

- Bo góc: card lớn/hero `rounded-2xl` (16px), card thường `rounded-xl` (12–14px), nút/input
  `rounded-[10px]`, pill/chip `rounded-full`, thumbnail `rounded-lg`.
- Viền 1px `line`; lựa chọn đang active dùng `1.5px` màu ngữ nghĩa (`pri`, `viol`…) + nền soft.
- Card accent trái: `border-l-[3px]` màu ngữ nghĩa (drop đang mở = `pri`/`drop`).
- Container: storefront `max-w-[1240px] px-7`, trang hẹp (cart 1080, checkout 720, confirm 640,
  login 420). Admin: sidebar 236px cố định + content `p-6`.
- Grid sản phẩm: 4 cột desktop / 2 cột mobile, `gap-4`; lineup 7 cột desktop / 4 cột mobile.
- Ảnh sản phẩm mock = `PlaceholderArt`: nền sọc chéo 45° (`card2`/`line`) + emoji/nhãn giữa,
  tag pill data góc trên trái.

## 4. Chuyển động

Nhẹ, có mục đích, ≤ .3s (trừ ambient). Định nghĩa sẵn trong `globals.css`:

| Keyframe | Dùng cho |
| --- | --- |
| `pop-in` | Checkmark xác nhận, card kết quả |
| `pulse-dot` | Chấm "ĐANG MỞ BÁN" / live |
| `badge-pop` | Badge số giỏ hàng khi tăng |
| `toast-in` | Toast trồi từ đáy |
| `stripe-move` | Progress bar sọc chéo của drop đang bán |
| `shake-box` | Nghi thức "lắc hộp" blind box ở màn xác nhận |
| `confetti` | Mảnh giấy bay khi reveal |
| `sheen` | Vệt sáng quét qua thẻ Gold / ô secret |
| `sheet-up` | Bottom sheet mobile |
| `float-y` | Ảnh hero/drop lơ lửng ambient |

Nút: `active:scale-95`, hover CTA `-translate-y-0.5` + shadow-lift. Progress width có
`transition-[width] duration-500`.

## 5. Component (`src/components/ui/`)

- `basics.tsx` — `Button` (primary=pri, dark=ink, secondary=viền line2, ghost, danger=drop;
  size sm/md/lg), `LinkButton`, `Card` (+`hover` prop), `Badge` (pill data UPPERCASE),
  `StatTile` (label + giá trị data + delta), `EmptyState` (khung dashed + mặt `( · _ · )`),
  `SectionTitle`, `Icon` (Material Symbols), `PlaceholderArt`.
- `form.tsx` — `Input`, `Select`, `Textarea` (nền card, focus viền `pri` + ring `pri-soft`),
  `FormField`, `Toggle` (switch 38×22 mint khi bật), `Stepper` (− số data +).
- `data.tsx` — `Table` (header data UPPERCASE 9.5px tracking rộng, row hover `card2`), `Td`,
  `Tabs` (segmented control nền `card2`, tab active nổi `card`), `Chip` (filter pill: active =
  nền `ink` chữ `bg`).
- `commerce.tsx` — `Price` (font-data), `OrderStatusBadge`, `ShipmentStatusBadge`, `Stars` (màu gold),
  `Countdown` (ô `card2` số data lớn, ô giây màu `pri`), `ProgressBar` (+`striped` cho drop live).
- `overlay.tsx` — `Dialog`, `ToastProvider` (toast kiểu v3: nền `ink` chữ `bg`, giữa đáy).

Badge trạng thái lấy màu từ `toneClasses` trong `src/lib/labels.ts` — đổi tông ở đó, cả app đổi theo.

## 6. Mẫu màn hình (patterns)

- **Storefront header**: sticky, blur, logo "VICI" + phụ đề data "ART TOYS — SAIGON", search giữa,
  nav (Drops có chấm pulse), toggle theme, pill hạng thành viên (gold-soft), nút giỏ `ink` + badge `pri`.
- **Product card**: ảnh vuông stripe + tag pill; hãng (11px tx3) → tên (14.5px semibold) → giá data;
  pre-order thêm dòng cọc màu `sky`; hết hàng `opacity-55`.
- **Drop**: card accent trái + pill live pulse + progress sọc chạy + "x/300 đã bán" data; sắp mở =
  countdown ô to + nút "Nhắc tôi" (bật = gold-soft); đã kết thúc = grayscale + opacity .85.
- **Blind box**: lineup grid, ô secret viền `viol` + gradient viol-soft + dấu `?` + sheen; pill
  "SECRET · 1/72". Sau khi đặt đơn thường: nghi thức lắc hộp 3 bước (niêm phong → lắc → tín hiệu tốt + confetti).
- **Pre-order**: mọi nơi hiển thị cả 3 số: tổng / cọc hôm nay / còn lại khi hàng về (màu sky);
  timeline 4 bước Cọc → Chờ hàng → Trả nốt → Giao.
- **Checkout**: 4 bước có progress bar mảnh; banner giữ hàng đếm ngược (đỏ dần khi < 5 phút);
  option card (ship/pay) viền 1.5px `pri` + nền pri-soft khi chọn.
- **Loyalty**: thẻ Gold nền gradient nâu-đen + chữ vàng + sheen; lộ trình 4 hạng; quyền lợi pill viền vàng.
- **Admin**: sidebar nhóm theo section header data (TỔNG QUAN / SẢN PHẨM / VẬN HÀNH / TĂNG TRƯỞNG /
  TÀI CHÍNH / HỆ THỐNG), item active nền pri-soft chữ pri; topbar sticky tiêu đề trang + **chip
  tenant** (emoji + tên, pill card2 mono) + ngày data + avatar; bảng theo `Table`; KPI dùng
  `StatTile`; giao vận dạng kanban 4 cột; sổ sách +xanh/−cam data (Inter). Khi Platform Operator
  impersonate: banner `viol-soft` full-width trên `<main>` ("Đang xem với tư cách {tenant} — Thoát").
- **Platform Console** (`/platform`, role `platform_admin`, ADR-007): cùng khung hình AdminShell
  nhưng **accent = viol** (logo phụ đề `PLATFORM`, item active viol-soft chữ viol). Nội dung:
  `StatTile` KPI nền tảng (tenant, active, MRR…), `Table` danh sách tenant, badge trạng thái
  (`tenantStatusMeta`: provisioning=special, active=positive, past_due=warning, suspended=danger,
  archived=neutral), bar lượng dùng (mint <80% / gold ≥80% / drop ≥100%). Logo tenant = emoji
  trên nền `{accentToken}-soft` (helper `accentPair`).
- **Onboarding wizard** (`/start`, công khai, layout tối giản không có shop chrome): card giữa
  `max-w-[560px]`, progress = N vạch `h-1` (`bg-pri` khi ≤ step), một bước một màn. Bước cuối là
  **stepper saga provisioning**: mỗi bước một dòng — chấm `running` nền pri-soft + `animate-pulse`,
  `done` nền mint-soft + icon `check`; xong → nút lớn "Vào trang quản trị". Pill `MOCK` ở chân.
- **Plan / pricing card**: `Card` cột — tên `font-display`, giá `font-data` lớn ("Miễn phí" khi 0₫),
  hạn mức + tính năng (icon `check_circle` mint có / `cancel` + gạch ngang không).
- **Mobile — storefront** (`< md`): bottom tab bar cố định 5 tab (Trang chủ / Cửa hàng / Drops /
  Giỏ / Tài khoản) — `MobileTabBar` trong `src/components/shop/tabbar.tsx`; tab active = icon
  fill và chữ `pri`, Drops có chấm pulse, Giỏ có badge số; nền `bg/95` + blur + safe-area-inset.
  Layout chừa `h-14` dưới footer.
- **Mobile — admin** (`< lg`): bottom tab bar 4 ô — Dashboard / Đơn hàng / Sản phẩm / **Thêm**;
  "Thêm" mở bottom sheet (`sheet-up`, scrim đen 40%) "Thêm mục quản lý" dạng grid 2 cột icon +
  label cho các mục còn lại, kèm hàng "Về cửa hàng / Thoát". Bảng rộng cuộn ngang trong `Table`.
- **Ngôn ngữ**: toàn bộ UI tiếng Việt, xưng "bạn", giọng gọn và chơi ("Săn secret. Sưu tầm nghiêm
  túc.", "Secret không tự về"). Tiền `1.850.000₫` (vi-VN + ₫), ngày `dd.mm` hoặc `dd/mm/yyyy`.

## 7. Truy cập & chất lượng

- Mọi màn hình phải đạt được bằng bàn phím; focus ring = `box-shadow 0 0 0 3px pri-soft`.
- Không truyền màu hex trong page — chỉ class token. Không `dark:` cho màu token.
- Toast cho phản hồi hành động; không dùng `alert()`.
- Ảnh placeholder luôn kèm nhãn chữ để rõ đây là mock (sẽ thay bằng ảnh thật khi có API).
