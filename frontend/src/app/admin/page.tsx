"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { Badge, Card, StatTile } from "@/components/ui/basics";
import { formatVnd } from "@/lib/format";
import { toneClasses } from "@/lib/labels";
import { dropPhase, useAppState, useNow } from "@/lib/mock/store";
import {
  completedOrders,
  lowStockItems,
  revenueByDay,
  revenueInRange,
  skuLabel,
} from "@/lib/mock/selectors";
import type { Order } from "@/lib/types";

const DAY = 86_400_000;
const PACK_SLA_HOURS = 4;

function orderTypePill(o: Order) {
  if (o.dropId) return <Badge className={toneClasses.danger}>Drop</Badge>;
  if (o.kind === "preorder") return <Badge className={toneClasses.info}>Pre-order</Badge>;
  return <Badge className={toneClasses.neutral}>Thường</Badge>;
}

export default function AdminDashboard() {
  const state = useAppState();
  const now = useNow();
  const router = useRouter();

  const todayStart = new Date(new Date(now).toDateString()).getTime();
  const revToday = revenueInRange(state, todayStart, now + DAY);
  const rev14 = revenueInRange(state, now - 14 * DAY, now + DAY);
  const chartData = revenueByDay(state, 14, now);
  const pending = state.orders
    .filter((o) => ["confirmed", "packing", "return_requested"].includes(o.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const nearSla = pending.filter(
    (o) => now - new Date(o.createdAt).getTime() > (PACK_SLA_HOURS - 1) * 3_600_000,
  );
  const low = lowStockItems(state);
  const done = completedOrders(state);
  const aov =
    done.length > 0
      ? Math.round(done.reduce((s, o) => s + o.totalVnd, 0) / done.length)
      : 0;
  const liveDrop = state.drops.find((d) =>
    ["live", "early_access"].includes(dropPhase(d, now)),
  );
  const liveItem = liveDrop?.items[0];
  const sellThrough = liveItem
    ? Math.round((liveItem.sold / liveItem.allocation) * 100)
    : null;
  const activeVoucher = state.vouchers.find((v) => v.status === "active");
  const activeFlash = state.flashSales.find(
    (f) => now >= new Date(f.startsAt).getTime() && now <= new Date(f.endsAt).getTime(),
  );

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Doanh thu hôm nay"
          value={formatVnd(revToday)}
          hint={`14 ngày: ${formatVnd(rev14)}`}
          tone="positive"
        />
        <StatTile
          label="Đơn chờ xử lý"
          value={String(pending.length)}
          hint={
            nearSla.length > 0
              ? `${nearSla.length} đơn sắp trễ SLA ${PACK_SLA_HOURS}h`
              : `SLA đóng gói: ${PACK_SLA_HOURS}h`
          }
          tone={nearSla.length > 0 ? "danger" : "default"}
        />
        <StatTile
          label="Sell-through drop"
          value={sellThrough !== null ? `${sellThrough}%` : "—"}
          hint={
            liveItem
              ? `${liveItem.sold}/${liveItem.allocation} · đang mở`
              : "không có drop đang chạy"
          }
          tone="positive"
        />
        <StatTile
          label="Giá trị đơn trung bình"
          value={aov > 0 ? formatVnd(aov) : "—"}
          hint={`${done.length} đơn hoàn tất`}
        />
      </div>

      {/* Doanh thu + sắp hết hàng */}
      <div className="grid gap-3.5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5.5">
          <div className="mb-4.5 flex items-baseline justify-between">
            <p className="text-sm font-bold">Doanh thu 14 ngày</p>
            <p className="font-data text-[11px] text-tx3 uppercase">
              Tổng {formatVnd(rev14)}
            </p>
          </div>
          <RevenueChart data={chartData} />
        </Card>
        <Card className="p-5.5">
          <p className="mb-4 text-sm font-bold">Sắp hết hàng</p>
          {low.length === 0 ? (
            <p className="text-[13px] text-tx2">Không có SKU nào dưới ngưỡng.</p>
          ) : (
            <div className="space-y-2.5">
              {low.slice(0, 5).map((item) => {
                const label = skuLabel(state, item.sku);
                const left = item.onHand - item.reserved;
                return (
                  <div key={item.sku} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-[13px]">
                      {label.name}
                    </span>
                    <span
                      className={`font-data text-xs font-bold tnum ${
                        left < item.threshold / 2 ? "text-drop" : "text-gold"
                      }`}
                    >
                      {left}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <Link
            href="/admin/inventory/receipts"
            className="mt-4.5 block rounded-lg border border-line py-2 text-center text-xs font-semibold text-tx2 hover:border-line2 hover:text-tx"
          >
            Tạo phiếu nhập hàng
          </Link>
        </Card>
      </div>

      {/* Chiến dịch đang chạy */}
      <Card className="p-5.5">
        <div className="mb-3.5 flex items-baseline justify-between">
          <p className="text-sm font-bold">Chiến dịch đang chạy</p>
          <Link href="/admin/campaigns" className="text-xs text-tx3 hover:text-pri">
            Quản lý →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {liveDrop && liveItem ? (
            <Link
              href="/admin/campaigns"
              className="rounded-[10px] border border-line border-l-[3px] border-l-drop px-4 py-3 hover:bg-card2"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-data text-[9px] font-semibold tracking-[0.06em] text-drop">
                  DROP
                </span>
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-drop" />
              </div>
              <p className="mb-1 text-[12.5px] font-semibold">{liveDrop.name}</p>
              <p className="text-[11px] text-tx2">
                {Math.round((liveItem.sold / liveItem.allocation) * 100)}% đã bán ·{" "}
                {liveItem.sold}/{liveItem.allocation}
              </p>
            </Link>
          ) : null}
          {activeVoucher ? (
            <Link
              href="/admin/campaigns"
              className="rounded-[10px] border border-line border-l-[3px] border-l-sky px-4 py-3 hover:bg-card2"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-data text-[9px] font-semibold tracking-[0.06em] text-sky">
                  VOUCHER
                </span>
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-sky" />
              </div>
              <p className="mb-1 font-data text-[12.5px] font-semibold">
                {activeVoucher.code}
              </p>
              <p className="text-[11px] text-tx2">
                {activeVoucher.usedCount.toLocaleString("vi-VN")} lượt dùng ·{" "}
                {activeVoucher.totalUses - activeVoucher.usedCount} lượt còn lại
              </p>
            </Link>
          ) : null}
          {activeFlash ? (
            <Link
              href="/admin/campaigns"
              className="rounded-[10px] border border-line border-l-[3px] border-l-gold px-4 py-3 hover:bg-card2"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-data text-[9px] font-semibold tracking-[0.06em] text-gold">
                  FLASH SALE
                </span>
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-gold" />
              </div>
              <p className="mb-1 text-[12.5px] font-semibold">{activeFlash.name}</p>
              <p className="text-[11px] text-tx2">
                đã bán {activeFlash.items.reduce((s, i) => s + i.sold, 0)}/
                {activeFlash.items.reduce((s, i) => s + i.cap, 0)} suất
              </p>
            </Link>
          ) : null}
          {!liveDrop && !activeVoucher && !activeFlash ? (
            <p className="text-[13px] text-tx2">Không có chiến dịch nào đang chạy.</p>
          ) : null}
        </div>
      </Card>

      {/* Đơn chờ xử lý */}
      <Card className="overflow-hidden !p-0">
        <div className="flex items-baseline justify-between border-b border-line px-5.5 py-4">
          <p className="text-sm font-bold">
            Đơn chờ xử lý{" "}
            <span className="font-data text-xs text-pri">({pending.length})</span>
          </p>
          <span className="text-xs text-tx3">SLA đóng gói: {PACK_SLA_HOURS}h</span>
        </div>
        <div className="grid grid-cols-[110px_1fr_120px_100px_70px] px-5.5 py-2 font-data text-[9.5px] tracking-[0.08em] text-tx3 uppercase max-sm:hidden">
          <span>Mã đơn</span>
          <span>Khách / sản phẩm</span>
          <span>Giá trị</span>
          <span>Loại</span>
          <span>Chờ</span>
        </div>
        {pending.length === 0 ? (
          <p className="px-5.5 py-5 text-[13px] text-tx2">
            Không có đơn nào chờ xử lý.
          </p>
        ) : (
          pending.map((o) => {
            const customer = state.users.find((u) => u.id === o.customerId);
            const ageH = (now - new Date(o.createdAt).getTime()) / 3_600_000;
            const ageText = `${Math.floor(ageH)}h${String(Math.floor((ageH % 1) * 60)).padStart(2, "0")}`;
            return (
              <button
                key={o.id}
                onClick={() => router.push(`/admin/orders/${o.id}`)}
                className="grid w-full cursor-pointer grid-cols-[110px_1fr_120px_100px_70px] items-center border-t border-line px-5.5 py-3 text-left transition-colors hover:bg-card2 max-sm:grid-cols-[1fr_auto]"
              >
                <span className="font-data text-[11.5px]">{o.code}</span>
                <span className="truncate text-[12.5px] max-sm:hidden">
                  <b>{customer?.name}</b>
                  <span className="text-tx2">
                    {" "}
                    · {o.lines[0]?.name}
                    {o.lines.length > 1 ? ` +${o.lines.length - 1}` : ""}
                  </span>
                </span>
                <span className="font-data text-[11.5px] font-bold tnum max-sm:hidden">
                  {formatVnd(o.totalVnd)}
                </span>
                <span className="max-sm:hidden">{orderTypePill(o)}</span>
                <span
                  className={`font-data text-[11.5px] ${
                    ageH > PACK_SLA_HOURS - 1
                      ? "text-drop"
                      : ageH > PACK_SLA_HOURS - 2
                        ? "text-gold"
                        : "text-tx"
                  }`}
                >
                  {ageText}
                </span>
              </button>
            );
          })
        )}
      </Card>
    </div>
  );
}
