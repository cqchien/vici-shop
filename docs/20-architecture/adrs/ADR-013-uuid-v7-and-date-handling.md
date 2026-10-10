# ADR-013: UUID v7 cho mọi identifier, `Date` + `date-fns` cho mọi xử lý thời gian

- **Trạng thái**: Accepted
- **Ngày**: 2026-10-10
- **Quan hệ**: bổ sung quy tắc cho [ADR-007](ADR-007-multi-tenancy-pooled-rls.md) (mô hình pooled,
  index luôn có tiền tố `tenant_id`) và nới một điểm trong
  [`.claude/conventions/architecture.md`](../../../.claude/conventions/architecture.md) §1
  ("domain không import gì ngoài stdlib").

## Problem

Hai quyết định nhỏ nhưng lặp lại ở **mọi** service, và slice đầu tiên của `auth-service` đã lộ ra
cả hai đang bị bỏ ngỏ:

1. **Sinh UUID.** `AccountId.generate()` và `OtpCode.issue()` dùng `randomUUID()` của
   `node:crypto` — tức **UUID v4, ngẫu nhiên toàn phần**. Trong khi đó `README.md` của
   auth-service lại tuyên bố "UUID **v7** for row ids (time-ordered)". Code và tài liệu nói ngược
   nhau; chưa có nơi nào chốt phiên bản UUID.
2. **Xử lý thời gian.** Domain tự làm số học trên milli-giây:
   `new Date(params.now.getTime() + params.ttlMinutes * 60_000)` và
   `now.getTime() >= this._expiresAt.getTime()`. Đơn vị không có trong tên hàm, phép tính là một
   phép nhân phải đọc nhẩm, và so sánh hai `Date` bằng `===` thì so **tham chiếu** chứ không so
   thời điểm — sai âm thầm, không có lỗi nào bật lên. Các miền sắp tới nặng về thời gian hơn
   nhiều: **scheduled drop**, **pre-order window**, **voucher hiệu lực**, **kỳ kế toán**; và
   `tenant-service` giữ `branding.timezone` cho từng tenant, nghĩa là "đầu ngày" của tenant không
   phải đầu ngày UTC.

Vấn đề thật ở điểm 2 **không phải kiểu dữ liệu `Date`** — mà là việc *tính toán và so sánh* thời
gian bằng tay. Hai thứ đó phải tách ra khi quyết định.

Nếu không chốt bây giờ, mỗi service sẽ tự chọn một kiểu, và service đầu tiên viết code sẽ thành
tiền lệ mặc định cho 12 service còn lại.

## Why

### UUID v7 thay v4

- **v7 sắp theo thời gian.** RFC 9562: 48 bit đầu là Unix timestamp milli-giây. Id sinh sau luôn
  lớn hơn id sinh trước, nên insert vào B-tree rơi vào **rìa phải** của cây thay vì rải random
  khắp cây như v4. Với mô hình pooled của ADR-007 — mọi bảng nghiệp vụ đều có index tiền tố
  `tenant_id` và được ghi liên tục bởi nhiều tenant — đây là khác biệt thật về page split, write
  amplification và cache locality, không phải tối ưu trên giấy.
- **Debug và vận hành.** Từ một id trong log suy ra được thời điểm tạo xấp xỉ, không cần join sang
  `created_at`. Sắp theo khoá chính cũng xấp xỉ sắp theo thứ tự tạo.
- **Vẫn là UUID.** Cùng 128 bit, cùng kiểu `uuid` của Postgres, cùng biểu diễn chuỗi — không cần
  migration, không đổi schema, không đổi contract (proto/Avro vẫn là string).
- **Phương án loại:**
  - *Giữ v4*: mất toàn bộ lợi ích trên mà không được gì; và trái chính tài liệu đã viết.
  - *ULID*: cũng sắp theo thời gian nhưng biểu diễn Crockford base32, không khớp kiểu `uuid` của
    Postgres, không khớp `format: 'uuid'` của OpenAPI — thêm một định dạng lạ để đổi lấy đúng thứ
    v7 đã có.
  - *`uuidv7()` của Postgres*: chỉ có từ **PostgreSQL 18**; ADR-003 chốt **Postgres 16**. Ngoài ra
    aggregate cần biết id **trước** khi ghi (id là phần của identity, không phải của hàng), nên
    sinh ở tầng domain mới đúng.
  - *`node:crypto`*: Node 22 chỉ có v4. `randomUUID({ version: 7 })` **không lỗi** mà âm thầm trả
    về v4 — một cái bẫy; đã kiểm tra trên Node 22.11.
- **Chi phí**: một dependency runtime, `uuid@11` (không phụ thuộc gì khác; từ v12 trở lên là
  ESM-only nên không nạp được dưới runtime CJS của Nest/Jest).

### `Date` là kiểu thời điểm — không thêm kiểu thứ hai

