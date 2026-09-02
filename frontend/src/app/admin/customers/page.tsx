"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/basics";
import { Table, Td } from "@/components/ui/data";
import { Input, Select } from "@/components/ui/form";
import { formatDate, formatVnd } from "@/lib/format";
import { tierMeta, toneClasses } from "@/lib/labels";
import { useAppState } from "@/lib/mock/store";
import type { Tier } from "@/lib/types";

export default function AdminCustomersPage() {
  const state = useAppState();
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<"" | Tier>("");

  const customers = state.users
    .filter(
      (u) =>
        u.role === "customer" &&
        (!q ||
          u.name.toLowerCase().includes(q.toLowerCase()) ||
          u.email.toLowerCase().includes(q.toLowerCase())) &&
        (!tier || u.tier === tier),
    )
    .sort((a, b) => b.spent12m - a.spent12m);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Tìm tên / email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="!w-64 !py-2.5"
        />
        <Select
          value={tier}
          onChange={(e) => setTier(e.target.value as "" | Tier)}
          className="!w-40 !py-2.5"
        >
          <option value="">Mọi hạng</option>
          {Object.entries(tierMeta).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
        <span className="text-[13px] text-tx3">{customers.length} khách</span>
      </div>

      <Table head={["Khách hàng", "Hạng", "Tổng chi tiêu", "Điểm", "Đơn", "Tham gia"]}>
        {customers.map((u) => {
          const orderCount = state.orders.filter((o) => o.customerId === u.id).length;
          return (
            <tr key={u.id} className="transition-colors hover:bg-card2">
              <Td>
                <Link
                  href={`/admin/customers/${u.id}`}
                  className="font-semibold hover:text-pri"
                >
                  {u.name}
                </Link>
                <p className="text-xs text-tx3">
                  {u.email}
                  {u.locked ? " · đã khoá" : ""}
                </p>
              </Td>
              <Td>
                <Badge className={toneClasses[tierMeta[u.tier].tone]}>
                  {tierMeta[u.tier].label}
                </Badge>
              </Td>
              <Td className="font-data text-[12.5px] tnum">{formatVnd(u.spent12m)}</Td>
              <Td className="font-data text-[12.5px] tnum">
                {u.points.toLocaleString("vi-VN")}
              </Td>
              <Td className="font-data text-[12.5px] tnum">{orderCount}</Td>
              <Td className="text-xs text-tx3">{formatDate(u.createdAt)}</Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
