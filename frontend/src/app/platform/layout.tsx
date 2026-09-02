"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@/components/ui/basics";
import { ToastProvider } from "@/components/ui/overlay";
import { toggleTheme, useTheme } from "@/lib/theme";
import { currentUser, useAppState, useHydrated, useNow } from "@/lib/mock/store";

// Platform Console — cấp nền tảng (ADR-007). Cùng ngôn ngữ hình khối với AdminShell,
// accent = viol để phân biệt rõ với /admin của tenant.
const NAV = [
  { href: "/platform", label: "Tổng quan", icon: "monitoring" },
  { href: "/platform/tenants", label: "Cửa hàng", icon: "storefront" },
  { href: "/platform/plans", label: "Gói dịch vụ", icon: "sell" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/platform") return pathname === "/platform";
  return pathname.startsWith(href);
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const state = useAppState();
  const user = currentUser(state);
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const now = useNow();
  const authorized = user?.role === "platform_admin";

  useEffect(() => {
    if (hydrated && !authorized) router.replace("/login?next=/platform");
  }, [hydrated, authorized, router]);

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center py-32 font-data text-sm text-tx3">
        VICI PLATFORM — đang tải…
      </div>
    );
  }
  if (!authorized || !user) return null;

  const title =
    NAV.slice().reverse().find((n) => isActive(pathname, n.href))?.label ?? "Tổng quan";
  const today = new Date(now).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <ToastProvider>
      <div className="grid min-h-screen lg:grid-cols-[236px_1fr]">
        <aside className="hidden border-r border-line px-3.5 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
          <Link href="/platform" className="flex items-baseline gap-1.5 px-2.5 pb-4">
            <span className="font-display text-[17px] font-bold tracking-[0.03em]">VICI</span>
            <span className="font-data text-[9px] tracking-[0.14em] text-viol">PLATFORM</span>
          </Link>
          <nav className="flex-1">
            {NAV.map((n) => {
              const active = isActive(pathname, n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
                    active ? "bg-viol-soft text-viol" : "text-tx2 hover:bg-card2"
                  }`}
                >
                  <Icon name={n.icon} size={18} />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-line pt-3.5">
            <Link
              href="/"
              className="block rounded-lg border border-line px-3 py-2 text-center text-[12.5px] font-semibold text-tx2 hover:border-line2 hover:text-tx"
            >
              ← Storefront demo
            </Link>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur-md sm:px-6">
            <h1 className="font-display text-[17px] font-bold">{title}</h1>
            <div className="flex items-center gap-3.5">
              <span className="hidden font-data text-[11.5px] text-tx3 capitalize sm:inline">
                {today}
              </span>
              <button
                onClick={toggleTheme}
                aria-label="Đổi giao diện sáng/tối"
                className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-lg border border-line text-tx2 hover:border-line2"
              >
                <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} size={16} />
              </button>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-viol-soft text-[12.5px] font-bold text-viol">
                {user.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          </header>

          <nav className="flex gap-1 overflow-x-auto border-b border-line px-4 py-2 lg:hidden">
            {NAV.map((n) => {
              const active = isActive(pathname, n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold ${
                    active ? "bg-viol-soft text-viol" : "text-tx2"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <main className="p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
