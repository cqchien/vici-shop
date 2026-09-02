"use client";

import { ShopFooter, ShopHeader } from "@/components/shop/header";
import { MobileTabBar } from "@/components/shop/tabbar";
import { ToastProvider } from "@/components/ui/overlay";
import { currentTenant, useAppState, useHydrated } from "@/lib/mock/store";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const state = useAppState();

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center py-32 font-data text-sm text-tx3">
        VICI — đang tải…
      </div>
    );
  }

  const tenant = currentTenant(state);
  const gated = tenant.status === "suspended" || tenant.status === "archived";

  return (
    <ToastProvider>
      <ShopHeader />
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 sm:px-7">
        {gated ? (
          <div className="mx-auto max-w-md py-24 text-center">
            <p className="font-data text-[26px] text-tx3">( — _ — )</p>
            <h1 className="mt-4 font-display text-xl font-bold">Cửa hàng tạm ngưng</h1>
            <p className="mt-2 text-[13.5px] text-tx2">
              {tenant.displayName} đang tạm dừng hoạt động. Vui lòng quay lại sau.
            </p>
          </div>
        ) : (
          children
        )}
      </main>
      <ShopFooter />
      {/* Chừa chỗ cho bottom tab bar trên mobile */}
      <div className="h-14 md:hidden" />
      <MobileTabBar />
    </ToastProvider>
  );
}
