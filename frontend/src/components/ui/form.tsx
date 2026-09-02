"use client";

import type { ReactNode } from "react";

const fieldClass =
  "w-full rounded-[10px] border border-line bg-card px-3.5 py-3 text-[13.5px] text-tx outline-none transition-colors focus:border-pri";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${fieldClass} ${className}`} {...rest} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return <select className={`${fieldClass} ${className}`} {...rest} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea className={`${fieldClass} resize-y ${className}`} {...rest} />
  );
}

export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-tx">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-drop">{error}</span>
      ) : null}
    </label>
  );
}

/** Switch 38×22 — bật = mint (theo v3: toggle waitlist, early access, lọc còn hàng). */
export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex cursor-pointer items-center gap-2.5"
    >
      <span
        className={`relative h-[22px] w-[38px] rounded-full transition-colors ${
          on ? "bg-mint" : "bg-line2"
        }`}
      >
        <span
          className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
            on ? "left-[19px]" : "left-[3px]"
          }`}
        />
      </span>
      {label ? (
        <span className="text-[12.5px] font-medium text-tx2">{label}</span>
      ) : null}
    </button>
  );
}

/** Bộ đếm − n + với số mono (chọn số lượng, điều chỉnh kho/điểm). */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  format,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-[10px] border border-line bg-card">
      <button
        type="button"
        aria-label="Giảm"
        onClick={() => onChange(Math.max(min, value - step))}
        className="h-10 w-9 cursor-pointer text-base text-tx hover:bg-card2"
      >
        −
      </button>
      <span className="min-w-10 px-1 text-center font-data text-sm font-semibold tnum">
        {format ? format(value) : value}
      </span>
      <button
        type="button"
        aria-label="Tăng"
        onClick={() => onChange(Math.min(max, value + step))}
        className="h-10 w-9 cursor-pointer text-base text-tx hover:bg-card2"
      >
        +
      </button>
    </div>
  );
}
