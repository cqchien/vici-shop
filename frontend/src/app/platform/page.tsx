"use client";

import Link from "next/link";
import { Badge, Card, StatTile } from "@/components/ui/basics";
import { Table, Td } from "@/components/ui/data";
import { formatDate, formatVnd } from "@/lib/format";
import { accentPair, tenantStatusMeta, toneClasses } from "@/lib/labels";
import { planFor, useAppState } from "@/lib/mock/store";

export default function PlatformOverviewPage() {
  const state = useAppState();
  const tenants = state.tenants;

  const active = tenants.filter((t) => t.status === "active").length;
  const suspended = tenants.filter(
    (t) => t.status === "suspended" || t.status === "past_due",
  ).length;
  const provisioning = tenants.filter((t) => t.status === "provisioning").length;
  const mrr = tenants
    .filter((t) => t.status === "active" || t.status === "past_due")
    .reduce((s, t) => s + t.mrrVnd, 0);
  const newest = tenants
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Tổng cửa hàng" value={String(tenants.length)} />
        <StatTile label="Đang hoạt động" value={String(active)} tone="positive" />
        <StatTile
          label="Tạm ngưng / quá hạn"
          value={String(suspended)}
          tone={suspended > 0 ? "danger" : "default"}
        />
        <StatTile label="MRR nền tảng" value={formatVnd(mrr)} hint={`${provisioning} đang khởi tạo`} />
      </div>

      <Card className="p-5">
        <p className="mb-4 text-sm font-bold">Đăng ký gần đây</p>
        <Table head={["Cửa hàng", "Địa chỉ web", "Gói", "Trạng thái", "Tạo ngày", ""]}>
          {newest.map((t) => {
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
                <Td>{planFor(state, t).name}</Td>
                <Td>
                  <Badge className={toneClasses[meta.tone]}>{meta.label}</Badge>
                </Td>
                <Td className="font-data text-[12px] text-tx3">{formatDate(t.createdAt)}</Td>
                <Td>
                  <Link
                    href={`/platform/tenants/${t.id}`}
                    className="font-data text-[12px] font-semibold text-viol hover:underline"
                  >
                    Xem →
                  </Link>
                </Td>
              </tr>
            );
          })}
        </Table>
      </Card>
    </div>
  );
}
