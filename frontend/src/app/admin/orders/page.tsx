"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/basics";
import { OrderStatusBadge } from "@/components/ui/commerce";
import { Chip, Table, Td } from "@/components/ui/data";
import { formatDateTime, formatVnd } from "@/lib/format";
import { toneClasses } from "@/lib/labels";
import { useAppState } from "@/lib/mock/store";
import type { Order, OrderStatus } from "@/lib/types";

// Chip lọc nhanh theo các trạng thái vận hành hay dùng (v3)
const FILTER_CHIPS: { label: string; statuses: OrderStatus[] | null }[] = [
  { label: "Tất cả", statuses: null },
  { label: "Chờ xác nhận", statuses: ["pending_payment", "confirmed"] },
  { label: "Đang đóng gói", statuses: ["packing"] },
  { label: "Đang giao", statuses: ["shipped", "delivered"] },
  { label: "Chờ hàng về", statuses: ["deposit_paid", "awaiting_stock", "balance_due"] },
  { label: "Hoàn tất", statuses: ["completed"] },
  { label: "Huỷ / đổi trả", statuses: ["cancelled", "return_requested", "returned"] },
];

function typePill(o: Order) {
  if (o.dropId) return <Badge className={toneClasses.danger}>Drop</Badge>;
  if (o.kind === "preorder") return <Badge className={toneClasses.info}>Pre-order</Badge>;
  return <Badge className={toneClasses.neutral}>Thường</Badge>;
}

export default function AdminOrdersPage() {
  const state = useAppState();
  const [filter, setFilter] = useState(0);

  const chip = FILTER_CHIPS[filter];
  const orders = state.orders
    .filter((o) => !chip.statuses || chip.statuses.includes(o.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map((c, i) => (
          <Chip
            key={c.label}
            label={c.label}
            active={filter === i}
            onClick={() => setFilter(i)}
          />
        ))}
        <span className="self-center text-[13px] text-tx3">{orders.length} đơn</span>
      </div>

      <Table head={["Mã đơn", "Khách / sản phẩm", "Giá trị", "Loại", "Trạng thái"]}>
        {orders.map((o) => {
          const customer = state.users.find((u) => u.id === o.customerId);
          return (
            <tr key={o.id} className="transition-colors hover:bg-card2">
              <Td>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="font-data text-[11.5px] font-semibold hover:text-pri"
                >
                  {o.code}
                </Link>
                <p className="font-data text-[10px] text-tx3">
                  {formatDateTime(o.createdAt)}
                </p>
              </Td>
              <Td className="max-w-72">
                <p className="line-clamp-1 text-[12.5px]">
                  <b>{customer?.name}</b>
                  <span className="text-tx2">
                    {" "}
                    · {o.lines[0]?.name}
                    {o.lines.length > 1 ? ` +${o.lines.length - 1}` : ""}
                  </span>
                </p>
              </Td>
              <Td className="font-data text-[11.5px] font-bold tnum">
                {o.kind === "preorder"
                  ? `${formatVnd(o.depositVnd ?? 0)} cọc`
                  : formatVnd(o.totalVnd)}
              </Td>
              <Td>{typePill(o)}</Td>
              <Td>
                <OrderStatusBadge status={o.status} />
              </Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
