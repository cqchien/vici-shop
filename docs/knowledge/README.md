# Knowledge — giải thích các kỹ thuật Vici dùng

`docs/` khác kể **làm gì** và **vì sao** (requirements, ADR, domain, service spec).
`.claude/conventions/` kể **phải viết code thế nào** (luật bắt buộc).
Thư mục này kể **kỹ thuật bên dưới hoạt động ra sao** — từ khái niệm tới cách Vici áp dụng và
những sai lầm hay gặp. Đọc khi cần hiểu sâu một pattern trước khi động vào code, hoặc để ôn tập.

Quan hệ: **conventions = luật, knowledge = lý do đằng sau luật**. Nếu convention nói "domain
layer không import framework", file `02-hexagonal/` giải thích vì sao và điều gì hỏng nếu vi phạm.

## Lộ trình đọc

Đánh số theo thứ tự học, không phải mức quan trọng.

### Nền tảng thiết kế

| # | Kỹ thuật | Một câu |
| --- | --- | --- |
| [01](01-ddd/README.md) | **DDD** (Domain-Driven Design) | Chia hệ thống theo *ngôn ngữ nghiệp vụ*; mỗi bounded context một mô hình, một database |
| [02](02-hexagonal/README.md) | **Hexagonal / Ports & Adapters** | Domain ở giữa, không biết gì về HTTP/SQL/Kafka; mọi I/O là adapter cắm vào port |
| [03](03-cqrs/README.md) | **CQRS** | Tách đường ghi (mutate aggregate) khỏi đường đọc (query projection) |
| [04](04-event-sourcing/README.md) | **Event Sourcing** | Nguồn sự thật là chuỗi event append-only; state hiện tại là kết quả replay |
| [05](05-saga/README.md) | **Saga** | Điều phối một quy trình nhiều service bằng các bước có compensation, không dùng distributed transaction |

### Messaging & tích hợp

| # | Kỹ thuật | Một câu |
| --- | --- | --- |
| [06](06-outbox/README.md) | **Transactional Outbox** | Ghi event vào bảng `outbox` cùng transaction với state; relay publish sau — không mất event |
| [07](07-event-driven-kafka/README.md) | **Event-driven với Kafka** | Service phát *sự thật đã xảy ra*; consumer tự phản ứng, loose coupling, at-least-once |
| [08](08-grpc-buf/README.md) | **gRPC + Buf** | Contract-first cho gọi đồng bộ nội bộ; Buf lint + breaking-change check trong CI |
| [09](09-api-gateway-kong/README.md) | **API Gateway (Kong)** | Một cửa cho traffic ngoài: verify JWT, rate limit, CORS, resolve tenant — service chỉ còn business logic |

### Nền tảng & xuyên suốt

| # | Kỹ thuật | Một câu |
| --- | --- | --- |
| [10](10-multi-tenancy-rls/README.md) | **Multi-tenancy + Postgres RLS** | Mô hình pooled: mọi bảng có `tenant_id`, Row-Level Security chặn chéo ở tầng DB (fail-closed) |
| [11](11-observability-otel/README.md) | **OpenTelemetry** | Một chuẩn trace/metric/log; trace nối liền xuyên gRPC + Kafka |
| [12](12-testing-testcontainers/README.md) | **Testing & Testcontainers** | Test pyramid: nhiều unit zero-I/O, ít integration chạy Postgres/Redis/Kafka thật |
| [13](13-serverless-aws/README.md) | **Serverless AWS** *(đề xuất — ADR-010)* | Lambda + EventBridge + SQS + SNS + Step Functions thay container luôn chạy |

## Cách các doc này được viết

Mỗi thư mục kỹ thuật có 4 file theo cùng một mạch:

| File | Nội dung |
| --- | --- |
| `01-khai-niem.md` | Vấn đề nó giải (trước nó người ta đau ở đâu), định nghĩa, **khi nào dùng / KHÔNG dùng**, glossary |
| `02-co-che.md` | Cơ chế từng bước, các biến thể, 1–2 mermaid "để ôn nhanh" — mỗi ý nối tới **hệ quả production** |
| `03-ap-dung-trong-vici.md` | Vici áp dụng ở đâu: link tới ADR/spec/convention thật, code sketch theo cấu trúc repo |
| `04-pitfalls-va-thuc-hanh.md` | Anti-pattern (triệu chứng → vì sao hỏng → cách đúng) + checklist Definition of Done |

Quy ước: tiếng Việt cho lời văn, **giữ nguyên thuật ngữ tiếng Anh** (aggregate, projection,
idempotent, cold start, RLS…). `> 💡` = quy tắc thực dụng, `> ⚠️` = pitfall, `> 🗣️` = cách
diễn đạt khi phỏng vấn. Không copy nội dung ADR — link tới nó.
