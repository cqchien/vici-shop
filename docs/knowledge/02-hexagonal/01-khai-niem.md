# Hexagonal — Khái niệm

> Vì sao quan trọng: đây là quy tắc giữ cho **business logic không bị framework/hạ tầng bắt cóc**.
> Vi phạm nó thì mỗi lần nâng cấp ORM, đổi broker, hay chuyển sang serverless, bạn phải sửa cả
> logic nghiệp vụ — rủi ro và tốn kém.

## Vấn đề nó giải

Kiến trúc phân tầng truyền thống (Controller → Service → Repository) có một điểm yếu: **Service
phụ thuộc xuống Repository cụ thể**, Repository phụ thuộc ORM, ORM phụ thuộc driver DB. Business
logic nằm cuối một chuỗi phụ thuộc vào hạ tầng.

Hậu quả thực tế:

- **Không test được logic mà không dựng DB.** Test "đơn không thể thanh toán hai lần" phải chạy
  Postgres → chậm, giòn, không chạy được trong unit test.
- **Đổi hạ tầng = sửa logic.** Chuyển từ REST sang gRPC, hay từ Postgres sang serverless
  Aurora, kéo theo sửa Service vì Service biết quá nhiều về tầng dưới.
- **Framework "rò rỉ" khắp nơi.** `@Entity` của ORM, `context.Context` của HTTP, annotation của
  Nest nằm lẫn trong class nghiệp vụ.

## Ý tưởng cốt lõi

Đảo hướng phụ thuộc quanh domain:

- **Domain** (business logic) ở trung tâm, **không import gì** ngoài standard library.
- Domain **khai báo port** = interface mô tả "tôi cần gì từ bên ngoài": `OrderRepository`,
  `PaymentGateway`, `Clock`.
- **Adapter** là code cụ thể ở vòng ngoài: `PostgresOrderRepository` implement `OrderRepository`;
  `VNPayGateway` implement `PaymentGateway`.
- **Dependency rule**: mũi tên phụ thuộc luôn chỉ **vào trong**. Adapter biết domain; domain
  **không** biết adapter. Adapter phụ thuộc vào interface do domain/application định nghĩa
  (Dependency Inversion).

"Hexagonal" chỉ là hình vẽ — lục giác để nhấn mạnh có **nhiều loại cổng** (HTTP, CLI, test,
queue) cắm vào cùng một lõi, không phải "trên–dưới" như layered.

## Port: driving vs driven

- **Driving port (inbound)** — thế giới *gọi vào* ứng dụng. Use case handler (`PlaceOrder`) là
  driving port; REST controller / gRPC handler / Kafka consumer là **driving adapter** gọi nó.
- **Driven port (outbound)** — ứng dụng *gọi ra* thế giới. `OrderRepository`, `PaymentGateway`
  là driven port; Postgres/gRPC-client/Kafka-producer là **driven adapter** implement nó.

> 💡 Mẹo phân biệt: nếu bỏ adapter đi thì app *không nhận được request nữa* → driving. Nếu bỏ đi
> thì app *không lưu/gọi được gì nữa* → driven.

## Adapter đổi được — ví dụ cụ thể

Litmus test của Vici (từ `architecture.md`): *"Đổi PostgreSQL sang store khác, hoặc REST sang
gRPC, bằng cách viết adapter mới và chỉ sửa wiring trong `main.go` — không đụng `domain/` hay
`application/`. Nếu được thì kiến trúc đúng."*

Ví dụ Vici có kế hoạch dùng: [ADR-010](../../20-architecture/adrs/ADR-010-serverless-aws-delivery.md)
chuyển sang serverless. Vì hexagonal, Lambda handler chỉ là **một driving adapter mới** trong
`interface/`; `infrastructure/grpc` → `infrastructure/awsinvoke` là **một driven adapter mới**.
`domain/` + `application/` không đổi một dòng.

## Khi nào dùng / khi nào KHÔNG

**Dùng khi**: dịch vụ có business logic đáng kể, sống lâu, và bạn muốn test nhanh + đổi hạ tầng
được. Đúng mô tả mọi service của Vici.

**Nhẹ tay khi**: một Lambda/script chỉ transform dữ liệu A→B không có invariant — lớp port/adapter
là overhead. Vẫn tách "phần thuần" ra hàm không I/O để test, nhưng không cần đủ 4 thư mục.

## Glossary

| Term | Một câu |
| --- | --- |
| Port | Interface domain/application khai báo về nhu cầu với bên ngoài |
| Adapter | Code cụ thể (framework/IO) implement port hoặc gọi vào use case |
| Driving / inbound | Bên ngoài gọi vào app (REST, gRPC server, Kafka consumer) |
| Driven / outbound | App gọi ra ngoài (DB, gRPC client, Kafka producer, HTTP client) |
| Dependency Inversion | Module cấp cao định nghĩa interface; module cấp thấp implement — không phải ngược lại |
| Wiring / composition root | Nơi tạo adapter cụ thể và tiêm vào use case (`main.go` / NestJS module) |

> 🗣️ Nói thành lời: "Hexagonal với tôi là một quy tắc phụ thuộc duy nhất: domain ở giữa, không
> import framework, và mọi thứ khác là adapter cắm vào port mà domain định nghĩa. Lợi ích cụ
> thể: test business logic không cần Postgres, và đổi hạ tầng — ví dụ chuyển sang Lambda — chỉ
> là viết adapter mới rồi sửa wiring, không đụng domain. Nếu tôi thấy `@Entity` hay
> `http.Request` trong class nghiệp vụ thì biết ngay là đã vi phạm."
