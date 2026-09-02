# API Gateway (Kong) — Pitfalls & thực hành

## 1. Gateway làm authorization theo nghiệp vụ

- **Triệu chứng**: plugin ở Kong quyết định "role `staff` không được gọi `POST /refunds`".
- **Vì sao hỏng**: quy tắc authz nghiệp vụ nằm ngoài service sở hữu nó; đổi quy tắc phải sửa
  gateway config; gateway phải biết chi tiết nghiệp vụ của 13 service. Rối và dễ lệch.
- **Cách đúng**: Kong verify token; service kiểm role → hành động (RBAC). ADR-005 quy định rõ.

## 2. Business logic / aggregation ở gateway

- **Triệu chứng**: một plugin/route gọi product + inventory + promotion rồi ghép response.
- **Vì sao hỏng**: gateway thành "God service" có logic, khó test, khó deploy, là điểm nghẽn.
- **Cách đúng**: aggregation là việc của **BFF** (backend-for-frontend) — một service riêng nếu
  cần, không phải gateway. Hoặc client gọi nhiều endpoint.

## 3. Tin `X-Tenant-Id` / `tenant_id` client gửi

- **Triệu chứng**: service đọc `X-Tenant-Id` từ request mà Kong **không** đè lại từ token.
- **Vì sao hỏng**: bất kỳ ai đổi header là đọc/ghi dữ liệu tenant khác — **lỗ hổng đa tenant
  nghiêm trọng**.
- **Cách đúng**: Kong **luôn đè** `X-Tenant-Id` từ claim `tid` (hoặc Host cho route public),
  xoá giá trị client gửi trước khi forward. Service chỉ tin header từ Kong.

## 4. Gateway là single point of failure không có phương án

- **Triệu chứng**: một node Kong, không health check, không auto-restart.
- **Vì sao hỏng**: Kong chết = toàn bộ traffic ngoài chết, dù mọi service vẫn sống.
- **Cách đúng**: chạy ≥ 2 node Kong sau load balancer; health check; DBless nên node stateless,
  scale dễ. Rate-limit counter ở Redis (chung) để nhiều node nhất quán.

## 5. Rate-limit `policy: local` khi có nhiều node

- **Triệu chứng**: 3 node Kong, mỗi node đếm riêng với `local`.
- **Vì sao hỏng**: giới hạn thực tế = N × ngưỡng (mỗi node cho qua ngưỡng riêng) → chống
  brute-force/bot yếu hơn nhiều so với dự tính.
- **Cách đúng**: `policy: redis` cho các route cần chính xác (`/auth/*`, drop). `local` chỉ khi
  một node hoặc ngưỡng lỏng.

## 6. Route public quên rate limit

- **Triệu chứng**: `GET /products` không giới hạn.
- **Vì sao hỏng**: scraper/bot cào catalog với tần suất cao → tải product-service + DB, ảnh
  hưởng khách thật, tăng cost.
- **Cách đúng**: mọi route public có rate limit (Vici: 300/min cho catalog). Route đăng nhập
  siết chặt hơn nhiều (10/min).

## 7. Config drift — sửa Kong runtime, không qua `kong.yml`

- **Triệu chứng**: dùng Admin API sửa route trực tiếp trên production để "fix nhanh".
- **Vì sao hỏng**: production lệch với `kong.yml` trong repo; lần deploy sau ghi đè mất fix;
  không ai biết cấu hình thật là gì.
- **Cách đúng**: mọi thay đổi qua `kong.yml` + `deck sync` / reload. DBless giúp ép kỷ luật này.

## 8. IPN / webhook route yêu cầu JWT

- **Triệu chứng**: `/payments/ipn` gắn plugin jwt.
- **Vì sao hỏng**: VNPay/Momo/GHN không có JWT của bạn — callback bị 401, thanh toán không được
  xác nhận, đơn kẹt.
- **Cách đúng**: route IPN/webhook **không** jwt; xác thực bằng **chữ ký** trong payload
  (verify ở service). Vici làm đúng: `payment-ipn`, `shipping-webhooks`, `billing-webhooks`
  không jwt.

## 9. Forward toàn bộ header nhạy cảm xuống upstream

- **Triệu chứng**: Kong forward nguyên `Authorization`, cookie, header nội bộ ra... hoặc từ
  service ra client.
- **Vì sao hỏng**: rò token/secret; header nội bộ (`X-Internal-*`) client thấy được có thể lợi dụng.
- **Cách đúng**: strip header nội bộ ở biên vào và ra; chỉ forward cái cần (`X-Tenant-Id`,
  `X-Request-ID`, `Authorization` nếu service cần claims).

## 10. Không propagate `X-Request-ID`

- **Triệu chứng**: mỗi service tự sinh request id, không nối với id của Kong.
- **Vì sao hỏng**: không correlate được log của một request xuyên gateway → service → service.
  Debug sự cố production khó gấp bội.
- **Cách đúng**: `request-id` plugin sinh `X-Request-ID` nếu chưa có, `echo_downstream: true`;
  mọi service log kèm id đó; OTel dùng làm baggage/correlation.

## Checklist — Definition of Done

- [ ] Kong verify chữ ký + hạn JWT; RBAC (role → hành động) ở service, không ở Kong
- [ ] Không có business logic / aggregation ở gateway
- [ ] `X-Tenant-Id` luôn do Kong đặt từ `tid`/Host; giá trị client bị xoá trước khi forward
- [ ] ≥ 2 node Kong sau LB, health check; rate-limit `policy: redis` cho route nhạy cảm
- [ ] Mọi route public có rate limit; `/auth/*` và drop siết chặt hơn
- [ ] Cấu hình chỉ qua `kong.yml` + deck/reload; không sửa runtime (không drift)
- [ ] Route IPN/webhook không jwt; xác thực bằng chữ ký ở service
- [ ] Strip header nội bộ ở biên; chỉ forward header cần thiết
- [ ] `X-Request-ID` sinh + propagate; service log kèm; OTel correlate

> 🗣️ Nói thành lời: "Lỗi kiến trúc hay gặp: nhét authorization nghiệp vụ hoặc aggregation vào
> gateway, biến nó thành God service. Kong chỉ verify token; role được làm gì là ở service. Lỗi
> bảo mật đa tenant nặng nhất là tin `X-Tenant-Id` client gửi — Kong phải luôn đè nó từ claim
> hoặc Host và xoá giá trị client. Và route webhook cổng thanh toán thì không được yêu cầu JWT,
> xác thực bằng chữ ký."
