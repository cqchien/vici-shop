# ADR-011: auth-service và user-service (Identity & Customer plane) dùng TypeScript/NestJS

- **Trạng thái**: Accepted
- **Ngày**: 2026-09-02
- **Quan hệ**: sửa đổi tiếp [ADR-002](ADR-002-go-first-language-policy.md) và
  [ADR-008](ADR-008-platform-plane-services-nestjs.md) (mở rộng danh sách service dùng NestJS từ
  3 lên 5; trần "hai ngôn ngữ" giữ nguyên).

## Problem

Sau [ADR-008](ADR-008-platform-plane-services-nestjs.md), danh sách NestJS gồm `order-service` +
platform plane (`tenant-service`, `billing-service`). ADR-008 quy định thêm service NestJS thứ tư
cần ADR mới. Nay muốn chuyển **`auth-service`** và **`user-service`** sang NestJS — service thứ
4 và 5.

## Why

- **auth-service**: xác thực là bài toán mà hệ sinh thái NestJS mạnh và trưởng thành —
  `@nestjs/passport` (OAuth Google, chiến lược JWT/refresh), `@nestjs/jwt`, **guard** cho
  RBAC/route protection, `class-validator` cho DTO đăng ký/đăng nhập. Tự dựng lại các mảnh này
  bằng Go là khối lượng và bề mặt lỗi không đáng.
- **user-service**: context **Customer** chia sẻ mối quan tâm với platform plane — vòng đời tài
  khoản, `TenantMember` (account ↔ tenant), consume `auth.account_registered` /
  `tenant.provisioned`. Gom cùng runtime với auth-service và tenant-service giảm context-switch;
  DTO địa chỉ/hồ sơ hợp với `class-validator`.
- **"Identity & Customer plane"** giờ đứng cùng phía với "platform plane + ordering" về công cụ.
- **8 service miền thương mại vẫn Go** (product, inventory, cart, payment, shipping, promotion,
  finance, notification) — đây là nơi lập luận gốc của [ADR-002](ADR-002-go-first-language-policy.md)
  còn mạnh nhất: I/O-bound, concurrency rẻ cho **drop spike** (add-to-cart, reserve stock, drop
  counter), binary nhỏ, deploy đơn giản. auth/user ít "nóng" hơn trong kịch bản drop.
- **Không thêm ngôn ngữ thứ ba.** Trần vẫn Go + TypeScript. Chi phí biên khi mở từ 3 lên 5
  service NestJS thấp: cùng `tsconfig`, `backend/libs/common/`, `backend/libs/events/`,
  conventions (`coding-conventions.md`).

## Solution

- **Mặc định ngôn ngữ mới:**
  - **NestJS** cho service hình dạng **account / platform / orchestration** (identity, customer,
    tenant, billing, ordering).
  - **Go** (`coding-conventions-go.md`) cho service **miền/compute** stateless throughput cao.
- **Danh sách NestJS (5)**: `auth-service`, `user-service`, `order-service`, `tenant-service`,
  `billing-service`. **Danh sách Go (8)**: `product`, `inventory`, `cart`, `payment`, `shipping`,
  `promotion`, `finance`, `notification`.
- **auth-service và user-service dùng NestJS nhưng KHÔNG áp CQRS + Event Sourcing + Saga** —
  hexagonal NestJS dạng CRUD; `@nestjs/cqrs` chỉ dùng nếu muốn tách command/query, không có event
  store, không có process manager. ES + Saga vẫn giới hạn ở `order-service` (ES + Saga),
  `tenant-service` (Saga provisioning), `billing-service` (CQRS + dunning) — xem
  [03-clean-architecture-ddd.md](../03-clean-architecture-ddd.md) §5.
- **Contract chéo ngôn ngữ không đổi**: proto (Buf sinh stub Go + TS), Avro event.
- **Thực thi**: chuyển scaffold `backend/services/{auth,user}-service/` sang layout NestJS
  (`architecture.md` §"TypeScript/NestJS service", bỏ `application/saga/`); cập nhật
  `coding-conventions*.md`, tech-stack, C4, service spec, roadmap.
- **Service NestJS thứ 6 → cần ADR mới.** Ngôn ngữ thứ ba → cần ADR mới.
