# FR — Gói dịch vụ & Subscription (`FR-BIL`)

Service: **billing-service** (NestJS, [ADR-008](../20-architecture/adrs/ADR-008-platform-plane-services-nestjs.md)).
Domain: [30-domain/05-tenant-lifecycle.md](../30-domain/05-tenant-lifecycle.md).

> **Đối chiếu FE mock (2026-08):** FE mô phỏng danh mục gói (`plans.json`), subscription của
> tenant, panel lượng dùng vs hạn mức, đổi gói. Chưa mô phỏng hoá đơn/dunning thật — chỉ đổi
> trạng thái. Backend thật tích hợp cổng thanh toán định kỳ.

## Danh mục gói (plan)

- **FR-BIL-01 [M]** Nền tảng định nghĩa các **gói**: mã, tên, giá/tháng (VND), chu kỳ, và
  **hạn mức**: số sản phẩm active, số đơn/tháng, dung lượng ảnh, số tài khoản staff, có/không
  drop & pre-order, phí giao dịch %. Gói mẫu v1: *Khởi đầu* (miễn phí, giới hạn thấp) ·
  *Cửa hàng* · *Nhà sưu tầm* (cao nhất).
- **FR-BIL-02 [M]** Gói `active`/`archived`; gói `archived` không cho đăng ký mới nhưng tenant
  đang dùng vẫn giữ. Đổi giá gói không hồi tố tenant hiện hữu tới kỳ kế tiếp.

## Subscription của tenant

- **FR-BIL-03 [M]** Mỗi tenant có đúng một subscription: `trialing → active → past_due →
  canceled`. Tạo khi provisioning (FR-TEN-05) với gói đã chọn; gói miễn phí bỏ qua `trialing`.
- **FR-BIL-04 [M]** **Đổi gói**: nâng gói áp dụng ngay, tính pro-rata phần còn lại của kỳ; hạ
  gói áp dụng từ kỳ kế tiếp và **chặn nếu lượng dùng hiện tại vượt hạn mức gói mới** (yêu cầu
  chủ shop giảm bớt trước).
- **FR-BIL-05 [M]** Chốt kỳ định kỳ tạo **hoá đơn**; thanh toán thành công → `active` + phát
  `billing.invoice_paid`; thất bại → retry theo lịch **dunning** (vd. +1d, +3d, +5d), sau chót
  → `past_due` rồi phát `billing.payment_failed` (tenant-service suspend theo FR-TEN-08).
- **FR-BIL-06 [S]** Webhook nhà cung cấp thanh toán xử lý **idempotent** (dedupe theo event id);
  đối soát số tiền trước khi đổi trạng thái.
- **FR-BIL-07 [M]** Huỷ subscription → `canceled` ở cuối kỳ đã trả; tenant chuyển `archived`
  theo FR-TEN-08.

## Đo lượng dùng & hạn mức

- **FR-BIL-08 [M]** billing-service tổng hợp **lượng dùng** theo tenant từ event các context
  (`product.created/archived` → số sản phẩm; `order.placed` → đơn/tháng; …) và lưu read model.
- **FR-BIL-09 [M]** Cung cấp gRPC `GetEntitlements(tenant_id)` → hạn mức + cờ tính năng hiện
  hành; các service cache ngắn và **enforce cục bộ**, trả lỗi domain `quota_exceeded` khi vượt
  (vd. product-service từ chối tạo sản phẩm thứ N+1).
- **FR-BIL-10 [S]** Cảnh báo chủ shop khi lượng dùng đạt 80% / 100% hạn mức (qua notification).

## Platform Operator

- **FR-BIL-11 [M]** Operator xem **MRR**, doanh thu nền tảng theo tháng, phân bố tenant theo gói,
  danh sách subscription `past_due`.
- **FR-BIL-12 [C]** Cấp **coupon / credit** cho một tenant (giảm giá kỳ, hoặc miễn phí n tháng).

## Ranh giới

- billing-service **sở hữu**: danh mục gói, subscription, hoá đơn, lịch dunning, read model
  lượng dùng, entitlements.
- **Không sở hữu**: bản ghi tenant & vòng đời (tenant-service — phản ứng với
  `billing.payment_failed`), dữ liệu nghiệp vụ đếm lượng dùng (các context — chỉ phát event).
