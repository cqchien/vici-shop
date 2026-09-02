# FR — Điểm thưởng & Thành viên (`FR-LOY`)

Service: **user-service** (loyalty là một module trong context Customer).

> **Phạm vi tenant:** `Customer`, `Address`, `PointLedger`, `Tier` mang `tenant_id`, RLS scoped.
> Một người mua ở hai tenant có **hai hồ sơ khách, hai số dư điểm** tách biệt (credential dùng
> chung ở auth-service, hồ sơ thì không). Tham số tích/tiêu điểm là cài đặt theo tenant.
> ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md))

> **Đối chiếu FE mock (2026-07):** các con số dưới đây đã đồng bộ với
> `frontend/src/lib/labels.ts` (`tierMeta`) và `Settings` seed
> (`frontend/src/lib/mock/data/finance.json`) — đây là bộ số đã demo và là nguồn đúng cho backend.
> Việc **tự động xét hạng lại** (FR-LOY-02) là quy tắc còn thiếu trong FE mock (tier hiện chỉ gán
> cố định lúc seed, `advanceOrder` cộng `spent12m` nhưng không bao giờ đọc lại để đổi `tier`) —
> đây là gap thật, **backend phải cài đúng job xét hạng lại**, không được bê nguyên hành vi tĩnh
> của mock.

- **FR-LOY-01 [M]** **Tích điểm**: 10.000 VND chi tiêu (sau giảm giá, không tính phí ship) = 1
  điểm; cộng khi đơn `completed`. Đơn hoàn/huỷ thì trừ lại điểm tương ứng.
- **FR-LOY-02 [M]** **Hạng thành viên** theo tổng chi tiêu 12 tháng gần nhất:
  `Standard` (mặc định) → `Silver` (5 triệu) → `Gold` (12 triệu) → `Collector` (20 triệu).
  Xét hạng lại hằng ngày (batch job trong user-service, đọc `spent12m` rolling-window); rớt hạng
  có hiệu lực sau chu kỳ 12 tháng kế tiếp.
- **FR-LOY-03 [M]** **Tiêu điểm**: 1 điểm = 100 VND, dùng tại checkout (FR-CART-07); tối đa 50%
  giá trị đơn. Điểm hết hạn sau 12 tháng kể từ khi cộng (FIFO).
- **FR-LOY-04 [M]** Lịch sử điểm đầy đủ (cộng/trừ/hết hạn, gắn đơn hàng) hiển thị trong tài
  khoản khách.
- **FR-LOY-05 [M]** Quyền lợi hạng: `Gold`/`Collector` được **early access drop** (FR-PROMO-04);
  hệ số tích điểm ×1.2 (Silver), ×1.5 (Gold), ×2 (Collector).
- **FR-LOY-06 [S]** Admin điều chỉnh điểm thủ công kèm lý do (đền bù, khiếu nại) — có audit.
- **FR-LOY-07 [C]** Quà sinh nhật: voucher tự động theo hạng vào tháng sinh nhật. Phụ thuộc
  `Customer.birthday` — trường này **chưa có** trong FE mock (`User` không có `birthday`); thêm
  khi implement FR-AUTH-06 ở backend thật (xem `11-auth-users.md`).
