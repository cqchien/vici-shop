# Yêu cầu chức năng & phi chức năng

Mỗi module một file; yêu cầu đánh số `FR-<MODULE>-<NN>` để spec, code và test tham chiếu.
Mức độ ưu tiên: **[M]** must-have (v1), **[S]** should-have, **[C]** could-have.

Vici là nền tảng đa tenant ([ADR-007](../20-architecture/adrs/ADR-007-multi-tenancy-pooled-rls.md)):
mọi FR dưới đây (trừ `FR-TEN` cấp nền tảng) ngầm hiểu **trong phạm vi một tenant** — mọi
aggregate mang `tenant_id`, mọi truy vấn scoped qua Postgres RLS.

| File | Module | Prefix | Service chịu trách nhiệm |
| --- | --- | --- | --- |
| [13-tenant.md](13-tenant.md) | Tenant & Onboarding (cấp nền tảng) | `FR-TEN` | tenant-service |
| [14-billing.md](14-billing.md) | Gói dịch vụ & Subscription | `FR-BIL` | billing-service |
| [01-catalog.md](01-catalog.md) | Catalog & Blind Box | `FR-CAT` | product-service |
| [02-inventory.md](02-inventory.md) | Tồn kho | `FR-INV` | inventory-service |
| [03-cart-checkout.md](03-cart-checkout.md) | Giỏ hàng & Checkout | `FR-CART` | cart-service |
| [04-order.md](04-order.md) | Đơn hàng & Pre-order | `FR-ORD` | order-service |
| [05-payment.md](05-payment.md) | Thanh toán | `FR-PAY` | payment-service |
| [06-shipping.md](06-shipping.md) | Vận chuyển | `FR-SHIP` | shipping-service |
| [07-promotion.md](07-promotion.md) | Khuyến mãi, Drop & Waitlist | `FR-PROMO` | promotion-service |
| [08-loyalty.md](08-loyalty.md) | Điểm thưởng & Thành viên | `FR-LOY` | user-service |
| [09-accounting.md](09-accounting.md) | Kế toán | `FR-ACC` | finance-service |
| [10-reporting.md](10-reporting.md) | Báo cáo | `FR-REP` | finance-service |
| [11-auth-users.md](11-auth-users.md) | Tài khoản & Xác thực | `FR-AUTH` | auth-service, user-service |
| [12-notification.md](12-notification.md) | Thông báo | `FR-NOTI` | notification-service |
| [99-nfr.md](99-nfr.md) | Yêu cầu phi chức năng | `NFR` | toàn hệ thống |

Thứ tự đọc theo roadmap: `FR-TEN` + `FR-BIL` (P0.5) trước, rồi các module nghiệp vụ P1→P4.
