# Multi-tenancy + RLS — Pitfalls & thực hành

## 1. Dùng `SET` thay vì `SET LOCAL`

- **Triệu chứng**: `SET app.tenant_id = ...` (không `LOCAL`) mở đầu request.
- **Vì sao hỏng**: connection pool tái dùng connection. Connection mang `app.tenant_id` của
  tenant A → phục vụ request tiếp theo của tenant B **mà không set lại** (hoặc set trễ) → B đọc
  dữ liệu A. **Rò rỉ chéo tenant** — sự cố nghiêm trọng nhất của mô hình pooled.
- **Cách đúng**: `SET LOCAL` (phạm vi transaction, tự biến mất khi commit/rollback). Mọi truy
  vấn nghiệp vụ chạy trong một transaction có `SET LOCAL` ở đầu.

## 2. App role có `BYPASSRLS` (hoặc là superuser)

- **Triệu chứng**: service kết nối bằng role `postgres` hoặc role có `BYPASSRLS`.
- **Vì sao hỏng**: RLS bị bỏ qua hoàn toàn → không có hàng rào nào; một query thiếu điều kiện =
  rò rỉ tất cả.
- **Cách đúng**: app role riêng, **không** `BYPASSRLS`, **không** superuser. `FORCE ROW LEVEL
  SECURITY` để cả owner bảng cũng bị áp. Chỉ role platform-plane mới được bypass, và chỉ
  tenant/billing-service dùng.

## 3. Service tin `tenant_id` từ body/param client

- **Triệu chứng**: `POST /products { tenant_id: "...", name: "..." }` và service dùng `tenant_id`
  đó.
- **Vì sao hỏng**: client đổi `tenant_id` = ghi/đọc tenant khác. Lỗ hổng.
- **Cách đúng**: `tenant_id` chỉ đến từ `X-Tenant-Id` (Kong đặt từ `tid`/Host, đè client). Body
  client không bao giờ chứa `tenant_id` — nếu có, bỏ qua.

## 4. Unique constraint quên `tenant_id`

- **Triệu chứng**: `UNIQUE (slug)` toàn cục thay vì `UNIQUE (tenant_id, slug)`.
- **Vì sao hỏng**: shop B không tạo được sản phẩm slug `molly` vì shop A đã dùng → onboard/nhập
  liệu fail vô cớ. Hoặc lộ thông tin (biết slug nào "đã có ai đó dùng").
- **Cách đúng**: mọi unique nghiệp vụ (`slug`, `sku`, `voucher.code`, `entry_no`, mã đơn) đổi
  thành `(tenant_id, <khoá>)`.

## 5. Quên `SET LOCAL` trong consumer Kafka / job nền

- **Triệu chứng**: consumer `order.completed` ghi read model finance mà không set `app.tenant_id`
  từ header `tenant-id`.
- **Vì sao hỏng**: fail-closed → `INSERT` bị RLS `WITH CHECK` chặn, hoặc `SELECT` để update trả
  0 dòng → read model không cập nhật, sổ sách thiếu. Hoặc (nếu context còn dính từ message
  trước) ghi nhầm tenant.
- **Cách đúng**: consumer đọc header `tenant-id` → set context → `SET LOCAL app.tenant_id` mở
  đầu mỗi transaction xử lý message. Integration test có case "message thiếu tenant header → từ chối".

## 6. Repository tự thêm `WHERE tenant_id` "cho chắc"

- **Triệu chứng**: mỗi query trong repo có `AND tenant_id = $ctx` viết tay.
- **Vì sao hỏng**: thừa (RLS đã lo); và tạo cảm giác an toàn giả — chỗ nào quên viết thì tưởng
  vẫn an toàn nhờ RLS, nhưng nếu ai đó nghĩ "repo tự lọc rồi" và tắt RLS thì thủng.
- **Cách đúng**: một cơ chế duy nhất — RLS. Repo chỉ `SET LOCAL`. Nhất quán, không nhầm.

