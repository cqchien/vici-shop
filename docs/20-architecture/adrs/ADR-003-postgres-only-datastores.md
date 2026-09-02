# ADR-003: Bỏ Elasticsearch & ClickHouse — PostgreSQL + Redis + Kafka

- **Trạng thái**: Accepted
- **Ngày**: 2026-07-05

## Problem

Thiết kế omnichannel cũ dùng Elasticsearch (search đa tenant, hàng triệu SKU) và ClickHouse
(analytics khối lượng lớn). Cửa hàng art toy đơn có catalog < 10.000 SKU và vài nghìn đơn/tháng
— có còn đáng vận hành thêm hai datastore?

## Why

- **Search**: Postgres `tsvector` + `unaccent` + trigram xử lý tốt full-text tiếng Việt không
  dấu ở quy mô này; filter theo brand/series/giá là query quan hệ thuần. Elasticsearch thêm một
  hệ thống phải đồng bộ, backup, giám sát — không tương xứng lợi ích.
- **Analytics**: báo cáo doanh thu/tồn kho/bán chạy ở quy mô này là read model Postgres cập
  nhật từ Kafka event, query trong milliseconds. ClickHouse chỉ đáng khi hàng trăm triệu dòng.
- Mỗi datastore bớt đi là bớt một mối lo vận hành, backup, bảo mật — đúng tinh thần "thêm
  dependency là một quyết định kiến trúc".

## Solution

State của toàn hệ thống chỉ gồm: **PostgreSQL 16** (database-per-service, kể cả search index
và read model báo cáo), **Redis 7** (cart, session, counter drop, cache, rate limit), **Kafka**
(event bus). Nếu catalog hoặc khối lượng analytics vượt ngưỡng Postgres xử lý thoải mái
(search p95 > 200ms sau khi đã tối ưu index), viết ADR mới để thêm lại công cụ chuyên dụng.
