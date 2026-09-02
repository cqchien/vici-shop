# ADR-008: Platform-plane service (tenant, billing) dùng TypeScript/NestJS

- **Trạng thái**: Accepted — sửa đổi tiếp bởi
  [ADR-011](ADR-011-identity-customer-plane-nestjs.md) (2026-09-02): `auth-service` +
  `user-service` cũng dùng NestJS; danh sách NestJS lên 5, service thứ 6 mới cần ADR.
- **Ngày**: 2026-08-30
- **Quan hệ**: sửa đổi [ADR-002](ADR-002-go-first-language-policy.md) (mở rộng danh sách
  service dùng NestJS; trần "hai ngôn ngữ" giữ nguyên).

## Problem

Pivot sang nền tảng đa tenant ([ADR-007](ADR-007-multi-tenancy-pooled-rls.md)) thêm hai bounded
context mới không thuộc miền thương mại: **Tenant** (đăng ký, khởi tạo, vòng đời tenant) và
**Billing** (gói dịch vụ, subscription, đo lượng dùng, webhook nhà cung cấp thanh toán, dunning).
ADR-002 hiện quy định chỉ `order-service` được dùng TypeScript/NestJS. Hai service mới viết bằng
Go hay NestJS?

## Why

- **tenant-service** điều phối một **saga provisioning** nhiều bước, có compensation (tạo
  workspace → seed catalog mẫu → cấu hình thanh toán/vận chuyển mặc định → phát
  `tenant.provisioned` → mở subdomain). Đây đúng lý do ADR-002 chọn NestJS cho order-service:
  `@nestjs/cqrs` cung cấp CommandBus/EventBus/Saga manager trưởng thành, tự viết bằng Go là khối
  lượng lớn và dễ sai.
- **billing-service** cần lịch định kỳ (chốt kỳ, dunning), xử lý webhook idempotent, state
  machine subscription (`trialing → active → past_due → canceled`) — hệ sinh thái Node cho billing
  (thư viện lịch, ret/webhook, số tiền) mạnh và quen thuộc; cùng runtime với tenant-service giảm
  chi phí context-switch cho nhóm platform.
- **Không thêm ngôn ngữ thứ ba.** Trần vẫn là Go + TypeScript. Chi phí biên khi mở từ 1 lên 3
  service NestJS thấp: cùng `tsconfig`, cùng `backend/libs/common`, cùng conventions
  (`coding-conventions.md`).
- Các service **miền thương mại vẫn Go** (I/O-bound, spike drop, binary nhỏ) — không nới lỏng
  mặc định "Go-first" cho service nghiệp vụ.

## Solution

- Mặc định mọi service mới vẫn viết bằng **Go 1.22+** theo `coding-conventions-go.md`.
- **Ngoại lệ NestJS** (`coding-conventions.md`, `@nestjs/cqrs`): `order-service`,
  **`tenant-service`**, **`billing-service`** — gọi chung là *platform plane* + ordering.
- Cả ba dùng chung `backend/libs/common/` (error type, pagination, health, OTel) và
  `backend/libs/events/` (TS event registry). Contract chéo ngôn ngữ vẫn qua proto (Buf sinh
  stub Go + TS) và Avro.
- Thêm service NestJS thứ tư → cần ADR mới (giữ kỷ luật). Thêm ngôn ngữ thứ ba → cần ADR mới.
