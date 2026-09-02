# ADR-001: Giữ kiến trúc microservices (rút gọn 11 services) cho cửa hàng đơn

- **Trạng thái**: Accepted — phần "một cửa hàng duy nhất" bị thay bởi
  [ADR-007](ADR-007-multi-tenancy-pooled-rls.md) (2026-08-30); quyết định giữ microservices
  vẫn có hiệu lực.
- **Ngày**: 2026-07-05

## Problem

Dự án pivot từ nền tảng SaaS omnichannel đa tenant sang **website e-commerce cho một cửa hàng
art toy duy nhất**. Thiết kế cũ có 13 microservices nhắm quy mô SaaS. Với một cửa hàng, câu
hỏi đặt ra: giữ microservices hay chuyển modular monolith?

## Why

- **Modular monolith** đơn giản hơn về vận hành và là lựa chọn "đúng sách" cho quy mô một cửa
  hàng — nhưng dự án này đồng thời là dự án học/portfolio về kiến trúc phân tán; giá trị nằm ở
  việc xây đúng các pattern (saga, outbox, event sourcing, chống oversell phân tán).
- Kịch bản **drop** có spike tải thật sự: tách promotion/inventory cho phép scale và tối ưu
  riêng điểm nóng.
- Repo đã có scaffold, conventions, hạ tầng (Kong, Kafka, compose) theo hướng microservices —
  chi phí giữ lại thấp hơn đập đi.
- Rủi ro chấp nhận: chi phí vận hành và độ phức tạp cao hơn mức "cần thiết" cho một cửa hàng;
  bù lại bằng docker-compose một lệnh và số service rút từ 13 → 11.

## Solution

Giữ kiến trúc microservices với **11 services**: auth, user (kèm loyalty), product (kèm review
+ search), inventory, cart, order (NestJS), payment, shipping, promotion, finance (kế toán +
báo cáo), notification. Bỏ: search, review, recommendation, chatbot, analytics services.

Nguyên tắc kèm theo (không đổi): **database-per-service** — không context nào đọc database của
context khác; dữ liệu chéo lấy qua gRPC/event và giữ bản sao denormalized cục bộ.