- **`Date` là kiểu mà *mọi* biên đã nói sẵn.** TypeORM đọc/ghi `timestamptz` ra `Date`; driver
  `pg` trả `Date`; `JSON.stringify` serialise `Date` thành ISO-8601; `google.protobuf.Timestamp`
  và `timestamp-millis` của Avro đều quy về cùng một con số milli-giây. Chọn một kiểu *khác* cho
  `domain/` nghĩa là phải viết một lớp chuyển đổi ở **từng** biên — mapper persistence, response
  DTO, event payload, gRPC — nhân với 13 service. Lớp chuyển đổi đó **chính là** technical debt
  mà quyết định này muốn tránh, và nó hỏng im lặng: một đối tượng wrapper truyền thẳng cho
  TypeORM bị serialise sai mà không có lỗi nào bật lên — phải viết thêm test để assert *kiểu* của
  từng cột, không chỉ giá trị.
- **Một kiểu từ đầu đến cuối thì không có chuyển đổi, nên không có lớp bug đó.** Mapper của
  `auth-service` sau quyết định này không còn hàm thời gian nào: gán trực tiếp.
- **`Date` là một *thời điểm*, không mang timezone.** Đây là điều đúng về mặt mô hình: thời điểm
  OTP hết hạn là một điểm trên trục thời gian; timezone chỉ *diễn giải* hoặc *hiển thị* điểm đó.
  Khi nghiệp vụ cần "đầu ngày theo giờ tenant", zone là **tham số của phép tính** (`startOfDay`
  với `TZDate` của `@date-fns/tz`), không phải thuộc tính dính kèm mọi biến thời gian đi qua hệ
  thống.

### `date-fns` cho mọi phép tính và so sánh

`Date` không có số học và không có so sánh — và đó đúng là chỗ đã sinh ra
`getTime() + n * 60_000`. Nên **mọi** phép tính/so sánh thời gian đi qua `date-fns`, không bao giờ
viết tay:

| Thay vì | Viết |
| --- | --- |
| `new Date(now.getTime() + ttl * 60_000)` | `addMinutes(now, ttl)` |
| `a.getTime() === b.getTime()` | `isEqual(a, b)` |
| `a.getTime() < b.getTime()` | `isBefore(a, b)` |
| `(b.getTime() - a.getTime()) / 60_000` | `differenceInMinutes(b, a)` |

- **Hàm thuần, nhận `Date` và trả `Date`.** Không có kiểu wrapper, nên không tạo ra biên chuyển
  đổi nào — đây là lý do chính chọn nó thay vì một thư viện có kiểu riêng.
- **Đơn vị nằm trong tên hàm.** Đọc ra ý định, không đọc ra phép nhân.
- **Tree-shake theo từng hàm**, không có global phải khởi tạo, và tự ship type TypeScript (không
  cần gói `@types/*` rời).
- **Timezone khi cần đến**: `@date-fns/tz` cung cấp `TZDate` — một **subclass của `Date`**, nên
  vẫn đi qua mọi biên như một `Date` bình thường. Thêm gói đó khi tính năng đầu tiên cần giờ
  tenant (drop/báo cáo), không thêm trước.
- **Phương án loại:**
  - *Luxon* (phiên bản đầu của ADR này đã chọn, và bị thay trong cùng ngày): `DateTime` là kiểu
    wrapper riêng → quay lại đúng lớp chuyển đổi nói ở trên, cộng ~70kB và một gói `@types` rời.
    Lợi thế thật của nó (zone dính theo instance) chỉ cần ở tầng *hiển thị/diễn giải*, nơi
    `TZDate` đã phủ.
  - *Day.js*: core 2kB nhưng UTC / timezone / duration mỗi thứ một plugin phải `extend` lúc
    bootstrap — một global mutable phải khởi tạo đúng thứ tự; và cũng là kiểu wrapper riêng.
  - *`Temporal`*: đúng hướng dài hạn (immutable, zone-aware, chuẩn ngôn ngữ) nhưng chưa có trong
    Node 22. Khi nó stable, một ADR mới supersede ADR này.
  - *`Date` thuần, không thư viện*: chính thứ đang tạo ra `getTime() + n * 60_000` trong domain.
- **Chi phí đã biết, và cách xử lý:**
  - `Date` **mutable** — `DateTime` của Luxon thì không. Aggregate vì vậy **giữ và trả bản copy**,
    không trả thẳng field của mình: `copyInstant()` trong `domain/model/utils/instant.ts`
    (`new Date(d)` copy đúng thời điểm, không cần milli-giây).
  - `===` trên hai `Date` so tham chiếu. Quy ước là `isEqual`; ESLint chặn `.getTime()`,
    `Date.now()` và `new Date()` không tham số trong `domain/` + `application/` để con đường
    milli-giây không mở lại được.
- **Chi phí dependency**: một gói runtime, `date-fns@4` (không phụ thuộc gì khác).

