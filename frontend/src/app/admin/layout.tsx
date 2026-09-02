"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/basics";
import { ToastProvider } from "@/components/ui/overlay";
import { toggleTheme, useTheme } from "@/lib/theme";
import {
  actions,
  currentTenant,
  currentUser,
  resetDemo,
  useAppState,
  useHydrated,
  useNow,
} from "@/lib/mock/store";

// Sidebar nhóm theo section (v3) — thứ tự khớp vòng đời vận hành cửa hàng.
const NAV: { header: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    header: "TỔNG QUAN",
    items: [{ href: "/admin", label: "Dashboard", icon: "dashboard" }],
  },
  {
    header: "SẢN PHẨM",
    items: [
      { href: "/admin/products", label: "Sản phẩm", icon: "category" },
      { href: "/admin/series", label: "Series và lineup", icon: "grid_view" },
      { href: "/admin/inventory", label: "Tồn kho", icon: "inventory_2" },
      { href: "/admin/inventory/receipts", label: "Phiếu nhập", icon: "receipt_long" },
    ],
  },
  {
    header: "VẬN HÀNH",
    items: [
      { href: "/admin/orders", label: "Đơn hàng", icon: "shopping_bag" },
      { href: "/admin/shipping", label: "Giao vận", icon: "local_shipping" },
    ],
  },
  {
    header: "TĂNG TRƯỞNG",
    items: [
      { href: "/admin/campaigns", label: "Chiến dịch", icon: "campaign" },
      { href: "/admin/customers", label: "Khách hàng", icon: "group" },
      { href: "/admin/reports", label: "Báo cáo", icon: "monitoring" },
    ],
  },
  {
    header: "TÀI CHÍNH",
    items: [{ href: "/admin/accounting", label: "Sổ sách", icon: "payments" }],
  },
  {
    header: "HỆ THỐNG",
    items: [{ href: "/admin/settings", label: "Cài đặt", icon: "settings" }],
  },
];

const TITLES: [string, string][] = [
  ["/admin/products", "Sản phẩm"],
  ["/admin/series", "Series và lineup"],
  ["/admin/inventory/receipts", "Phiếu nhập"],
  ["/admin/inventory", "Tồn kho"],
  ["/admin/orders", "Đơn hàng"],
  ["/admin/shipping", "Giao vận"],
  ["/admin/campaigns", "Chiến dịch"],
  ["/admin/customers", "Khách hàng"],
  ["/admin/reports", "Báo cáo"],
  ["/admin/accounting", "Sổ sách"],
  ["/admin/settings", "Cài đặt"],
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/inventory")
    return pathname.startsWith(href) && !pathname.startsWith("/admin/inventory/receipts");
  return pathname.startsWith(href);
}

