"use client";

import Link from "next/link";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Icon } from "@/components/ui/basics";
import { useToast } from "@/components/ui/overlay";
import { formatDate, formatVnd } from "@/lib/format";
import { accentPair, tenantStatusMeta, toneClasses } from "@/lib/labels";
import {
  actions,
  PROVISIONING_STEPS,
  planFor,
  tenantById,
  useAppState,
} from "@/lib/mock/store";

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const barColor = pct >= 100 ? "bg-drop" : pct >= 80 ? "bg-gold" : "bg-mint";
  return (
    <div>
      <div className="mb-1 flex justify-between text-[12px]">
        <span className="text-tx2">{label}</span>
        <span className="font-data text-tx3">
          {used} / {limit} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-card2">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const state = useAppState();
  const toast = useToast();
  const router = useRouter();
  const tenant = tenantById(state, id);

  if (!tenant) {
    return (
      <p className="py-10 text-center text-sm text-tx3">
        Không tìm thấy cửa hàng. <Link href="/platform/tenants" className="text-viol">← Danh sách</Link>
      </p>
    );
  }

  const plan = planFor(state, tenant);
  const meta = tenantStatusMeta[tenant.status];
  const run = state.provisioning?.tenantId === tenant.id ? state.provisioning : null;

  function act(fn: () => { ok: boolean; error?: string }, ok: string) {
    const r = fn();
    if (r.ok) toast(ok);
    else toast(r.error ?? "Không thực hiện được", "error");
  }

  return (
    <div className="space-y-6">
      <Link href="/platform/tenants" className="text-[12.5px] font-semibold text-tx3 hover:text-tx">
        ← Danh sách cửa hàng
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${accentPair[tenant.branding.accentToken] ?? "bg-card2"}`}
          >
            {tenant.branding.logoEmoji}
          </span>
          <div>
            <h1 className="font-display text-xl font-bold">{tenant.displayName}</h1>
            <p className="font-data text-[12px] text-tx3">
              {tenant.subdomain}.vici.shop
              {tenant.customDomain ? ` · ${tenant.customDomain}` : ""}
            </p>
            <div className="mt-1.5">
              <Badge className={toneClasses[meta.tone]}>{meta.label}</Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(tenant.status === "active" || tenant.status === "past_due") && (
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                act(
                  () => actions.setTenantStatus(tenant.id, "suspended", "Tạm ngưng thủ công"),
                  "Đã tạm ngưng cửa hàng",
                )
              }
            >
              Tạm ngưng
            </Button>
          )}
          {tenant.status === "suspended" && (
            <Button
              size="sm"
              onClick={() =>
                act(() => actions.setTenantStatus(tenant.id, "active"), "Đã khôi phục")
              }
            >
              Khôi phục
            </Button>
          )}
          {tenant.status !== "archived" && tenant.status !== "provisioning" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                act(() => actions.setTenantStatus(tenant.id, "archived"), "Đã lưu trữ")
              }
            >
              Lưu trữ
            </Button>
          )}
          {tenant.status !== "provisioning" && (
            <Button
              variant="dark"
              size="sm"
              onClick={() => {
                actions.impersonateTenant(tenant.id);
                toast(`Đang xem với tư cách ${tenant.displayName}`);
                router.push("/admin");
              }}
            >
              <Icon name="open_in_new" size={15} /> Mở /admin
            </Button>
          )}
        </div>
      </div>

      {tenant.suspendedReason ? (
        <Card className="border-drop/40 bg-drop-soft/50 p-4 text-[13px] text-drop">
          <Icon name="warning" size={16} className="mr-1.5 align-middle" />
          {tenant.suspendedReason}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-3.5 text-sm font-bold">Gói &amp; lượng dùng</p>
          <div className="mb-4 flex items-baseline justify-between">
            <span className="font-semibold">{plan.name}</span>
            <span className="font-data text-[13px] text-tx3">
              {formatVnd(plan.priceVndMonth)}/tháng · phí GD {plan.txnFeePercent}%
            </span>
          </div>
          <div className="space-y-3">
            <UsageRow label="Sản phẩm" used={tenant.usage.products} limit={plan.limits.products} />
            <UsageRow
              label="Đơn / tháng"
              used={tenant.usage.ordersMonth}
              limit={plan.limits.ordersMonth}
            />
            <UsageRow
              label="Tài khoản staff"
              used={tenant.usage.staffSeats}
              limit={plan.limits.staffSeats}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {state.plans.map((p) => (
              <Button
                key={p.code}
                size="sm"
                variant={p.code === tenant.planCode ? "primary" : "secondary"}
                disabled={p.code === tenant.planCode}
                onClick={() =>
                  act(() => actions.changePlan(tenant.id, p.code), `Đã chuyển sang gói ${p.name}`)
                }
              >
                {p.name}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-3.5 text-sm font-bold">
            {run ? "Tiến trình khởi tạo (saga)" : "Thông tin"}
          </p>
          {run ? (
            <ul className="space-y-2.5">
              {run.steps.map((s) => (
                <li key={s.key} className="flex items-center gap-2.5 text-[13px]">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      s.status === "done"
                        ? "bg-mint-soft text-mint"
                        : s.status === "running"
                          ? "bg-viol-soft text-viol"
                          : "bg-card2 text-tx3"
                    }`}
                  >
                    <Icon
                      name={s.status === "done" ? "check" : s.status === "running" ? "sync" : "circle"}
                      size={12}
                    />
                  </span>
                  <span className={s.status === "pending" ? "text-tx3" : "text-tx"}>
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-tx3">Chủ shop</dt>
                <dd className="font-medium">{tenant.ownerName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-tx3">Email</dt>
                <dd className="font-data text-[12px]">{tenant.ownerEmail}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-tx3">Tạo ngày</dt>
                <dd className="font-data text-[12px]">{formatDate(tenant.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-tx3">MRR</dt>
                <dd className="font-data text-[12px]">{formatVnd(tenant.mrrVnd)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-tx3">Các bước provisioning</dt>
                <dd className="text-tx3">{PROVISIONING_STEPS.length} bước · đã xong</dd>
              </div>
            </dl>
          )}
        </Card>
      </div>
    </div>
  );
}
