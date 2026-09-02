# Saga — Khái niệm

> Vì sao quan trọng: khi một nghiệp vụ đụng nhiều service/database, bạn **không thể** dùng một
> transaction. Saga là câu trả lời chuẩn — nhưng nó đánh đổi atomicity lấy eventual consistency,
> và bạn phải thiết kế compensation cẩn thận.

## Vì sao không dùng distributed transaction (2PC)

Two-Phase Commit khoá tài nguyên trên nhiều service cho tới khi tất cả sẵn sàng commit. Ở
microservices, điều này hỏng:

- **Khoá xuyên service = coupling thời gian.** Một service chậm/chết giữ khoá → mọi service
  khác trong giao dịch chờ. Availability sụp theo cấp số nhân.
- **Không scale.** Dưới tải drop, hàng nghìn giao dịch giữ khoá đồng thời → nghẽn.
- **Nhiều datastore không hỗ trợ.** Redis, Kafka, API bên thứ ba (VNPay) không tham gia 2PC được.
- Vi phạm database-per-service (ADR-001): không có transaction chung.

## Saga giải gì

Chia quy trình dài thành **các transaction cục bộ** (mỗi cái chỉ trong một service, một
database, commit ngay), nối lại bằng messaging. Nếu một bước sau thất bại, chạy **compensation**
cho các bước đã xong — *lùi về trạng thái nhất quán về mặt nghiệp vụ*, không phải rollback kỹ
thuật.

Ví dụ checkout: `ReserveStock` → `ChargePayment` → `CreateShipment`.
Nếu `CreateShipment` fail sau khi đã charge: compensation = `RefundPayment` + `ReleaseStock` +
đơn `cancelled`. Không có ai "rollback" — ta ghi thêm các hành động đảo.

> Hệ quả production: saga cho phép mỗi bước commit và nhả tài nguyên ngay → throughput cao, một
> service chết chỉ chặn saga đang chạy chứ không khoá cả hệ thống. Đổi lại: có khoảng thời gian
> hệ thống "chưa nhất quán" (đã trừ tồn nhưng chưa charge) — nghiệp vụ phải chấp nhận.

## Compensation ≠ rollback

- **Rollback**: DB tự huỷ, như chưa từng xảy ra.
- **Compensation**: một hành động nghiệp vụ **mới**, đảo tác dụng của bước trước, và **để lại
  dấu vết**. `RefundPayment` là một giao dịch thật, có phí, có record — khách thấy "đã hoàn tiền",
  không phải "giao dịch biến mất".

Một số bước **không đảo được hoàn toàn**: email đã gửi, hàng đã giao. → thiết kế saga để các
bước không-đảo-được nằm **cuối**, hoặc chấp nhận compensation "mềm" (gửi email xin lỗi).

## Orchestration vs Choreography

**Orchestration** — một **process manager** (orchestrator) giữ state của saga, ra lệnh từng
bước, nghe kết quả, quyết định bước tiếp hoặc compensation.

- ✅ Luồng nhìn thấy được ở một chỗ; dễ debug "đang ở bước nào"; dễ thêm bước.
- ✅ Compensation tường minh.
- ❌ Orchestrator là một component phải xây + vận hành; có thể thành điểm nghẽn nếu làm sai.

**Choreography** — không ai chỉ huy. Mỗi service nghe event, làm phần của mình, phát event tiếp.

- ✅ Loose coupling, không component trung tâm.
- ❌ Luồng "ẩn" — rải trong nhiều service; khó biết toàn cảnh; dễ tạo vòng lặp event; compensation
  khó phối hợp.

**Chọn thế nào:**

| Dùng orchestration | Dùng choreography |
| --- | --- |
| Nhiều bước (≥ 3), có compensation | Fan-out đơn giản, 1–2 bước, không cần bù |
| Cần biết "đang ở đâu" (support, monitoring) | Các phản ứng độc lập với nhau |
| Thứ tự bước quan trọng | Thứ tự không quan trọng |
| Ví dụ Vici: checkout, provisioning | Ví dụ Vici: `order.completed` → finance + user + notification |

## Khi nào KHÔNG cần saga

- Nghiệp vụ nằm gọn trong **một aggregate, một service** → dùng transaction cục bộ thường.
- Chỉ cần "thông báo cho service khác biết" mà không cần chờ kết quả hay bù → phát event
  (choreography nhẹ), không phải saga.

## Glossary

| Term | Một câu |
| --- | --- |
| Saga | Chuỗi transaction cục bộ + compensation, thay cho distributed transaction |
| Compensation | Hành động nghiệp vụ mới đảo tác dụng của một bước đã xong |
| Orchestrator / process manager | Component giữ state saga và ra lệnh từng bước |
| Choreography | Điều phối bằng event, không có orchestrator |
| Semantic lock | Đánh dấu "đang xử lý" (vd. reservation) thay cho khoá DB thật |
| Pivot step | Bước sau đó không thể compensation nữa (điểm không quay lại) |
| Compensatable step | Bước trước pivot, có thể bù |

> 🗣️ Nói thành lời: "Saga thay cho distributed transaction khi nghiệp vụ đụng nhiều service.
> Mỗi bước là transaction cục bộ commit ngay; nếu bước sau fail thì chạy compensation cho các
> bước đã xong — compensation là hành động nghiệp vụ mới có để lại dấu vết, không phải rollback.
> Tôi chọn orchestration khi có từ ba bước trở lên và cần biết saga đang ở đâu; choreography cho
> fan-out đơn giản như một event kích ba consumer độc lập."
