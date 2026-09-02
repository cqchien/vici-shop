"use client";

import type { ReactNode } from "react";

/** Bảng chuẩn admin: header mono UPPERCASE, row hover card2, cuộn ngang trên màn hẹp. */
export function Table({
  head,
  children,
}: {
  head: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card">
      <table className="w-full min-w-max text-[13px]">
        <thead className="text-left font-data text-[9.5px] font-semibold tracking-[0.08em] text-tx3 uppercase">
          <tr className="border-b border-line">
            {head.map((h) => (
              <th key={h} className="px-5 py-2.5 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  className = "",
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return <td className={`px-5 py-3 align-middle ${className}`}>{children}</td>;
}

/** Segmented control — nền card2, tab active nổi lên nền card. */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-[10px] bg-card2 p-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`cursor-pointer rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors ${
            active === t.key
              ? "bg-card text-tx shadow-soft"
              : "text-tx3 hover:text-tx2"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Chip lọc dạng pill — active = nền ink chữ bg (theo v3 listing/admin orders). */
export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
        active
          ? "border-ink bg-ink text-bg"
          : "border-line bg-card text-tx2 hover:border-tx3"
      }`}
    >
      {label}
    </button>
  );
}
