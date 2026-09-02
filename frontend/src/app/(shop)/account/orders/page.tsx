"use client";

import Link from "next/link";
import { EmptyState, LinkButton } from "@/components/ui/basics";
import { OrderStatusBadge } from "@/components/ui/commerce";
import { formatDateTime, formatVnd } from "@/lib/format";
import { currentUser, useAppState } from "@/lib/mock/store";

export default function MyOrdersPage() {
  const state = useAppState();
  const user = currentUser(state)!;
  const orders = state.orders
    .filter((o) => o.customerId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (orders.length === 0) {
    return (
      <EmptyState
        title="Chưa có đơn hàng nào"
        hint="Secret không tự về — bắt đầu từ series mới nhất."
        action={<LinkButton href="/products">Khám phá cửa hàng</LinkButton>}
      />
    );
  }

  return (
    <div className="space-y-2.5">
      {orders.map((o) => {
        const summary =
          o.lines.length === 1
            ? `${o.lines[0].name} ×${o.lines[0].qty}`
            : `${o.lines[0].name} +${o.lines.length - 1} sản phẩm khác`;
        return (
          <Link
            key={o.id}
            href={`/account/orders/${o.id}`}
            className="flex items-center gap-4 rounded-xl border border-line bg-card px-5 py-4 transition-all hover:border-line2 hover:shadow-soft"
          >
            <span className="w-[110px] shrink-0 font-data text-[11.5px] text-tx3">
              {o.code}
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[13.5px] font-semibold">
                {summary}
                {o.kind === "preorder" ? (
                  <span className="ml-1.5 text-xs font-normal text-sky">
                    · Pre-order
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-tx3">{formatDateTime(o.createdAt)}</p>
            </div>
            <span className="hidden font-data text-[12.5px] tnum sm:block">
              {o.kind === "preorder"
                ? `${formatVnd(o.depositVnd ?? 0)} cọc`
                : formatVnd(o.totalVnd)}
            </span>
            <OrderStatusBadge status={o.status} />
          </Link>
        );
      })}
    </div>
  );
}
