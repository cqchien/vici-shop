"use client";

import { Card } from "@/components/ui/basics";
import { formatDateTime, formatVnd } from "@/lib/format";
import { pointReasonLabel, tierMeta } from "@/lib/labels";
import { currentUser, useAppState } from "@/lib/mock/store";
import type { Tier } from "@/lib/types";

const TIER_ORDER: Tier[] = ["standard", "silver", "gold", "collector"];

const TIER_BENEFITS: Record<Tier, string[]> = {
  standard: ["Tích điểm mỗi đơn"],
  silver: ["Điểm ×1.2", "Ưu tiên hỗ trợ"],
  gold: ["Drop sớm 10 phút", "Điểm ×1.5", "Freeship toàn quốc"],
  collector: ["Drop sớm 10 phút", "Điểm ×2", "Freeship + hộp cứng", "Săn bản đánh số"],
};

export default function LoyaltyPage() {
  const state = useAppState();
  const user = currentUser(state)!;
  const entries = state.pointEntries
    .filter((p) => p.customerId === user.id)
    .sort((a, b) => b.at.localeCompare(a.at));

  const tierIdx = TIER_ORDER.indexOf(user.tier);
  const nextTier = TIER_ORDER[tierIdx + 1];
  const nextThreshold = nextTier ? tierMeta[nextTier].thresholdVnd : null;
  const progressPct = nextThreshold
    ? Math.min(100, Math.round((user.spent12m / nextThreshold) * 100))
    : 100;

  return (
    <div className="space-y-4.5">
      <div className="grid items-start gap-4.5 lg:grid-cols-2">
        {/* Thẻ thành viên — gradient nâu-đen + sheen (v3) */}
        <div className="relative overflow-hidden rounded-2xl border border-gold bg-gradient-to-br from-[#292112] via-[#171106] to-[#211A0A] p-7 text-[#F2EFE7]">
          <span className="sheen-overlay" />
          <div className="mb-7 flex items-start justify-between">
            <div>
              <p className="mb-1.5 font-data text-[10px] tracking-[0.18em] text-[#C9A75A]">
                HẠNG THÀNH VIÊN
              </p>
              <p className="font-display text-3xl font-bold text-[#E9CE8B] uppercase">
                {tierMeta[user.tier].label}
              </p>
            </div>
            <div className="text-right">
              <p className="font-data text-xl font-semibold text-[#E9CE8B]">
                {user.points.toLocaleString("vi-VN")}
              </p>
              <p className="text-[11px] text-[#9C8B60]">điểm</p>
            </div>
          </div>
          {nextTier && nextThreshold ? (
            <>
              <div className="mb-2 flex justify-between gap-3 text-[11.5px] text-[#B8A876]">
                <span className="whitespace-nowrap">
                  Lên <b className="uppercase">{tierMeta[nextTier].label}</b>
                </span>
                <span className="font-data text-[11px] whitespace-nowrap">
                  {formatVnd(user.spent12m)} / {formatVnd(nextThreshold)}
                </span>
              </div>
              <div className="mb-4 h-[7px] overflow-hidden rounded-full bg-[rgba(216,180,90,0.18)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#C9A75A] to-[#E9CE8B]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </>
          ) : (
            <p className="mb-4 text-[11.5px] text-[#B8A876]">
              Bạn đang ở hạng cao nhất.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {TIER_BENEFITS[user.tier].map((b) => (
              <span
                key={b}
                className="rounded-full border border-[rgba(216,180,90,0.4)] px-2.5 py-1 text-[11px] whitespace-nowrap text-[#D8C58F]"
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Lộ trình hạng */}
        <Card className="p-5.5">
          <p className="mb-4 font-display text-[14.5px] font-bold">Lộ trình hạng</p>
          <div className="space-y-2.5">
            {TIER_ORDER.map((t, i) => {
              const meta = tierMeta[t];
              const isCur = t === user.tier;
              const isPast = i < tierIdx;
              return (
                <div
                  key={t}
                  className={`flex items-center gap-3 rounded-[10px] border px-3.5 py-2.5 ${
                    isCur ? "border-gold bg-gold-soft" : "border-line"
                  }`}
                >
                  <span
                    className={`h-[9px] w-[9px] rounded-full ${
                      isPast ? "bg-tx3" : isCur ? "bg-gold" : "bg-line2"
                    }`}
                  />
                  <span
                    className={`flex-1 text-[13px] font-semibold ${
                      !isPast && !isCur ? "text-tx3" : ""
                    }`}
                  >
                    {meta.label}
                  </span>
                  <span className="font-data text-[10.5px] text-tx3">
                    {formatVnd(meta.thresholdVnd)}
                  </span>
                  <span
                    className={`text-[10.5px] font-semibold ${isCur ? "text-gold" : "text-tx3"}`}
                  >
                    {isPast
                      ? "Đã qua"
                      : isCur
                        ? "Hạng hiện tại"
                        : nextThreshold && t === nextTier
                          ? `Còn ${formatVnd(Math.max(0, nextThreshold - user.spent12m))}`
                          : ""}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-3.5 text-[11.5px] text-tx3">
            Hạng tính theo chi tiêu 12 tháng. Điểm nhân hệ số ×
            {tierMeta[user.tier].multiplier} khi đơn hoàn tất; 1 điểm ={" "}
            {formatVnd(state.settings.pointValueVnd)} khi thanh toán.
          </p>
        </Card>
      </div>

      {/* Lịch sử điểm */}
      <Card className="p-6">
        <h2 className="mb-3.5 font-display text-[15px] font-bold">Lịch sử điểm</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-tx2">Chưa có giao dịch điểm.</p>
        ) : (
          <ul className="divide-y divide-line">
            {entries.map((e) => {
              const order = e.orderId
                ? state.orders.find((o) => o.id === e.orderId)
                : undefined;
              return (
                <li key={e.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-[13.5px] font-semibold">
                      {pointReasonLabel[e.reason]}
                      {order ? (
                        <span className="ml-1.5 font-data text-xs font-normal text-tx3">
                          {order.code}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-tx3">
                      {formatDateTime(e.at)}
                      {e.note ? ` — ${e.note}` : ""}
                    </p>
                  </div>
                  <span
                    className={`font-data text-sm font-semibold tnum ${
                      e.delta >= 0 ? "text-mint" : "text-drop"
                    }`}
                  >
                    {e.delta >= 0 ? "+" : ""}
                    {e.delta.toLocaleString("vi-VN")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
