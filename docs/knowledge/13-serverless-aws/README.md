# 13 — Serverless trên AWS

**Trạng thái: đề xuất** — đi kèm [ADR-010](../../20-architecture/adrs/ADR-010-serverless-aws-delivery.md)
(Proposed) và [`20-architecture/06-serverless-aws.md`](../../20-architecture/06-serverless-aws.md).

Serverless = compute chạy theo request, **scale-to-zero**, tính tiền theo dùng; broker/queue là
managed. Với AWS: **Lambda** (compute), **API Gateway** (edge), **EventBridge** (routing event),
**SQS** (buffer + retry + DLQ), **SNS** (fan-out rộng), **Step Functions** (saga orchestrator).

Điểm mấu chốt: **hexagonal core không đổi** — Lambda handler chỉ là một *driving adapter* mới;
gRPC → Lambda `Invoke` là một *driven adapter* mới. Outbox (ADR-004) và pooled RLS (ADR-007)
giữ nguyên.

| File | Nội dung |
| --- | --- |
| [01-khai-niem.md](01-khai-niem.md) | Serverless là gì, vì sao cho multi-tenant nhiều shop nhỏ, cái giá (cold start, 15', no long gRPC), khi nào KHÔNG |
| [02-co-che.md](02-co-che.md) | Lambda, API GW + authorizer, EventBridge→SQS→Lambda, SNS fanout, Step Functions + callback token, RDS Proxy, cron |
| [03-ap-dung-trong-vici.md](03-ap-dung-trong-vici.md) | Bảng ánh xạ ADR-010, 6 luồng, tenant context serverless, pilot tenant+billing, những gì KHÔNG đổi |
| [04-pitfalls-va-thuc-hanh.md](04-pitfalls-va-thuc-hanh.md) | Connection exhaustion, cold start đường nóng, ordering trong SQS, retry/DLQ thiếu, lock-in… + checklist |

Đọc kèm: [ADR-010](../../20-architecture/adrs/ADR-010-serverless-aws-delivery.md) ·
[`20-architecture/06-serverless-aws.md`](../../20-architecture/06-serverless-aws.md) ·
[`backend/infra/terraform/modules/`](../../../backend/infra/terraform/modules/) (lambda, eventbridge) ·
[`05-saga`](../05-saga/README.md) · [`06-outbox`](../06-outbox/README.md) · [`10-multi-tenancy-rls`](../10-multi-tenancy-rls/README.md)
