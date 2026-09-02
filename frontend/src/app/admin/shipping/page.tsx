"use client";

import Link from "next/link";
import { StatTile } from "@/components/ui/basics";
import { useAppState } from "@/lib/mock/store";
import type { Shipment } from "@/lib/types";

// Kanban 4 cột theo v3 — nhóm trạng thái vận đơn theo bước vận hành.
const COLUMNS: {
  title: string;
  warn?: boolean;
  statuses: Shipment["status"][];
}[] = [
  { title: "Chờ lấy hàng", statuses: ["pending", "picked_up"] },
  { title: "Đang giao", statuses: ["in_transit", "out_for_delivery"] },
  { title: "Giao lỗi", warn: true, statuses: ["failed", "returned"] },
  { title: "Đã giao (7 ngày)", statuses: ["delivered"] },
];

export default function AdminShippingPage() {
  const state = useAppState();

  const inTransit = state.shipments.filter((s) =>
    ["pending", "picked_up", "in_transit", "out_for_delivery"].includes(s.status),
  ).length;
  const failed = state.shipments.filter((s) =>
    ["failed", "returned"].includes(s.status),
  ).length;
  const codPending = state.orders.filter((o) =>
    o.transactions.some((t) => t.method === "cod" && t.status === "pending"),
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3.5 sm:grid-cols-3">
        <StatTile label="Đang trên đường" value={String(inTransit)} />
        <StatTile
          label="Giao lỗi / hoàn về"
          value={String(failed)}
          tone={failed > 0 ? "danger" : "positive"}
        />
        <StatTile label="COD chờ thu" value={String(codPending)} />
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const cards = state.shipments
            .filter((s) => col.statuses.includes(s.status))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
          return (
            <div key={col.title}>
              <div className="mb-2.5 flex items-baseline justify-between">
                <span
                  className={`text-[13px] font-bold ${col.warn ? "text-drop" : ""}`}
                >
                  {col.title}
                </span>
                <span className="font-data text-[11.5px] text-tx3">
                  {cards.length}
                </span>
              </div>
              <div className="space-y-2">
                {cards.length === 0 ? (
                  <p className="rounded-[10px] border border-dashed border-line2 px-3.5 py-4 text-center text-xs text-tx3">
                    Trống
                  </p>
                ) : (
                  cards.map((s) => {
                    const order = state.orders.find((o) => o.id === s.orderId);
                    const customer = order
                      ? state.users.find((u) => u.id === order.customerId)
                      : undefined;
                    return (
                      <Link
                        key={s.id}
                        href={order ? `/admin/orders/${order.id}` : "/admin/orders"}
                        className="block rounded-[10px] border border-line bg-card px-3.5 py-3 transition-colors hover:border-line2 hover:shadow-soft"
                      >
                        <p className="font-data text-[11.5px] font-bold">
                          {order?.code ?? s.orderId}
                        </p>
                        <p className="my-1 text-xs text-tx2">
                          {customer?.name ?? "—"}
                        </p>
                        <p className="font-data text-[10.5px] text-tx3">
                          {s.carrier.toUpperCase()} · {s.trackingCode}
                        </p>
                        {s.status === "failed" || s.status === "returned" ? (
                          <p className="mt-2 rounded-md bg-drop-soft px-2.5 py-1.5 text-[11px] font-semibold text-drop">
                            {s.status === "returned"
                              ? "Hoàn về shop — kiểm tra hàng khi nhận"
                              : `Phát thất bại ×${s.attempts} — gọi lại khách`}
                          </p>
                        ) : null}
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-tx3">
        Vận đơn được tạo tự động khi chuyển đơn sang &quot;Đang giao&quot; (mock
        GHN/GHTK — FR-SHIP-02). Webhook tracking sẽ cập nhật trạng thái khi có backend
        thật.
      </p>
    </div>
  );
}