## 7. Connection pool không giới hạn per-tenant (noisy neighbour)

- **Triệu chứng**: một tenant import 10k sản phẩm chiếm hết connection pool của product-service.
- **Vì sao hỏng**: tenant khác timeout kết nối DB; "một shop làm sập trải nghiệm mọi shop".
- **Cách đúng**: quota theo gói (`GetEntitlements`), rate limit theo tenant ở gateway, cân nhắc
  connection budget per-tenant, batch import có throttle.

## 8. Migration không backfill / bật RLS trước khi NOT NULL

- **Triệu chứng**: `ADD COLUMN tenant_id NOT NULL` ngay (fail vì hàng cũ NULL); hoặc bật RLS
  trước khi backfill (hàng cũ `tenant_id` NULL → biến mất khỏi mọi query).
- **Vì sao hỏng**: migration fail, hoặc dữ liệu hiện có "biến mất".
- **Cách đúng**: theo đúng thứ tự ADR-007 §6: nullable → backfill → NOT NULL → policy → enable
  RLS → đổi index.

## 9. Platform-plane API nhận `X-Tenant-Id` của tenant thường

- **Triệu chứng**: `/platform/tenants` cũng đọc `X-Tenant-Id` và lọc theo nó.
- **Vì sao hỏng**: hoặc Operator chỉ thấy một tenant (sai chức năng), hoặc tenant thường gọi
  được endpoint platform.
- **Cách đúng**: route platform không nhận `X-Tenant-Id`; chỉ `platform_admin` (token không
  `tid`) gọi; DB role cross-tenant.

## 10. Impersonate không giới hạn / không audit

- **Triệu chứng**: Operator impersonate token sống lâu như token thường, không ghi log.
- **Vì sao hỏng**: một tài khoản Operator bị chiếm = truy cập mọi tenant vô thời hạn, không
  dấu vết.
- **Cách đúng**: token impersonate `exp ≤ 30'`, không refresh, ghi `impersonation_audit`
  (ai/tenant/lý do), banner hiển thị suốt phiên (NFR-06b).

## Checklist — Definition of Done

- [ ] Mọi bảng nghiệp vụ có `tenant_id NOT NULL`; RLS `ENABLE` + `FORCE`; policy `USING` + `WITH CHECK`
- [ ] App role **không** `BYPASSRLS`, **không** superuser; role platform-plane riêng
- [ ] Repo mở transaction với `SET LOCAL app.tenant_id` (LOCAL, không phải SET); không tự `WHERE tenant_id`
- [ ] `tenant_id` chỉ từ `X-Tenant-Id` (Kong) / metadata / header Kafka — không từ body client
- [ ] Unique nghiệp vụ đổi thành `(tenant_id, <khoá>)`; stream id `(tenant_id, aggregate_id)`
- [ ] Consumer + job nền set `app.tenant_id` trước khi ghi; test case "thiếu tenant → từ chối"
- [ ] Migration theo thứ tự: nullable → backfill → NOT NULL → policy → enable → index
- [ ] Platform route không nhận `X-Tenant-Id` tenant thường; chỉ `platform_admin`
- [ ] Impersonate: `exp ≤ 30'`, không refresh, audit, banner
- [ ] Quota theo gói + rate limit theo tenant để giảm noisy neighbour
- [ ] Integration test: "cross-tenant read trả rỗng" cho mỗi repository (NFR-13)

> 🗣️ Nói thành lời: "Bug nguy hiểm nhất của pooled + RLS là dùng `SET` thay vì `SET LOCAL` —
> connection pool tái dùng connection nên `app.tenant_id` của tenant A dính sang request tenant
> B, rò rỉ chéo. Luôn `SET LOCAL` trong transaction. App role không được `BYPASSRLS`. `tenant_id`
> chỉ đến từ header Kong đặt, không bao giờ từ body client. Consumer Kafka cũng phải set từ
> header `tenant-id` trước khi ghi. Và integration test bắt buộc có case cross-tenant read trả
> rỗng cho mọi repo."
