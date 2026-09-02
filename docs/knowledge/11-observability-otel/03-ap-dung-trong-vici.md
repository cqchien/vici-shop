# OpenTelemetry — Áp dụng trong Vici

Nguồn chuẩn: [`coding-conventions-go.md`](../../../.claude/conventions/coding-conventions-go.md) §9 (zap), §14 (OTel);
[`coding-conventions.md`](../../../.claude/conventions/coding-conventions.md) §5;
[`02-tech-stack.md`](../../20-architecture/02-tech-stack.md);
[`99-nfr.md`](../../10-requirements/99-nfr.md) NFR-08.

## Stack

Từ [`02-tech-stack.md`](../../20-architecture/02-tech-stack.md): **OpenTelemetry → Jaeger,
Prometheus, Grafana, Loki**. Config: `backend/infra/observability/{otel-collector,jaeger,
prometheus,grafana,loki}/`.

NFR-08: *"Observability chuẩn OpenTelemetry: trace xuyên service (gRPC + Kafka), metrics
Prometheus, log JSON có trace id. Health endpoint mỗi service."*

## Init (conventions §14)

*"Initialize the OTel SDK once in `cmd/server/main.go` — tracer provider, meter provider, log
bridge. Use `go.opentelemetry.io/otel`."* NestJS: trong `main.ts` trước khi app khởi động.
Exporter: OTLP → OTel Collector.

`OTEL_SERVICE_NAME` và `OTEL_EXPORTER_OTLP_ENDPOINT` là env vars (xem
`backend/infra/docker/.env.example`, và `.env.example` của tenant/billing-service).

## Propagation

- **gRPC** (§14): *"Propagate context across gRPC calls with `otelgrpc` interceptors."* Interceptor
  cũng là chỗ inject/extract metadata `x-tenant-id` (ADR-009) — cùng một lớp.
- **Kafka** (§14): *"across Kafka messages by injecting/extracting the W3C Trace Context header
  into message headers."* Header `traceparent` đi cạnh header `tenant-id` (relay copy từ outbox).
- **Kong**: `request-id` plugin sinh `X-Request-ID`, `echo_downstream: true` → mọi service log
  kèm, dùng làm correlation id ngoài trace.

## Span cho use case (§14)

```go
ctx, span := otel.Tracer("order").Start(ctx, "CreateOrder")
defer span.End()
```

*"Do not hand-roll tracing. The OTel API is the only tracing interface."*

## Metric riêng service (từ spec)

- [`tenant-service.md`](../../40-services/tenant-service.md) §7:
  `tenant_provisioning_duration_seconds` (histogram — theo dõi **NFR-14** < 5 phút),
  `tenant_provisioning_failed_total{step}`, `tenants_active` (gauge).
- [`billing-service.md`](../../40-services/billing-service.md) §7: `billing_mrr_vnd` (gauge),
  `billing_invoices_failed_total`, `billing_dunning_active`, `entitlements_rpc_duration_seconds`.
- [`product-service.md`](../../40-services/product-service.md) §7:
  `product_reviews_created_total{hasPulled}`.

## Logging (§9)

- `uber-go/zap`, structured fields, **không** `fmt.Sprintf` trong message. Inject qua
  constructor; **không** global `zap.L()` trong domain/application.
- Level: `error` (kèm `zap.Error`), `warn`, `info` (1–2 cột mốc/request), `debug` (tắt prod).
- **Include trace id on every log line** (§9).
- **Never log secrets/tokens/passwords/full PII/full card numbers** (§9,
  [CONSTITUTION](../../../.claude/CONSTITUTION.md) II.5, NFR-07). Redact ở boundary.

## Trace nối liền một luồng Vici

Checkout ([`05-key-flows.md`](../../20-architecture/05-key-flows.md) §1): một `trace_id` xuyên
qua `POST /orders` (Kong) → order-service span `CreateOrder` → gRPC span `ReserveStock`
(inventory) → gRPC span `CreatePayment` (payment) → outbox → Kafka (header `traceparent`) →
consumer span ở finance/user/notification. Trong Jaeger: một cây span duy nhất từ click "Đặt
hàng" tới "email đã gửi".

## Serverless (ADR-010)

Từ [`06-serverless-aws.md`](../../20-architecture/06-serverless-aws.md) §0 "Dev & IaC": **ADOT
Lambda layer** (AWS Distro for OpenTelemetry) → cùng OTel Collector; Jaeger/Prometheus/Grafana/
Loki không đổi. Trace propagate qua API GW → Lambda invoke → EventBridge (`detail`) → SQS
(message attribute) → Step Functions execution history.

## Đọc tiếp

- Correlation id từ Kong → [`09-api-gateway-kong`](../09-api-gateway-kong/README.md)
- Interceptor gRPC (cùng chỗ tenant) → [`08-grpc-buf`](../08-grpc-buf/README.md)
- Trace qua Kafka header → [`07-event-driven-kafka`](../07-event-driven-kafka/README.md)
