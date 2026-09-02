"use client";

import Link from "next/link";
import { Badge, Button, EmptyState, PlaceholderArt } from "@/components/ui/basics";
import { Countdown, ProgressBar } from "@/components/ui/commerce";
import { useToast } from "@/components/ui/overlay";
import { formatVnd } from "@/lib/format";
import type { Drop } from "@/lib/types";
import type { State } from "@/lib/mock/seed";
import {
  actions,
  currentUser,
  dropPhase,
  dropRemainingForUser,
  useAppState,
  useNow,
} from "@/lib/mock/store";

/** Drop đang mở — hero card accent trái + progress sọc chạy + CTA mua (v3). */
function LiveDropHero({ drop, state }: { drop: Drop; state: State }) {
  const toast = useToast();
  const user = currentUser(state);
  const item = drop.items[0];
  const product = state.products.find((p) => p.id === item?.productId);
  if (!item || !product) return null;
  const variant = product.variants[0];
  const remaining = dropRemainingForUser(state, drop, product.id, user?.id ?? null);

  return (
    <section className="grid items-center gap-8 rounded-2xl border border-line border-l-[3px] border-l-pri bg-card p-7 shadow-soft sm:p-10 lg:grid-cols-[1fr_320px]">
      <div>
        <Badge className="mb-4 bg-pri-soft text-pri">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-pri" />
          Đang mở bán
        </Badge>
        <h2 className="mb-2 text-[28px] font-bold tracking-[-0.02em] sm:text-[38px]">
          {drop.name}
        </h2>
        <p className="mb-6 max-w-lg text-[14.5px] leading-relaxed text-tx2 text-pretty">
          {product.description}
        </p>
        <ProgressBar
          value={item.sold}
          max={item.allocation}
          striped
          className="mb-2.5 !h-2.5 max-w-lg"
        />
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <span className="font-data text-[13px]">
            <span className="font-semibold text-pri">{item.sold}</span>
            <span className="text-tx3">/{item.allocation} đã bán</span>
          </span>
          <span className="rounded-full border border-line2 px-2.5 py-1 font-data text-[10.5px] text-tx2">
            TỐI ĐA {item.perLimit}/KHÁCH
          </span>
          {drop.earlyMinutes > 0 ? (
            <span className="rounded-full bg-gold-soft px-2.5 py-1 font-data text-[10.5px] text-gold">
              GOLD ĐÃ VÀO SỚM {drop.earlyMinutes} PHÚT
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-4.5">
          <Button
            size="lg"
            disabled={remaining <= 0}
            onClick={() => {
              const r = actions.addToCart(product.id, variant.id, 1);
              toast(
                r.ok ? `Đã giữ 1 bản ${product.name} trong giỏ` : r.error,
                r.ok ? "success" : "error",
              );
            }}
          >
            {remaining <= 0
              ? `Đã đạt giới hạn ${item.perLimit}/khách`
              : `Mua ngay — ${formatVnd(variant.priceVnd)}`}
          </Button>
          <span className="font-data text-xl font-semibold">
            {formatVnd(variant.priceVnd)}
          </span>
        </div>
        <p className="mt-3 text-xs text-tx3">
          Số lượng chỉ trừ khi thanh toán xong — không giữ chỗ ảo.
          {user ? ` Bạn còn ${remaining} suất.` : " Đăng nhập để mua hàng drop."}
        </p>
      </div>
      <PlaceholderArt
        emoji={product.emoji}
        label={`ảnh ${product.name}`}
        ratioClass="hidden aspect-[1/1.15] animate-float-y rounded-xl border border-line text-7xl lg:flex"
      />
    </section>
  );
}

/** Drop sắp mở — countdown lớn giữa + nút "Nhắc tôi" (v3). */
function UpcomingDrop({ drop, state }: { drop: Drop; state: State }) {
  const toast = useToast();
  const user = currentUser(state);
  const item = drop.items[0];
  const product = state.products.find((p) => p.id === item?.productId);
  if (!item || !product) return null;
  const variant = product.variants[0];
  const joined = user
    ? state.waitlist.some((w) => w.customerId === user.id && w.targetId === drop.id)
    : false;

  return (
    <section className="rounded-2xl border border-line bg-card p-7 text-center shadow-soft sm:p-10">
      <Badge className="mb-4 bg-gold-soft text-gold">
        Sắp mở · Gold+ vào sớm {drop.earlyMinutes} phút
      </Badge>
      <h2 className="mb-1.5 text-2xl font-bold tracking-[-0.015em] sm:text-3xl">
        {drop.name}
      </h2>
      <p className="mb-7 text-[13.5px] text-tx2">
        {item.allocation} bản · {formatVnd(variant.priceVnd)} · tối đa{" "}
        {item.perLimit}/khách
      </p>
      <div className="mb-6 flex justify-center">
        <Countdown target={drop.startsAt} size="lg" />
      </div>
      <Button
        variant="secondary"
        disabled={joined}
        className={joined ? "border-gold bg-gold-soft text-gold" : "text-tx"}
        onClick={() => {
          const r = actions.joinWaitlist("drop", drop.id);
          toast(r.ok ? "Sẽ nhắc bạn trước 15 phút" : r.error, r.ok ? "success" : "error");
        }}
      >
        {joined ? "✓ Sẽ nhắc bạn trước 15 phút" : "Nhắc tôi khi mở"}
      </Button>
    </section>
  );
}

/** Drop đã kết thúc — strip mờ grayscale (v3). */
function PastDrop({ drop, state }: { drop: Drop; state: State }) {
  const item = drop.items[0];
  const product = state.products.find((p) => p.id === item?.productId);
  if (!item || !product) return null;

  return (
    <section className="flex items-center gap-6 rounded-2xl border border-line bg-card2 p-6 opacity-85 sm:px-10">
      <div className="w-19 shrink-0 grayscale">
        <PlaceholderArt
          emoji={product.emoji}
          ratioClass="aspect-[1/1.15] rounded-[10px] text-3xl"
        />
      </div>
      <div className="min-w-0 flex-1">
        <Badge className="mb-2 bg-line text-tx3">
          {item.sold >= item.allocation ? "Cháy hàng" : "Đã kết thúc"}
        </Badge>
        <p className="truncate font-display text-[17px] font-bold">{drop.name}</p>
        <p className="mt-0.5 text-[12.5px] text-tx2">
          Đã bán {item.sold}/{item.allocation} bản.
        </p>
      </div>
      <Link
        href={`/products/${product.slug}`}
        className="shrink-0 rounded-[9px] border border-line2 px-4 py-2.5 text-[12.5px] font-semibold text-tx2 hover:border-tx3 hover:text-tx"
      >
        Xem sản phẩm →
      </Link>
    </section>
  );
}

export default function DropsPage() {
  const state = useAppState();
  const now = useNow();

  const live = state.drops.filter((d) =>
    ["live", "early_access"].includes(dropPhase(d, now)),
  );
  const upcoming = state.drops.filter((d) => dropPhase(d, now) === "scheduled");
  const past = state.drops.filter((d) =>
    ["ended", "sold_out"].includes(dropPhase(d, now)),
  );

  return (
    <div className="space-y-4.5 py-4 pb-10">
      {live.map((d) => (
        <LiveDropHero key={d.id} drop={d} state={state} />
      ))}
      {upcoming.map((d) => (
        <UpcomingDrop key={d.id} drop={d} state={state} />
      ))}
      {past.map((d) => (
        <PastDrop key={d.id} drop={d} state={state} />
      ))}
      {state.drops.length === 0 ? (
        <EmptyState
          title="Chưa có drop nào"
          hint="Drop giới hạn mở đúng giờ — theo dõi Instagram của Vici để không bỏ lỡ."
        />
      ) : null}
    </div>
  );
}
