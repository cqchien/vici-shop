# Yêu cầu phi chức năng (NFR)

## Hiệu năng

- **NFR-01** Trang storefront (SSR + cache): p95 < 500ms; API đọc p95 < 200ms, API ghi p95 < 500ms.
- **NFR-02** **Kịch bản drop**: 1.000 người dùng đồng thời vào một trang sản phẩm lúc mở bán;
  hệ thống không oversell, không vượt giới hạn mua/người, p95 add-to-cart < 1s. Có k6 load test
  tái hiện kịch bản này trước khi go-live (P5).

## Đa tenant

- **NFR-13** **Cô lập tenant fail-closed**: mọi bảng nghiệp vụ có `tenant_id` + Postgres RLS
  ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md)); truy vấn thiếu
  `app.tenant_id` trả 0 dòng, không rò rỉ. Integration test bắt buộc có case "cross-tenant
  read trả rỗng" cho mỗi repository.
- **NFR-14** **Onboarding < 5 phút**: từ lúc submit form `/start` đến khi storefront tenant
  phản hồi 200, saga provisioning hoàn tất trong 5 phút (p95); mỗi bước có compensation.
- **NFR-15** **Hạn mức & rate limit theo tenant**: Kong rate-limit theo `tenant_id`, không để
  một tenant làm nghẽn tenant khác; `billing-service` là nguồn hạn mức (số sản phẩm, đơn/tháng,
  dung lượng ảnh), service enforce cục bộ và trả lỗi `quota_exceeded` rõ ràng.
- **NFR-16** **Lưu trữ & xoá dữ liệu tenant**: tenant `archived` giữ dữ liệu ở trạng thái
  chỉ-đọc 90 ngày rồi xoá cứng theo yêu cầu; export toàn bộ dữ liệu một tenant (JSON/CSV) khi
  chủ shop yêu cầu — Nghị định 13/2023/NĐ-CP áp dụng cho cả dữ liệu khách của tenant.

## Đúng đắn dữ liệu

- **NFR-03** Không mất event: mọi domain event publish qua **outbox pattern**; consumer
  idempotent (xử lý trùng an toàn). Event mang `tenant_id` (cột outbox + header Kafka).
- **NFR-04** Tiền tệ: VND, số nguyên (không dấu phẩy động ở bất kỳ tầng nào). Sổ cái
  append-only, bút toán không sửa/xoá — sai thì ghi bút toán đảo.
- **NFR-05** Tồn kho và lượt dùng voucher là atomic dưới concurrent load (test bằng integration
  test song song).

## Bảo mật

- **NFR-06** OWASP Top 10; JWT verify tại Kong; RBAC ở service. Mật khẩu bcrypt/argon2.
  Secret từ env/secret manager — không bao giờ trong repo. JWT mang claim `tid`; Kong đè
  `X-Tenant-Id` từ `tid` (client không tự khai được tenant — ADR-009).
- **NFR-06b** **Impersonate** tenant của Platform Operator: token có thời hạn ≤ 30 phút, ghi
  audit (ai, tenant nào, lý do), hiển thị banner trong `/admin`; không có luồng nào để cấp
  quyền cross-tenant vĩnh viễn cho tài khoản thường.
- **NFR-07** PII (email, điện thoại, địa chỉ) không xuất hiện trong log; tuân thủ Nghị định
  13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân (consent, quyền xoá tài khoản).

## Vận hành

- **NFR-08** Observability chuẩn OpenTelemetry: trace xuyên service (gRPC + Kafka), metrics
  Prometheus, log JSON có trace id. Health endpoint mỗi service.
- **NFR-09** Availability mục tiêu 99,5%/tháng; RPO 1 giờ (backup Postgres), RTO 4 giờ.
- **NFR-10** Mọi service chạy được local bằng docker-compose một lệnh; CI chạy
  lint/typecheck/test/build cho mọi thay đổi.

## Frontend

- **NFR-11** Responsive mobile-first (đa số khách mua trên điện thoại); Lighthouse
  performance ≥ 85, accessibility ≥ 90 cho các trang chính.
- **NFR-12** Ngôn ngữ giao diện: tiếng Việt (i18n-ready, chưa cần đa ngôn ngữ v1).