### Vì sao cho phép cả hai lib trong `domain/`

`architecture.md` §1 viết domain "không import gì ngoài stdlib". Quy tắc đó tồn tại để chặn
**framework và I/O** — thứ buộc domain vào NestJS, vào ORM, vào mạng. `uuid` và `date-fns` không
thuộc loại đó: cả hai là **pure, không I/O, không đọc config, không phụ thuộc runtime**, và đều
mô hình hoá đúng khái niệm mà domain vốn đã nói tới (identity, thời điểm). Thay chúng bằng port
chỉ để giữ chữ của quy tắc sẽ đổi lấy một lớp gián tiếp mà không ai cần: `Clock` **vẫn là port**
— nó mới là chỗ thời gian *thật* đi vào hệ thống, và nó vẫn bị inject để test xác định.

## Solution

- **UUID v7 là phiên bản duy nhất được sinh ra trong hệ thống.** Toàn bộ việc sinh id đi qua một
  hàm duy nhất mỗi service — ở `auth-service` là `src/shared/utils/uuid.ts` → `uuidV7()`
  (bọc `v7` của `uuid`). **Không gọi `randomUUID()` ở bất cứ đâu nữa**, kể cả cho request id.
  Áp dụng cho cả khoá chính, OTP id và correlation id.
- **Validate vẫn rộng hơn sinh.** `isUuid()` tiếp tục nhận version nibble `1–8` (RFC 9562) vì
  `tenant_id` là **input từ ngoài** (header `X-Tenant-Id`, ADR-009) và dữ liệu lịch sử có thể là
  v4. Chúng ta *mint* v7, nhưng *accept* mọi UUID hợp lệ — nil và max UUID vẫn bị loại.
- **Postgres không sinh id.** Không `DEFAULT gen_random_uuid()` trên khoá chính; aggregate sinh id
  rồi mới ghi. Fixture trong test cũng dùng `uuidV7()` thay `gen_random_uuid()` để test chạy
  trên cùng định dạng với production.
- **`Date` là kiểu thời điểm duy nhất, ở mọi tầng.** `Clock.now(): Date`; aggregate và entity giữ
  `Date`; mapper persistence **không chuyển đổi gì** (cột `timestamptz` là `Date` ở cả hai phía).
  Không có kiểu thời gian thứ hai trong repo.
- **Mọi phép tính và so sánh thời gian dùng `date-fns`** — `addMinutes` / `differenceInMinutes` để
  tính, `isBefore` / `isAfter` / `isEqual` để so. **Không `getTime()`, không số học milli-giây,
  không `===` giữa hai `Date`.** ESLint (`no-restricted-syntax` trên `src/domain/**` và
  `src/application/**`) biến quy tắc này thành lỗi build thay vì thành việc của reviewer.
- **Aggregate không trả `Date` của chính nó.** Vì `Date` mutable, getter trả `copyInstant(field)`
  và constructor copy input. Đây là cái giá của việc không thêm kiểu thứ hai, và nó nằm gọn trong
  một hàm.
- **Thời gian thật chỉ vào hệ thống qua `Clock` port.** `new Date()` không tham số và `Date.now()`
  bị chặn trong `domain/` + `application/`; implementation duy nhất là
  `infrastructure/system/system-clock.ts`. Unit test inject một instant cố định
  (`test/helpers/time.ts` → `at(iso)` / `fixedClock(iso)`), parse bằng `parseISO` để không phụ
  thuộc timezone của máy chạy test.
- **Lưu trữ luôn là UTC** (`timestamptz`). Timezone của tenant (`branding.timezone`) chỉ dùng khi
  *diễn giải* hoặc *hiển thị* — khi tính năng đầu tiên cần nó, thêm `@date-fns/tz` và dùng
  `TZDate`; không bao giờ dùng zone để quyết định cách lưu.
- **Phạm vi áp dụng**: cả 5 service NestJS (`auth`, `user`, `order`, `tenant`, `billing`).
  8 service Go dùng tương đương chuẩn của Go — `github.com/google/uuid` (`uuid.NewV7()`) và
  `time.Time` của stdlib, với `Before`/`After`/`Equal` và `time.Duration` thay cho số học thô
  (Go đã có sẵn phần mà TypeScript phải mượn `date-fns`, nên không thêm lib); một `Clock` port
  tương tự vẫn bắt buộc để test xác định.
- **Việc phải làm**: cập nhật `architecture.md` §1 (ngoại lệ hẹp cho lib pure), ghi quy tắc vào
  `coding-conventions.md` (TS) và `coding-conventions-go.md` (Go), sửa slice
  `auth-service` hiện có cho khớp.
- **Thêm một lib "pure" khác vào `domain/` → cần ADR mới.** Ngoại lệ này hẹp đúng hai thư viện
  nêu trên, không phải một cánh cửa mở.
