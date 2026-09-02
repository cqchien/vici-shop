"use client";

import { useState } from "react";
import { Badge, Button, Card, Icon } from "@/components/ui/basics";
import { Tabs } from "@/components/ui/data";
import { FormField, Input, Stepper } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { formatVnd } from "@/lib/format";
import { actions, currentTenant, planFor, useAppState } from "@/lib/mock/store";
import type { AccentToken } from "@/lib/types";

const ACCENTS: { token: AccentToken; label: string; dot: string }[] = [
  { token: "pri", label: "Hồng", dot: "bg-pri" },
  { token: "viol", label: "Tím", dot: "bg-viol" },
  { token: "sky", label: "Lavender", dot: "bg-sky" },
  { token: "mint", label: "Mint", dot: "bg-mint" },
  { token: "gold", label: "Vàng", dot: "bg-gold" },
  { token: "drop", label: "San hô", dot: "bg-drop" },
];

type Tab = "brand" | "plan" | "ops";

export default function SettingsPage() {
  const state = useAppState();
  const toast = useToast();
  const tenant = currentTenant(state);
  const plan = planFor(state, tenant);
  const [tab, setTab] = useState<Tab>("brand");

  const s = state.settings;
  const [freeShip, setFreeShip] = useState(String(s.freeShipThresholdVnd));
  const [holdMinutes, setHoldMinutes] = useState(s.holdMinutes);
  const [earnRate, setEarnRate] = useState(String(s.pointEarnRate));
  const [pointValue, setPointValue] = useState(String(s.pointValueVnd));
  const [maxPercent, setMaxPercent] = useState(String(s.maxPointPercent));

  const [name, setName] = useState(tenant.displayName);
  const [emoji, setEmoji] = useState(tenant.branding.logoEmoji);
  const [accent, setAccent] = useState<AccentToken>(tenant.branding.accentToken);
  const [tagline, setTagline] = useState(tenant.branding.tagline);
  const [customDomain, setCustomDomain] = useState(tenant.customDomain ?? "");

  return (
    <div className="max-w-xl space-y-4">
      <Tabs<Tab>
        tabs={[
          { key: "brand", label: "Cửa hàng & thương hiệu" },
          { key: "plan", label: "Gói dịch vụ" },
          { key: "ops", label: "Vận hành" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "brand" && (
        <Card className="p-6">
          <p className="mb-4.5 text-sm font-bold">Thương hiệu cửa hàng</p>
          <div className="space-y-4.5">
            <FormField label="Tên hiển thị">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Slogan">
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </FormField>
            <FormField label="Biểu tượng">
              <Input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="w-20 text-center text-lg"
                maxLength={2}
              />
            </FormField>
            <div>
              <p className="mb-1.5 text-xs font-semibold">Màu nhấn storefront</p>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.token}
                    onClick={() => setAccent(a.token)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
                      accent === a.token ? "border-tx bg-card2" : "border-line"
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${a.dot}`} />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <FormField label="Địa chỉ web">
              <div className="flex items-center gap-1.5">
                <Input value={tenant.subdomain} disabled className="font-data" />
                <span className="font-data text-[13px] text-tx3">.vici.shop</span>
              </div>
            </FormField>
            <FormField label="Tên miền riêng (FR-TEN-12)">
              <Input
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="shopcuaban.com"
                className="font-data"
                disabled={!plan.features.customDomain}
              />
            </FormField>
            {!plan.features.customDomain ? (
              <p className="text-[11.5px] text-tx3">
                Tên miền riêng có ở gói Nhà sưu tầm — nâng gói ở tab Gói dịch vụ.
              </p>
            ) : null}
            <Button
              onClick={() => {
                actions.updateBranding(tenant.id, {
                  displayName: name,
                  logoEmoji: emoji,
                  accentToken: accent,
                  tagline,
                  customDomain: plan.features.customDomain ? customDomain : undefined,
                });
                toast("Đã lưu thương hiệu — storefront áp dụng ngay");
              }}
            >
              Lưu thương hiệu
            </Button>
          </div>
        </Card>
      )}

      {tab === "plan" && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Gói hiện tại</p>
              <p className="mt-0.5 font-data text-[13px] text-tx3">
                {formatVnd(plan.priceVndMonth)}/tháng · phí giao dịch {plan.txnFeePercent}%
              </p>
            </div>
            <Badge className="bg-pri-soft text-pri">{plan.name}</Badge>
          </div>
          <div className="space-y-2.5">
            {(
              [
                ["Sản phẩm", tenant.usage.products, plan.limits.products],
                ["Đơn / tháng", tenant.usage.ordersMonth, plan.limits.ordersMonth],
                ["Tài khoản staff", tenant.usage.staffSeats, plan.limits.staffSeats],
              ] as const
            ).map(([label, used, limit]) => {
              const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
              return (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-[12px]">
                    <span className="text-tx2">{label}</span>
                    <span className="font-data text-tx3">
                      {used} / {limit}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-card2">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? "bg-drop" : pct >= 80 ? "bg-gold" : "bg-mint"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 mb-2 text-xs font-semibold">Đổi gói</p>
          <div className="flex flex-wrap gap-2">
            {state.plans.map((p) => (
              <Button
                key={p.code}
                size="sm"
                variant={p.code === tenant.planCode ? "primary" : "secondary"}
                disabled={p.code === tenant.planCode}
                onClick={() => {
                  const r = actions.changePlan(tenant.id, p.code);
                  if (r.ok) toast(`Đã chuyển sang gói ${p.name}`);
                  else toast(r.error, "error");
                }}
              >
                {p.name} · {p.priceVndMonth === 0 ? "0₫" : formatVnd(p.priceVndMonth)}
              </Button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-tx3">
            <Icon name="info" size={12} className="mr-1 align-middle" />
            Hạ gói bị chặn nếu lượng dùng vượt hạn mức gói mới (FR-BIL-04).
          </p>
        </Card>
      )}

      {tab === "ops" && (
        <Card className="p-6">
          <p className="mb-4.5 text-sm font-bold">Cấu hình vận hành (theo cửa hàng)</p>
          <div className="space-y-4.5">
            <FormField label="Ngưỡng miễn phí vận chuyển (VND)">
              <Input
                type="number"
                value={freeShip}
                onChange={(e) => setFreeShip(e.target.value)}
                className="!bg-card2 font-data"
              />
            </FormField>
            <div>
              <p className="mb-1.5 text-xs font-semibold">
                Thời gian giữ hàng khi checkout (FR-INV-02)
              </p>
              <Stepper
                value={holdMinutes}
                onChange={setHoldMinutes}
                min={5}
                max={30}
                step={5}
                format={(v) => `${v} phút`}
              />
            </div>
            <FormField label="Tích điểm: VND chi tiêu cho 1 điểm (FR-LOY-01)">
              <Input
                type="number"
                value={earnRate}
                onChange={(e) => setEarnRate(e.target.value)}
                className="!bg-card2 font-data"
              />
            </FormField>
            <FormField label="Giá trị 1 điểm khi tiêu (VND — FR-LOY-03)">
              <Input
                type="number"
                value={pointValue}
                onChange={(e) => setPointValue(e.target.value)}
                className="!bg-card2 font-data"
              />
            </FormField>
            <FormField label="% tối đa của đơn trả bằng điểm">
              <Input
                type="number"
                value={maxPercent}
                onChange={(e) => setMaxPercent(e.target.value)}
                className="!bg-card2 font-data"
              />
            </FormField>
            <Button
              onClick={() => {
                actions.saveSettings({
                  freeShipThresholdVnd: Number(freeShip),
                  holdMinutes,
                  pointEarnRate: Number(earnRate),
                  pointValueVnd: Number(pointValue),
                  maxPointPercent: Number(maxPercent),
                });
                toast("Đã lưu cài đặt cửa hàng");
              }}
            >
              Lưu cài đặt
            </Button>
          </div>
          <p className="mt-4 text-xs text-tx3">
            Mock: mỗi khoá là bảng <code>settings</code> 1-dòng theo tenant ở service tương ứng
            (shipping / inventory / user). Cấu hình cổng thanh toán / vận chuyển thật nằm ở
            backend (secret manager theo tenant, không bao giờ trong UI).
          </p>
        </Card>
      )}
    </div>
  );
}
