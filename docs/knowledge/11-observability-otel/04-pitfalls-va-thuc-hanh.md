# OpenTelemetry — Pitfalls & thực hành

## 1. Trace đứt ở Kafka

- **Triệu chứng**: trace dừng ở "outbox written"; consumer bên kia tạo trace **mới** không nối.
- **Vì sao hỏng**: điều tra sự cố async (đơn completed nhưng finance không ghi sổ) không lần
  được — hai trace rời rạc, không biết cái nào ứng cái nào.
- **Cách đúng**: producer inject `traceparent` vào **message header**; consumer extract khi
  nhận, tạo span con. Header `traceparent` đi cạnh `tenant-id` (relay copy cả hai từ outbox).

## 2. Log không có trace id

- **Triệu chứng**: log JSON nhưng không field `trace_id` / `request_id`.
- **Vì sao hỏng**: thấy dòng log `payment declined` nhưng không nhảy sang trace được → phải
  grep theo timestamp + đoán, xuyên 13 service. MTTR tăng nhiều.
- **Cách đúng**: mọi dòng log kèm `trace_id` (từ span context trong `ctx`) + `X-Request-ID`.

## 3. Metric cardinality nổ

- **Triệu chứng**: label `order_id`, `user_email`, `tenant_id` (nghìn giá trị), hoặc `url` với
  path param (`/orders/abc123`).
- **Vì sao hỏng**: mỗi tổ hợp label = một time series; hàng triệu series → Prometheus OOM, query
  chậm, cost storage nổ.
- **Cách đúng**: label chỉ giá trị **giới hạn** (`status_code`, `method`, `plan_code`,
  `provisioning_step`). ID cụ thể (`order_id`) đi vào **trace/log**, không phải label metric.
  Path param: template hoá (`/orders/:id`).

## 4. Hand-roll tracing

- **Triệu chứng**: tự log "START CreateOrder ts=... / END CreateOrder ts=..." rồi tự tính diff.
- **Vì sao hỏng**: không nối cây span, không propagate, không xuất được sang Jaeger/Tempo; mỗi
  người một format; conventions §14 cấm.
- **Cách đúng**: `otel.Tracer(...).Start(ctx, name)`. OTel API là interface tracing duy nhất.

## 5. Log secret / PII

- **Triệu chứng**: log full request body (có `password`, token), full số thẻ, email khách.
- **Vì sao hỏng**: log tập trung ở Loki, ai có quyền đọc log = đọc được secret/PII; vi phạm
  NFR-07 (Nghị định 13/2023), CONSTITUTION II.5.
- **Cách đúng**: redact ở boundary — log `card: "****1234"`, `email: "<redacted>"`, không log
  `Authorization` header, không log body của `/auth/*`.

## 6. `info` log mỗi lần gọi hàm

- **Triệu chứng**: `logger.Info("entering calculateShipping")` khắp nơi.
- **Vì sao hỏng**: tín hiệu (order placed, payment failed) chìm trong noise; cost ingest/lưu
  Loki tăng; đọc log mệt.
- **Cách đúng**: `info` = 1–2 cột mốc nghiệp vụ/request. Chi tiết bước → `debug` (tắt prod) hoặc
  span attribute.

## 7. Global logger/tracer trong domain

- **Triệu chứng**: `domain/model/order.go` gọi `zap.L().Info(...)` hoặc `otel.Tracer(...)`.
- **Vì sao hỏng**: domain dính observability infra; test phải khởi tạo OTel; vi phạm hexagonal.
- **Cách đúng**: instrument ở `application`/`infrastructure`. Domain thuần. Nếu domain cần "báo"
  gì thì trả về (event, error), lớp ngoài log.

## 8. Không đo P95/P99, chỉ trung bình

- **Triệu chứng**: dashboard chỉ có `avg(duration)`.
- **Vì sao hỏng**: trung bình 150ms nhưng P99 3s → 1% khách (có thể là khách VIP, hoặc lúc
  drop) trải nghiệm rất tệ mà dashboard "xanh". NFR-01 đặt mục tiêu theo P95.
- **Cách đúng**: histogram → query P50/P95/P99. Alert theo P99.

## 9. Không giám sát cái đặc thù của hệ này

- **Triệu chứng**: có RED cho HTTP nhưng không có: Kafka consumer lag, saga fail rate,
  provisioning duration, RLS "0 rows" bất thường.
- **Vì sao hỏng**: consumer chết âm thầm → sổ sách trễ; saga treo → đơn kẹt; provisioning chậm
  → NFR-14 vỡ mà không biết.
- **Cách đúng**: metric nghiệp vụ then chốt (spec §7 mỗi service) + alert.

## 10. Sampling bỏ mất trace lỗi

- **Triệu chứng**: head-based sampling 5% → phần lớn trace lỗi bị bỏ.
- **Vì sao hỏng**: sự cố xảy ra nhưng không có trace để điều tra.
- **Cách đúng**: tail-based sampling ở Collector — **luôn giữ trace có error/slow**, sample
  phần bình thường.

## Checklist — Definition of Done

- [ ] OTel SDK init một lần ở `main`; exporter OTLP → Collector; `OTEL_SERVICE_NAME` set
- [ ] Auto-instrument HTTP + gRPC + DB; span thủ công cho use case chính
- [ ] `traceparent` propagate qua gRPC (interceptor) **và** Kafka (message header) — trace không đứt
- [ ] Mọi dòng log JSON kèm `trace_id` + `X-Request-ID`
- [ ] Metric label chỉ giá trị giới hạn; ID cụ thể ở trace/log, không phải label
- [ ] Không hand-roll tracing; OTel API là interface duy nhất
- [ ] Không log secret/token/full PII/full card; redact ở boundary
- [ ] `info` = cột mốc nghiệp vụ (1–2/request); không log mỗi hàm
- [ ] Logger/tracer inject qua constructor; không global trong domain/application
- [ ] Dashboard có P95/P99 (histogram), không chỉ avg; alert theo P99
- [ ] Metric đặc thù: consumer lag, saga fail, provisioning duration (NFR-14), health endpoint

> 🗣️ Nói thành lời: "Lỗi observability hay gặp: trace đứt ở Kafka vì quên inject traceparent
> vào message header; log không có trace id nên không nhảy từ log sang trace được; và metric
> cardinality nổ vì để order_id làm label. ID cụ thể thuộc về trace và log, label metric chỉ
> giá trị giới hạn. Luôn đo P95/P99 chứ không trung bình, và tail-based sampling để không bỏ
> mất trace lỗi."
