"use client";

import Link from "next/link";
import type { Drop } from "@/lib/types";
import type { State } from "@/lib/mock/seed";
import { formatVnd } from "@/lib/format";
import {
  actions,
  currentUser,
  dropPhase,
  useAppState,
  useNow,
} from "@/lib/mock/store";
import { Badge, Button, PlaceholderArt } from "@/components/ui/basics";
import { Countdown, ProgressBar } from "@/components/ui/commerce";
import { useToast } from "@/components/ui/overlay";

/** Card drop theo v3: accent trái + pill live pulse / countdown gold (DESIGN.md §6). */
export function DropCard({ drop, state }: { drop: Drop; state: State }) {
  const now = useNow();
  const user = currentUser(state);
  const phase = dropPhase(drop, now, user?.tier);
  const toast = useToast();
  const appState = useAppState();

  const item = drop.items[0];
  const product = item
    ? appState.products.find((p) => p.id === item.productId)
    : undefined;
  if (!item || !product) return null;

  const price = product.variants[0]?.priceVnd ?? 0;
  const joined = user
    ? appState.waitlist.some((w) => w.customerId === user.id && w.targetId === drop.id)
    : false;
  const live = phase === "live" || phase === "early_access";
  const over = phase === "ended" || phase === "sold_out";

  return (
    <div
      className={`rounded-2xl border border-line bg-card p-6 shadow-soft ${
        live ? "border-l-[3px] border-l-pri" : ""
      } ${over ? "bg-card2 opacity-85 shadow-none" : ""}`}
    >
      <div className="flex gap-5">
        <div className={`w-24 shrink-0 sm:w-28 ${over ? "grayscale" : ""}`}>
          <PlaceholderArt
            emoji={product.emoji}
            ratioClass={`aspect-[1/1.15] rounded-xl text-4xl ${live ? "animate-float-y" : ""}`}
          />
        </div>
        <div className="min-w-0 flex-1">
          {live ? (
            <Badge className="mb-3 bg-pri-soft text-pri">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-pri" />
              {phase === "early_access" ? "Early access" : "Đang mở bán"}
            </Badge>
          ) : phase === "scheduled" ? (
            <Badge className="mb-3 bg-gold-soft text-gold">
              Sắp mở{drop.earlyMinutes > 0 ? ` · Gold vào sớm ${drop.earlyMinutes} phút` : ""}
            </Badge>
          ) : (
            <Badge className="mb-3 bg-line text-tx3">
              {phase === "sold_out" ? "Cháy hàng" : "Đã kết thúc"}
            </Badge>
          )}

          <Link
            href={`/products/${product.slug}`}
            className="block truncate font-display text-lg font-bold hover:text-pri"
          >
            {drop.name}
          </Link>
          <p className="mt-0.5 mb-3 text-[13px] text-tx2">
            {item.allocation} bản · tối đa {item.perLimit}/khách ·{" "}
            <span className="font-data">{formatVnd(price)}</span>
          </p>

          {phase === "scheduled" ? (
            <div className="flex flex-wrap items-center gap-4">
              <Countdown target={drop.startsAt} />
              <Button
                size="sm"
                variant="secondary"
                disabled={joined}
                className={joined ? "border-gold bg-gold-soft text-gold" : ""}
                onClick={() => {
                  const r = actions.joinWaitlist("drop", drop.id);
                  toast(
                    r.ok ? "Sẽ nhắc bạn trước 15 phút" : r.error,
                    r.ok ? "success" : "error",
                  );
                }}
              >
                {joined ? "✓ Sẽ nhắc bạn" : "Nhắc tôi khi mở"}
              </Button>
            </div>
          ) : (
            <>
              <ProgressBar
                value={item.sold}
                max={item.allocation}
                striped={live}
                className="mb-2 max-w-md"
              />
              <p className="font-data text-xs text-tx2">
                <span className="font-semibold text-pri">{item.sold}</span>
                <span className="text-tx3">/{item.allocation} đã bán</span>
                {live && drop.endsAt ? (
                  <span className="ml-3 text-tx3">
                    kết thúc sau <Countdown target={drop.endsAt} compact />
                  </span>
                ) : null}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
