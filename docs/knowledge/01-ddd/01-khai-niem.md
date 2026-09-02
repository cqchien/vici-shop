# DDD — Khái niệm

> Vì sao chủ đề này quan trọng: DDD quyết định **ranh giới** trong hệ thống. Đặt ranh giới sai
> thì mọi thứ sau đó (service nào sở hữu gì, ai gọi ai, schema ra sao) đều lệch, và sửa rất đắt
> vì đã có code + data.

## Vấn đề DDD giải

Trước DDD, cách chia hệ thống phổ biến là **theo tầng kỹ thuật** (controllers / services / DAOs)
hoặc **theo bảng database**. Kết quả:

- Một thay đổi nghiệp vụ nhỏ ("đơn pre-order được huỷ trong 24h đầu") phải sửa rải rác ở nhiều
  file kỹ thuật, không có một chỗ "sự thật" về quy tắc đó.
- Dev và người nghiệp vụ nói hai ngôn ngữ khác nhau — "record", "row", "flag" vs "đơn hàng",
  "đặt cọc", "drop". Mỗi lần trao đổi phải dịch, dịch sai thì code sai.
- Khi hệ thống lớn, một model "God object" (`User` có 60 field phục vụ 10 mục đích) khiến mọi
  thay đổi đều rủi ro: đổi field cho tính năng A làm hỏng tính năng B.

DDD nói: **mô hình hoá phần mềm theo đúng cách người làm nghiệp vụ tư duy**, và **chia hệ thống
theo ranh giới nghiệp vụ** chứ không theo kỹ thuật.

## Ubiquitous language — ngôn ngữ chung

Trong một phạm vi nghiệp vụ, dev và domain expert dùng **cùng một bộ từ vựng**, và bộ từ đó
xuất hiện **nguyên văn trong code**: tên class, method, biến, event.

- Nghiệp vụ nói "khách *đặt cọc* cho một *chiến dịch pre-order*" → code có
  `PreOrderCampaign`, `order.PayDeposit()`, event `DepositPaid`. Không phải `createPartialPayment`.
- Nếu một từ có nghĩa mơ hồ ("fulfilled" — đã giao hay đã thanh toán?), phải làm rõ *trước khi*
  viết code, vì cái tên sẽ đóng băng vào API và event schema.

> 💡 Quy tắc: nếu bạn phải giải thích một cái tên trong code cho người nghiệp vụ, cái tên đó sai.

## Strategic vs tactical

**Strategic DDD** — chia hệ thống ở tầm lớn:

- **Bounded context**: một ranh giới trong đó một mô hình + một ngôn ngữ nhất quán. `Order` bên
  trong context Ordering là một aggregate đầy đủ vòng đời; `Order` trong context Finance chỉ là
  một tham chiếu (`order_id`, tổng tiền) trên bút toán. **Cùng từ, khác nghĩa, khác type.**
- **Context map**: các context quan hệ với nhau thế nào (ai gọi ai bằng gRPC, ai consume event
  của ai). Đây là bản đồ để quyết định coupling.

**Tactical DDD** — mô hình bên trong một context:

- **Aggregate**: cụm object thay đổi cùng nhau, có một **root**; code ngoài chỉ tham chiếu
  aggregate qua root và qua ID. Là **đơn vị transaction** và **đơn vị consistency**.
- **Entity**: có định danh và vòng đời (`LineItem`, `Address`). Bằng nhau khi cùng ID.
- **Value Object (VO)**: bất biến, không có định danh, bằng nhau khi cùng giá trị (`Money`,
  `Email`, `Sku`, `TenantId`). Mang theo validation.
- **Domain Event**: một sự thật **đã xảy ra**, quá khứ (`OrderPlaced`, `TenantProvisioned`).
- **Repository**: cổng để load/save một aggregate root; nói ngôn ngữ domain (`FindByID`,
  `Save`), không nói SQL.
- **Domain Service**: logic không thuộc riêng aggregate nào (vd. tính phí ship qua nhiều yếu tố).

## Khi nào dùng / khi nào KHÔNG

**Dùng DDD khi:**

- Nghiệp vụ phức tạp và **hay đổi** (blind box, drop, pre-order cọc, giá vốn moving-average,
  hạng thành viên — đúng mô tả của Vici).
- Nhiều người/nhiều team cùng làm, cần ranh giới rõ để không giẫm chân nhau.

**KHÔNG cần (hoặc dùng nhẹ) khi:**

- CRUD thuần: một form nhập liệu, một bảng, không có invariant nào ngoài "field bắt buộc".
  Áp full tactical DDD ở đây chỉ thêm lớp map vô ích.
- Prototype vứt đi, hoặc script một lần.
- Sub-domain **generic** (gửi email, xuất PDF) — mua/dùng thư viện, đừng mô hình hoá.

> 💡 Vici áp DDD **đậm** cho Ordering / Promotion / Finance / Tenant (nghiệp vụ lõi), **nhẹ** cho
> Notification (chủ yếu là gửi đi). Xem `04-pitfalls` về việc đừng bê CQRS/ES sang mọi nơi.

## Glossary

| Term | Một câu |
| --- | --- |
| Bounded context | Ranh giới trong đó một mô hình + một ngôn ngữ nhất quán |
| Ubiquitous language | Bộ từ vựng nghiệp vụ dùng chung, xuất hiện nguyên văn trong code |
| Aggregate / aggregate root | Cụm object đổi cùng nhau qua một root; đơn vị transaction & consistency |
| Invariant | Quy tắc luôn phải đúng ("đơn không thể thanh toán hai lần") |
| Entity | Object có định danh + vòng đời; bằng nhau khi cùng ID |
| Value Object | Object bất biến, không định danh; bằng nhau khi cùng giá trị |
| Domain event | Sự thật đã xảy ra, đặt tên quá khứ |
| Anti-corruption layer (ACL) | Lớp dịch khi tích hợp với model bên ngoài để không "nhiễm" model của mình |

> 🗣️ Nói thành lời: "DDD với tôi là hai việc. Một, chia hệ thống theo bounded context — mỗi
> context một mô hình, một database, không share type; cùng một từ như *Order* có thể khác nghĩa
> giữa Ordering và Finance. Hai, bên trong context thì mô hình bằng aggregate + value object,
> để invariant nghiệp vụ nằm một chỗ và test được không cần database. Cái quan trọng nhất là
> ubiquitous language: nếu tên trong code phải giải thích cho người nghiệp vụ thì tên đó sai."
