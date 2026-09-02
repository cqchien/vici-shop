"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentUser, useAppState } from "@/lib/mock/store";
import { Icon } from "@/components/ui/basics";

// Bottom tab bar mobile (v3 re-base): Trang chủ / Cửa hàng / Drops / Giỏ / Tài khoản.
// Tab active = icon fill + màu pri; Drops có chấm live, Giỏ có badge số lượng.
export function MobileTabBar() {
  const state = useAppState();
  const user = currentUser(state);
  const pathname = usePathname();
  const cartCount = state.cart.reduce((s, c) => s + c.qty, 0);

  const tabs = [
    { href: "/", label: "Trang chủ", icon: "home" },
    { href: "/products", label: "Cửa hàng", icon: "storefront" },
    { href: "/drops", label: "Drops", icon: "bolt", live: true },
    { href: "/cart", label: "Giỏ", icon: "shopping_bag", badge: cartCount },
    { href: user ? "/account" : "/login", label: "Tài khoản", icon: "person" },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      {tabs.map((t) => {
        const active = isActive(t.href);
        return (
          <Link
            key={t.label}
            href={t.href}
            className={`relative flex flex-col items-center gap-0.5 pt-2 pb-1.5 ${
              active ? "text-pri" : "text-tx3"
            }`}
          >
            <Icon name={t.icon} size={22} fill={active} />
            <span className={`text-[10px] ${active ? "font-bold" : "font-semibold"}`}>
              {t.label}
            </span>
            {t.live ? (
              <span className="absolute top-1.5 right-[calc(50%-16px)] h-1.5 w-1.5 animate-pulse-dot rounded-full bg-pri" />
            ) : null}
            {t.badge ? (
              <span className="absolute top-1 right-[calc(50%-20px)] flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-pri px-[3px] font-data text-[9px] font-bold text-white">
                {t.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
