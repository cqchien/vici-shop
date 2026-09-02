"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "dark" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-pri text-white shadow-soft hover:-translate-y-0.5 hover:shadow-lift disabled:bg-line disabled:text-tx3 disabled:shadow-none disabled:hover:translate-y-0",
  dark: "bg-ink text-bg hover:opacity-85 disabled:bg-line disabled:text-tx3",
  secondary:
    "border border-line2 text-tx2 hover:border-tx3 hover:text-tx disabled:text-tx3",
  ghost: "text-tx2 hover:bg-card2 hover:text-tx",
  danger: "bg-drop text-white hover:opacity-85 disabled:bg-line disabled:text-tx3",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-xs rounded-lg",
  md: "px-5 py-2.5 text-[13.5px] rounded-[10px]",
  lg: "px-6 py-3.5 text-sm rounded-[10px]",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 font-semibold active:scale-95 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-1.5 font-semibold transition-all active:scale-95 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Card({
  className = "",
  hover = false,
  children,
}: {
  className?: string;
  hover?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-card ${
        hover
          ? "shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Pill mono UPPERCASE — nhận diện đặc trưng của Vici cho tag/trạng thái. */
export function Badge({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-data text-[9.5px] font-semibold tracking-[0.08em] uppercase ${className}`}
    >
      {children}
    </span>
  );
}

/** Icon Material Symbols Rounded — thay cho emoji trong UI (DESIGN.md §2). */
export function Icon({
  name,
  size = 18,
  fill = false,
  className = "",
}: {
  name: string;
  size?: number;
  fill?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`msr ${fill ? "msr-fill" : ""} ${className}`}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  );
}

/**
 * "Ảnh" sản phẩm mock — nền sọc chéo + emoji/nhãn giữa, tag pill góc trên trái.
 * Khi có API thật, component này được thay bằng <Image /> mà không đổi layout.
 */
export function PlaceholderArt({
  emoji,
  label,
  tag,
  ratioClass = "aspect-square",
  className = "",
  viol = false,
}: {
  emoji?: string;
  label?: string;
  tag?: ReactNode;
  ratioClass?: string;
  className?: string;
  viol?: boolean;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${
        viol ? "stripe-art-viol" : "stripe-art"
      } ${ratioClass} ${className}`}
    >
      {emoji ? <span className="text-4xl">{emoji}</span> : null}
      {label ? (
        <span className="absolute rounded-md border border-line bg-card px-2 py-1 text-[10px] text-tx3">
          {label}
        </span>
      ) : null}
      {tag ? <span className="absolute top-2.5 left-2.5">{tag}</span> : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "danger";
}) {
  const hintClass =
    tone === "positive" ? "text-mint" : tone === "danger" ? "text-drop" : "text-tx3";
  return (
    <Card className="px-5 py-4">
      <p className="text-[11.5px] text-tx3">{label}</p>
      <p className="mt-2 font-data text-[23px] leading-none font-semibold tnum">
        {value}
      </p>
      {hint ? <p className={`mt-2 text-[11px] ${hintClass}`}>{hint}</p> : null}
    </Card>
  );
}

export function EmptyState({
  face = "( · _ · )",
  title,
  hint,
  action,
}: {
  face?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line2 px-10 py-16 text-center">
      <span className="mb-2 font-data text-[26px] text-tx3">{face}</span>
      <p className="font-display text-lg font-bold">{title}</p>
      {hint ? <p className="max-w-sm text-[13.5px] text-tx2">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="text-[22px] font-bold tracking-[-0.01em]">{title}</h2>
      {action}
    </div>
  );
}
