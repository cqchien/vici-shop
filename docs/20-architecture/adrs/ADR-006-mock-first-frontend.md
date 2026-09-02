# ADR-006: Frontend mock-first — một Next.js app, storefront + admin

- **Trạng thái**: Accepted
- **Ngày**: 2026-07-05

## Problem

Backend chưa có code (scaffold), nhưng cần sớm có giao diện chạy được để chốt nghiệp vụ
(blind box, drop, pre-order, kế toán) với stakeholder trước khi đầu tư viết 11 services.
Đồng thời phải quyết: storefront và admin là một app hay hai app riêng?

## Why

- **Mock-first**: UI mô phỏng đầy đủ vòng đời nghiệp vụ trên dữ liệu giả là cách rẻ nhất để
  phát hiện thiếu sót yêu cầu; khi backend sẵn sàng, chỉ thay tầng data (mock repository →
  API client) nhờ tách interface ngay từ đầu.
- **Một app hai zone** (route group `(shop)` và `(admin)`): dùng chung design system, types,
  mock store — quan trọng nhất là **hai zone nhìn thấy cùng một dữ liệu** (đặt đơn ở storefront
  thấy ngay trong admin), điều hai app riêng khó làm khi chưa có backend. Tách app về sau vẫn
  mở (route group đã là ranh giới sạch).

## Solution

- Một Next.js 14+ App Router tại `frontend/`: storefront `/` (route group `(shop)`), admin
  `/admin` (route group `(admin)`), TypeScript strict, TailwindCSS.
- Tầng dữ liệu mock: types domain tại `src/lib/types.ts`; dữ liệu tĩnh nằm trong
  `src/lib/mock/data/*.json` (ngày lưu dạng offset tương đối, `seed.ts` hydrate thành ISO
  quanh thời điểm chạy); store tại `src/lib/mock/store.ts`, đọc/ghi qua actions duy nhất;
  state giữ trong memory + localStorage để hai zone và các lần reload chia sẻ dữ liệu. Khi có
  API, các file JSON được thay bằng response thật mà không đổi shape.
- Khi backend lên theo roadmap, thay từng repository mock bằng API client (fetch qua Kong),
  không đổi component.
