# CQRS — Khái niệm

> Vì sao quan trọng: CQRS bị lạm dụng nhiều. Hiểu đúng giúp bạn biết **khi nào nó đáng** (đọc
> và ghi có nhu cầu rất khác nhau) và khi nào nó chỉ thêm phức tạp mà không đổi lấy gì.

## Vấn đề nó giải

Một model duy nhất phục vụ cả ghi lẫn đọc thường bị kéo về hai hướng đối nghịch:

- **Đường ghi** cần model chuẩn hoá, bảo vệ invariant, khoá tối thiểu, transaction nhỏ.
- **Đường đọc** cần model **phi chuẩn hoá** (join sẵn, tính sẵn tổng), tối ưu cho truy vấn cụ
  thể của màn hình, và thường **đọc nhiều hơn ghi hàng chục–hàng trăm lần**.

Ép một model làm cả hai:

- Query phức tạp phải `JOIN` 5 bảng mỗi lần, hoặc load cả aggregate rồi bỏ 90% dữ liệu.
- Thêm index cho query làm chậm ghi.
- Muốn scale riêng phần đọc (đưa lên replica, cache) thì vướng vì cùng model, cùng store.

> Hệ quả production: trang "lịch sử đơn của tôi" và trang admin "tra cứu đơn" là read-heavy;
> nếu chúng phải replay aggregate hoặc join nặng thì P99 đọc xấu và đường ghi bị ảnh hưởng theo.

## Ý tưởng cốt lõi

Tách trách nhiệm:

- **Command** = ý định thay đổi (`PlaceOrder`, `CancelOrder`, `ChangePlan`). Đi qua **aggregate**,
  bảo vệ invariant, trả về ít nhất có thể (thường chỉ id hoặc void). Không trả dữ liệu để hiển thị.
- **Query** = yêu cầu đọc (`GetOrder`, `ListOrders`, `GetEntitlements`). Đọc từ **read model /
  projection** — bảng/tài liệu được thiết kế riêng cho truy vấn đó. **Không** đi qua aggregate,
  **không** thay đổi gì.

Hai đường có thể:

- Dùng model khác nhau trên **cùng một database** (CQRS "nhẹ") — projection là vài bảng
  denormalized cập nhật trong cùng transaction hoặc qua event handler nội bộ.
- Dùng **store khác nhau** (CQRS "nặng") — ghi vào Postgres, projection sang Elasticsearch/Redis;
  cập nhật bất đồng bộ qua event. Read model là **eventually consistent** với write.

## CQRS ≠ Event Sourcing

Hay bị gộp làm một. Thực tế:

- **CQRS không cần ES**: bạn có thể tách command/query mà write side vẫn là CRUD bình thường.
- **ES gần như luôn kéo theo CQRS**: nếu nguồn sự thật là chuỗi event thì đọc phải qua
  projection (replay mỗi query quá đắt).

Vici: `order-service` dùng **cả hai** (ES + CQRS). `billing-service` dùng **CQRS không ES**
(write = subscription state machine, read = entitlements + MRR projection).

## Khi nào dùng / khi nào KHÔNG

**Dùng khi:**

- Tỉ lệ đọc/ghi lệch mạnh và query phức tạp (dashboard, tra cứu, report).
- Cần audit trail đầy đủ đường ghi (→ thường đi với ES).
- Nhiều màn hình đọc cùng dữ liệu theo các hình dạng rất khác nhau.

**KHÔNG dùng khi:**

- CRUD thuần, đọc và ghi gần như đối xứng (`inventory-service` điều chỉnh tồn: đọc số, ghi số).
- Team chưa quen — CQRS "nặng" thêm eventual consistency, phải xử lý "vừa ghi xong đọc lại chưa
  thấy".
- Chỉ để "cho hiện đại". Không có nhu cầu đọc/ghi khác nhau thì đây là hai lớp trùng lặp.

> 💡 Quy tắc Vici: CQRS chỉ ở order/tenant/billing (ADR-002/008). 8 service Go + auth/user
> (NestJS nhưng CRUD thường — ADR-011) không dùng. Đừng bê sang chỉ vì "order-service làm vậy".

## Glossary

| Term | Một câu |
| --- | --- |
| Command | Ý định thay đổi state; qua aggregate; trả về tối thiểu |
| Query | Yêu cầu đọc; từ read model; không side effect |
| Read model / projection | Cấu trúc dữ liệu thiết kế riêng cho một/nhóm truy vấn, phi chuẩn hoá |
| Command bus / query bus | Bộ định tuyến gửi command/query tới đúng handler (`@nestjs/cqrs`) |
| Eventual consistency | Read model bắt kịp write sau một khoảng (thường ms), không tức thì |
| Read-your-writes | Đảm bảo người vừa ghi thì đọc lại thấy ngay — cần xử lý riêng khi CQRS nặng |

> 🗣️ Nói thành lời: "CQRS là tách command khỏi query. Command đi qua aggregate và bảo vệ
> invariant; query đọc từ projection thiết kế riêng cho màn hình, không đụng aggregate. Nó
> đáng khi đọc và ghi có nhu cầu rất khác nhau — dashboard, tra cứu, report. Nó không đáng cho
> CRUD đối xứng. CQRS không bắt buộc đi với Event Sourcing, nhưng ES thì gần như luôn kéo theo
> CQRS. Ở dự án tôi làm, chỉ ba service dùng CQRS, phần còn lại là CRUD thường."
