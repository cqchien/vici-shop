"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Card } from "@/components/ui/basics";
import { Chip, Table, Td } from "@/components/ui/data";
import { Input } from "@/components/ui/form";
import { formatDate, formatVnd } from "@/lib/format";
import { accentPair, tenantStatusMeta, toneClasses } from "@/lib/labels";
import { planFor, useAppState } from "@/lib/mock/store";
import type { TenantStatus } from "@/lib/types";

const FILTERS: { key: TenantStatus | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Hoạt động" },
  { key: "provisioning", label: "Đang khởi tạo" },
  { key: "past_due", label: "Quá hạn" },
  { key: "suspended", label: "Tạm ngưng" },
  { key: "archived", label: "Lưu trữ" },
];

export default function PlatformTenantsPage() {
  const state = useAppState();
  const [filter, setFilter] = useState<TenantStatus | "all">("all");
  const [q, setQ] = useState("");

  const rows = state.tenants.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    const s = q.trim().toLowerCase();
    return !s || t.displayName.toLowerCase().includes(s) || t.subdomain.includes(s);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            active={filter === f.key}
            onClick={() => setFilter(f.key)}
          />
        ))}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm tên hoặc địa chỉ web…"
          className="ml-auto max-w-56"
        />
      </div>

      <Card className="p-0">
        <Table head={["Cửa hàng", "Địa chỉ web", "Chủ shop", "Gói", "MRR", "Lượng dùng", "Trạng thái", "Tạo", ""]}>
          {rows.map((t) => {
            const plan = planFor(state, t);
            const meta = tenantStatusMeta[t.status];
            return (
              <tr key={t.id} className="hover:bg-card2">
                <Td>
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${accentPair[t.branding.accentToken] ?? "bg-card2"}`}
                    >
                      {t.branding.logoEmoji}
                    </span>
                    <span className="font-semibold">{t.displayName}</span>
                  </span>
                </Td>
                <Td className="font-data text-[12px] text-tx3">{t.subdomain}.vici.shop</Td>
                <Td className="text-tx2">{t.ownerName}</Td>
                <Td>{plan.name}</Td>
                <Td className="font-data text-[12px]">{formatVnd(t.mrrVnd)}</Td>
                <Td className="font-data text-[12px] text-tx3">
                  {t.usage.products}/{plan.limits.products} SP
                </Td>
                <Td>
                  <Badge className={toneClasses[meta.tone]}>{meta.label}</Badge>
                </Td>
                <Td className="font-data text-[12px] text-tx3">{formatDate(t.createdAt)}</Td>
                <Td>
                  <Link
                    href={`/platform/tenants/${t.id}`}
                    className="font-data text-[12px] font-semibold text-viol hover:underline"
                  >
                    Chi tiết →
                  </Link>
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-tx3">Không có cửa hàng khớp bộ lọc.</p>
      ) : null}
    </div>
  );
}
