# 08 — gRPC + Buf

gRPC là cách các service Vici **gọi nhau đồng bộ** (mũi tên liền trong sơ đồ): contract-first
(định nghĩa `.proto` trước), sinh stub cho Go và TypeScript, HTTP/2 + Protobuf (nhỏ, nhanh),
typed hai đầu. **Buf** là toolchain quản lý `.proto`: lint style, kiểm **breaking change** trong
CI, sinh code.

Dùng khi caller **cần kết quả ngay để đi tiếp** (`ReserveStock`, `GetEntitlements`). Không dùng
để "thông báo" — đó là việc của Kafka event.

| File | Nội dung |
| --- | --- |
| [01-khai-niem.md](01-khai-niem.md) | Vì sao gRPC (không REST nội bộ), contract-first, khi nào gRPC / khi nào event |
| [02-co-che.md](02-co-che.md) | proto3, 4 kiểu RPC, code-gen, deadline/timeout, status codes, interceptor, Buf lint + breaking |
| [03-ap-dung-trong-vici.md](03-ap-dung-trong-vici.md) | `libs/proto/`, naming `vici.<context>.v1`, RPC catalog, metadata `x-tenant-id`, Lambda invoke (ADR-010) |
| [04-pitfalls-va-thuc-hanh.md](04-pitfalls-va-thuc-hanh.md) | REST nội bộ, không deadline, retry RPC có side-effect, breaking proto, domain import grpc… + checklist |

Đọc kèm: [`20-architecture/04-service-contracts-conventions.md`](../../20-architecture/04-service-contracts-conventions.md) §2 ·
[`backend/libs/proto/`](../../../backend/libs/proto/) ·
[`.claude/conventions/coding-conventions-go.md`](../../../.claude/conventions/coding-conventions-go.md) §12 ·
[`.claude/conventions/architecture.md`](../../../.claude/conventions/architecture.md) §6
