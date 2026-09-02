"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, EmptyState, LinkButton } from "@/components/ui/basics";
import { FormField, Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { formatVnd } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/labels";
import {
  actions,
  computeTotals,
  currentUser,
  useAppState,
  useNow,
} from "@/lib/mock/store";
import type { PaymentMethod } from "@/lib/types";

const STEPS = ["Địa chỉ", "Vận chuyển", "Thanh toán", "Xác nhận"] as const;

const SHIP_OPTIONS = [
  {
    id: "ghn",
    name: "GHN — Tiêu chuẩn",
    sub: "2–4 ngày toàn quốc, có bảo hiểm hàng sưu tầm",
    fee: 30_000,
    freeByThreshold: true,
  },
  {
    id: "express",
    name: "Hỏa tốc nội thành HCM",
    sub: "Nhận trong 2 giờ, giao bằng hộp cứng",
    fee: 65_000,
    freeByThreshold: false,
  },
  {
    id: "pickup",
    name: "Nhận tại cửa hàng Q.1",
    sub: "42 Lý Tự Trọng — kiểm seal tại chỗ",
    fee: 0,
    freeByThreshold: false,
  },
] as const;

const PAY_SUBS: Record<PaymentMethod, string> = {
  momo: "Quét QR, xác nhận tức thì",
  zalopay: "Liên kết ví có sẵn",
  vnpay: "Napas, Visa, Mastercard",
  cod: "Thanh toán khi nhận hàng",
};

export default function CheckoutPage() {
  const state = useAppState();
  const router = useRouter();
  const toast = useToast();
  const user = currentUser(state);
  const now = useNow();

  const [step, setStep] = useState(0);
  const [holdUntil] = useState(
    () => Date.now() + state.settings.holdMinutes * 60_000,
  );

  const defaultAddr = user?.addresses.find((a) => a.isDefault) ?? user?.addresses[0];
  const [recipient, setRecipient] = useState(defaultAddr?.recipient ?? user?.name ?? "");
  const [phone, setPhone] = useState(defaultAddr?.phone ?? user?.phone ?? "");
  const [province, setProvince] = useState(defaultAddr?.province ?? "TP. Hồ Chí Minh");
  const [district, setDistrict] = useState(defaultAddr?.district ?? "");
  const [ward, setWard] = useState(defaultAddr?.ward ?? "");
  const [street, setStreet] = useState(defaultAddr?.street ?? "");

  const [shipId, setShipId] = useState<(typeof SHIP_OPTIONS)[number]["id"]>("ghn");
  const [method, setMethod] = useState<PaymentMethod>("momo");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherApplied, setVoucherApplied] = useState<string | undefined>();
  const [pointsUsed, setPointsUsed] = useState(0);

  const voucher = useMemo(
    () =>
      voucherApplied
        ? (state.vouchers.find(
            (v) => v.code === voucherApplied && v.status === "active",
          ) ?? null)
        : null,
    [state.vouchers, voucherApplied],
  );

  const subtotalOnly = computeTotals(state, { now }).subtotal;
  const ship = SHIP_OPTIONS.find((s) => s.id === shipId)!;
  const shipFee =
    ship.freeByThreshold && subtotalOnly >= state.settings.freeShipThresholdVnd
      ? 0
      : ship.fee;
  const totals = computeTotals(state, {
    voucher,
    pointsUsed,
    now,
    shipFeeVnd: shipFee,
  });

  useEffect(() => {
    if (!user) router.replace("/login?next=/checkout");
  }, [user, router]);

  if (!user) return null;
  if (state.cart.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <EmptyState
          title="Giỏ hàng trống"
          hint="Secret không tự về — bắt đầu từ series mới nhất."
          action={<LinkButton href="/products">Khám phá cửa hàng</LinkButton>}
        />
      </div>
    );
  }

  const addressText = `${recipient} · ${phone} · ${street}, ${ward}, ${district}, ${province}`;
  const addressValid = recipient && phone && province && district && street;
  const maxPoints = Math.min(
    user.points,
    Math.floor(
      ((totals.subtotal - totals.voucherDiscount) * state.settings.maxPointPercent) /
        100 /
        state.settings.pointValueVnd,
    ),
  );

  const holdMs = Math.max(0, holdUntil - now);
  const holdWarn = holdMs > 0 && holdMs < 5 * 60_000;
  const pad = (n: number) => String(n).padStart(2, "0");
  const holdText = `${pad(Math.floor(holdMs / 60_000))}:${pad(Math.floor(holdMs / 1000) % 60)}`;

  function applyVoucher() {
    const vc = state.vouchers.find(
      (v) =>
        v.code.toLowerCase() === voucherCode.trim().toLowerCase() &&
        v.status === "active",
    );
    if (!vc) {
      toast("Voucher không tồn tại hoặc đã tắt", "error");
      return;
    }
    if (vc.usedCount >= vc.totalUses) {
      toast("Voucher đã hết lượt dùng", "error");
      return;
    }
    if (totals.subtotal < vc.minOrderVnd) {
      toast(`Đơn tối thiểu ${formatVnd(vc.minOrderVnd)} mới dùng được mã này`, "error");
      return;
    }
    setVoucherApplied(vc.code);
    toast(`Đã áp dụng ${vc.code}`);
  }

  function placeOrder() {
    const r = actions.placeOrder({
      addressText,
      shipMethod: ship.name,
      shipFeeVnd: shipFee,
      method,
      voucherCode: voucherApplied,
      pointsUsed,
    });
    if (r.ok) {
      router.push(`/orders/${r.orderId}/confirmation`);
    } else {
      toast(r.error, "error");
    }
  }

  const optionCard = (active: boolean) =>
    `cursor-pointer rounded-xl border-[1.5px] px-4.5 py-3.5 transition-colors ${
      active ? "border-pri bg-pri-soft" : "border-line bg-card hover:border-tx3"
    }`;

  return (
    <div className="mx-auto max-w-[720px] py-4 pb-10">
      {/* Banner giữ hàng */}
      <div
        className={`mb-6 flex items-center justify-between rounded-xl border px-4.5 py-3 ${
          holdWarn ? "border-drop bg-drop-soft" : "border-line bg-card"
        }`}
      >
        <span
          className={`text-[13px] font-semibold ${holdWarn ? "text-drop" : "text-tx2"}`}
        >
          Sản phẩm của bạn đang được giữ chỗ
        </span>
        <span
          className={`font-data text-[17px] font-semibold tnum ${holdWarn ? "text-drop" : "text-tx2"}`}
        >
          {holdText}
        </span>
      </div>

      {/* Progress steps */}
      <div className="mb-8 flex gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i < step && setStep(i)}
            className={`flex-1 ${i < step ? "cursor-pointer" : "cursor-default"}`}
          >
            <span
              className={`mb-2 block h-[3px] rounded-full transition-colors ${
                i <= step ? "bg-pri" : "bg-line"
              }`}
            />
            <span
              className={`block text-left text-[11px] font-semibold ${
                i === step ? "text-tx" : i < step ? "text-tx2" : "text-tx3"
              }`}
            >
              {i + 1}. {s}
            </span>
          </button>
        ))}
      </div>

      {step === 0 ? (
        <div>
          <h2 className="mb-5 text-[21px] font-bold tracking-[-0.01em]">
            Địa chỉ giao hàng
          </h2>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <FormField label="Họ và tên">
              <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} />
            </FormField>
            <FormField label="Số điện thoại">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Địa chỉ (số nhà, đường, phường)">
                <Input
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="12 Nguyễn Huệ"
                />
              </FormField>
            </div>
            <FormField label="Tỉnh / Thành phố">
              <Select value={province} onChange={(e) => setProvince(e.target.value)}>
                <option>TP. Hồ Chí Minh</option>
                <option>Hà Nội</option>
                <option>Đà Nẵng</option>
                <option>Cần Thơ</option>
                <option>Khác</option>
              </Select>
            </FormField>
            <FormField label="Quận / Huyện">
              <Input value={district} onChange={(e) => setDistrict(e.target.value)} />
            </FormField>
            <FormField label="Phường / Xã">
              <Input value={ward} onChange={(e) => setWard(e.target.value)} />
            </FormField>
          </div>
          <Button
            variant="dark"
            size="lg"
            className="w-full"
            disabled={!addressValid}
            onClick={() => setStep(1)}
          >
            Tiếp tục — Vận chuyển
          </Button>
        </div>
      ) : null}

      {step === 1 ? (
        <div>
          <h2 className="mb-5 text-[21px] font-bold tracking-[-0.01em]">
            Phương thức vận chuyển
          </h2>
          <div className="mb-6 flex flex-col gap-2.5">
            {SHIP_OPTIONS.map((opt) => {
              const fee =
                opt.freeByThreshold &&
                subtotalOnly >= state.settings.freeShipThresholdVnd
                  ? 0
                  : opt.fee;
              return (
                <button
                  key={opt.id}
                  onClick={() => setShipId(opt.id)}
                  className={`${optionCard(shipId === opt.id)} flex items-center justify-between text-left`}
                >
                  <span>
                    <span className="block text-sm font-semibold">{opt.name}</span>
                    <span className="mt-0.5 block text-xs text-tx3">{opt.sub}</span>
                  </span>
                  <span className="font-data text-[13.5px] font-semibold">
                    {fee === 0 ? "Miễn phí" : formatVnd(fee)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="lg" onClick={() => setStep(0)}>
              ← Quay lại
            </Button>
            <Button variant="dark" size="lg" className="flex-1" onClick={() => setStep(2)}>
              Tiếp tục — Thanh toán
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <h2 className="mb-5 text-[21px] font-bold tracking-[-0.01em]">
            Phương thức thanh toán
          </h2>
          <div className="mb-5 grid gap-2.5 sm:grid-cols-2">
            {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`${optionCard(method === m)} text-left`}
              >
                <span className="mb-0.5 block text-sm font-semibold">
                  {paymentMethodLabel[m]}
                </span>
                <span className="block text-xs text-tx3">{PAY_SUBS[m]}</span>
              </button>
            ))}
          </div>

          <div className="mb-5 space-y-2 border-t border-line pt-4.5">
            <p className="text-sm font-semibold">Voucher</p>
            <div className="flex gap-2">
              <Input
                placeholder="Nhập mã (thử THANG7-10)"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                className="font-data"
              />
              <Button variant="secondary" onClick={applyVoucher}>
                Áp dụng
              </Button>
            </div>
            {voucher ? (
              <p className="text-xs font-semibold text-mint">
                ✓ {voucher.code} — giảm {formatVnd(totals.voucherDiscount)}
                {voucher.kind === "freeship" ? " (miễn phí vận chuyển)" : ""}
              </p>
            ) : null}
          </div>

          {user.points > 0 ? (
            <div className="mb-6 space-y-2 border-t border-line pt-4.5">
              <p className="text-sm font-semibold">
                Dùng điểm — có{" "}
                <span className="font-data">{user.points.toLocaleString("vi-VN")}</span>{" "}
                điểm (= {formatVnd(user.points * state.settings.pointValueVnd)})
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={maxPoints}
                  value={pointsUsed}
                  onChange={(e) => setPointsUsed(Number(e.target.value))}
                  className="flex-1 accent-[var(--pri)]"
                />
                <span className="w-28 text-right font-data text-sm tnum">
                  −{formatVnd(pointsUsed * state.settings.pointValueVnd)}
                </span>
              </div>
              <p className="text-xs text-tx3">
                Tối đa {state.settings.maxPointPercent}% giá trị đơn.
              </p>
            </div>
          ) : null}

          <div className="flex gap-2.5">
            <Button variant="secondary" size="lg" onClick={() => setStep(1)}>
              ← Quay lại
            </Button>
            <Button variant="dark" size="lg" className="flex-1" onClick={() => setStep(3)}>
              Tiếp tục — Xác nhận
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div>
          <h2 className="mb-5 text-[21px] font-bold tracking-[-0.01em]">
            Kiểm tra và đặt hàng
          </h2>
          <Card className="mb-3.5 p-5">
            {state.cart.map((c) => {
              const p = state.products.find((x) => x.id === c.productId);
              const v = p?.variants.find((x) => x.id === c.variantId);
              if (!p || !v) return null;
              return (
                <div
                  key={c.variantId}
                  className="flex justify-between py-1.5 text-[13.5px]"
                >
                  <span className="line-clamp-1">
                    {p.name} ({v.name}) <span className="text-tx3">×{c.qty}</span>
                  </span>
                </div>
              );
            })}
            <div className="mt-3 space-y-2 border-t border-line pt-3 text-[13.5px]">
              <div className="flex justify-between">
                <span className="text-tx2">Tạm tính</span>
                <span className="font-data tnum">{formatVnd(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tx2">Vận chuyển — {ship.name}</span>
                <span className="font-data tnum">
                  {totals.shipFee === 0 ? "Miễn phí" : formatVnd(totals.shipFee)}
                </span>
              </div>
              {totals.voucherDiscount > 0 ? (
                <div className="flex justify-between text-mint">
                  <span>Voucher {voucher?.code}</span>
                  <span className="font-data tnum">
                    −{formatVnd(totals.voucherDiscount)}
                  </span>
                </div>
              ) : null}
              {totals.pointsDiscount > 0 ? (
                <div className="flex justify-between text-mint">
                  <span>Điểm thưởng</span>
                  <span className="font-data tnum">
                    −{formatVnd(totals.pointsDiscount)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between text-[15px] font-semibold">
                <span>Hôm nay · {paymentMethodLabel[method]}</span>
                <span className="font-data tnum">{formatVnd(totals.total)}</span>
              </div>
            </div>
          </Card>
          <p className="mb-5 text-xs text-tx3">
            Giao đến: {addressText}. Bằng việc đặt hàng, bạn đồng ý với điều khoản
            pre-order và đổi trả của Vici. (Mock: cổng thanh toán giả lập thành công
            ngay.)
          </p>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="lg" onClick={() => setStep(2)}>
              ← Quay lại
            </Button>
            <Button size="lg" className="flex-1" onClick={placeOrder}>
              Đặt hàng — {formatVnd(totals.total)}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
