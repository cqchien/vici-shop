# gRPC + Buf — Khái niệm

> Vì sao quan trọng: gọi nội bộ sai cách (REST tự do giữa service, không deadline, retry bừa)
> là nguồn của cascading failure và data corruption. gRPC + contract-first ép kỷ luật ở đúng
> chỗ dễ ẩu nhất.

## Vấn đề nó giải

Khi service A cần hỏi service B một câu và **chờ trả lời** (order hỏi inventory "còn hàng
không?"), lựa chọn:

- **REST/JSON nội bộ**: dễ bắt đầu nhưng: contract chỉ là "tài liệu" (dễ lệch code), JSON verbose,
  không typed (A gửi sai field, B nhận `null`, phát hiện lúc runtime), mỗi team đặt path/format
  khác nhau.
- **gRPC**: `.proto` là **contract thực thi được** — sinh ra code cả hai đầu, sai kiểu là lỗi
  **compile**. Protobuf nhỏ hơn JSON ~3–10 lần. HTTP/2 multiplex. Có sẵn deadline, streaming,
  status code chuẩn.

> Hệ quả production: contract lệch giữa hai service là bug tích hợp kinh điển, thường lộ ở
> production. gRPC + code-gen đẩy nó về compile time. Payload nhỏ + HTTP/2 → P99 nội bộ tốt hơn,
> đỡ băng thông trong VPC.

## Contract-first

Quy trình: **viết `.proto` trước** → review (Buf lint + breaking check) → sinh stub Go + TS →
implement. Không phải "code xong rồi mô tả lại".

- `.proto` sống ở **một chỗ** (`backend/libs/proto/`), là **single source of truth** cho contract.
- Đổi `.proto` = thay đổi cross-cutting: cập nhật **mọi consumer trong cùng change** + Buf
  breaking check.

## Vì sao Buf (không protoc trần)

- `buf lint`: enforce style nhất quán (naming, package, field number) — 13 service trông như một hệ.
- `buf breaking`: so `.proto` mới với bản trên main, **chặn breaking change** (xoá field, đổi
  kiểu, đổi field number) trong CI. Đây là bảo vệ quan trọng nhất — một breaking proto merge vào
  làm hỏng runtime của mọi service dùng nó.
- `buf generate`: sinh stub Go (`gen/go/`) + TS (`gen/ts/`) từ một config.

## gRPC vs Kafka event — ranh giới

| Dùng gRPC | Dùng Kafka event |
| --- | --- |
| Caller **cần kết quả** để đi tiếp | Publisher không quan tâm ai xử lý |
| Quan hệ 1-1, đồng bộ | 1-nhiều, bất đồng bộ |
| `ReserveStock`, `GetEntitlements`, `AttachTenant` | `order.completed`, `tenant.provisioned` |
| Fail = xử lý ngay (compensation, lỗi trả client) | Fail = retry/DLQ, không chặn caller |

Nguyên tắc Vici ([`01-system-overview.md`](../../20-architecture/01-system-overview.md)): *"mặc
định event; chỉ gRPC khi caller cần kết quả ngay để đi tiếp. **Không bao giờ gọi REST nội bộ
giữa services.**"*

## Khi nào KHÔNG dùng gRPC

- Client trình duyệt gọi vào → REST qua Kong (gRPC-web thêm phức tạp, không cần cho Vici).
- "Thông báo đã xảy ra việc X" → Kafka event.
- Gọi API bên thứ ba (VNPay, GHN) → chúng expose REST, dùng REST + anti-corruption layer.

## Glossary

| Term | Một câu |
| --- | --- |
| proto3 | Phiên bản cú pháp Protocol Buffers hiện dùng |
| Stub / generated code | Code client + server sinh từ `.proto` |
| Unary RPC | Một request → một response (đa số RPC của Vici) |
| Deadline | Thời hạn tuyệt đối cho một RPC; hết hạn → huỷ, trả `DeadlineExceeded` |
| Metadata | Cặp key-value đi kèm RPC (như HTTP header) — Vici dùng cho `x-tenant-id`, trace |
| Interceptor | Middleware cho gRPC (logging, auth, OTel, tenant) |
| Buf breaking | Kiểm `.proto` mới có phá vỡ tương thích không |
| Field number | Số định danh field trong Protobuf; **không bao giờ đổi/tái dùng** |

> 🗣️ Nói thành lời: "gRPC cho gọi nội bộ đồng bộ khi caller cần kết quả để đi tiếp — reserve
> stock, check entitlement. Nó là contract-first: `.proto` là source of truth, sinh code hai
> đầu nên sai kiểu là lỗi compile chứ không phải bug production. Buf lo lint style cho 13 service
> nhất quán và chặn breaking change trong CI. Tôi không bao giờ gọi REST giữa service, và việc
> 'thông báo đã xảy ra' thì dùng Kafka chứ không gRPC."
