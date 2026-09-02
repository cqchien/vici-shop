"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { actions, currentTenant, currentUser, useAppState } from "@/lib/mock/store";
import { tierMeta } from "@/lib/labels";
import { toggleTheme, useTheme } from "@/lib/theme";
import { Icon } from "@/components/ui/basics";

export function ShopHeader() {
  const state = useAppState();
  const user = currentUser(state);
  const tenant = currentTenant(state);
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const [q, setQ] = useState("");
  const cartCount = state.cart.reduce((s, c) => s + c.qty, 0);
  const featuredSeries = state.series[0];

  const nav = [
    { href: "/products", label: "Cửa hàng", live: false },
    {
      href: featuredSeries ? `/series/${featuredSeries.slug}` : "/products",
      label: "Series",
      live: false,
    },
    { href: "/drops", label: "Drops", live: true },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-5 px-4 sm:px-7">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg">{tenant.branding.logoEmoji}</span>
          <span className="font-display text-xl font-bold tracking-[0.02em]">
            {tenant.displayName}
          </span>
          <span className="hidden font-data text-[9.5px] tracking-[0.16em] text-tx3 md:inline">
            {tenant.subdomain}.vici.shop
          </span>
        </Link>

        <form
          className="hidden max-w-xs flex-1 md:block"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/products?q=${encodeURIComponent(q)}`);
          }}
        >
          <div className="flex items-center gap-2 rounded-[9px] border border-line bg-card px-3 py-2">
            <Icon name="search" size={17} className="text-tx3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm sản phẩm, series, thương hiệu…"
              className="w-full bg-transparent text-[13px] outline-none focus:shadow-none"
              style={{ boxShadow: "none" }}
            />
          </div>
        </form>

        <nav className="ml-auto hidden gap-5 text-[13.5px] font-semibold sm:flex">
          {nav.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className={`flex items-center gap-1.5 transition-colors hover:text-pri ${
                pathname.startsWith(n.href.split("?")[0]) && n.href !== "/"
                  ? "text-tx"
                  : "text-tx2"
              }`}
            >
              {n.label}
              {n.live ? (
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-pri" />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <button
            onClick={toggleTheme}
            aria-label="Đổi giao diện sáng/tối"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[9px] border border-line text-tx2 hover:border-line2 hover:text-tx"
          >
            <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} size={17} />
          </button>

          {user ? (
            <Link
              href="/account"
              className={`flex items-center gap-1.5 rounded-[9px] px-3 py-2 ${
                user.tier === "gold"
                  ? "bg-gold-soft"
                  : user.tier === "collector"
                    ? "bg-viol-soft"
                    : "border border-line hover:border-line2"
              }`}
            >
              <span
                className={`h-[7px] w-[7px] rounded-full ${
                  user.tier === "gold"
                    ? "bg-gold"
                    : user.tier === "collector"
                      ? "bg-viol"
                      : "bg-tx3"
                }`}
              />
              <span
                className={`font-data text-[10.5px] font-semibold tracking-[0.08em] uppercase ${
                  user.tier === "gold"
                    ? "text-gold"
                    : user.tier === "collector"
                      ? "text-viol"
                      : "text-tx2"
                }`}
              >
                {tierMeta[user.tier].label}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              aria-label="Đăng nhập"
              className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-line text-tx2 hover:border-line2 hover:text-tx"
            >
              <Icon name="person" size={18} />
            </Link>
          )}

          <Link
            href="/cart"
            className="relative rounded-[9px] bg-ink px-4 py-2 text-[13px] font-semibold text-bg hover:opacity-85"
          >
            <span className="hidden sm:inline">Giỏ hàng</span>
            <Icon name="shopping_bag" size={17} className="sm:hidden" />
            {cartCount > 0 ? (
              <span
                key={cartCount}
                className="absolute -top-1.5 -right-1.5 flex h-[19px] min-w-[19px] animate-badge-pop items-center justify-center rounded-full bg-pri px-1 font-data text-[10.5px] font-semibold text-white"
              >
                {cartCount}
              </span>
            ) : null}
          </Link>

          {user && (user.role === "admin" || user.role === "staff") ? (
            <Link
              href="/admin"
              className="hidden rounded-[9px] border border-line px-3 py-2 text-[12.5px] font-semibold text-tx2 hover:border-line2 hover:text-tx lg:block"
            >
              Admin
            </Link>
          ) : null}
          {user ? (
            <button
              onClick={() => actions.logout()}
              className="hidden cursor-pointer px-1 text-xs text-tx3 hover:text-tx lg:block"
            >
              Thoát
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function ShopFooter() {
  return (
    <footer className="mt-auto border-t border-line px-7 py-8">
      <div className="mx-auto grid max-w-[1240px] items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[15px] font-bold tracking-[0.04em]">
            VICI
          </span>
          <span className="font-data text-[9.5px] text-tx3">
            © 2026 — 42 Lý Tự Trọng, Q.1, TP.HCM
          </span>
        </div>
        <div className="flex justify-self-start gap-4 font-data text-xs text-tx3 sm:justify-self-center">
          <Link href="/admin" className="hover:text-pri">
            → Admin
          </Link>
          <Link href="/start" className="hover:text-pri">
            → Mở cửa hàng
          </Link>
          <Link href="/platform" className="hover:text-pri">
            → Platform
          </Link>
        </div>
        <div className="flex gap-4 text-xs text-tx3 sm:justify-self-end">
          <a href="#" className="hover:text-pri">
            Instagram
          </a>
          <a href="#" className="hover:text-pri">
            TikTok
          </a>
          <a href="#" className="hover:text-pri">
            Chính sách pre-order
          </a>
        </div>
      </div>
      <p className="mx-auto mt-3 max-w-[1240px] text-[11px] text-tx3">
        Bản mock-first — dữ liệu giả lưu trên trình duyệt (ADR-006). Kiểm seal
        on-cam · Giao HCM trong 2h · Đổi lỗi 1-1.
      </p>
    </footer>
  );
}
