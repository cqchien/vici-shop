# Event Sourcing — Cơ chế

## 1. Event store — cấu trúc tối thiểu

Một bảng append-only (Postgres đủ, không cần store chuyên dụng ở quy mô Vici):

| Cột | Vai trò |
| --- | --- |
| `stream_id` | Aggregate nào — với Vici đa tenant: `(tenant_id, order_id)` |
| `version` | Số thứ tự event trong stream, tăng dần từ 1 |
| `event_type` | `OrderPlaced`, `DepositPaid`… |
| `payload` | JSON/Avro dữ liệu event |
| `occurred_at` | Thời điểm |
| `metadata` | trace id, actor, tenant_id |

Unique constraint `(stream_id, version)` — đây là cơ chế chống ghi đè.

## 2. Ghi (append) + optimistic concurrency

1. Load stream: đọc mọi event của `stream_id`, replay để dựng aggregate, biết `currentVersion`.
2. Gọi method domain (`order.PayDeposit()`) → aggregate kiểm invariant, trả về **event mới**
   (chưa ghi).
3. Append với `expectedVersion = currentVersion`:
   `INSERT ... version = currentVersion + 1`. Nếu ai đó vừa ghi trước → unique constraint vi
   phạm → **concurrency conflict** → caller retry (load lại, thử lại) hoặc trả lỗi.

> Hệ quả production: đây là cách ES xử lý hai request đồng thời sửa cùng một đơn — không cần
> khoá bi quan, không lock hàng. Dưới tải drop, ít contention hơn `SELECT ... FOR UPDATE`.

## 3. Rehydrate — dựng lại aggregate

```
order := NewEmptyOrder()
for _, e := range events {          // đúng thứ tự version
    order.apply(e)                  // apply KHÔNG kiểm invariant, chỉ set state
}
```

Phân biệt hai loại method trong aggregate:

- **Command method** (`Place`, `PayDeposit`, `Cancel`): kiểm invariant, *quyết định* có tạo
  event không, trả event. Gọi khi xử lý command.
- **`apply(event)`**: chỉ cập nhật field từ event, không kiểm gì. Gọi khi replay **và** ngay sau
  khi command method tạo event (để aggregate in-memory phản ánh event vừa tạo).

## 4. Snapshot — khi stream dài

Aggregate có hàng trăm–nghìn event → replay mỗi lần load chậm.

- Định kỳ (mỗi N event) lưu **snapshot**: `{stream_id, version, state_json}`.
- Load: lấy snapshot mới nhất → replay chỉ các event **sau** version đó.
- Snapshot là **cache**, không phải nguồn sự thật — xoá hết snapshot, hệ thống vẫn đúng (chỉ chậm).

Vici: đơn hàng thường < 20 event vòng đời → **chưa cần snapshot** ngay; thêm khi có aggregate
sống rất lâu.

## 5. Projection — để query được

Event store không query theo thuộc tính được ("tìm đơn `status = shipped`"). Cần **projection**:

- Event handler (nội bộ service, sau khi append) cập nhật bảng `orders_read_model`
  (denormalized: status, tổng tiền, tên khách, timeline).
- Query đọc bảng đó (xem [`03-cqrs`](../03-cqrs/README.md)).
- Projection **eventually consistent** với event store (thường < ms nếu cùng service).

**Rebuild**: đổi hình dạng projection → truncate + replay toàn bộ event store qua handler mới.
Kế hoạch blue-green: dựng projection mới song song, switch khi xong.

## 6. Schema evolution — event bất biến thì đổi thế nào

Event đã ghi **không sửa được**. Khi cần đổi shape:

| Thay đổi | Cách xử lý |
| --- | --- |
| Thêm field optional | OK, không cần gì (Avro/JSON tương thích ngược) |
| Thêm field bắt buộc | Cho default khi đọc event cũ; hoặc **upcaster** điền giá trị |
| Đổi tên field | Upcaster dịch tên cũ → mới khi đọc |
| Đổi ý nghĩa field | **Cấm.** Tạo `event_type` mới (`OrderPlacedV2`), giữ cả hai |
| Bỏ field | Vẫn đọc được, chỉ bỏ qua |

Upcaster = hàm chạy lúc đọc event từ store, dịch bản cũ sang bản code hiện tại hiểu.

## 7. ES + outbox: publish ra Kafka

Event đã có sẵn (chính là cái vừa append). Trong **cùng transaction** append event store, ghi
thêm vào bảng `outbox`. Relay publish sang Kafka. Xem [`06-outbox`](../06-outbox/README.md).

## Tóm tắt để ôn nhanh

```mermaid
flowchart LR
    CMD["Command: order.PayDeposit()"] --> AGG["Aggregate<br/>kiểm invariant → tạo event"]
    AGG --> APPEND["Append event store<br/>(stream_id, version+1) + outbox<br/>1 transaction"]
    APPEND -->|unique (stream,version) vi phạm| CONFLICT["Concurrency conflict → retry"]
    APPEND --> PROJ["Event handler → update read model"]
    APPEND --> RELAY["Outbox relay → Kafka"]
    LOAD["Load: replay events (± snapshot) → apply()"] --> AGG
```

> 🗣️ Nói thành lời: "Event store là bảng append-only khoá theo `(stream_id, version)`. Ghi thì
> load-replay để biết version hiện tại, gọi method domain lấy event mới, append với
> `expectedVersion` — nếu unique constraint vi phạm thì có người ghi trước, retry. State query
> đọc từ projection cập nhật qua event handler. Aggregate sống lâu thì thêm snapshot làm cache.
> Event bất biến nên đổi schema bằng upcaster hoặc tạo version event mới, tuyệt đối không đổi ý
> nghĩa field cũ."
