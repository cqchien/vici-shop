"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui/basics";
import { Toggle } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { formatDateTime } from "@/lib/format";
import { actions, currentUser, useAppState } from "@/lib/mock/store";

export default function WaitlistPage() {
  const state = useAppState();
  const user = currentUser(state)!;
  const toast = useToast();
  const entries = state.waitlist.filter((w) => w.customerId === user.id);

  if (entries.length === 0) {
    return (
      <EmptyState
        title="Chưa đăng ký nhận tin nào"
        hint='Bấm "Báo khi có hàng" ở sản phẩm hết hàng hoặc "Nhắc tôi" ở drop sắp mở.'
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {entries.map((w) => {
        const product =
          w.targetType === "product"
            ? state.products.find((p) => p.id === w.targetId)
            : undefined;
        const drop =
          w.targetType === "drop"
            ? state.drops.find((d) => d.id === w.targetId)
            : undefined;
        const title = product?.name ?? drop?.name ?? "—";
        const href = product ? `/products/${product.slug}` : "/drops";
        return (
          <div
            key={w.id}
            className="flex items-center gap-4 rounded-xl border border-line bg-card px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={href}
                className="line-clamp-1 text-[13.5px] font-semibold hover:text-pri"
              >
                {title}
              </Link>
              <p className="mt-0.5 text-xs text-tx3">
                Đăng ký {formatDateTime(w.createdAt)}
                {w.notifiedAt
                  ? ` · đã báo có hàng ${formatDateTime(w.notifiedAt)}`
                  : " · sẽ báo qua Zalo và email"}
              </p>
            </div>
            <Toggle
              on
              onChange={() => {
                actions.leaveWaitlist(w.id);
                toast("Đã tắt thông báo");
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
