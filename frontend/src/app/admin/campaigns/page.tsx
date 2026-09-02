"use client";

import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui/basics";
import { Countdown, ProgressBar } from "@/components/ui/commerce";
import { Chip, Table, Td } from "@/components/ui/data";
import { FormField, Input, Select, Stepper, Toggle } from "@/components/ui/form";
import { Dialog, useToast } from "@/components/ui/overlay";
import { formatDateTime, formatVnd, uid } from "@/lib/format";
import { toneClasses, voucherKindLabel } from "@/lib/labels";
import { actions, dropPhase, useAppState, useNow } from "@/lib/mock/store";
import type { Voucher, VoucherKind } from "@/lib/types";

type Tab = "vouchers" | "flash" | "drops" | "preorder";

const TABS: { key: Tab; label: string }[] = [
  { key: "vouchers", label: "Vouchers" },
  { key: "flash", label: "Flash sale" },
  { key: "drops", label: "Drop scheduler" },
  { key: "preorder", label: "Pre-order" },
];

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

function fromLocalInput(v: string): string {
  return new Date(v).toISOString();
}

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

// ── Voucher editor ──────────────────────────────────────────

function VoucherEditor({
  existing,
  onClose,
}: {
  existing?: Voucher;
  onClose: () => void;
}) {
  const toast = useToast();
  const [code, setCode] = useState(existing?.code ?? "");
  const [kind, setKind] = useState<VoucherKind>(existing?.kind ?? "percent");
  const [value, setValue] = useState(existing?.value ?? 10);
  const [minOrder, setMinOrder] = useState(existing?.minOrderVnd ?? 500_000);
  const [totalUses, setTotalUses] = useState(existing?.totalUses ?? 100);
  const [perCustomer, setPerCustomer] = useState(existing?.perCustomer ?? 1);
  const [startsAt, setStartsAt] = useState(
    toLocalInput(existing?.startsAt ?? new Date().toISOString()),
  );
  const [endsAt, setEndsAt] = useState(toLocalInput(existing?.endsAt ?? inHours(24 * 30)));
  const [status, setStatus] = useState<Voucher["status"]>(existing?.status ?? "active");

  return (
    <div className="space-y-3.5">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Mã voucher">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="!bg-card2 font-data"
          />
        </FormField>
        <FormField label="Loại">
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as VoucherKind)}
            className="!bg-card2"
          >
            <option value="percent">Giảm %</option>
            <option value="fixed">Giảm tiền</option>
            <option value="freeship">Free ship</option>
          </Select>
        </FormField>
        {kind !== "freeship" ? (
          <FormField label={kind === "percent" ? "Phần trăm giảm" : "Số tiền giảm (VND)"}>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="!bg-card2 font-data"
            />
          </FormField>
        ) : null}
        <FormField label="Giá trị đơn tối thiểu (VND)">
          <Input
            type="number"
            value={minOrder}
            onChange={(e) => setMinOrder(Number(e.target.value))}
            className="!bg-card2 font-data"
          />
        </FormField>
        <FormField label="Tổng lượt dùng">
          <Input
            type="number"
            value={totalUses}
            onChange={(e) => setTotalUses(Number(e.target.value))}
            className="!bg-card2 font-data"
          />
        </FormField>
        <FormField label="Lượt / khách">
          <Input
            type="number"
            value={perCustomer}
            onChange={(e) => setPerCustomer(Number(e.target.value))}
            className="!bg-card2 font-data"
          />
        </FormField>
        <FormField label="Bắt đầu">
          <Input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="!bg-card2 font-data !text-[12.5px]"
          />
        </FormField>
        <FormField label="Kết thúc">
          <Input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="!bg-card2 font-data !text-[12.5px]"
          />
        </FormField>
        <FormField label="Trạng thái">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as Voucher["status"])}
            className="!bg-card2"
          >
            <option value="draft">Nháp</option>
            <option value="active">Chạy</option>
            <option value="paused">Tạm dừng</option>
          </Select>
        </FormField>
      </div>
      <div className="flex justify-end gap-2 border-t border-line pt-3.5">
        <Button variant="secondary" onClick={onClose}>
          Huỷ
        </Button>
        <Button
          onClick={() => {
            if (!code.trim()) return toast("Cần mã voucher", "error");
            actions.saveVoucher({
              id: existing?.id ?? uid("vc"),
              code,
              kind,
              value: kind === "freeship" ? 0 : value,
              minOrderVnd: minOrder,
              totalUses,
              perCustomer,
              usedCount: existing?.usedCount ?? 0,
              startsAt: fromLocalInput(startsAt),
              endsAt: fromLocalInput(endsAt),
              status,
            });
            toast(existing ? `Đã lưu ${code}` : `Đã tạo voucher ${code}`);
            onClose();
          }}
        >
          {existing ? "Lưu voucher" : "Tạo voucher"}
        </Button>
      </div>
    </div>
  );
}

