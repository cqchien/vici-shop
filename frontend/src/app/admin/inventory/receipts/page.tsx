"use client";

import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui/basics";
import { FormField, Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { formatDate, formatVnd } from "@/lib/format";
import { toneClasses } from "@/lib/labels";
import { actions, useAppState } from "@/lib/mock/store";
import type { ReceiptLine } from "@/lib/types";

const paymentLabel = {
  paid: "Đã trả",
  partial: "Trả một phần",
  unpaid: "Chưa trả",
} as const;
const paymentTone = { paid: "positive", partial: "warning", unpaid: "danger" } as const;

export default function ReceiptsPage() {
  const state = useAppState();
  const toast = useToast();
  const [supplier, setSupplier] = useState("");
  const [payment, setPayment] = useState<"paid" | "partial" | "unpaid">("unpaid");
  const [lines, setLines] = useState<ReceiptLine[]>([
    { sku: state.stock[0]?.sku ?? "", qty: 0, unitCostVnd: 0 },
  ]);

  const total = lines.reduce((s, l) => s + l.qty * l.unitCostVnd, 0);

  function setLine(i: number, patch: Partial<ReceiptLine>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  function save() {
    const valid = lines.filter((l) => l.sku && l.qty > 0 && l.unitCostVnd > 0);
    if (!supplier.trim() || valid.length === 0) {
      toast("Cần nhà cung cấp và ít nhất một dòng hợp lệ", "error");
      return;
    }
    const r = actions.createReceipt({ supplier, lines: valid, paymentStatus: payment });
    if (r.ok) {
      toast(`Đã tạo phiếu nhập ${formatVnd(total)}`);
      setSupplier("");
      setLines([{ sku: state.stock[0]?.sku ?? "", qty: 0, unitCostVnd: 0 }]);
    } else toast(r.error, "error");
  }

  return (
    <div className="grid items-start gap-4.5 lg:grid-cols-[1fr_320px]">
      {/* Tạo phiếu nhập */}
      <Card className="p-6">
        <p className="mb-4 text-sm font-bold">Tạo phiếu nhập hàng</p>
        <div className="mb-4.5 grid gap-3 sm:grid-cols-2">
          <FormField label="Nhà cung cấp">
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Studio MÂY (Hà Nội)"
              className="!bg-card2"
            />
          </FormField>
          <FormField label="Thanh toán NCC">
            <Select
              value={payment}
              onChange={(e) => setPayment(e.target.value as typeof payment)}
              className="!bg-card2"
            >
              <option value="unpaid">Chưa trả</option>
              <option value="partial">Trả một phần</option>
              <option value="paid">Đã trả đủ</option>
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_36px] gap-2 border-b border-line px-1 pb-2 font-data text-[9.5px] tracking-[0.06em] text-tx3 uppercase">
          <span>SKU / sản phẩm</span>
          <span>Số lượng</span>
          <span>Đơn giá</span>
          <span>Thành tiền</span>
          <span />
        </div>
        <div className="space-y-2 py-2.5">
          {lines.map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_36px] items-center gap-2"
            >
              <Select
                value={l.sku}
                onChange={(e) => setLine(i, { sku: e.target.value })}
                className="!bg-card2 !py-2 font-data !text-[12px]"
              >
                {state.stock.map((s) => (
                  <option key={s.sku} value={s.sku}>
                    {s.sku}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                placeholder="SL"
                value={l.qty || ""}
                onChange={(e) => setLine(i, { qty: Number(e.target.value) })}
                className="!bg-card2 !py-2 font-data !text-[12.5px]"
              />
              <Input
                type="number"
                placeholder="Giá vốn"
                value={l.unitCostVnd || ""}
                onChange={(e) => setLine(i, { unitCostVnd: Number(e.target.value) })}
                className="!bg-card2 !py-2 font-data !text-[12.5px]"
              />
              <span className="font-data text-[12.5px] font-bold tnum">
                {l.qty > 0 && l.unitCostVnd > 0 ? formatVnd(l.qty * l.unitCostVnd) : "—"}
              </span>
              <button
                aria-label="Xoá dòng"
                onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                className="cursor-pointer text-[15px] text-tx3 hover:text-drop"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setLines((ls) => [
              ...ls,
              { sku: state.stock[0]?.sku ?? "", qty: 0, unitCostVnd: 0 },
            ])
          }
        >
          + Thêm dòng SKU
        </Button>

        <p className="mt-4 text-xs text-tx3">
          Nhập kho sẽ: cộng tồn, cập nhật giá vốn moving-average, ghi sổ cái, chuyển đơn
          pre-order chờ hàng sang &quot;chờ thanh toán nốt&quot; và báo waitlist
          (FR-INV-05, FR-ORD-08, FR-PROMO-07).
        </p>

        <div className="mt-4.5 flex items-center justify-between border-t border-line pt-4">
          <span className="text-sm font-bold">
            Tổng giá trị nhập:{" "}
            <span className="font-data tnum">{formatVnd(total)}</span>
          </span>
          <Button onClick={save}>Tạo phiếu nhập</Button>
        </div>
      </Card>

      {/* Phiếu gần đây */}
      <Card className="p-5.5">
        <p className="mb-3.5 text-[13px] font-bold">Phiếu gần đây</p>
        <div className="space-y-3.5">
          {state.receipts.map((r) => {
            const rTotal = r.lines.reduce((s, l) => s + l.qty * l.unitCostVnd, 0);
            return (
              <div key={r.id} className="border-b border-line pb-3 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold">{r.supplier}</p>
                  <Badge className={toneClasses[paymentTone[r.paymentStatus]]}>
                    {paymentLabel[r.paymentStatus]}
                  </Badge>
                </div>
                <p className="mt-1 font-data text-[11px] text-tx3">
                  {formatDate(r.receivedAt)} · {r.lines.length} dòng ·{" "}
                  <span className="font-semibold text-tx">{formatVnd(rTotal)}</span>
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
