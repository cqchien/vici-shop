# Serverless AWS — Pitfalls & thực hành

## 1. Database connection exhaustion

- **Triệu chứng**: mỗi Lambda tự `pg.connect()`; drop → 1.000 Lambda → 1.000 connection tới
  Postgres → `FATAL: too many connections`.
- **Vì sao hỏng**: DB từ chối kết nối → mọi request lỗi, kể cả tenant không liên quan drop.
- **Cách đúng**: **RDS Proxy** (pool + tái dùng) hoặc Aurora Serverless v2. Lambda kết nối
  Proxy, không kết nối RDS trực tiếp. Vẫn `SET LOCAL app.tenant_id` mỗi transaction.

## 2. Cold start trên đường nóng

- **Triệu chứng**: `POST /orders` / add-to-cart lúc drop rơi vào instance lạnh → +vài trăm ms.
- **Vì sao hỏng**: NFR-02 đặt p95 add-to-cart < 1s; NFR-01 API ghi < 500ms. Cold start làm
  đuôi latency xấu đúng lúc tải cao nhất.
- **Cách đúng**: **provisioned concurrency** cho `cart`, `order` (bật/tắt bằng scheduler quanh
  giờ G). Go (khởi động nhanh). Giữ package Lambda nhỏ, ít dependency init.

## 3. Mất thứ tự khi cần thứ tự (SQS standard)

- **Triệu chứng**: dùng SQS standard cho event của một đơn → `OrderShipped` xử lý trước
  `OrderConfirmed`.
- **Vì sao hỏng**: projection/consumer thấy trạng thái sai thứ tự → state máy đơn loạn.
- **Cách đúng**: **SQS FIFO** với `MessageGroupId = orderId` cho các event cần thứ tự;
  `MessageDeduplicationId = eventId`. Giữa đơn khác nhau: standard, song song.

## 4. Thiếu DLQ / redrive policy

- **Triệu chứng**: SQS không có DLQ; message hỏng retry tới `maxReceiveCount` rồi... biến mất,
  hoặc quay vòng mãi.
- **Vì sao hỏng**: mất event (sổ sách thiếu) hoặc queue tắc. Giống pitfall Kafka không DLQ.
- **Cách đúng**: redrive policy → `<queue>-dlq` sau N lần; CloudWatch alarm trên
  `ApproximateNumberOfMessagesVisible` của DLQ.

## 5. Retry của EventBridge/SQS gây side-effect kép

- **Triệu chứng**: Lambda consumer chưa idempotent; SQS redeliver (visibility timeout hết trước
  khi xử lý xong) → xử lý hai lần.
- **Vì sao hỏng**: cộng doanh thu/điểm hai lần — giống at-least-once của Kafka.
- **Cách đúng**: dedupe `eventId` trước khi apply; `ReportBatchItemFailures` để chỉ retry item
  fail; visibility timeout ≥ thời gian xử lý tối đa.

## 6. Step Functions Standard vs Express nhầm chỗ

- **Triệu chứng**: dùng Express (rẻ, nhanh, nhưng at-least-once và không có execution history
  đầy đủ) cho checkout saga.
- **Vì sao hỏng**: mất khả năng "xem đơn kẹt ở bước nào"; at-least-once → bước không idempotent
  chạy lại.
- **Cách đúng**: **Standard** cho saga nghiệp vụ (history đầy đủ, exactly-once transition,
  callback token). Express cho luồng cực ngắn, tần suất rất cao, không cần audit.

## 7. Lambda quá "béo" — một hàm làm mọi route

- **Triệu chứng**: một Lambda handle toàn bộ REST của một service qua router nội bộ.
- **Vì sao hỏng**: cold start nặng (load cả service); permission IAM quá rộng; khó tune memory
  per-endpoint; blast radius lớn.
- **Cách đúng**: cân bằng — một hàm cho một nhóm route liên quan, hoặc một hàm cho REST + hàm
  riêng cho mỗi consumer/RPC. IAM least-privilege per hàm.

## 8. Payload > 256KB qua SQS/EventBridge/Step Functions

