# ADR-005: Kong gateway cho cross-cutting concerns

- **Trạng thái**: Accepted
- **Ngày**: 2026-07-05

## Problem

11 services đều cần: verify JWT, rate limiting (đặc biệt kịch bản drop và brute-force login),
CORS, request-id, routing theo path. Lặp lại các concern này trong từng service là trùng lặp
code và cấu hình dễ lệch.

## Why

- Gateway tập trung cho phép khai báo một lần (DBless declarative YAML — reviewable trong repo),
  service chỉ còn business logic; đổi chính sách rate limit không cần deploy lại service.
- Kong chọn vì: DBless mode đơn giản cho local/CI, plugin JWT/rate-limiting/CORS có sẵn,
  cộng đồng lớn. (So với Traefik/Nginx: hệ plugin auth trưởng thành hơn; so với API Gateway
  managed: chạy được local y hệt production.)
- Service **vẫn tự kiểm tra RBAC** (role trong JWT claim) — Kong chỉ verify chữ ký/hạn token;
  authorization là nghiệp vụ, thuộc về service.

## Solution

Kong DBless (`backend/gateway/kong/kong.yml`) là cửa duy nhất cho traffic ngoài vào: route theo
path `/auth, /users, /products, /inventory, /cart, /orders, /payments, /shipping, /promotions,
/finance, /notifications`; JWT plugin cho mọi route trừ public (đăng ký/đăng nhập, xem catalog);
rate limit chặt cho `/auth/*` và các endpoint drop.
