# Serverless AWS — luồng đề xuất (kèm ADR-010)

> Trạng thái: **đề xuất**, đi kèm [ADR-010](adrs/ADR-010-serverless-aws-delivery.md) (Proposed).
> Compute = **Lambda**; async = **EventBridge → SQS**, fan-out rộng = **SNS**; saga =
> **Step Functions**; edge = **API Gateway HTTP API** (thay Kong). Tenant context ADR-009 giữ
> nguyên, đổi phương tiện (authorizer context / `detail.tenantId` / SQS message attribute).

## 0. Bản đồ tổng

```mermaid
flowchart LR
    CF["CloudFront + WAF"]
    APIGW["API Gateway (HTTP API)<br/>+ Lambda authorizer (JWT + tenant resolve)"]
    subgraph L["Lambda / service (hexagonal core không đổi)"]
        Lrest["REST handlers"]
        Lrpc["RPC handlers (invoke nội bộ)"]
        Lcons["Event consumers (trigger SQS)"]
        Lrelay["Outbox relay (Scheduler 1')"]
    end
    EB["EventBridge default bus<br/>source=vici.&lt;context&gt;"]
    SQS["SQS mỗi consumer (+ DLQ)"]
    SNS["SNS (fan-out rộng)"]
    SFN["Step Functions<br/>checkout saga · provisioning saga"]
    RDS["RDS PostgreSQL + RDS Proxy<br/>(RLS: SET LOCAL app.tenant_id)"]
    EC["ElastiCache Serverless<br/>cart · drop counter atomic"]
    SCH["EventBridge Scheduler<br/>dunning · deadline · purge"]

    CF --> APIGW --> Lrest
    Lrest -->|Invoke RequestResponse| Lrpc
    Lrest --> RDS
    Lrpc --> RDS
    Lrest --> EC
    Lrelay -->|"đọc outbox → putEvents"| EB
    EB -->|rule| SQS --> Lcons --> RDS
    EB --> SNS --> SQS
    Lrest -->|StartExecution| SFN
    SFN -->|Invoke| Lrpc
    EB -->|"payment.succeeded → SendTaskSuccess"| SFN
    SCH --> Lcons
```

## 1. Request REST công khai (storefront `GET /products`)

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant CF as CloudFront
    participant GW as API Gateway HTTP API
    participant Auth as Lambda authorizer
    participant Fn as product Lambda
    participant Proxy as RDS Proxy
    participant PG as product_db (RLS)

    Client->>CF: GET https://{shop}.vici.shop/v1/products
    CF->>GW: forward (Host giữ nguyên)
    GW->>Auth: authorize (Authorization?, Host)
    Auth->>Auth: JWT hợp lệ → tid; hoặc ResolveTenantByHost(Host)
    Auth-->>GW: allow + context.tenantId
    GW->>Fn: event (context.authorizer.tenantId)
    Fn->>Proxy: BEGIN; SET LOCAL app.tenant_id = $tid
    Proxy->>PG: SELECT ... (RLS lọc theo tenant)
    PG-->>Fn: rows
    Fn-->>Client: 200 { data, meta }
```

Rate limit: **usage plan / throttle theo API key ảo = tenant** (thay `rate-limiting` plugin Kong).

## 2. Saga checkout (Step Functions + callback task token)

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant GW as API Gateway
    participant Order as order Lambda
    participant SFN as Step Functions (CheckoutSaga)
    participant Inv as inventory Lambda
    participant Pay as payment Lambda
    participant EB as EventBridge
    participant Ship as shipping Lambda

    Client->>GW: POST /v1/orders (Idempotency-Key)
    GW->>Order: event
    Order->>Order: append OrderPlaced (event store + outbox, cùng transaction)
    Order->>SFN: StartExecution({ orderId, tenantId, lines })
    Order-->>Client: 201 { orderId, payUrl }

    SFN->>Inv: Invoke ReserveStock  (retry 2, backoff)
    Inv-->>SFN: reservationId
    SFN->>Pay: Invoke CreatePayment
    Pay-->>SFN: pending (+ task token lưu lại)
    Note over SFN: Task "WaitForPayment" — chờ callback
    EB-->>SFN: payment.succeeded → SendTaskSuccess(token)
    SFN->>Inv: Invoke CommitReservation
    SFN->>Ship: Invoke CreateShipment
    SFN->>EB: putEvents(order.confirmed)

    Note over SFN: Catch bất kỳ bước nào →
    SFN->>Inv: ReleaseReservation
    SFN->>Pay: Refund (nếu đã thu)
    SFN->>Order: Invoke MarkCancelled
```

- **Timeout thanh toán**: state `WaitForPayment` có `TimeoutSeconds` (vd. 1800) → nhánh
  compensation, đơn về `pending_payment` (FR-PAY-07).
- Saga state (đang ở bước nào) do **Step Functions** giữ — không service nào giữ hộ.

## 3. Fan-out `order.completed` (EventBridge → SQS → Lambda)

