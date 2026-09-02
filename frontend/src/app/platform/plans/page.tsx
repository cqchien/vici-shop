"use client";

import { Badge, Card, Icon } from "@/components/ui/basics";
import { formatVnd } from "@/lib/format";
import { useAppState } from "@/lib/mock/store";

export default function PlatformPlansPage() {
  const state = useAppState();
  const countByPlan = (code: string) =>
    state.tenants.filter((t) => t.planCode === code).length;

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-tx3">
        Danh mục gói áp cho toàn nền tảng. Đổi giá không hồi tố tenant hiện hữu tới kỳ kế tiếp
        (FR-BIL-02). Chỉnh sửa là mock.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {state.plans.map((p) => (
          <Card key={p.code} className="flex flex-col p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold">{p.name}</h2>
              <Badge className="bg-viol-soft text-viol">{countByPlan(p.code)} shop</Badge>
            </div>
            <p className="font-data text-2xl font-semibold">
              {p.priceVndMonth === 0 ? "Miễn phí" : formatVnd(p.priceVndMonth)}
              {p.priceVndMonth > 0 ? (
                <span className="text-[13px] font-normal text-tx3"> /tháng</span>
              ) : null}
            </p>
            <p className="mt-1 font-data text-[12px] text-tx3">
              Phí giao dịch {p.txnFeePercent}%
            </p>
            <ul className="mt-4 space-y-1.5 text-[13px]">
              <li>{p.limits.products} sản phẩm active</li>
              <li>{p.limits.ordersMonth.toLocaleString("vi-VN")} đơn / tháng</li>
              <li>{p.limits.staffSeats} tài khoản staff</li>
              {(["drop", "preorder", "customDomain"] as const).map((f) => (
                <li
                  key={f}
                  className={`flex items-center gap-1.5 ${p.features[f] ? "text-tx" : "text-tx3 line-through"}`}
                >
                  <Icon
                    name={p.features[f] ? "check_circle" : "cancel"}
                    size={14}
                    className={p.features[f] ? "text-mint" : "text-line2"}
                  />
                  {f === "drop" ? "Drop có lịch" : f === "preorder" ? "Pre-order cọc" : "Tên miền riêng"}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
