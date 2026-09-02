# Vici — Frontend (mock-first)

Một Next.js app đa zone (ADR-006 + ADR-007 đa tenant), UI/UX theo [`DESIGN.md`](./DESIGN.md) —
đọc trước khi sửa giao diện:

- **Storefront** `/` — khách của một tenant duyệt catalog, blind box (lineup + tỉ lệ secret),
  drop giới hạn, pre-order cọc 30%, giỏ hàng, checkout 4 bước có giữ hàng, tài khoản. Header lấy
  tên/logo từ `currentTenant`.
- **Admin** `/admin` — quản trị của một tenant: dashboard, sản phẩm & series, tồn kho & phiếu
  nhập, đơn hàng, giao vận kanban, chiến dịch, khách hàng, sổ sách, báo cáo, và **cài đặt 3 tab**
  (thương hiệu / gói dịch vụ / vận hành).
- **Platform Console** `/platform` (role `platform_admin`) — tổng quan nền tảng, danh sách
  tenant, vòng đời (tạm ngưng/khôi phục/lưu trữ), impersonate, danh mục gói.
- **Onboarding** `/start` — wizard 5 bước tạo tenant + mô phỏng saga provisioning.

## Chạy

```bash
npm install
npm run dev        # http://localhost:3000
```

Đăng nhập nhanh tại `/login` bằng persona demo (Minh Anh — Gold vào drop sớm, Quốc Bảo —
Collector, Hà Linh — Silver, Vy — chủ shop / tenant admin, Tú — staff, **Ngân — Platform
Operator** → `/platform`). Không cần mật khẩu (mock).

## Kiến trúc mock

- Dữ liệu tĩnh nằm trong **`src/lib/mock/data/*.json`** (catalog, users, tồn kho, khuyến mãi,
  đơn mẫu, tài chính, **tenants, plans**) — ngày lưu dạng offset tương đối, `seed.ts` hydrate
  thành ISO quanh thời điểm chạy. Khi có API, thay JSON bằng response thật mà không đổi shape.
- **Đa tenant (mock)**: dữ liệu nghiệp vụ thuộc tenant tham chiếu `t_vici` (VICI Saigon);
  `state.tenants` là registry cho Platform Console; `currentTenant()` = tenant đang impersonate,
  hoặc theo user, hoặc mặc định `t_vici`. Wizard `/start` mô phỏng saga provisioning bằng timer.
- State lưu trong memory + localStorage — các zone chia sẻ cùng store (đặt đơn ở storefront
  thấy ngay trong admin; tạo tenant ở `/start` thấy ngay trong `/platform`).
- Mọi nghiệp vụ đi qua `actions` trong `src/lib/mock/store.ts` (mô phỏng API thật: server
  tính, client hiển thị). Khi backend lên theo roadmap, thay từng action bằng API client
  qua Kong mà không đổi component.
- Nút **Reset demo** ở sidebar admin đưa dữ liệu về seed ban đầu.

## Design system

- Token màu/chữ/animation: `src/app/globals.css` (CSS variables → Tailwind `@theme inline`);
  dark mode qua `html[data-theme]`, toggle ở header (lưu localStorage).
- Component dùng chung: `src/components/ui/` — quy ước chi tiết trong [`DESIGN.md`](./DESIGN.md).
- Font: Be Vietnam Pro (body) · Plus Jakarta Sans (heading) · IBM Plex Mono (số liệu) ·
  Material Symbols Rounded (icon).

## Quality gates

```bash
npm run lint && npx tsc --noEmit && npm run build
```

Tài liệu design system & sitemap: `docs/50-frontend/`.
