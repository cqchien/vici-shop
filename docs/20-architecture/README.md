# Kiến trúc

| File | Nội dung |
| --- | --- |
| [01-system-overview.md](01-system-overview.md) | Bản đồ hệ thống: services, gateway, luồng dữ liệu |
| [02-tech-stack.md](02-tech-stack.md) | Công nghệ được chọn và lý do |
| [03-clean-architecture-ddd.md](03-clean-architecture-ddd.md) | Hexagonal + DDD áp dụng vào domain thật của Vici (aggregate/VO/event theo từng context, `tenant_id`, CQRS/ES/Saga ở đâu) |
| [04-service-contracts-conventions.md](04-service-contracts-conventions.md) | Quy ước REST/gRPC/event dùng chung cho mọi service — đọc trước khi viết spec service |
| [05-key-flows.md](05-key-flows.md) | Sequence diagram các luồng xuyên service: onboarding/provisioning saga, checkout saga, drop, pre-order, đổi trả, hạch toán |
| [06-serverless-aws.md](06-serverless-aws.md) | **(Đề xuất — ADR-010)** Luồng vận hành serverless AWS: Lambda, EventBridge, SQS, SNS, Step Functions |
| [adrs/](adrs/README.md) | Architecture Decision Records — mọi quyết định lớn |

Quy tắc nền (chi tiết trong [.claude/conventions/architecture.md](../../.claude/conventions/architecture.md)):

- Mỗi service theo **Hexagonal Architecture + DDD**; domain layer không import framework.
- Nội bộ gọi nhau bằng **gRPC**; công khai qua **REST trên Kong**; bất đồng bộ qua **Kafka**
  với **outbox pattern** bắt buộc.
- **Database-per-service** — không chia sẻ database giữa các bounded context (ADR-001).
- **Đa tenant (pooled)**: mọi bảng nghiệp vụ có `tenant_id` + Postgres RLS; tenant context lan
  truyền qua header/metadata/Kafka header ([ADR-007](adrs/ADR-007-multi-tenancy-pooled-rls.md),
  [ADR-009](adrs/ADR-009-tenant-context-propagation.md)).
- **13 service** — 8 Go + 5 TypeScript/NestJS (auth, user, order, tenant, billing —
  [ADR-008](adrs/ADR-008-platform-plane-services-nestjs.md),
  [ADR-011](adrs/ADR-011-identity-customer-plane-nestjs.md)).
- Thay đổi kỹ thuật lớn → viết ADR **trước khi** code ([template](adrs/adr-template.md)).