// ── Drop scheduler (inline form + preview theo v3) ──────────

function DropScheduler() {
  const state = useAppState();
  const toast = useToast();
  const sellable = state.products.filter((p) => p.status !== "archived");
  const [productId, setProductId] = useState(sellable[0]?.id ?? "");
  const [alloc, setAlloc] = useState(500);
  const [cap, setCap] = useState(1);
  const [date, setDate] = useState(inHours(24 * 3).slice(0, 10));
  const [time, setTime] = useState("20:00");
  const [early, setEarly] = useState(true);
  const [scheduled, setScheduled] = useState<string | null>(null);

  const product = state.products.find((p) => p.id === productId);
  const dateLabel = date.split("-").reverse().join(".");

  if (scheduled) {
    return (
      <Card className="mx-auto max-w-md animate-pop-in p-10 text-center">
        <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-mint-soft text-[22px] text-mint">
          ✓
        </div>
        <p className="mb-1.5 text-lg font-bold">Drop đã lên lịch</p>
        <p className="mb-1.5 text-[13px] text-tx2">{scheduled}</p>
        <p className="mb-6 font-data text-[11.5px] text-tx3">
          {alloc} bản · {cap}/khách · {time} — {dateLabel}
        </p>
        <Button variant="dark" onClick={() => setScheduled(null)}>
          Lên lịch drop khác
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid items-start gap-4.5 lg:grid-cols-[1fr_360px]">
      <Card className="p-6">
        <p className="mb-1 text-sm font-bold">Lên lịch drop mới</p>
        <p className="mb-5 text-xs text-tx3">
          Drop tự mở bán đúng giờ. Gold+ vào sớm theo cấu hình bên dưới.
        </p>
        <div className="space-y-4">
          <FormField label="Sản phẩm">
            <Select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="!bg-card2"
            >
              {sellable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-semibold">Số lượng phân bổ</p>
              <Stepper value={alloc} onChange={setAlloc} min={50} max={5000} step={50} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold">Giới hạn mỗi khách</p>
              <Stepper value={cap} onChange={setCap} min={1} max={5} />
            </div>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <FormField label="Ngày mở">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="!bg-card2 font-data !text-[12.5px]"
              />
            </FormField>
            <FormField label="Giờ mở">
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="!bg-card2 font-data !text-[12.5px]"
              />
            </FormField>
          </div>
          <div className="flex items-center justify-between rounded-[10px] border border-line px-4 py-3.5">
            <div>
              <p className="text-[13px] font-semibold">
                Early access cho Gold và Collector
              </p>
              <p className="mt-0.5 text-[11px] text-tx3">
                Mở sớm 10 phút trước giờ công bố
              </p>
            </div>
            <Toggle on={early} onChange={setEarly} />
          </div>
          <Button
            variant="dark"
            size="lg"
            className="w-full"
            onClick={() => {
              if (!product) return toast("Cần chọn sản phẩm", "error");
              actions.saveDrop({
                id: uid("drop"),
                name: product.name,
                startsAt: new Date(`${date}T${time}:00`).toISOString(),
                earlyMinutes: early ? 10 : 0,
                items: [{ productId, allocation: alloc, perLimit: cap, sold: 0 }],
              });
              setScheduled(product.name);
              toast("Drop đã vào hàng chờ — tự mở đúng giờ");
            }}
          >
            Lên lịch drop
          </Button>
        </div>
      </Card>

      {/* Xem trước storefront — luôn nền tối như v3 */}
      <div>
        <p className="mb-2.5 font-data text-[10px] tracking-[0.12em] text-tx3">
          XEM TRƯỚC TRÊN STOREFRONT
        </p>
        <div className="rounded-xl border border-[#2A2926] bg-[#121110] p-5.5 text-[#F1EFEA]">
          <span className="mb-3 inline-flex rounded-full border border-[#D8B45A] px-2.5 py-1 font-data text-[9px] tracking-[0.1em] text-[#D8B45A]">
            SẮP MỞ{early ? " · GOLD SỚM 10'" : ""}
          </span>
          <p className="mb-1 text-base font-bold">{product?.name ?? "—"}</p>
          <p className="mb-3 text-[11px] text-[#ABA79D]">
            {alloc} bản · tối đa {cap}/khách · mở {time} ngày {dateLabel}
          </p>
          <div className="flex gap-2">
            {["04", "18", "32"].map((n, i) => (
              <span
                key={i}
                className={`w-[50px] rounded-lg border border-[#2A2926] bg-[#1B1A18] py-1.5 text-center font-data text-[15px] font-semibold ${
                  i === 2 ? "text-[#FF5A36]" : ""
                }`}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────

export default function CampaignsPage() {
  const state = useAppState();
  const toast = useToast();
  const now = useNow();
  const [tab, setTab] = useState<Tab>("drops");
  const [voucherEdit, setVoucherEdit] = useState<Voucher | null | "new">(null);

  // Pre-order campaign form
  const [poOpen, setPoOpen] = useState(false);
  const [poProduct, setPoProduct] = useState("");
  const [poDeposit, setPoDeposit] = useState(30);
  const [poSlots, setPoSlots] = useState(20);
  const [poCloses, setPoCloses] = useState(toLocalInput(inHours(24 * 14)));
  const [poEta, setPoEta] = useState(toLocalInput(inHours(24 * 60)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Chip
            key={t.key}
            label={t.label}
            active={tab === t.key}
            onClick={() => setTab(t.key)}
          />
        ))}
      </div>

      {tab === "vouchers" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setVoucherEdit("new")}>+ Voucher mới</Button>
          </div>
          <Table head={["Mã", "Loại", "Điều kiện", "Đã dùng", "Hiệu lực", "Trạng thái", ""]}>
            {state.vouchers.map((v) => (
              <tr key={v.id} className="transition-colors hover:bg-card2">
                <Td className="font-data text-[12.5px] font-bold">{v.code}</Td>
                <Td className="text-[12.5px]">
                  {voucherKindLabel[v.kind]}
                  {v.kind === "percent"
                    ? ` ${v.value}%`
                    : v.kind === "fixed"
                      ? ` ${formatVnd(v.value)}`
                      : ""}
                </Td>
                <Td className="text-xs text-tx2">
                  Đơn từ {formatVnd(v.minOrderVnd)} · {v.perCustomer} lượt/khách
                </Td>
                <Td className="font-data text-[12.5px] tnum">
                  {v.usedCount.toLocaleString("vi-VN")}/{v.totalUses.toLocaleString("vi-VN")}
                </Td>
                <Td className="font-data text-[10.5px] text-tx3">
                  {formatDateTime(v.startsAt)} → {formatDateTime(v.endsAt)}
                </Td>
                <Td>
                  <Badge
                    className={
                      v.status === "active"
                        ? toneClasses.positive
                        : v.status === "paused"
                          ? toneClasses.warning
                          : toneClasses.neutral
                    }
                  >
                    {v.status === "active" ? "Chạy" : v.status === "paused" ? "Dừng" : "Nháp"}
                  </Badge>
                </Td>
                <Td>
                  <Button variant="secondary" size="sm" onClick={() => setVoucherEdit(v)}>
                    Sửa
                  </Button>
                </Td>
              </tr>
            ))}
          </Table>
        </div>
      ) : null}

      {tab === "flash" ? (
        <div className="space-y-3.5">
          {state.flashSales.map((fs) => {
            const live =
              now >= new Date(fs.startsAt).getTime() &&
              now <= new Date(fs.endsAt).getTime();
            return (
              <Card
                key={fs.id}
                className={`space-y-3 p-5.5 ${live ? "border-l-[3px] border-l-gold" : ""}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">⚡ {fs.name}</p>
                  {live ? (
                    <span className="font-data text-xs font-semibold text-gold">
                      Đang chạy — còn <Countdown target={fs.endsAt} compact />
                    </span>
                  ) : (
                    <Badge className={toneClasses.neutral}>
                      {now < new Date(fs.startsAt).getTime() ? "Chưa mở" : "Đã kết thúc"}
                    </Badge>
                  )}
                </div>
                {fs.items.map((it) => {
                  const product = state.products.find((p) =>
                    p.variants.some((v) => v.id === it.variantId),
                  );
                  const variant = product?.variants.find((v) => v.id === it.variantId);
                  return (
                    <div key={it.variantId} className="flex items-center gap-3 text-sm">
                      <div className="stripe-art flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg">
                        {product?.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-[13px] font-semibold">
                          {product?.name}
                        </p>
                        <p className="font-data text-xs text-tx3">
                          {formatVnd(it.salePriceVnd)}{" "}
                          <span className="line-through">
                            {variant ? formatVnd(variant.priceVnd) : ""}
                          </span>
                        </p>
                      </div>
                      <div className="flex w-40 items-center gap-2">
                        <ProgressBar value={it.sold} max={it.cap} />
                        <span className="font-data text-xs tnum">
                          {it.sold}/{it.cap}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </Card>
            );
          })}
          <p className="text-xs text-tx3">
            Mock: flash sale mới thêm qua dữ liệu seed; editor đầy đủ khi nối backend
            (FR-PROMO-03).
          </p>
        </div>
      ) : null}

      {tab === "drops" ? (
        <div className="space-y-5">
          <DropScheduler />
          <div className="space-y-2.5">
            <p className="text-[13px] font-bold">Drop đã tạo</p>
            {state.drops.map((d) => {
              const phase = dropPhase(d, now);
              const item = d.items[0];
              const product = item
                ? state.products.find((p) => p.id === item.productId)
                : undefined;
              const live = phase === "live" || phase === "early_access";
              return (
                <Card
                  key={d.id}
                  className={`flex flex-wrap items-center gap-4 p-4.5 ${
                    live ? "border-l-[3px] border-l-pri" : ""
                  }`}
                >
                  <div className="stripe-art flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl">
                    {product?.emoji ?? "🔥"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold">{d.name}</p>
                    <p className="text-xs text-tx3">
                      mở {formatDateTime(d.startsAt)} · giới hạn {item?.perLimit}/khách
                      {d.earlyMinutes > 0 ? ` · Gold+ sớm ${d.earlyMinutes}'` : ""}
                    </p>
                    {item ? (
                      <div className="mt-2 flex max-w-xs items-center gap-2">
                        <ProgressBar value={item.sold} max={item.allocation} striped={live} />
                        <span className="font-data text-xs tnum">
                          {item.sold}/{item.allocation}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <Badge
                    className={
                      live
                        ? toneClasses.brand
                        : phase === "scheduled"
                          ? toneClasses.warning
                          : toneClasses.neutral
                    }
                  >
                    {phase === "live"
                      ? "Đang bán"
                      : phase === "early_access"
                        ? "Early access"
                        : phase === "scheduled"
                          ? "Đã lên lịch"
                          : phase === "sold_out"
                            ? "Cháy hàng"
                            : "Kết thúc"}
                  </Badge>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {tab === "preorder" ? (
        <div className="space-y-3.5">
          <div className="flex justify-end">
            <Button onClick={() => setPoOpen(true)}>+ Mở pre-order</Button>
          </div>
          {state.preorderCampaigns.map((c) => {
            const product = state.products.find((p) => p.id === c.productId);
            return (
              <Card key={c.id} className="flex flex-wrap items-center gap-4 p-5">
                <div className="stripe-art flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl">
                  {product?.emoji ?? "📦"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold">{product?.name}</p>
                  <p className="text-xs text-tx3">
                    Cọc {c.depositPercent}% · đóng {formatDateTime(c.closesAt)} · hàng về
                    dự kiến {formatDateTime(c.etaDate)}
                  </p>
                  <p className="text-xs text-tx3">{c.forfeitPolicy}</p>
                  <div className="mt-2 flex max-w-xs items-center gap-2">
                    <ProgressBar value={c.taken} max={c.slots} />
                    <span className="font-data text-xs tnum">
                      {c.taken}/{c.slots} suất
                    </span>
                  </div>
                </div>
                <Badge className={toneClasses.info}>Pre-order</Badge>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* Dialogs */}
      <Dialog
        open={voucherEdit !== null}
        onClose={() => setVoucherEdit(null)}
        title={voucherEdit === "new" ? "Tạo voucher mới" : `Sửa ${voucherEdit?.code ?? ""}`}
        wide
      >
        <VoucherEditor
          existing={voucherEdit === "new" ? undefined : (voucherEdit ?? undefined)}
          onClose={() => setVoucherEdit(null)}
        />
      </Dialog>

      <Dialog open={poOpen} onClose={() => setPoOpen(false)} title="Cấu hình pre-order" wide>
        <div className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Sản phẩm">
              <Select
                value={poProduct}
                onChange={(e) => setPoProduct(e.target.value)}
                className="!bg-card2"
              >
                <option value="">— Chọn sản phẩm —</option>
                {state.products
                  .filter((p) => p.status !== "archived")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </FormField>
            <FormField label="% cọc">
              <Input
                type="number"
                value={poDeposit}
                onChange={(e) => setPoDeposit(Number(e.target.value))}
                className="!bg-card2 font-data"
              />
            </FormField>
            <FormField label="Số suất">
              <Input
                type="number"
                value={poSlots}
                onChange={(e) => setPoSlots(Number(e.target.value))}
                className="!bg-card2 font-data"
              />
            </FormField>
            <FormField label="Đóng nhận đặt">
              <Input
                type="datetime-local"
                value={poCloses}
                onChange={(e) => setPoCloses(e.target.value)}
                className="!bg-card2 font-data !text-[12.5px]"
              />
            </FormField>
            <FormField label="Hàng về dự kiến">
              <Input
                type="datetime-local"
                value={poEta}
                onChange={(e) => setPoEta(e.target.value)}
                className="!bg-card2 font-data !text-[12.5px]"
              />
            </FormField>
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-3.5">
            <Button variant="secondary" onClick={() => setPoOpen(false)}>
              Huỷ
            </Button>
            <Button
              onClick={() => {
                if (!poProduct) return toast("Cần chọn sản phẩm", "error");
                actions.saveCampaign({
                  id: uid("poc"),
                  productId: poProduct,
                  opensAt: new Date().toISOString(),
                  closesAt: fromLocalInput(poCloses),
                  depositPercent: poDeposit,
                  etaDate: fromLocalInput(poEta),
                  slots: poSlots,
                  taken: 0,
                  forfeitPolicy: "Huỷ sau khi chốt đơn: mất 50% tiền cọc",
                });
                toast("Đã lưu cấu hình pre-order");
                setPoOpen(false);
              }}
            >
              Lưu cấu hình pre-order
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
