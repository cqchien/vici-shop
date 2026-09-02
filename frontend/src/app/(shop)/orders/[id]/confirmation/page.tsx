"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, EmptyState, LinkButton } from "@/components/ui/basics";
import { formatVnd } from "@/lib/format";
import { paymentMethodLabel, tierMeta } from "@/lib/labels";
import { currentUser, useAppState } from "@/lib/mock/store";
import type { Tier } from "@/lib/types";

const NEXT_TIER: Partial<Record<Tier, Tier>> = {
  standard: "silver",
  silver: "gold",
  gold: "collector",
};

/** Nghi thức "lắc hộp" cho đơn có blind box (DESIGN.md §6). */
function ShakeReveal({ secretRatio }: { secretRatio?: string }) {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <Card className="mb-6 p-9 shadow-soft">
      {stage === 0 ? (
        <>
          <p className="mb-1 font-display text-lg font-bold">
            Hộp của bạn đã được niêm phong
          </p>
          <p className="mb-6 text-[13px] text-tx2">
            Nhân vật được chọn ngẫu nhiên khi đóng gói. Lắc thử một cái?
          </p>
          <div className="stripe-art mx-auto mb-6 flex h-[134px] w-[116px] animate-float-y items-center justify-center rounded-2xl border border-line2">
            <span className="font-data text-[26px] text-tx3">?</span>
          </div>
          <Button
            className="!bg-viol"
            onClick={() => {
              setStage(1);
              timer.current = setTimeout(() => setStage(2), 1700);
            }}
          >
            Lắc hộp
          </Button>
        </>
      ) : null}

      {stage === 1 ? (
        <>
          <p className="mb-7 font-display text-lg font-bold">Nghe kìa…</p>
          <div className="stripe-art mx-auto mb-7 flex h-[134px] w-[116px] animate-shake-box items-center justify-center rounded-2xl border-[1.5px] border-viol">
            <span className="font-data text-[26px] text-viol">?</span>
          </div>
          <p className="font-data text-[11.5px] text-tx3">
            tiếng lạch cạch chuẩn vinyl
          </p>
        </>
      ) : null}

      {stage === 2 ? (
        <div className="relative">
          <span className="confetti-bit top-2 left-1/4 h-[7px] w-[7px] rounded-sm bg-pri" />
          <span className="confetti-bit top-0 left-1/2 h-1.5 w-1.5 rounded-full bg-viol [animation-delay:0.1s]" />
          <span className="confetti-bit top-3 right-1/4 h-[7px] w-[7px] rounded-sm bg-gold [animation-delay:0.05s]" />
          <p className="mb-1 font-display text-lg font-bold">Tín hiệu tốt</p>
          <p className="mb-6 text-[13px] text-tx2">
            Nặng tay, tiếng lạch cạch chuẩn. Nhân vật thật lộ diện khi bạn mở seal
            on-cam.
          </p>
          <div className="mx-auto mb-4.5 w-[140px] animate-pop-in rounded-2xl border-[1.5px] border-viol bg-gradient-to-br from-viol-soft to-card p-3">
            <div className="mb-2 flex aspect-[1/1.1] items-center justify-center rounded-[10px] bg-card2">
              <span className="font-data text-3xl font-semibold text-viol">?</span>
            </div>
            <p className="text-[12.5px] font-bold">BLIND BOX ×1</p>
            {secretRatio ? (
              <p className="mt-1 font-data text-[9.5px] text-viol">
                SECRET ODDS · {secretRatio}
              </p>
            ) : null}
          </div>
          <p className="text-xs text-tx3">
            Mở hộp on-camera để được hỗ trợ đổi lỗi 1-1
          </p>
        </div>
      ) : null}
    </Card>
  );
}

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  const order = state.orders.find((o) => o.id === id);
  const user = currentUser(state);

  if (!order) return <EmptyState title="Không tìm thấy đơn hàng" />;

  const tx = order.transactions[0];
  const isPreorder = order.kind === "preorder";
  const deposit = order.depositVnd ?? 0;
  const balance = order.totalVnd - deposit;
  const hasBlindBox = order.lines.some((l) => {
    const p = state.products.find((x) => x.id === l.productId);
    return p?.type === "blind_box";
  });
  const secretRatio = (() => {
    for (const l of order.lines) {
      const p = state.products.find((x) => x.id === l.productId);
      const s = p?.seriesId ? state.series.find((x) => x.id === p.seriesId) : undefined;
      const secret = s?.figures.find((f) => f.isSecret);
      if (secret) return secret.ratio;
    }
    return undefined;
  })();

  // Điểm dự kiến khi đơn hoàn tất + lộ trình lên hạng kế tiếp
  const subtotal = order.lines.reduce((s, l) => s + l.unitPriceVnd * l.qty, 0);
  const willEarn = user
    ? Math.floor(
        ((subtotal - order.discountVnd) / state.settings.pointEarnRate) *
          tierMeta[user.tier].multiplier,
      )
    : 0;
  const nextTier = user ? NEXT_TIER[user.tier] : undefined;
  const toNext =
    user && nextTier ? Math.max(0, tierMeta[nextTier].thresholdVnd - user.spent12m) : 0;

  return (
    <div className="mx-auto max-w-[640px] py-8 pb-12 text-center">
      <div className="mx-auto mb-4.5 flex h-[58px] w-[58px] animate-pop-in items-center justify-center rounded-full bg-mint-soft text-[25px] text-mint">
        ✓
      </div>
      <h1 className="mb-1.5 text-[28px] font-bold tracking-[-0.015em]">
        {isPreorder ? "Đặt cọc thành công" : "Đặt hàng thành công"}
      </h1>
      <p className="mb-2 font-data text-[12.5px] text-tx3">#{order.code}</p>
      {user && willEarn > 0 ? (
        <p className="mx-auto mb-7 inline-block rounded-full bg-gold-soft px-4 py-1.5 text-[12.5px] font-semibold text-gold">
          +{willEarn.toLocaleString("vi-VN")} điểm khi hoàn tất
          {nextTier && toNext > 0
            ? ` · còn ${formatVnd(toNext)} chi tiêu để lên ${tierMeta[nextTier].label}`
            : ""}
        </p>
      ) : (
        <div className="mb-7" />
      )}

      {!isPreorder && hasBlindBox ? <ShakeReveal secretRatio={secretRatio} /> : null}

      {isPreorder ? (
        <Card className="mb-6 p-8 text-left shadow-soft">
          <Badge className="mb-3.5 bg-sky-soft text-sky">
            Pre-order · Đã cọc{" "}
            {Math.round((deposit / Math.max(1, order.totalVnd)) * 100)}%
          </Badge>
          <p className="mb-1 font-display text-lg font-bold">
            {order.lines[0]?.name}
          </p>
          <p className="mb-5 text-[13px] text-tx2">
            Tổng <span className="font-data">{formatVnd(order.totalVnd)}</span> · Đã cọc{" "}
            <b className="font-data">{formatVnd(deposit)}</b> · Còn lại{" "}
            <span className="font-data">{formatVnd(balance)}</span> khi hàng về
          </p>
          <div className="flex items-center">
            {[
              { mark: "✓", cls: "bg-mint text-white", line: "bg-mint" },
              { mark: "●", cls: "bg-sky text-white", line: "bg-line" },
              { mark: "", cls: "bg-card2 text-tx3", line: "bg-line" },
              { mark: "", cls: "bg-card2 text-tx3", line: "" },
            ].map((s, i) => (
              <div key={i} className={`flex items-center ${i < 3 ? "flex-1" : ""}`}>
                <span
                  className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${s.cls}`}
                >
                  {s.mark}
                </span>
                {s.line ? <span className={`mx-1.5 h-0.5 flex-1 ${s.line}`} /> : null}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10.5px] text-tx3">
            <span className="font-semibold text-mint">Cọc xong</span>
            <span>Chờ hàng</span>
            <span>Trả nốt</span>
            <span>Giao</span>
          </div>
        </Card>
      ) : null}

      {!isPreorder && !hasBlindBox ? (
        <Card className="mb-6 p-6 text-left shadow-soft">
          {order.lines.map((l) => (
            <div key={l.variantId} className="flex justify-between py-1 text-[13.5px]">
              <span className="line-clamp-1">
                {l.name} <span className="text-tx3">×{l.qty}</span>
              </span>
              <span className="font-data tnum">{formatVnd(l.unitPriceVnd * l.qty)}</span>
            </div>
          ))}
          <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm font-semibold">
            <span>Tổng · {tx ? paymentMethodLabel[tx.method] : ""}</span>
            <span className="font-data tnum">{formatVnd(order.totalVnd)}</span>
          </div>
        </Card>
      ) : null}

      <p className="mb-7 text-xs text-tx3">
        {tx?.method === "cod"
          ? "Bạn thanh toán khi nhận hàng — shop sẽ gọi xác nhận trước khi gửi."
          : isPreorder
            ? "Vici sẽ báo qua Zalo và email khi hàng về kho để thanh toán phần còn lại (hạn 7 ngày)."
            : `Đã thanh toán qua ${tx ? paymentMethodLabel[tx.method] : ""}.`}{" "}
        Giao tới: {order.addressText}
      </p>

      <div className="flex justify-center gap-2.5">
        <LinkButton href={`/account/orders/${order.id}`} variant="dark">
          Theo dõi đơn hàng
        </LinkButton>
        <LinkButton href="/" variant="secondary">
          Về trang chủ
        </LinkButton>
      </div>
    </div>
  );
}
