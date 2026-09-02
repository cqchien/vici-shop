"use client";

import { useState } from "react";
import { formatVnd } from "@/lib/format";

export interface DayPoint {
  date: string; // yyyy-mm-dd
  value: number;
}

/**
 * Biểu đồ cột doanh thu theo ngày (v3): cột line2, cột cuối (hôm nay) màu pri,
 * hover đổi màu + tooltip. Trục ngày mono ở đáy.
 */
export function RevenueChart({
  data,
  height = 140,
}: {
  data: DayPoint[];
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.value));
  const label = (iso: string) => iso.slice(5).split("-").reverse().join(".");

  return (
    <div className="relative">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <button
            key={d.date}
            aria-label={`${label(d.date)}: ${formatVnd(d.value)}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={`flex-1 cursor-default rounded-t-[5px] rounded-b-sm transition-colors ${
              hover === i || i === data.length - 1 ? "bg-pri" : "bg-line2"
            }`}
            style={{ height: `${Math.max(3, Math.round((d.value / max) * 100))}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between font-data text-[9px] text-tx3">
        <span>{label(data[0].date)}</span>
        {data.length > 2 ? (
          <span>{label(data[Math.floor((data.length - 1) / 2)].date)}</span>
        ) : null}
        <span>{label(data[data.length - 1].date)}</span>
      </div>
      {hover !== null ? (
        <div
          className="pointer-events-none absolute -top-2 -translate-y-full rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-bg shadow-lift"
          style={{
            left: `${((hover + 0.5) / data.length) * 100}%`,
            transform: `translate(${hover > data.length * 0.7 ? "-100%" : "-8px"}, -100%)`,
          }}
        >
          <p className="font-semibold">{label(data[hover].date)}</p>
          <p className="font-data tnum">{formatVnd(data[hover].value)}</p>
        </div>
      ) : null}
    </div>
  );
}
