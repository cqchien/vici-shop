"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/basics";
import { ToastProvider } from "@/components/ui/overlay";
import { toggleTheme, useTheme } from "@/lib/theme";
import { useHydrated } from "@/lib/mock/store";

export default function StartLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const theme = useTheme();

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-bg">
        <header className="flex h-16 items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-display text-xl font-bold tracking-[0.04em]">VICI</span>
            <span className="hidden font-data text-[9.5px] tracking-[0.16em] text-tx3 sm:inline">
              PLATFORM — MỞ CỬA HÀNG
            </span>
          </Link>
          <button
            onClick={toggleTheme}
            aria-label="Đổi giao diện sáng/tối"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[9px] border border-line text-tx2 hover:border-line2"
          >
            <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} size={17} />
          </button>
        </header>
        <main className="flex flex-1 flex-col items-center px-4 py-6 sm:py-10">
          {hydrated ? (
            children
          ) : (
            <p className="mt-24 font-data text-sm text-tx3">Đang tải…</p>
          )}
        </main>
      </div>
    </ToastProvider>
  );
}
