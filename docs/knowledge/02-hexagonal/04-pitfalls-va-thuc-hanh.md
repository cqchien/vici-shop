# Hexagonal — Pitfalls & thực hành

## 1. Framework/ORM lọt vào `domain/`

- **Triệu chứng**: `import "gorm.io/gorm"` hoặc `@Entity()`, `@Column()` trên aggregate; domain
  struct chính là ORM entity.
- **Vì sao hỏng**: domain giờ phụ thuộc chu kỳ nâng cấp ORM; đổi ORM = viết lại domain. Không
  test được domain mà không có ORM. Annotation persistence (`@Column({nullable})`) rò rỉ quyết
  định lưu trữ vào nơi chỉ nên nói nghiệp vụ.
- **Cách đúng**: ORM entity nằm ở `infrastructure/persistence/entity`, có **mapper** dịch
  entity ↔ domain model. Domain model là struct thuần.

## 2. Port định nghĩa ở sai phía

- **Triệu chứng**: interface `OrderRepository` nằm trong package `infrastructure/postgres`, và
  `application` import package đó.
- **Vì sao hỏng**: application phụ thuộc vào infrastructure → đảo ngược dependency rule. Không
  swap adapter được vì interface "thuộc về" một adapter.
- **Cách đúng**: interface ở `domain/port` hoặc `application`; `infrastructure` import nó và implement.

## 3. Port mang hình dạng của thư viện

- **Triệu chứng**: `type Store interface { Exec(sql string, args ...any) (Rows, error) }`.
- **Vì sao hỏng**: đây không phải port domain, mà là "Postgres trá hình". Đổi sang key-value
  store thì interface vô nghĩa; domain vẫn dính SQL.
- **Cách đúng**: port nói ngôn ngữ domain: `Save(ctx, *Order) error`, `FindByID(ctx, OrderID) (*Order, error)`.

## 4. Business logic rò vào adapter

- **Triệu chứng**: REST controller kiểm "đơn đã packing thì không cho huỷ"; hoặc repository
  quyết định tính phí ship.
- **Vì sao hỏng**: logic trùng lặp (gRPC handler và REST handler mỗi cái một bản), lệch nhau
  theo thời gian. Không test được qua use case.
- **Cách đúng**: controller chỉ decode + validate cú pháp + gọi use case + map lỗi. Mọi quy tắc
  nghiệp vụ nằm trong domain/application.

## 5. "Anemic use case" — application chỉ là pass-through

- **Triệu chứng**: `PlaceOrderHandler.Execute` gọi thẳng `repo.Insert(dto)` không qua aggregate.
- **Vì sao hỏng**: invariant bị bỏ qua; aggregate thành bao đựng dữ liệu. Về bản chất là anemic
  model (xem [`01-ddd/04`](../01-ddd/04-pitfalls-va-thuc-hanh.md#1-anemic-domain-model)).
- **Cách đúng**: use case dựng/lấy aggregate, gọi method domain, rồi mới save. Logic ở domain.

## 6. Rò `context.Context` / `Request` vào domain

- **Triệu chứng**: `domain/model/order.go` nhận `*http.Request` hoặc lưu `context.Context` trong field.
- **Vì sao hỏng**: domain dính transport; test phải giả lập request. `context` là per-request,
  struct sống lâu — lưu vào field là bug rò rỉ/cancel sai.
- **Cách đúng**: domain nhận **giá trị thuần** (đã trích từ context ở `interface/`). `context`
  truyền như tham số đầu tiên của hàm I/O ở application/infrastructure, không lưu vào struct.
  ([`coding-conventions-go.md`](../../../.claude/conventions/coding-conventions-go.md) §6.)

## 7. Đọc env ở khắp nơi

- **Triệu chứng**: `os.Getenv("DB_URL")` trong `infrastructure/postgres/repo.go`, `process.env.X`
  rải rác.
- **Vì sao hỏng**: không biết service cần biến gì nếu không đọc hết code; thiếu biến thì lỗi
  giữa chừng lúc runtime thay vì fail-fast lúc start.
- **Cách đúng**: một `Config` struct ở `infrastructure/config`, parse + validate trong `main.go`
  trước khi listener chạy. Fail ngay với thông báo rõ.
  ([`coding-conventions-go.md`](../../../.claude/conventions/coding-conventions-go.md) §10,
  [CONSTITUTION](../../../.claude/CONSTITUTION.md) Article II.2.)

## 8. DI container / global cho business dependency (Go)

- **Triệu chứng**: `var GlobalOrderRepo OrderRepository` set trong `init()`; hoặc kéo cả một DI
  framework vào Go.
- **Vì sao hỏng**: thứ tự khởi tạo ngầm, khó test (không thay được), `init()` side-effect chạy
  cả khi import cho test.
- **Cách đúng**: constructor injection thủ công trong `main.go`. Singleton chỉ chấp nhận cho hạ
  tầng dùng chung như OTel provider.

## 9. Over-engineering service CRUD thuần

- **Triệu chứng**: một service chỉ lưu/đọc `NotificationTemplate` mà vẫn có đủ port cho từng
  thao tác, mapper hai chiều, domain service.
- **Vì sao hỏng**: nhiều lớp map không đổi lấy gì; chậm phát triển, thêm chỗ bug.
- **Cách đúng**: giữ dependency rule (vẫn không để framework vào phần logic) nhưng gộp lớp khi
  không có invariant để bảo vệ. Mức độ tương xứng với độ phức tạp.

## Checklist — Definition of Done

- [ ] `grep -r "gorm\|@nestjs\|net/http\|pgx" internal/domain/` (Go) hoặc `src/domain/` (Nest) → rỗng
- [ ] Interface (port) định nghĩa ở `domain/port` hoặc `application`, không ở `infrastructure`
- [ ] Port nói ngôn ngữ domain (`Save`, `FindByID`), không phải API thư viện (`Exec`, `Query`)
- [ ] Controller/handler mỏng: decode → 1 use case → map lỗi; không có quy tắc nghiệp vụ
- [ ] Map lỗi domain → status code chỉ ở `interface/`
- [ ] `context.Context` truyền qua tham số, không lưu trong struct field
- [ ] Chỉ `infrastructure/config` đọc env; parse + validate ở `main.go`, fail-fast
- [ ] Wiring ở `main.go` (Go) / module file (Nest); không global var, không `init()` side-effect
- [ ] Litmus test đạt: đổi Postgres→store khác hoặc REST→gRPC chỉ cần adapter mới + sửa wiring

> 🗣️ Nói thành lời: "Cách tôi kiểm nhanh một service có đúng hexagonal không: grep thư mục
> domain xem có import framework/ORM/HTTP không — phải rỗng. Rồi xem interface repository nằm ở
> đâu — phải ở phía application/domain, không ở package Postgres. Và controller phải mỏng: chỉ
> decode, gọi use case, map lỗi. Nếu ba cái đó ổn thì đổi hạ tầng về sau chỉ là viết adapter."
