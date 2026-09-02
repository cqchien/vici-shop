"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Icon } from "@/components/ui/basics";
import { FormField, Input, Textarea, Toggle } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { formatVnd } from "@/lib/format";
import { actions, useAppState } from "@/lib/mock/store";
import type { AccentToken, PlanCode } from "@/lib/types";

const ACCENTS: { token: AccentToken; label: string; dot: string }[] = [
  { token: "pri", label: "Hồng", dot: "bg-pri" },
  { token: "viol", label: "Tím", dot: "bg-viol" },
  { token: "sky", label: "Lavender", dot: "bg-sky" },
  { token: "mint", label: "Mint", dot: "bg-mint" },
  { token: "gold", label: "Vàng", dot: "bg-gold" },
  { token: "drop", label: "San hô", dot: "bg-drop" },
];
const EMOJIS = ["🧸", "🌙", "🦖", "🎠", "🏆", "👾", "🐰", "🎁", "✨", "🪄"];
const TOTAL = 5;

export default function StartWizardPage() {
  const state = useAppState();
  const toast = useToast();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [logoEmoji, setLogoEmoji] = useState("🧸");
  const [accentToken, setAccentToken] = useState<AccentToken>("pri");
  const [planCode, setPlanCode] = useState<PlanCode>("starter");
  const [seedCatalog, setSeedCatalog] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const subCheck = subdomain ? actions.checkSubdomain(subdomain) : null;
  const run = tenantId && state.provisioning?.tenantId === tenantId ? state.provisioning : null;
  const doneTenant = state.tenants.find((t) => t.id === tenantId);
  const provisioningDone = doneTenant?.status === "active";
  const stepCount = run?.steps.length ?? 0;

  // Bước 5: "chạy" saga — advance đúng số bước (mỗi 900ms), rồi kích hoạt tenant.
  useEffect(() => {
    if (step !== 5 || !tenantId || stepCount === 0) return;
    let ticks = 0;
    const t = setInterval(() => {
      ticks += 1;
      if (ticks < stepCount) {
        actions.advanceProvisioning();
      } else {
        actions.advanceProvisioning();
        actions.completeProvisioning(tenantId);
        clearInterval(t);
      }
    }, 900);
    return () => clearInterval(t);
  }, [step, tenantId, stepCount]);

  function next() {
    if (step === 1 && (!displayName.trim() || !ownerName.trim() || !ownerEmail.trim())) {
      toast("Điền tên shop, tên và email của bạn", "error");
      return;
    }
    if (step === 2 && (!subCheck || !subCheck.ok)) {
      toast(subCheck?.error ?? "Chọn địa chỉ web hợp lệ", "error");
      return;
    }
    if (step === 4) {
      const r = actions.createTenant({
        displayName,
        subdomain,
        planCode,
        seedCatalog,
        ownerName,
        ownerEmail,
        logoEmoji,
        accentToken,
      });
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      setTenantId(r.tenantId);
      actions.updateBranding(r.tenantId, { tagline });
    }
    setStep((s) => Math.min(TOTAL, s + 1));
  }

  function enterAdmin() {
    actions.clearProvisioning();
    actions.login(ownerEmail);
    router.push("/admin");
  }

  return (
    <div className="w-full max-w-[560px]">
      {/* Progress */}
      <div className="mb-6 flex items-center gap-2">
        {Array.from({ length: TOTAL }, (_, i) => i + 1).map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors ${
              n <= step ? "bg-pri" : "bg-card2"
            }`}
          />
        ))}
      </div>

      <Card className="p-6 sm:p-7">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-xl font-bold">Cửa hàng của bạn</h1>
              <p className="mt-1 text-[13px] text-tx3">Bắt đầu miễn phí, không cần thẻ.</p>
            </div>
            <FormField label="Tên cửa hàng">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Moon Rabbit Toys"
              />
            </FormField>
            <FormField label="Slogan (tuỳ chọn)">
              <Textarea
                rows={2}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Blind box mỗi tuần."
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tên của bạn">
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              </FormField>
              <FormField label="Email">
                <Input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                />
              </FormField>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-xl font-bold">Địa chỉ web</h1>
              <p className="mt-1 text-[13px] text-tx3">Đổi được sau. Tên miền riêng thêm ở phần cài đặt.</p>
            </div>
            <FormField label="Địa chỉ" error={subdomain && subCheck && !subCheck.ok ? subCheck.error : undefined}>
              <div className="flex items-center gap-1.5">
                <Input
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                  placeholder="moon-rabbit"
                  className="font-data"
                />
                <span className="font-data text-[13px] text-tx3">.vici.shop</span>
              </div>
            </FormField>
            {subdomain && subCheck?.ok ? (
              <p className="flex items-center gap-1.5 text-[12.5px] text-mint">
                <Icon name="check_circle" size={14} /> Địa chỉ khả dụng
              </p>
            ) : null}

            <FormField label="Biểu tượng cửa hàng">
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setLogoEmoji(e)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg ${
                      logoEmoji === e ? "border-pri bg-pri-soft" : "border-line hover:border-line2"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </FormField>
            <FormField label="Màu nhấn">
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.token}
                    onClick={() => setAccentToken(a.token)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
                      accentToken === a.token ? "border-tx bg-card2" : "border-line"
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${a.dot}`} />
                    {a.label}
                  </button>
                ))}
              </div>
            </FormField>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-xl font-bold">Chọn gói</h1>
              <p className="mt-1 text-[13px] text-tx3">Nâng/hạ gói bất cứ lúc nào trong cài đặt.</p>
            </div>
            <div className="space-y-2.5">
              {state.plans.map((p) => (
                <button
                  key={p.code}
                  onClick={() => setPlanCode(p.code)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${
                    planCode === p.code ? "border-pri bg-pri-soft" : "border-line hover:border-line2"
                  }`}
                >
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="mt-0.5 text-[12px] text-tx3">
                      {p.limits.products} SP · {p.limits.ordersMonth.toLocaleString("vi-VN")} đơn/tháng
                      {p.features.drop ? " · drop & pre-order" : ""}
                    </p>
                  </div>
                  <span className="font-data text-[13px] font-semibold">
                    {p.priceVndMonth === 0 ? "Miễn phí" : `${formatVnd(p.priceVndMonth)}/th`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-xl font-bold">Dữ liệu mẫu</h1>
              <p className="mt-1 text-[13px] text-tx3">
                Tạo sẵn 1 brand + 1 series blind box + vài sản phẩm demo để bạn hình dung. Xoá
                được sau.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line p-4">
              <span className="text-[13.5px] font-semibold">Seed catalog mẫu</span>
              <Toggle on={seedCatalog} onChange={setSeedCatalog} />
            </div>
            <div className="rounded-xl bg-card2 p-4 text-[12.5px] text-tx2">
              <p className="mb-1 font-semibold text-tx">Tóm tắt</p>
              <p>
                {displayName || "Cửa hàng"} · {subdomain || "địa-chỉ"}.vici.shop ·{" "}
                {state.plans.find((p) => p.code === planCode)?.name}
              </p>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-xl font-bold">
                {provisioningDone ? "Cửa hàng đã sẵn sàng 🎉" : "Đang khởi tạo cửa hàng…"}
              </h1>
              <p className="mt-1 text-[13px] text-tx3">
                {provisioningDone
                  ? `${displayName} · ${subdomain}.vici.shop`
                  : "Saga provisioning — vài giây thôi."}
              </p>
            </div>
            <ul className="space-y-2.5">
              {(run?.steps ?? []).map((s) => (
                <li key={s.key} className="flex items-center gap-2.5 text-[13px]">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      s.status === "done"
                        ? "bg-mint-soft text-mint"
                        : s.status === "running"
                          ? "animate-pulse bg-pri-soft text-pri"
                          : "bg-card2 text-tx3"
                    }`}
                  >
                    <Icon name={s.status === "done" ? "check" : "sync"} size={12} />
                  </span>
                  <span className={s.status === "pending" ? "text-tx3" : "text-tx"}>{s.label}</span>
                </li>
              ))}
            </ul>
            {provisioningDone ? (
              <Button size="lg" className="w-full" onClick={enterAdmin}>
                Vào trang quản trị
              </Button>
            ) : null}
          </div>
        )}

        {step < 5 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="cursor-pointer text-[13px] font-semibold text-tx3 hover:text-tx disabled:opacity-0"
            >
              ← Quay lại
            </button>
            <Button onClick={next}>
              {step === 4 ? "Tạo cửa hàng" : "Tiếp tục"}
            </Button>
          </div>
        )}
      </Card>

      {step === 1 ? (
        <p className="mt-4 text-center text-[12px] text-tx3">
          Đã có cửa hàng? <a href="/login" className="font-semibold text-pri">Đăng nhập</a>
        </p>
      ) : (
        <p className="mt-4 text-center text-[12px] text-tx3">
          <Badge className="bg-card2 text-tx3">MOCK</Badge> Provisioning mô phỏng saga bằng timer
          (ADR-007/009).
        </p>
      )}
    </div>
  );
}
