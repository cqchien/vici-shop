# <name>-service — Service Spec

> Copy template này thành `docs/40-services/<name>-service.md` ngay trước khi code service.
> Spec là contract: interface/behavior code phải khớp spec, lệch là bug.

## 1. Trách nhiệm & ranh giới

- Bounded context: … (link [01-bounded-contexts.md](../30-domain/01-bounded-contexts.md))
- Sở hữu dữ liệu gì; **không** sở hữu gì (và lấy từ đâu thay thế).
- FR cover: FR-XXX-01…

## 2. API

### REST (qua Kong)

| Method | Path | Mô tả | Auth |
| --- | --- | --- | --- |
| GET | /… | … | public / customer / staff / admin |

### gRPC (nội bộ)

| RPC | Request → Response | Ai gọi |
| --- | --- | --- |

### Events

| Phát (topic) | Payload (schema Avro) | Khi nào |
| --- | --- | --- |

| Tiêu thụ (topic) | Xử lý | Idempotency |
| --- | --- | --- |

## 3. Data model

Bảng chính, cột quan trọng, index, ràng buộc. Migration đầu tiên.

## 4. Nghiệp vụ cốt lõi

Use case chính theo từng bước; invariant phải giữ; error case và mã lỗi domain.

## 5. Config (env)

| Biến | Bắt buộc | Mặc định | Ghi chú |
| --- | --- | --- | --- |

## 6. Kiểm thử

- Unit: các invariant domain cần cover.
- Integration (Testcontainers): kịch bản chính, kịch bản concurrency nếu có.

## 7. Observability

Span chính, metric riêng của service, log milestone.
