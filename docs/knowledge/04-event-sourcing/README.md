# 04 — Event Sourcing (ES)

Event Sourcing: **nguồn sự thật không phải state hiện tại, mà là chuỗi domain event append-only**.
State hiện tại (aggregate, projection) là **kết quả replay** chuỗi event đó. Không sửa, không xoá
event — sai thì ghi event bù/đảo.

ES cho audit trail hoàn hảo và khả năng "quay ngược thời gian", đổi lại độ phức tạp: versioning
schema event, snapshot, rebuild projection. Vici chỉ dùng ở `order-service` (và event store cho
lịch sử vòng đời `tenant-service`).

| File | Nội dung |
| --- | --- |
| [01-khai-niem.md](01-khai-niem.md) | Vấn đề nó giải, so với "lưu state", lợi ích thật, cái giá phải trả, khi nào KHÔNG dùng |
| [02-co-che.md](02-co-che.md) | Event store, append + optimistic concurrency (version), rehydrate, snapshot, projection, schema evolution |
| [03-ap-dung-trong-vici.md](03-ap-dung-trong-vici.md) | `Order` event-sourced, stream id = `(tenant_id, order_id)`, event list, chỗ Vici KHÔNG dùng |
| [04-pitfalls-va-thuc-hanh.md](04-pitfalls-va-thuc-hanh.md) | Event mang ý định lưu trữ, thiếu snapshot, breaking schema, "CRUD trá hình event"… + checklist |

Đọc kèm: [`40-services/order-service.md`](../../40-services/order-service.md) §3 ·
[`30-domain/02-order-lifecycle.md`](../../30-domain/02-order-lifecycle.md) ·
[`30-domain/04-data-models.md`](../../30-domain/04-data-models.md) (mục Ordering) ·
[ADR-002](../../20-architecture/adrs/ADR-002-go-first-language-policy.md)
