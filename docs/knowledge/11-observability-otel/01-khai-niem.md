# OpenTelemetry — Khái niệm

> Vì sao quan trọng: trong hệ 13 service, khi "checkout chậm" hoặc "đơn kẹt", không có trace
> xuyên service thì điều tra là đoán mò qua log của từng service. Observability quyết định thời
> gian khôi phục sự cố (MTTR).

## Observability vs Monitoring

- **Monitoring**: theo dõi các chỉ số **đã biết trước** — "CPU > 80%?", "error rate > 1%?".
  Trả lời câu hỏi bạn nghĩ ra từ trước.
- **Observability**: hệ thống phát ra đủ tín hiệu để bạn hỏi **câu hỏi mới** khi sự cố xảy ra
  mà không cần deploy — "request này chậm ở đâu?", "chỉ tenant X bị hay tất cả?", "đơn kẹt vì
  saga dừng ở bước nào?".

Sự cố production thường là "unknown unknown" — bạn không biết trước để đặt alert. Observability
là để điều tra cái chưa lường trước.

## Ba trụ

| Trụ | Là gì | Trả lời |
| --- | --- | --- |
| **Traces** | Đường đi của **một request** qua các service/hàm, dạng cây span có thời gian | "Chậm ở đâu? Đi qua những gì? Bước nào fail?" |
| **Metrics** | Số đo **tổng hợp** theo thời gian (counter, gauge, histogram) | "Rate/error/latency đang thế nào so với bình thường?" |
| **Logs** | Sự kiện **rời rạc** kèm ngữ cảnh (structured JSON) | "Chi tiết chính xác lúc đó: giá trị nào, lỗi gì?" |

Ba trụ **bổ sung** nhau: metric cho biết "có vấn đề" (error rate tăng), trace cho biết "ở đâu"
(service payment, span CreatePayment), log cho biết "cái gì" (`gateway timeout, orderId=...`).

## Vì sao OpenTelemetry (không SDK của vendor)

- **Một API, đổi backend không đổi code.** Instrument bằng OTel API; xuất sang Jaeger hôm nay,
  Datadog/Tempo mai — chỉ đổi exporter config.
- **Chuẩn công nghiệp** (CNCF): auto-instrumentation cho HTTP, gRPC, DB, Kafka có sẵn.
- **Context propagation chuẩn** (W3C Trace Context) — trace nối liền giữa service viết bằng
  ngôn ngữ khác nhau (Go ↔ NestJS của Vici).

> Hệ quả production: khoá vào SDK vendor = chi phí chuyển đổi khổng lồ khi đổi nhà cung cấp
> (giá, tính năng, sự cố). OTel giữ instrumentation là tài sản của bạn.

## RED và USE — đo cái gì

- **RED** (cho service/endpoint): **R**ate (req/s), **E**rrors (lỗi/s hoặc %), **D**uration
  (phân bố latency, đặc biệt P95/P99). Ba số này cho bức tranh sức khoẻ một service.
- **USE** (cho tài nguyên): **U**tilization, **S**aturation, **E**rrors — CPU, memory,
  connection pool, Kafka consumer lag.

NFR-01 của Vici đặt mục tiêu theo D: storefront p95 < 500ms, API đọc p95 < 200ms, ghi < 500ms.
→ phải đo được P95/P99, không chỉ trung bình (trung bình giấu đuôi).

## Khi nào "đủ"

- Mọi entry point (REST, gRPC, Kafka consumer) có span; trace nối liền xuyên service.
- RED cho mỗi service + vài metric nghiệp vụ then chốt (order rate, provisioning duration,
  consumer lag).
- Log structured JSON, **có trace id trên mọi dòng**.
- Health endpoint mỗi service (NFR-08).
- Alert cho vài chỉ số sống-còn (error rate, P99, consumer lag, saga fail).

Không cần: trace mọi hàm nội bộ, metric cho mọi biến, log mọi bước.

## Glossary

| Term | Một câu |
| --- | --- |
| Span | Một đơn vị công việc có tên + thời gian bắt đầu/kết thúc + thuộc tính |
| Trace | Cây span của một request; có một `trace_id` |
| Context propagation | Truyền `trace_id`/`span_id` qua ranh giới service (header/metadata) |
| W3C Trace Context | Chuẩn header `traceparent` để propagate |
| Sampling | Chỉ giữ một phần trace (head-based / tail-based) để giảm chi phí lưu |
| Cardinality | Số tổ hợp giá trị của label metric — cao quá làm nổ storage |
| OTel Collector | Tiến trình nhận telemetry, xử lý (batch, lọc), xuất tới backend |
| Exporter | Thành phần gửi telemetry tới một backend cụ thể (Jaeger, OTLP…) |

> 🗣️ Nói thành lời: "Observability là phát đủ tín hiệu để hỏi câu hỏi mới lúc sự cố mà không
> deploy — khác monitoring là theo dõi cái đã biết trước. Ba trụ: metric cho biết có vấn đề,
> trace cho biết ở đâu trong 13 service, log cho biết chi tiết. Tôi dùng OpenTelemetry vì nó là
> một API chuẩn, đổi backend chỉ đổi exporter, và context propagation W3C giúp trace nối liền
> giữa service Go và NestJS. Đo theo RED cho service và USE cho tài nguyên, và luôn đo P95/P99
> chứ không trung bình."
