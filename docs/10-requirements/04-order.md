# FR — Đơn hàng & Pre-order (`FR-ORD`)

Service: **order-service** (CQRS + Event Sourcing + Saga — ADR-002).
Vòng đời chi tiết: [30-domain/02-order-lifecycle.md](../30-domain/02-order-lifecycle.md).

> **Phạm vi tenant:** mỗi event trong event store mang `tenant_id`; stream id = `(tenant_id,
> order_id)`; projection và outbox scoped RLS
> ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md)). Mã đơn (`VC-1001`)
> chỉ unique trong một tenant. Saga truyền `x-tenant-id` xuống payment/inventory/shipping.

> **Đối chiếu FE mock (2026-07):** hai điểm cần backend cài **đúng** spec, không theo mock:
>
> 1. FR-ORD-09 (xử lý cọc theo chính sách campaign khi quá hạn) — mock hiện **hoàn 100% mọi giao
>    dịch đã thành công khi huỷ đơn**, kể cả tiền cọc pre-order, bất kể `forfeitPolicy` của
>    campaign nói gì (VD: campaign hiển thị "mất 50% cọc" nhưng huỷ đơn vẫn hoàn đủ). Đây là bug
>    trong mock, không phải quyết định nghiệp vụ — backend phải enforce đúng `forfeitPolicy`.
> 2. FR-ORD-09's "quá hạn thanh toán phần còn lại: đơn huỷ" chưa có cơ chế tự động (cron/job) nào
>    trong mock — chuyển trạng thái hiện chỉ do admin thao tác tay. Backend cần job quét deadline.
>
> Ngoài ra, `advanceOrder` (FE) cho phép nhánh `return_requested → completed` (admin **từ chối**
> yêu cầu đổi trả, đơn quay lại coi như hoàn tất bình thường) — bổ sung vào state machine ở
> FR-ORD-05 bên dưới và vào diagram [02-order-lifecycle.md](../30-domain/02-order-lifecycle.md).

## Đơn hàng thường

- **FR-ORD-01 [M]** Tạo đơn từ checkout session: snapshot đầy đủ (item, giá, giảm giá, địa chỉ,
  phí ship) — thay đổi catalog sau đó không ảnh hưởng đơn đã đặt.
- **FR-ORD-02 [M]** Vòng đời: `pending_payment → confirmed → packing → shipped → delivered →
  completed`; nhánh `cancelled` và `return_requested → returned/refunded`. Chuyển trạng thái
  không hợp lệ bị từ chối (state machine).
- **FR-ORD-03 [M]** Saga checkout: ReserveStock → ProcessPayment → CreateShipment; bước nào
  thất bại thì compensation (nhả stock, hoàn tiền) chạy tự động.
- **FR-ORD-04 [M]** Khách huỷ đơn được khi chưa `packing`; COD chưa thanh toán thì huỷ trực
  tiếp, đã trả online thì tự động tạo yêu cầu hoàn tiền.
- **FR-ORD-05 [M]** Đổi trả trong 7 ngày kể từ `delivered`: khách tạo yêu cầu kèm lý do + ảnh;
  admin duyệt → hoàn tiền (toàn phần/một phần) và nhập kho lại nếu hàng nguyên vẹn; admin
  **từ chối** → đơn quay lại `completed` (không hoàn tiền, không nhập kho).
- **FR-ORD-06 [M]** Admin xem danh sách đơn lọc theo trạng thái/ngày/khách; chuyển trạng thái
  theo đúng state machine; ghi chú nội bộ trên đơn.

## Pre-order

- **FR-ORD-07 [M]** Đơn pre-order gắn với pre-order campaign (FR-PROMO-06): khách trả **tiền cọc**
  (% cấu hình theo campaign) lúc đặt.
- **FR-ORD-08 [M]** Vòng đời pre-order: `deposit_paid → awaiting_stock → balance_due →
  balance_paid → (vào luồng fulfil như đơn thường)`. Khi hàng về, hệ thống thông báo và mở
  thanh toán phần còn lại với thời hạn (mặc định 7 ngày).
- **FR-ORD-09 [M]** Quá hạn thanh toán phần còn lại: đơn huỷ, xử lý cọc theo chính sách campaign
  (mất cọc / hoàn một phần — cấu hình khi tạo campaign).
- **FR-ORD-10 [S]** Khách xem tiến độ pre-order trong tài khoản (đã cọc, dự kiến hàng về, còn
  phải trả).
