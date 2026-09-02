# ADR-002: Go-first; order-service dùng TypeScript/NestJS cho CQRS + ES + Saga

- **Trạng thái**: Accepted — sửa đổi bởi [ADR-008](ADR-008-platform-plane-services-nestjs.md)
  (2026-08-30): `tenant-service` và `billing-service` cũng dùng TypeScript/NestJS; sửa đổi tiếp
  bởi [ADR-011](ADR-011-identity-customer-plane-nestjs.md) (2026-09-02): `auth-service` và
  `user-service` cũng dùng TypeScript/NestJS (5 NestJS / 8 Go).
- **Ngày**: 2026-07-05

## Problem

Monorepo cần một chính sách ngôn ngữ rõ ràng để 11 services nhất quán về tooling, conventions
và chi phí bảo trì, đồng thời order-service cần CQRS + Event Sourcing + Saga cho vòng đời đơn
hàng phức tạp (đơn thường + pre-order hai khoản thanh toán + compensation).

## Why

- **Go** phù hợp đa số service: I/O-bound, cần concurrency rẻ (drop spike), binary nhỏ, deploy
  đơn giản; team conventions Go đã hoàn chỉnh (`coding-conventions-go.md`).
- **CQRS + ES + Saga tự viết bằng Go** là khối lượng lớn và dễ sai; `@nestjs/cqrs` cung cấp
  CommandBus/EventBus/Saga manager trưởng thành — đổi lấy một service khác ngôn ngữ là trade-off
  chấp nhận được, cô lập trong đúng một bounded context.
- Hai ngôn ngữ là mức trần: thêm ngôn ngữ thứ ba cần ADR mới.

## Solution

- Mặc định mọi service mới viết bằng **Go 1.22+** theo `coding-conventions-go.md`.
- **order-service** duy nhất dùng **TypeScript/NestJS** với `@nestjs/cqrs` (event store trên
  PostgreSQL, optimistic concurrency bằng cột `version`), theo `coding-conventions.md`.
- Contract chéo ngôn ngữ qua proto (Buf sinh stub Go + TS) và Avro (events).