- **Triệu chứng**: event `order.completed` với 200 line item + ảnh base64.
- **Vì sao hỏng**: vượt giới hạn → gửi fail hoặc phải nén; Step Functions state cũng có giới hạn.
- **Cách đúng**: payload gọn (id + field then chốt + snapshot cần thiết); dữ liệu lớn để S3,
  truyền reference (S3 key).

## 9. Không có dev-prod parity

- **Triệu chứng**: test local bằng cách gọi Lambda handler như hàm thường; không test authorizer,
  EventBridge routing, SQS retry.
- **Vì sao hỏng**: "chạy trên máy tôi" nhưng authorizer/routing sai trên AWS; phát hiện ở staging/prod.
- **Cách đúng**: **AWS SAM + LocalStack** — chạy API GW + authorizer + SQS + EventBridge +
  Step Functions Local. Test integration với chúng.

## 10. Vendor lock-in ngấm vào domain

- **Triệu chứng**: `domain/` import AWS SDK; command handler gọi thẳng `sqs.SendMessage`.
- **Vì sao hỏng**: domain dính AWS; không test không AWS; đổi cloud = viết lại nghiệp vụ.
- **Cách đúng**: hexagonal — domain/application chỉ biết port (`EventPublisher`,
  `WorkflowStarter`); adapter AWS ở `infrastructure/`. Đây chính là lý do đổi được từ container
  sang serverless mà không đụng core.

## 11. IAM quá rộng ("*" trên "*")

- **Triệu chứng**: mọi Lambda có role `AdministratorAccess`.
- **Vì sao hỏng**: một Lambda bị khai thác = toàn bộ AWS account. Với đa tenant, cực nguy hiểm.
- **Cách đúng**: least-privilege per hàm — hàm order chỉ được `states:StartExecution` state
  machine của nó, `lambda:InvokeFunction` các hàm nó gọi, `rds-db:connect` DB của nó.

## 12. Bỏ qua cost của "chạy mãi"

- **Triệu chứng**: một Lambda poll một hàng đợi bên ngoài trong vòng lặp, hoặc chạy gần 15' mỗi
  lần liên tục.
- **Vì sao hỏng**: Lambda tính theo ms — "chạy mãi" đắt hơn container 24/7 ở mức tải đó.
- **Cách đúng**: workload liên tục tải cao → giữ container. Serverless cho tải không đều /
  event-driven / burst.

## Checklist — Definition of Done

- [ ] Lambda kết nối **RDS Proxy** (không RDS trực tiếp); vẫn `SET LOCAL app.tenant_id` mỗi transaction
- [ ] Provisioned concurrency cho đường nóng (cart, order); bật/tắt quanh giờ drop
- [ ] SQS FIFO + `MessageGroupId` cho event cần thứ tự; standard cho phần còn lại
- [ ] Mọi SQS có redrive → `<queue>-dlq` + CloudWatch alarm
- [ ] Lambda consumer idempotent (dedupe `eventId`); `ReportBatchItemFailures`; visibility timeout đủ
- [ ] Saga = Step Functions **Standard**; `Retry`/`Catch` khai báo; callback token cho chờ async + timeout
- [ ] Event/payload ≤ 256KB; dữ liệu lớn → S3 reference
- [ ] Tenant context: authorizer trả `tenantId`; `detail.tenantId`; SQS attribute `tenant-id`
- [ ] `domain/` + `application/` không import AWS SDK; adapter AWS ở `infrastructure/`
- [ ] IAM least-privilege per hàm
- [ ] Local: SAM + LocalStack; test authorizer + routing + retry, không chỉ gọi handler
- [ ] Outbox (ADR-004) và RLS (ADR-007) giữ nguyên — chỉ đổi adapter

> 🗣️ Nói thành lời: "Hai lỗi serverless giết hệ nhanh nhất: connection exhaustion — 1.000
> Lambda mở 1.000 connection tới Postgres, phải có RDS Proxy — và cold start trên đường nóng
> lúc drop, phải provisioned concurrency. Async thì SQS FIFO nếu cần thứ tự, luôn có DLQ, và
> consumer idempotent vì vẫn at-least-once. Saga dùng Step Functions Standard cho execution
> history. Và giữ domain sạch không import AWS SDK — đó là lý do đổi được từ container sang
> serverless mà không viết lại nghiệp vụ."
