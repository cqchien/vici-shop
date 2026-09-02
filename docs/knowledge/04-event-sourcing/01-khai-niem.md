# Event Sourcing — Khái niệm

> Vì sao quan trọng: ES là một trong những kỹ thuật dễ chọn sai nhất. Lợi ích rất thật (audit,
> debug, projection linh hoạt) nhưng cái giá cũng thật (versioning, snapshot, vận hành). Phải
> biết cả hai để dùng đúng chỗ.

## Vấn đề nó giải

Cách thường: lưu **state hiện tại** (`orders` table, cột `status = 'shipped'`). Khi state đổi,
`UPDATE` đè lên. Vấn đề:

- **Mất lịch sử.** Không biết đơn từng ở trạng thái nào, khi nào, ai đổi, vì sao. Cột
  `updated_at` chỉ cho biết lần cuối. Khi có khiếu nại "sao đơn tôi bị huỷ" — không tra được.
- **Audit là chắp vá.** Thêm bảng `order_history` ghi tay ở mỗi chỗ `UPDATE` — dễ quên, dễ lệch.
- **Read model bị khoá cứng.** Muốn một cách nhìn mới về dữ liệu ("đơn nào từng fail payment
  rồi thành công") thì không có dữ liệu để dựng vì đã đè mất.

## Ý tưởng cốt lõi

Đảo ngược: **lưu cái gì đã xảy ra, không lưu cái đang là**.

- Mỗi thay đổi = một **domain event** bất biến, append vào **event store**:
  `OrderPlaced` → `DepositPaid` → `StockArrived` → `BalancePaid` → `OrderConfirmed` → …
- **State hiện tại = replay** toàn bộ event của aggregate đó từ đầu, áp lần lượt (`apply`).
- Không `UPDATE`, không `DELETE`. Sai → ghi event bù (`OrderCorrected`) hoặc đảo
  (`RefundIssued`). Sổ cái kế toán hoạt động đúng nguyên tắc này (NFR-04).

Event store là nguồn sự thật duy nhất. Aggregate và mọi projection là **phái sinh** — vứt đi
dựng lại từ event bất cứ lúc nào.

## So sánh nhanh

| | Lưu state (CRUD) | Event Sourcing |
| --- | --- | --- |
| Nguồn sự thật | Hàng hiện tại trong bảng | Chuỗi event append-only |
| Lịch sử | Mất (hoặc phải ghi tay) | Có sẵn, đầy đủ, miễn phí |
| Đọc state hiện tại | `SELECT` trực tiếp | Replay event → cần projection cho query |
| Sửa dữ liệu sai | `UPDATE` | Ghi event bù/đảo |
| Thêm cách nhìn mới | Không có data lịch sử | Replay lại với projection mới |
| Độ phức tạp | Thấp | Cao (version, snapshot, rebuild) |

## Lợi ích thật (và "so what")

- **Audit trail hoàn hảo.** Mọi thay đổi có thời điểm + nguyên nhân. → giải quyết khiếu nại,
  điều tra sự cố, tuân thủ (kế toán, thanh toán).
- **Debug bằng "time travel".** Replay tới trước thời điểm bug để tái hiện. → giảm thời gian
  điều tra sự cố production.
- **Projection linh hoạt.** Nghiệp vụ hỏi câu mới → viết projection mới, replay. → không cần
  migration data đau đớn.
- **Tự nhiên hợp với event-driven.** Domain event vốn đã có; publish ra Kafka qua outbox.

## Cái giá phải trả (và "so what")

- **Schema evolution.** Event đã ghi thì bất biến; đổi shape event = phải hỗ trợ cả bản cũ
  (upcasting). → mỗi thay đổi event là việc cần cẩn thận, không "đổi cột là xong".
- **Snapshot.** Aggregate sống lâu (nghìn event) → replay chậm. Cần snapshot định kỳ. → thêm
  cơ chế, thêm chỗ sai.
- **Rebuild projection tốn thời gian.** Event store lớn → replay để dựng lại read model có thể
  mất phút–giờ. → cần kế hoạch (blue-green projection).
- **Đội phải quen.** "Không có bảng orders để query thẳng" là cú sốc; onboarding lâu hơn.

## Khi nào dùng / khi nào KHÔNG

**Dùng khi:**

- Nghiệp vụ mà **lịch sử là yêu cầu**, không phải nice-to-have: đơn hàng, thanh toán, sổ cái,
  vòng đời tenant.
- Trạng thái đi qua nhiều bước có quy tắc chuyển (state machine phức tạp).

**KHÔNG dùng khi:**

- CRUD: catalog, hồ sơ khách, tồn kho (số hiện tại là đủ; movement log riêng đã cover audit).
- Dữ liệu tra cứu, cấu hình.
- Team chưa từng vận hành ES và deadline gấp — chọn CRUD + audit table, thêm ES sau nếu thật cần.

> 💡 Vici: ES chỉ ở `order-service`. `inventory-service` có `stock_movement` (audit log kiểu
> append) nhưng state là `stock_item` — đó **không phải** ES, chỉ là CRUD + log.

## Glossary

| Term | Một câu |
| --- | --- |
| Event store | Nơi lưu chuỗi event append-only, khoá theo stream |
| Stream | Chuỗi event của một aggregate (vd. một `Order`) |
| Rehydrate / replay | Dựng lại state aggregate bằng cách áp lần lượt các event |
| `apply(event)` | Hàm trong aggregate cập nhật state từ một event (không kiểm invariant) |
| Optimistic concurrency | Chặn hai lần ghi đè nhau bằng cách so `expectedVersion` |
| Snapshot | Bản chụp state aggregate tại version N để không phải replay từ 0 |
| Upcasting | Dịch event schema cũ sang mới khi đọc |
| Projection / read model | State phái sinh xây từ event, phục vụ query (xem [`03-cqrs`](../03-cqrs/README.md)) |

> 🗣️ Nói thành lời: "Event Sourcing là lưu chuỗi event đã xảy ra thay vì state hiện tại; state
> là kết quả replay. Lợi ích lớn nhất là audit trail miễn phí và khả năng dựng projection mới
> bằng replay. Cái giá là versioning event, snapshot, và rebuild projection tốn thời gian. Tôi
> chỉ dùng cho nghiệp vụ mà lịch sử là bắt buộc — đơn hàng, thanh toán, sổ cái — không dùng cho
> catalog hay hồ sơ."