// Bottom tab bar mobile (v3 re-base): 3 màn chính + sheet "Thêm" cho phần còn lại.
const MOBILE_TABS = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/orders", label: "Đơn hàng", icon: "shopping_bag" },
  { href: "/admin/products", label: "Sản phẩm", icon: "category" },
];
const SHEET_ITEMS = NAV.flatMap((g) => g.items).filter(
  (n) => !MOBILE_TABS.some((t) => t.href === n.href),
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const state = useAppState();
  const user = currentUser(state);
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const now = useNow();
  const [sheetOpen, setSheetOpen] = useState(false);
  const impersonating = Boolean(state.impersonatingTenantId);
  const authorized =
    user &&
    (user.role === "admin" ||
      user.role === "staff" ||
      (user.role === "platform_admin" && impersonating));
  const tenant = currentTenant(state);

  useEffect(() => {
    if (hydrated && !authorized) router.replace("/login?next=/admin");
  }, [hydrated, authorized, router]);

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center py-32 font-data text-sm text-tx3">
        VICI OPS — đang tải…
      </div>
    );
  }
  if (!authorized) return null;

  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? "Dashboard";
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const today = new Date(now).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <ToastProvider>
      <div className="grid min-h-screen lg:grid-cols-[236px_1fr]">
        {/* Sidebar */}
        <aside className="hidden border-r border-line px-3.5 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
          <Link href="/admin" className="flex items-baseline gap-1.5 px-2.5 pb-4">
            <span className="font-display text-[17px] font-bold tracking-[0.03em]">
              VICI
            </span>
            <span className="font-data text-[9px] tracking-[0.14em] text-tx3">OPS</span>
          </Link>
          <nav className="flex-1">
            {NAV.map((group) => (
              <div key={group.header}>
                <p className="px-3 pt-4 pb-1.5 font-data text-[9.5px] font-semibold tracking-[0.12em] text-tx3">
                  {group.header}
                </p>
                {group.items.map((n) => {
                  const active = isActive(pathname, n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
                        active ? "bg-pri-soft text-pri" : "text-tx2 hover:bg-card2"
                      }`}
                    >
                      <Icon name={n.icon} size={18} />
                      {n.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="mt-4 space-y-2 border-t border-line pt-3.5">
            <Link
              href="/"
              className="block rounded-lg border border-line px-3 py-2 text-center text-[12.5px] font-semibold text-tx2 hover:border-line2 hover:text-tx"
            >
              ← Về cửa hàng
            </Link>
            <div className="flex justify-between px-1 text-[11.5px] text-tx3">
              <button
                className="cursor-pointer hover:text-tx"
                onClick={() => {
                  if (confirm("Reset toàn bộ dữ liệu demo về ban đầu?")) resetDemo();
                }}
              >
                ↺ Reset demo
              </button>
              <button
                className="cursor-pointer hover:text-tx"
                onClick={() => actions.logout()}
              >
                Thoát
              </button>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0">
          <header className="sticky top-0 z-10 flex h-[60px] items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-[17px] font-bold">{title}</h1>
              <span className="hidden items-center gap-1.5 rounded-full bg-card2 px-2.5 py-1 font-data text-[10px] font-semibold tracking-[0.06em] text-tx3 uppercase sm:inline-flex">
                <span>{tenant.branding.logoEmoji}</span>
                {tenant.displayName}
              </span>
            </div>
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
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pri-soft text-[12.5px] font-bold text-pri">
                {initials}
              </span>
            </div>
          </header>

          {impersonating ? (
            <div className="flex items-center justify-between gap-3 border-b border-viol/30 bg-viol-soft px-4 py-2 text-[12.5px] font-semibold text-viol sm:px-6">
              <span>
                <Icon name="visibility" size={14} className="mr-1.5 align-middle" />
                Đang xem trang quản trị với tư cách <b>{tenant.displayName}</b> (impersonate)
              </span>
              <button
                onClick={() => {
                  actions.stopImpersonating();
                  router.push("/platform/tenants");
                }}
                className="cursor-pointer whitespace-nowrap rounded-lg border border-viol/40 px-2.5 py-1 hover:bg-viol/10"
              >
                Thoát
              </button>
            </div>
          ) : null}

          <main className="p-4 pb-24 sm:p-6 lg:pb-6">{children}</main>
        </div>

        {/* Sheet "Thêm mục quản lý" — mobile */}
        {sheetOpen ? (
          <>
            <div
              className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
              onClick={() => setSheetOpen(false)}
            />
            <div className="fixed inset-x-0 bottom-0 z-[61] animate-sheet-up rounded-t-[18px] bg-card px-4 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))] lg:hidden">
              <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line2" />
              <p className="mb-3 text-sm font-bold">Thêm mục quản lý</p>
              <div className="grid grid-cols-2 gap-2">
                {SHEET_ITEMS.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setSheetOpen(false)}
                    className={`flex items-center gap-2 rounded-[11px] border px-3.5 py-3 text-[12.5px] font-semibold ${
                      isActive(pathname, n.href)
                        ? "border-pri bg-pri-soft text-pri"
                        : "border-line text-tx"
                    }`}
                  >
                    <Icon name={n.icon} size={19} className="text-tx2" />
                    {n.label}
                  </Link>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-line pt-3 text-[12.5px] font-semibold text-tx2">
                <Link href="/" className="hover:text-tx">
                  ← Về cửa hàng
                </Link>
                <button
                  className="cursor-pointer hover:text-tx"
                  onClick={() => actions.logout()}
                >
                  Thoát
                </button>
              </div>
            </div>
          </>
        ) : null}

        {/* Bottom tab bar — mobile */}
        <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
          {MOBILE_TABS.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 ${
                  active ? "text-pri" : "text-tx3"
                }`}
              >
                <Icon name={t.icon} size={22} fill={active} />
                <span className={`text-[10px] ${active ? "font-bold" : "font-semibold"}`}>
                  {t.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setSheetOpen((v) => !v)}
            className={`flex cursor-pointer flex-col items-center gap-0.5 pt-2 pb-1.5 ${
              SHEET_ITEMS.some((n) => isActive(pathname, n.href)) ? "text-pri" : "text-tx3"
            }`}
          >
            <Icon name="apps" size={22} />
            <span className="text-[10px] font-semibold">Thêm</span>
          </button>
        </nav>
      </div>
    </ToastProvider>
  );
}
