# Testing & Testcontainers — Pitfalls & thực hành

## 1. Mock cái đáng ra phải chạy thật (integration)

- **Triệu chứng**: "integration test" của repo dùng mock DB / sqlmock trả kết quả cứng.
- **Vì sao hỏng**: bạn test cái mock, không test SQL. `UPDATE ... WHERE available >= qty` atomic
  không? RLS chặn không? Migration apply không? — mock không trả lời. Bug oversell / rò rỉ
  tenant lọt qua.
- **Cách đúng**: integration test = dep thật qua Testcontainers. Mock chỉ ở unit test (qua port).

## 2. Ice-cream cone — nhiều e2e, ít unit

- **Triệu chứng**: 200 e2e, 30 unit; CI chạy 25 phút; đỏ vì flaky mỗi ngày.
- **Vì sao hỏng**: chậm → dev không chạy local → phát hiện lỗi muộn. Flaky → team re-run cho
  xanh → mất niềm tin → skip. Một đổi nhỏ hỏng 15 e2e (giòn).
- **Cách đúng**: đảo lại pyramid. Logic → unit. Adapter → integration. e2e chỉ luồng sống-còn
  (checkout, onboarding).

## 3. Test giòn — assert vào chi tiết không quan trọng

- **Triệu chứng**: assert exact JSON string, thứ tự field, message tiếng Việt cụ thể, timestamp.
- **Vì sao hỏng**: đổi câu chữ / thêm field → test đỏ dù hành vi đúng. Test cản trở thay đổi
  hợp lệ.
- **Cách đúng**: assert **hành vi + hợp đồng ổn định**: status code, `error.code` (không
  `error.message`), field then chốt. Bỏ qua cái dễ đổi.

## 4. Không test concurrency

- **Triệu chứng**: test reserve stock chỉ một luồng.
- **Vì sao hỏng**: NFR-05 nói tồn kho + voucher phải atomic dưới concurrent — không test thì
  không biết `WHERE available >= qty` có race không cho tới khi drop production oversell.
- **Cách đúng**: integration test với N goroutine/promise song song, assert đúng số thành công +
  không âm.

## 5. Quên reset state → test phụ thuộc thứ tự chạy

- **Triệu chứng**: test A tạo dữ liệu, test B assert số lượng; đổi thứ tự chạy → đỏ.
- **Vì sao hỏng**: flaky; chạy song song không được; debug tốn thời gian.
- **Cách đúng**: mỗi test tự chủ — transaction rollback hoặc truncate trong `Cleanup`/`TestMain`.
  Không test nào dựa vào dấu vết của test khác.

## 6. Test dùng `time.Now()` / clock thật

- **Triệu chứng**: test "voucher hết hạn" dùng `time.Now().Add(-1h)`; test countdown drop.
- **Vì sao hỏng**: flaky quanh ranh giới thời gian; không test được "đúng lúc hết hạn".
- **Cách đúng**: inject `Clock` qua port; test truyền clock cố định. (Conventions Go: không gọi
  `time.Now()` trực tiếp trong domain — nhận qua tham số; FE có `useNow()` vì lý do tương tự.)

## 7. Container khởi động mỗi test → CI 20 phút

- **Triệu chứng**: `postgres.RunContainer` trong mỗi `Test*`.
- **Vì sao hỏng**: khởi động Postgres ~vài giây × trăm test = CI rất chậm.
- **Cách đúng**: một container cho cả package (`TestMain`), reset state giữa test. Cân nhắc chia
  sẻ container giữa package nếu cần.

## 8. Không có test cho bug đã sửa

- **Triệu chứng**: sửa bug bằng một dòng, không thêm test.
- **Vì sao hỏng**: bug quay lại ở lần refactor sau; không có gì chặn regression.
- **Cách đúng**: bug fix bắt đầu bằng **test đỏ tái hiện bug**, rồi sửa cho xanh (CONSTITUTION VI.1).

## 9. Coverage số làm mục tiêu

- **Triệu chứng**: viết test getter/setter, test mapper 1-1, để đạt "90% coverage".
- **Vì sao hỏng**: coverage cao nhưng test không kiểm hành vi có ý nghĩa; false confidence; tốn
  thời gian bảo trì.
- **Cách đúng**: test **invariant + hành vi + case biên + concurrency + cross-tenant**. Coverage
  là chỉ báo, không phải mục tiêu.

## 10. "Test xong" nhưng không chạy quality gate

- **Triệu chứng**: nói "done" mà chưa chạy `lint`/`typecheck`/`test`/`build`/`buf`.
- **Vì sao hỏng**: lint đỏ / build fail lọt vào PR; CONSTITUTION VI.3 yêu cầu **chạy**, không
  giả định.
- **Cách đúng**: chạy đủ gate; report trung thực (fail thì show output; skip thì nói).

## Checklist — Definition of Done

- [ ] Logic (domain/application) test bằng unit zero-I/O, fake qua port, table-driven
- [ ] Adapter test bằng integration với Testcontainers (dep thật, không mock infra)
- [ ] Pyramid đúng hình: nhiều unit, ít integration, rất ít e2e
- [ ] Case concurrency (oversell/voucher — NFR-05) có integration test song song
- [ ] Mỗi repo tenant-plane có test "cross-tenant read trả rỗng" + "thiếu tenant → từ chối" (NFR-13)
- [ ] Saga: mỗi kịch bản fail → test compensation đúng + đúng thứ tự
- [ ] Consumer: test redeliver cùng event → cùng kết quả (idempotent)
- [ ] State cô lập mỗi test (rollback/truncate); không phụ thuộc thứ tự chạy
- [ ] Clock inject qua port; không `time.Now()` trong test logic thời gian
- [ ] Một container/package (TestMain), không mỗi test
- [ ] Bug fix có test đỏ tái hiện trước khi sửa
- [ ] Chạy đủ quality gate (`lint`/`typecheck`/`test`/`build`/`buf`); report trung thực

> 🗣️ Nói thành lời: "Lỗi hình dạng suite hay gặp là ice-cream cone — nhiều e2e giòn, CI chậm,
> team mất niềm tin rồi skip. Đảo lại pyramid: logic thì unit zero-I/O, adapter thì integration
> với Testcontainers dùng dep thật — vì mock ở integration là test cái mock. Case bắt buộc:
> concurrency cho oversell, cross-tenant read trả rỗng cho RLS, và compensation cho saga. Bug
> fix luôn bắt đầu bằng test đỏ tái hiện."
