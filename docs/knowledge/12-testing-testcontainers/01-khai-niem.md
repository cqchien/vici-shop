# Testing & Testcontainers — Khái niệm

> Vì sao quan trọng: test suite sai hình dạng (nhiều e2e giòn, ít unit) làm CI chậm + hay đỏ
> vặt vãnh → team mất niềm tin, bắt đầu skip test → bug lọt production. Hình dạng suite quyết
> định tốc độ và độ tin cậy của cả vòng phát triển.

## Test pyramid

```
        /\        e2e — vài kịch bản (checkout end-to-end, onboarding)
       /  \       chậm, giòn, đắt; chỉ luồng sống-còn
      /----\
     /      \     integration — adapter với dep thật (Postgres/Redis/Kafka)
    /--------\    vừa phải; test cái mock không kiểm được
   /          \
  /------------\  unit — domain + application, ZERO I/O
                  rất nhiều, chạy ms; nền của pyramid
```

**Ice-cream cone** (ngược lại — nhiều e2e, ít unit) là anti-pattern: suite chạy 30 phút, đỏ vì
timing/flaky, một thay đổi nhỏ làm hỏng 20 e2e.

| Loại | Test cái gì | I/O | Tốc độ | Số lượng |
| --- | --- | --- | --- | --- |
| **Unit** | Invariant domain, logic use case (với fake port) | Không | ~ms | Rất nhiều |
| **Integration** | Adapter: repo với SQL thật, consumer với Kafka thật, RLS | Có (container) | ~giây | Vừa |
| **e2e** | Luồng xuyên nhiều service qua API | Có (hệ thống) | ~chục giây–phút | Rất ít |

## Vì sao unit test zero I/O — và điều kiện

- **Nhanh**: chạy cả nghìn test trong giây → dev chạy liên tục khi code, CI < 1 phút cho unit.
- **Deterministic**: không phụ thuộc container khởi động, network, clock → không flaky.
- **Điều kiện**: domain + application **không import I/O** (hexagonal). Nếu domain gọi DB thẳng
  thì "unit test zero I/O" là bất khả.

Test domain: gọi method aggregate, assert invariant + event trả về. Test application: inject
**fake** implement port, assert use case điều phối đúng.

## Vì sao integration dùng dep THẬT (không mock)

Integration test **mục đích chính là** kiểm cái mock giấu đi:

- SQL thật: `UPDATE ... WHERE on_hand - reserved >= $qty` có chạy đúng dưới concurrent không?
  Mock repo trả "ok" luôn — không kiểm được.
- **RLS thật**: policy có chặn cross-tenant không? Chỉ Postgres thật mới trả lời.
- Kafka thật: consumer group rebalance, offset commit, redelivery.
- Migration thật: schema có apply được không.

Mock ở integration = test cái mock của bạn, không test hệ thống.

> Hệ quả production: bug oversell, bug rò rỉ tenant, bug migration — chỉ integration test với
> dep thật bắt được **trước** production. NFR-05 (tồn kho + voucher atomic) và NFR-13
> (cross-tenant read trả rỗng) là các case **bắt buộc** phải có integration test.

## Testcontainers

Thư viện khởi động **container Docker thật** (Postgres, Redis, Kafka) **trong quá trình test**,
tự dọn sau:

- Test tự chủ: không cần "chạy `docker compose up` trước" thủ công; CI chỉ cần Docker.
- Mỗi test suite có instance sạch (hoặc chia sẻ + reset giữa test).
- Testcontainers-go (8 service Go), Testcontainers (Node) cho 5 service NestJS (auth, user,
  order, tenant, billing).

## TDD với bug fix

Từ conventions: *"Every bug fix starts with a failing test that reproduces it."* Viết test tái
hiện bug (đỏ) → sửa (xanh) → test đó ở lại chống regression.

## Khi nào "đủ test"

- Mọi invariant domain có unit test (kể cả case biên: 0, âm, trùng).
- Mọi adapter có integration test cho happy path + case concurrency nếu có.
- Mỗi repo tenant-plane có test "cross-tenant read trả rỗng" (NFR-13).
- Vài e2e cho luồng sống-còn (checkout, onboarding).
- Quality gate: `lint`, `typecheck`, `test`, `build` (+ Buf) đều xanh trước khi coi là xong.

Không cần: test getter/setter, test framework của người khác, 100% coverage bằng mọi giá.

## Glossary

| Term | Một câu |
| --- | --- |
| Test pyramid | Nhiều unit, ít integration, rất ít e2e |
| Fake / stub | Implement port đơn giản dùng trong unit test (in-memory) |
| Table-driven test | Một test, nhiều case trong một bảng dữ liệu |
| Testcontainers | Khởi động container Docker thật trong test, tự dọn |
| Fixture / seed | Dữ liệu dựng sẵn cho test |
| Flaky test | Test lúc xanh lúc đỏ không do code — thường do timing/state |
| `TestMain` (Go) | Hàm setup/teardown chạy một lần cho cả package test |

> 🗣️ Nói thành lời: "Test pyramid: nhiều unit cho domain và application với zero I/O nên chạy
> mili-giây và không flaky — hexagonal làm được điều này vì domain không import I/O. Ít hơn là
> integration test chạy Postgres, Redis, Kafka thật qua Testcontainers — mục đích là kiểm chính
> cái mock giấu đi, như SQL atomic dưới concurrent, RLS chặn cross-tenant, migration. Mock ở
> integration là test cái mock chứ không phải hệ thống. Rất ít e2e cho luồng sống-còn."
