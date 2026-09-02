# Serverless AWS — Khái niệm

> Vì sao quan trọng: serverless đổi cả mô hình vận hành, cost, và một số ràng buộc kỹ thuật
> (không process luôn chạy, giới hạn thời gian, connection). Chọn đúng thì rẻ + ít ops; chọn
> sai thì cold start giết P99 và connection exhaustion giết DB.

## Serverless là gì

Không phải "không có server" — mà là **bạn không quản lý server**:

- **Compute chạy theo sự kiện**: hàm (Lambda) khởi động khi có request/message, chạy, rồi tắt.
  Không có gì "luôn chạy" chờ.
- **Scale-to-zero**: 0 request → 0 compute → **0 tiền compute**. 1.000 request đồng thời → AWS
  tự chạy 1.000 instance.
- **Tính tiền theo dùng**: mili-giây × bộ nhớ, không phải "thuê máy 24/7".
- **Managed messaging/data**: EventBridge/SQS/SNS/Aurora Serverless — không tự vận hành broker,
  không patch, không scale thủ công.

## Vấn đề nó giải cho Vici

Vici hiện thiết kế là **13 container luôn chạy** (K8s/Helm, Kong, Kafka consumer thường trực).
Với nền tảng nhiều **shop nhỏ tải không đều**:

- Phần lớn thời gian compute **nằm im nhưng vẫn tính tiền** — container chờ.
- Tự vận hành Kafka + Kong + K8s là **gánh nặng ops** không tương xứng quy mô.
- **Spike drop** cần scale nhanh — container/K8s scale chậm hơn Lambda burst.

Serverless: tenant không hoạt động = 0 compute; drop = burst concurrency; hết Kafka/K8s để vận
hành.

> Hệ quả production: với 1.000 shop mà 900 shop im phần lớn thời gian, cost mô hình container ~
> tuyến tính theo số service × replica tối thiểu; cost serverless ~ tuyến tính theo **request
> thật**. Chênh lệch lớn ở đuôi dài.

## Cái giá phải trả (và cách giảm)

| Ràng buộc | Vì sao đau | Giảm thế nào |
| --- | --- | --- |
| **Cold start** | Instance mới khởi động (~100ms Go, ~vài trăm ms Node) → P99 xấu cho request rơi vào instance lạnh | Go (binary nhỏ); **provisioned concurrency** cho đường nóng (checkout, add-to-cart); giữ ấm bằng scheduler quanh giờ drop |
| **Không process luôn chạy** | Kafka consumer thường trực, saga giữ state trong RAM — không còn | Consumer = Lambda trigger bởi SQS; saga = **Step Functions** (state ở engine); relay outbox = Lambda theo scheduler |
| **Không gRPC luồng dài** | gRPC client giữ connection HTTP/2 — Lambda ngắn hạn | Gọi nội bộ = **Lambda `Invoke` (RequestResponse)** hoặc private API GW; port interface giữ nguyên |
| **Giới hạn 15 phút / payload 256KB** | Job dài, response lớn | Việc dài → Step Functions; payload lớn → S3, truyền reference |
| **Connection DB** | 1.000 Lambda = 1.000 connection tới Postgres → cạn | **RDS Proxy** (pool) — bắt buộc vì RLS dùng `SET LOCAL` mỗi transaction; hoặc Aurora Serverless v2 |
| **Vendor lock-in** | EventBridge/SF/SQS là API AWS | Giữ core sạch (hexagonal); adapter mỏng, thay được; đây là lý do hexagonal quan trọng |
| **Dev-prod parity** | Không `docker compose` được nữa | **AWS SAM + LocalStack** |

## Khi nào KHÔNG serverless (hoặc dùng có chọn lọc)

- Workload **liên tục, tải đều, cao** — container 24/7 rẻ hơn Lambda ở mức đó (Lambda đắt/unit
  compute khi chạy mãi).
- Cần **độ trễ P99 cực thấp, ổn định** cho mọi request và không muốn trả tiền provisioned
  concurrency lớn.
- Consumer cần **giữ connection/state lâu** (WebSocket server, stream processor stateful).
- Team chưa từng vận hành serverless + deadline gấp — rủi ro cao.

Vici pilot **tenant-service + billing-service** trước (tải thấp, saga-heavy) rồi mới cân nhắc
service thương mại.

## Glossary

| Term | Một câu |
| --- | --- |
| Lambda | Hàm chạy theo sự kiện, scale-to-zero, tính theo ms×memory |
| Cold start | Độ trễ thêm khi Lambda khởi động instance mới |
| Provisioned concurrency | Giữ sẵn N instance ấm để tránh cold start |
| API Gateway | Managed edge: routing, JWT authorizer, throttling |
| Lambda authorizer | Hàm chạy trước, quyết định allow/deny + trả context (Vici: `tenantId`) |
| EventBridge | Bus sự kiện managed; rule route theo `source`/`detail-type` |
| SQS | Hàng đợi managed; buffer, retry, DLQ, FIFO tùy chọn |
| SNS | Pub/sub managed; fan-out một message tới nhiều subscriber |
| Step Functions | Orchestrator managed (state machine ASL) cho saga/workflow |
| Callback task token | Cơ chế Step Functions chờ tín hiệu async (event) rồi tiếp |
| RDS Proxy | Pool connection giữa Lambda và RDS |
| ADOT | AWS Distro for OpenTelemetry (Lambda layer) |

> 🗣️ Nói thành lời: "Serverless là không quản lý server: compute chạy theo request, scale-to-zero,
> tính theo mili-giây. Nó hợp với nền tảng nhiều shop nhỏ tải không đều vì shop im thì không tốn
> compute, và bỏ được việc vận hành Kafka/K8s. Cái giá: cold start nên đường nóng cần provisioned
> concurrency; không có process luôn chạy nên consumer thành Lambda trigger bởi SQS và saga
> thành Step Functions; và 1.000 Lambda cạn connection DB nên bắt buộc RDS Proxy. Điểm mấu chốt
> là hexagonal core không đổi — Lambda handler chỉ là adapter mới."
