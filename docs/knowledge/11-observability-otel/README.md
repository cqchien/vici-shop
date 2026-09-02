# 11 — OpenTelemetry (Observability)

Observability = trả lời được "**tại sao** hệ thống hành xử thế này" **mà không cần deploy code
mới**. Ba trụ: **traces** (một request đi qua những service/hàm nào, mất bao lâu ở đâu),
**metrics** (số đo tổng hợp: rate, error, duration, saturation), **logs** (sự kiện rời rạc, có
ngữ cảnh).

**OpenTelemetry (OTel)** là *một chuẩn* để instrument cả ba, không khoá vào một vendor. Vici
dùng OTel SDK → Jaeger (trace), Prometheus (metric), Loki (log), Grafana (dashboard). Điểm mạnh
với hệ phân tán: **trace nối liền xuyên gRPC và Kafka**.

| File | Nội dung |
| --- | --- |
| [01-khai-niem.md](01-khai-niem.md) | Observability vs monitoring, ba trụ, vì sao OTel (không SDK vendor), khi nào đủ |
| [02-co-che.md](02-co-che.md) | Span/trace/context propagation, W3C traceparent, đo gì (RED/USE), sampling, log correlation, OTel Collector |
| [03-ap-dung-trong-vici.md](03-ap-dung-trong-vici.md) | Init ở `main`, otelgrpc, propagate qua Kafka header, span use-case, metric riêng service, X-Request-ID |
| [04-pitfalls-va-thuc-hanh.md](04-pitfalls-va-thuc-hanh.md) | Trace đứt ở Kafka, log không có trace id, cardinality nổ, hand-roll tracing, log PII… + checklist |

Đọc kèm: [`.claude/conventions/coding-conventions-go.md`](../../../.claude/conventions/coding-conventions-go.md) §9, §14 ·
[`.claude/conventions/coding-conventions.md`](../../../.claude/conventions/coding-conventions.md) §5 ·
[`20-architecture/02-tech-stack.md`](../../20-architecture/02-tech-stack.md) ·
[`10-requirements/99-nfr.md`](../../10-requirements/99-nfr.md) NFR-08
