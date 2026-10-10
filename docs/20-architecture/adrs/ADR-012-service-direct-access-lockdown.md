# ADR-012: Khoá truy cập trực tiếp vào service — chỉ Kong được gọi thẳng

- **Trạng thái**: Accepted
- **Ngày**: 2026-09-04
- **Quan hệ**: thực thi triệt để [ADR-005](ADR-005-kong-api-gateway.md) ("Kong là cửa duy nhất
  cho traffic ngoài vào") và bảo vệ mô hình tin cậy header của [ADR-009](ADR-009-tenant-context-propagation.md)
  ("Header `X-Tenant-Id` — Kong bảo đảm").

## Problem

`docker-compose.yml` trung tâm publish cổng của từng service ra host (VD `3001:3001` cho
auth-service) để tiện debug (`curl localhost:3001`, xem Swagger). Hệ quả: bất kỳ ai cũng gọi
thẳng service, bỏ qua Kong hoàn toàn.

ADR-005 đã nói Kong là "cửa duy nhất", nhưng chưa nói **làm sao thực thi** điều đó. Đây không chỉ
là vấn đề tiện lợi — nó phá mô hình tin cậy mà ADR-009 dựa vào: service tin `X-Tenant-Id` vì
"Kong bảo đảm". Gọi thẳng service nghĩa là client tự đặt `X-Tenant-Id` bất kỳ — giả mạo tenant,
và bỏ qua rate-limit chống brute-force của Kong (FR-AUTH-05).

## Why

Hai lớp phòng thủ, không phải một, theo nguyên tắc *defense in depth* dùng phổ biến khi chưa có
service mesh/mTLS đầy đủ:

1. **Cô lập mạng (lớp chính)** — service không có cổng publish ra host; chỉ nằm trên mạng Docker
   nội bộ, chỉ container khác (Kong) gọi được qua tên service. Đây là kiểm soát chuẩn nhất,
   tương đương `ClusterIP` (không `Ingress`/`NodePort`) trong Kubernetes — service "vô hình" với
   bên ngoài, không phải "được phép nhưng bị chặn ở tầng ứng dụng".
2. **Header bí mật do gateway cấp (lớp thứ hai)** — cô lập mạng chỉ chặn *bên ngoài*; hai
   container **trong cùng mạng Docker** (VD một service khác, hoặc cấu hình publish cổng thêm
   sau này do vô ý) vẫn gọi thẳng được nhau. Cần một kiểm tra ở tầng ứng dụng không phụ thuộc
   mạng: Kong stamp header `X-Gateway-Secret` (đọc từ biến môi trường riêng của Kong, **không bao
   giờ nằm trong `kong.yml`**) vào mọi request trước khi forward; service từ chối bất kỳ request
   nào thiếu đúng giá trị này.

**Phương án đã loại:**
- **mTLS / service mesh (Istio, Linkerd)** — đúng "chuẩn vàng" cho zero-trust service-to-service,
  nhưng cần hạ tầng cấp chứng chỉ + sidecar, không hợp với quy mô hiện tại (Kong DBless, 1 service
  đã triển khai, roadmap P5 mới tới hardening hạ tầng). Ghi nhận làm hướng nâng cấp khi có nhiều
  service + Kubernetes thật.
- **Chỉ cô lập mạng, bỏ qua header bí mật** — đơn giản hơn nhưng có lỗ hổng đã nêu ở trên (service
  gọi service trong cùng mạng, hoặc lỗi cấu hình publish cổng về sau). Header bí mật là chi phí
  thấp (một Kong plugin có sẵn + một guard) cho một lớp phòng thủ thật.
- **API key theo client (Kong `key-auth`)** — giải bài toán khác (xác thực *client bên ngoài*),
  không phải bài toán "đây có phải traffic từ Kong không".

## Solution

**1. Cô lập mạng — bắt buộc cho mọi service trong `docker-compose.yml` trung tâm:**
Không service nghiệp vụ nào được có `ports:` publish ra host. Chỉ Kong (`8000` proxy, `8001`
admin — admin cũng không nên publish ở môi trường thật) có cổng ra ngoài. Muốn gọi trực tiếp lúc
dev, dùng `docker exec` vào mạng, hoặc chạy service bằng `pnpm start:dev` trên host (khi đó nó
không nằm trong mạng Docker nữa, không phải là "service đã triển khai bị lộ").

**2. Header bí mật do Kong cấp — plugin toàn cục, kiểm tra toàn cục:**
- `kong.yml`: plugin `pre-function` (Lua, có sẵn trong Kong OSS, không cần enterprise) đặt ở cấp
  toàn cục — `kong.service.request.set_header("X-Gateway-Secret", os.getenv("GATEWAY_SHARED_SECRET"))`.
  `set_header` (không phải `add_header`) nên **luôn ghi đè** giá trị client tự gửi — client không
  thể giả mạo dù có đi qua Kong. Giá trị secret chỉ tồn tại trong biến môi trường của container
  Kong, không bao giờ commit vào `kong.yml`.
- Mỗi service: một guard toàn cục (`GatewayOnlyGuard`, NestJS `APP_GUARD`) từ chối
  (`403 DIRECT_ACCESS_FORBIDDEN`) mọi request thiếu đúng `X-Gateway-Secret`. Route liveness/readiness
  (`/health`, `/health/ready`) được đánh dấu miễn trừ (`@SkipGatewayCheck()`) — health check của
  Docker/Kubernetes gọi thẳng vào container, không qua Kong.
- `GATEWAY_SHARED_SECRET` là biến môi trường bắt buộc (không có default) — thiếu thì service từ
  chối khởi động thay vì âm thầm tắt kiểm tra (fail-closed, CONSTITUTION Art. II.2).
- Một secret dùng chung cho toàn bộ services ở giai đoạn này (đơn service); khi có nhiều service
  cân nhắc secret riêng theo cặp Kong↔service hoặc chuyển hẳn sang mTLS.

**Hệ quả:**
- ✅ Không client ngoài nào gọi thẳng service được (mất cả đường mạng lẫn header).
- ✅ Kể cả traffic trong mạng Docker (service khác, container lạ) cũng bị chặn nếu không qua Kong.
- ⚠️ `GATEWAY_SHARED_SECRET` là secret dùng chung đầu tiên của hệ thống — môi trường thật phải lấy
  từ secret manager (AWS Secrets Manager/SSM), không phải `.env` (CONSTITUTION Art. II.4); giá trị
  trong `.env.example` chỉ là placeholder cho local dev (giống `POSTGRES_PASSWORD`).
- ⚠️ Việc thực thi (code, migration, tài liệu liên quan): áp dụng pattern này cho **mọi service
  NestJS/Go tiếp theo** — copy `GatewayOnlyGuard`/middleware tương đương + thêm plugin `pre-function`
  toàn cục một lần trong `kong.yml` (đã global, không cần lặp lại mỗi route).
- mTLS/service mesh vẫn là hướng nâng cấp khi hệ thống có nhiều service thật + Kubernetes
  (roadmap P5) — ADR mới khi tới lúc đó, không chặn bởi ADR này.
