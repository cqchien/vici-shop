"use client";

import { useMemo, useState } from "react";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { Card } from "@/components/ui/basics";
import { formatVnd } from "@/lib/format";
import { tierMeta } from "@/lib/labels";
import { useAppState, useNow } from "@/lib/mock/store";
import {
  completedOrders,
  orderRevenue,
  revenueByDay,
  skuLabel,
  topSellers,
} from "@/lib/mock/selectors";
import type { Tier } from "@/lib/types";

const DAY = 86_400_000;
const TIER_ORDER: Tier[] = ["collector", "gold", "silver", "standard"];
const TIER_TEXT: Record<Tier, string> = {
  collector: "text-viol",
  gold: "text-gold",
  silver: "text-sky",
  standard: "text-tx2",
};

export default function ReportsPage() {
  const state = useAppState();
  const now = useNow();
  const [range, setRange] = useState<7 | 30 | 90>(30);

  const chartData = useMemo(() => revenueByDay(state, range, now), [state, range, now]);
  const rangeTotal = chartData.reduce((s, d) => s + d.value, 0);
  const sellers = topSellers(state, 5);
  const maxSellerRev = Math.max(1, ...sellers.map((s) => s.revenue));

  // Hàng chậm luân chuyển: còn tồn nhưng không bán được đơn hoàn tất nào trong 30 ngày
  const slowMovers = state.stock.filter((item) => {
    if (item.onHand === 0) return false;
    const soldRecently = completedOrders(state).some(
      (o) =>
        new Date(o.createdAt).getTime() >= now - 30 * DAY &&
        o.lines.some((l) => l.sku === item.sku),
    );
    return !soldRecently;
  });

  // Phân khúc khách theo hạng + tỉ trọng doanh thu
  const customers = state.users.filter((u) => u.role === "customer");
  const revByCustomer = new Map<string, number>();
  for (const o of completedOrders(state)) {
    revByCustomer.set(
      o.customerId,
      (revByCustomer.get(o.customerId) ?? 0) + orderRevenue(o),
    );
  }
  const totalRev = [...revByCustomer.values()].reduce((s, v) => s + v, 0);
  const segments = TIER_ORDER.map((tier) => {
    const members = customers.filter((u) => u.tier === tier);
    const rev = members.reduce((s, u) => s + (revByCustomer.get(u.id) ?? 0), 0);
    return {
      tier,
      count: members.length,
      share: totalRev > 0 ? Math.round((rev / totalRev) * 100) : 0,
    };
  });

  return (
    <div className="space-y-3.5">
      {/* Doanh thu theo ngày */}
      <Card className="p-5.5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold">
            Doanh thu theo ngày{" "}
            <span className="ml-1 font-data text-[11px] font-normal text-tx3 uppercase">
              Tổng {formatVnd(rangeTotal)}
            </span>
          </p>
          <div className="flex gap-1">
            {([7, 30, 90] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  range === r ? "bg-ink text-bg" : "bg-card2 text-tx3 hover:text-tx"
                }`}
              >
                {r} ngày
              </button>
            ))}
          </div>
        </div>
        <RevenueChart data={chartData} />
      </Card>

      {/* Lưới 2×2 theo v3 */}
      <div className="grid gap-3.5 lg:grid-cols-2">
        <Card className="p-5.5">
          <p className="mb-4 text-sm font-bold">Bán chạy nhất</p>
          <div className="space-y-3">
            {sellers.map((s) => (
              <div key={s.sku}>
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate font-semibold">{s.name}</span>
                  <span className="ml-2 shrink-0 font-data text-tx3">
                    {s.qty} · {formatVnd(s.revenue)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-card2">
                  <div
                    className="h-full rounded-full bg-mint"
                    style={{ width: `${Math.round((s.revenue / maxSellerRev) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5.5">
          <p className="mb-4 text-sm font-bold">Tồn kho chậm luân chuyển</p>
          {slowMovers.length === 0 ? (
            <p className="text-[13px] text-tx2">
              Không có SKU nào tồn quá 30 ngày không bán.
            </p>
          ) : (
            <div className="space-y-2.5">
              {slowMovers.map((item) => {
                const label = skuLabel(state, item.sku);
                const cost =
                  state.costLots.find((c) => c.sku === item.sku)?.avgCostVnd ?? 0;
                return (
                  <div
                    key={item.sku}
                    className="flex justify-between gap-3 border-b border-line pb-2.5 text-[12.5px] last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {label.name}
                    </span>
                    <span className="shrink-0 font-data text-drop">
                      {item.onHand} còn lại · {formatVnd(item.onHand * cost)} vốn
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5.5">
          <p className="mb-4 text-sm font-bold">Phân khúc khách hàng</p>
          <div className="space-y-2.5">
            {segments.map((s) => (
              <div key={s.tier} className="flex justify-between text-[12.5px]">
                <span className={`font-semibold ${TIER_TEXT[s.tier]}`}>
                  {tierMeta[s.tier].label}
                  {s.tier === "collector" ? " (VIP)" : ""}
                </span>
                <span className="text-tx2">
                  {s.count} khách · {s.share}% doanh thu
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3.5 text-[11px] text-tx3">
            Doanh thu tính trên đơn hoàn tất. Hạng theo chi tiêu 12 tháng.
          </p>
        </Card>

        <Card className="p-5.5">
          <p className="mb-4 text-sm font-bold">Hiệu quả chiến dịch</p>
          <div className="space-y-3">
            {state.drops.map((d) => {
              const item = d.items[0];
              if (!item) return null;
              const rev = state.orders
                .filter((o) => o.dropId === d.id && o.status !== "cancelled")
                .reduce((s, o) => s + orderRevenue(o), 0);
              return (
                <div key={d.id}>
                  <p className="text-[12.5px] font-semibold">
                    {d.name} <span className="font-normal text-tx3">· Drop</span>
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-tx2">
                    sell-through {Math.round((item.sold / item.allocation) * 100)}% ·
                    doanh thu quy cho drop {formatVnd(rev)}
                  </p>
                </div>
              );
            })}
            {state.vouchers.map((v) => {
              const rev = state.orders
                .filter((o) => o.voucherCode === v.code && o.status !== "cancelled")
                .reduce((s, o) => s + o.totalVnd, 0);
              return (
                <div key={v.id}>
                  <p className="font-data text-[12.5px] font-semibold">
                    {v.code}{" "}
                    <span className="font-sans font-normal text-tx3">· Voucher</span>
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-tx2">
                    {v.usedCount.toLocaleString("vi-VN")} lượt dùng
                    {rev > 0 ? ` · ${formatVnd(rev)} doanh thu kèm mã` : ""}
                  </p>
                </div>
              );
            })}
            {state.flashSales.map((f) => (
              <div key={f.id}>
                <p className="text-[12.5px] font-semibold">
                  {f.name} <span className="font-normal text-tx3">· Flash</span>
                </p>
                <p className="mt-0.5 text-[11.5px] text-tx2">
                  đã bán {f.items.reduce((s, i) => s + i.sold, 0)}/
                  {f.items.reduce((s, i) => s + i.cap, 0)} suất
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3.5 text-[11px] text-tx3">
            Waitlist: {state.waitlist.length} đăng ký,{" "}
            {state.waitlist.filter((w) => w.notifiedAt).length} đã báo — tín hiệu nhập
            hàng / mở drop mới (FR-PROMO-08).
          </p>
        </Card>
      </div>
    </div>
  );
}