```mermaid
sequenceDiagram
    autonumber
    participant Relay as order outbox relay Lambda
    participant EB as EventBridge (vici.order / order.completed)
    participant Qf as SQS finance
    participant Qu as SQS user
    participant Qn as SQS notification
    participant Fin as finance consumer Lambda
    participant Usr as user consumer Lambda
    participant Not as notification consumer Lambda

    Relay->>EB: putEvents(detail={ tenantId, orderId, ... })
    par rule → 1 queue mỗi consumer
        EB->>Qf: message (attr tenant-id)
        EB->>Qu: message (attr tenant-id)
        EB->>Qn: message (attr tenant-id)
    end
    Qf->>Fin: batch (SET app.tenant_id → ghi sổ; dedupe eventId)
    Qu->>Usr: batch (cộng điểm)
    Qn->>Not: batch (email theo thương hiệu tenant)
    Note over Fin,Not: lỗi 1 item → ReportBatchItemFailures;<br/>hết retry → DLQ + alarm
```

- **Thứ tự cần thiết** (vd. các event của cùng một `order_id`): dùng **SQS FIFO** với
  `MessageGroupId = orderId`, `MessageDeduplicationId = eventId`.
- **Fan-out rất rộng** (`tenant.provisioned` → ~7 context): EventBridge → **SNS** → SQS mỗi
  context (tránh giới hạn 5 target/rule và dễ thêm subscriber).

## 4. Onboarding + provisioning saga

```mermaid
sequenceDiagram
    autonumber
    actor Owner
    participant GW as API Gateway
    participant Tn as tenant Lambda
    participant SFN as Step Functions (ProvisioningSaga)
    participant Au as auth Lambda
    participant Bl as billing Lambda
    participant EB as EventBridge
    participant SNS as SNS tenant.provisioned
    participant Ctx as context seed Lambdas

    Owner->>GW: POST /v1/tenants
    GW->>Tn: event (route cross-tenant)
    Tn->>Tn: kiểm subdomain → Tenant{provisioning}
    Tn->>SFN: StartExecution({ tenantId, subdomain, planCode, seed })
    SFN->>Au: Invoke AttachTenant           (catch → xoá Tenant)
    SFN->>Bl: Invoke CreateSubscription     (catch → xoá account + Tenant)
    SFN->>EB: putEvents(tenant.provisioned)
    EB->>SNS: (fan-out)
    SNS-->>Ctx: mỗi context: SET app.tenant_id → seed defaults (+ catalog mẫu)
    SFN->>Tn: RegisterSubdomain (API GW custom domain / Route53)
    SFN->>Tn: MarkActive
    SFN->>EB: putEvents(notification: email chào mừng)
```

Bước seed **idempotent theo `tenantId`** (Step Functions có thể retry); toàn saga < 5' (NFR-14) —
Step Functions Standard đo được bằng execution duration.

## 5. Drop spike (NFR-02)

```mermaid
sequenceDiagram
    autonumber
    actor Clients as 1.000 clients
    participant GW as API Gateway (throttle/tenant)
    participant Cart as cart Lambda (provisioned concurrency)
    participant EC as ElastiCache Serverless
    participant Q as SQS FIFO (checkout)

    Clients->>GW: POST /v1/cart/items (drop)
    GW->>Cart: event (burst concurrency)
    Cart->>EC: EVAL Lua: INCR allocation + per-customer (atomic)
    alt còn slot
        EC-->>Cart: ok
        Cart-->>Clients: 200
    else hết
        EC-->>Cart: reject
        Cart-->>Clients: 422 DROP_LIMIT_EXCEEDED
    end
    Note over Cart,Q: khi khách bấm checkout → enqueue FIFO<br/>(MessageGroupId=tenantId#dropId) để hạ tải đỉnh
```

- **Provisioned concurrency** cho `cart` + `order` trong khung giờ drop (EventBridge Scheduler
  bật/tắt trước/sau giờ G).
- Counter atomic ở **ElastiCache** (không phải DynamoDB) vì cần độ trễ sub-ms + Lua.

## 6. Cron (EventBridge Scheduler → Lambda)

| Lịch | Lambda | Việc |
| --- | --- | --- |
| mỗi 1' | `*-outbox-relay` (mỗi service) | đọc `outbox` chưa gửi → `PutEvents` EventBridge → đánh dấu `sent_at` |
| mỗi giờ | `billing-dunning` | quét invoice `past_due` tới hạn retry → charge → phát `billing.*` |
| mỗi giờ | `order-preorder-deadline` | đơn pre-order quá 7 ngày chưa trả nốt → `cancelled` + forfeit policy |
| hằng ngày | `tenant-purge` | tenant `archived` > 90 ngày → `tenant.purge_requested` |

## Dev & IaC

- **AWS SAM + LocalStack** thay `docker compose` cho local (Lambda, API GW, SQS, SNS,
  EventBridge, Step Functions Local); Postgres/Redis vẫn container local.
- Terraform mở rộng: `infra/terraform/modules/{lambda,eventbridge}` đã có sẵn scaffold — thêm
  `apigateway`, `stepfunctions`, `sqs`, `sns`, `rds-proxy`.
- OTel: **ADOT Lambda layer** → collector hiện tại (Jaeger/Prometheus/Grafana/Loki không đổi).
