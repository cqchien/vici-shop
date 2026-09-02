"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Icon } from "@/components/ui/basics";
import { currentUser, useAppState } from "@/lib/mock/store";

const tabs = [
  { href: "/account", label: "Hồ sơ và địa chỉ", icon: "person" },
  { href: "/account/orders", label: "Đơn hàng", icon: "shopping_bag" },
  { href: "/account/loyalty", label: "Hạng và điểm", icon: "star" },
  { href: "/account/waitlist", label: "Waitlist", icon: "notifications" },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const state = useAppState();
  const user = currentUser(state);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace("/login?next=/account");
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl py-6 pb-12">
      <h1 className="mb-6 text-[26px] font-bold tracking-[-0.015em]">Tài khoản</h1>
      <div className="grid items-start gap-7 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto rounded-xl border border-line bg-card p-2.5 lg:sticky lg:top-[86px] lg:flex-col lg:gap-0.5">
          {tabs.map((t) => {
            const active =
              t.href === "/account"
                ? pathname === "/account"
                : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex shrink-0 items-center gap-2.5 rounded-[9px] px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors ${
                  active ? "bg-pri-soft text-pri" : "text-tx2 hover:bg-card2"
                }`}
              >
                <Icon name={t.icon} size={18} />
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
