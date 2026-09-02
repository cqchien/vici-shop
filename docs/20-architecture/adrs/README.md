# Architecture Decision Records

Mọi quyết định kiến trúc lớn được ghi lại theo cấu trúc **Problem → Why → Solution**, đánh số
tăng dần, **viết trước khi code**. ADR đã accept không sửa nội dung — thay đổi thì viết ADR mới
đánh dấu supersede.

| ADR | Tiêu đề | Trạng thái |
| --- | --- | --- |
| [ADR-001](ADR-001-microservices-for-single-store.md) | Giữ kiến trúc microservices cho cửa hàng đơn | Accepted (một phần bị thay bởi ADR-007) |
| [ADR-002](ADR-002-go-first-language-policy.md) | Go-first; order-service dùng TypeScript/NestJS cho CQRS + ES + Saga | Accepted (sửa đổi bởi ADR-008, ADR-011) |
| [ADR-003](ADR-003-postgres-only-datastores.md) | Bỏ Elasticsearch & ClickHouse — PostgreSQL + Redis + Kafka | Accepted |
| [ADR-004](ADR-004-kafka-outbox-events.md) | Kafka + Outbox pattern cho mọi domain event | Accepted |
| [ADR-005](ADR-005-kong-api-gateway.md) | Kong gateway cho cross-cutting concerns | Accepted |
| [ADR-006](ADR-006-mock-first-frontend.md) | Frontend mock-first: một Next.js app, storefront + admin | Accepted |
| [ADR-007](ADR-007-multi-tenancy-pooled-rls.md) | Multi-tenancy — mô hình pooled (`tenant_id` + Postgres RLS) | Accepted |
| [ADR-008](ADR-008-platform-plane-services-nestjs.md) | Platform-plane service (tenant, billing) dùng TypeScript/NestJS | Accepted (sửa đổi bởi ADR-011) |
| [ADR-009](ADR-009-tenant-context-propagation.md) | Lan truyền và phân giải tenant context xuyên hệ thống | Accepted |
| [ADR-010](ADR-010-serverless-aws-delivery.md) | Vận hành serverless trên AWS (Lambda + EventBridge + SQS + SNS + Step Functions) | **Proposed** |
| [ADR-011](ADR-011-identity-customer-plane-nestjs.md) | auth-service + user-service dùng TypeScript/NestJS (5 NestJS / 8 Go) | Accepted |

Tạo ADR mới: copy [adr-template.md](adr-template.md), đặt tên `ADR-<số>-<slug>.md`, thêm vào bảng trên.
