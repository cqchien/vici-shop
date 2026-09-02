"use client";

import { useEffect, useState } from "react";
import { formatVnd, timeUntil } from "@/lib/format";
import {
  orderStatusMeta,
  shipmentStatusMeta,
  toneClasses,
} from "@/lib/labels";
import type { OrderStatus, ShipmentStatus } from "@/lib/types";
import { Badge } from "./basics";

export function Price({
  amount,
  compareAt,
  className = "",
}: {
  amount: number;
  compareAt?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-data font-semibold tnum">{formatVnd(amount)}</span>
      {compareAt && compareAt > amount ? (
        <span className="font-data text-xs text-tx3 line-through tnum">
          {formatVnd(compareAt)}
        </span>
      ) : null}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = orderStatusMeta[status];
  return <Badge className={toneClasses[meta.tone]}>{meta.label}</Badge>;
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const meta = shipmentStatusMeta[status];
  return <Badge className={toneClasses[meta.tone]}>{meta.label}</Badge>;
}

export function Stars({ value }: { value: number }) {
  return (
    <span className="text-[13px] tracking-[2px] text-gold" aria-label={`${value} sao`}>
      {"★".repeat(Math.round(value))}
      <span className="text-line2">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

/** Đồng hồ đếm ngược drop / flash sale — ô card2, số mono, ô giây màu pri. */
export function Countdown({
  target,
  onDone,
  compact = false,
  size = "md",
}: {
  target: string;
  onDone?: () => void;
  compact?: boolean;
  size?: "md" | "lg";
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { days, hours, minutes, seconds, totalMs } = timeUntil(target, now);

  useEffect(() => {
    if (totalMs <= 0 && onDone) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ bắn khi hết giờ
  }, [totalMs <= 0]);

  if (totalMs <= 0) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  if (compact) {
    return (
      <span className="font-data font-semibold tnum">
        {days > 0 ? `${days}d ` : ""}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    );
  }
  const cells = [
    { v: days, l: "NGÀY" },
    { v: hours, l: "GIỜ" },
    { v: minutes, l: "PHÚT" },
    { v: seconds, l: "GIÂY", accent: true },
  ];
  const box =
    size === "lg" ? "w-24 py-4" : "w-[60px] py-2.5";
  const num = size === "lg" ? "text-4xl" : "text-xl";
  return (
    <div className="flex gap-2">
      {cells.map((c) => (
        <div
          key={c.l}
          className={`flex flex-col items-center rounded-xl bg-card2 ${box}`}
        >
          <span
            className={`font-data leading-none font-semibold tnum ${num} ${
              c.accent ? "text-pri" : ""
            }`}
          >
            {pad(c.v)}
          </span>
          <span className="mt-1.5 text-[9px] tracking-[0.14em] text-tx3">
            {c.l}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  striped = false,
  className = "",
}: {
  value: number;
  max: number;
  /** Sọc chéo chạy — dành cho drop đang mở bán. */
  striped?: boolean;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-card2 ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${
          striped ? "stripe-live" : "bg-pri"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
