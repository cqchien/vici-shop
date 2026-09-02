"use client";

import { Fragment, useState } from "react";
import { Badge, Button, LinkButton, StatTile } from "@/components/ui/basics";
import { Table, Td, Tabs } from "@/components/ui/data";
import { Select, Stepper } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { formatDateTime, formatVnd } from "@/lib/format";
import { movementReasonLabel, toneClasses } from "@/lib/labels";
import { actions, useAppState } from "@/lib/mock/store";
import { inventoryValue, skuLabel } from "@/lib/mock/selectors";

const ADJUST_REASONS = [
  "Kiểm kê định kỳ",
  "Hàng lỗi/hỏng",
  "Nhập từ phiếu nhập",
  "Điều chỉnh thủ công",
];

export default function AdminInventoryPage() {
  const state = useAppState();
  const toast = useToast();
  const [tab, setTab] = useState<"stock" | "movements">("stock");
  const [openSku, setOpenSku] = useState<string | null>(null);
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState(ADJUST_REASONS[0]);

  const lowCount = state.stock.filter(
    (i) => i.threshold > 0 && i.onHand - i.reserved <= i.threshold,
  ).length;

  function levelColor(avail: number, threshold: number): string {
    if (avail === 0) return "bg-tx3";
    if (threshold > 0 && avail <= threshold) return "bg-drop";
    if (threshold > 0 && avail <= threshold * 2) return "bg-gold";
    return "bg-mint";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { key: "stock", label: "Tồn theo SKU" },
            { key: "movements", label: `Biến động (${state.movements.length})` },
          ]}
          active={tab}
          onChange={setTab}
        />
        <LinkButton href="/admin/inventory/receipts" variant="secondary">
          Phiếu nhập hàng →
        </LinkButton>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-3">
        <StatTile
          label="Giá trị tồn (giá vốn)"
          value={formatVnd(inventoryValue(state))}
        />
        <StatTile label="Số SKU" value={String(state.stock.length)} />
        <StatTile
          label="Dưới ngưỡng cảnh báo"
          value={String(lowCount)}
          tone={lowCount > 0 ? "danger" : "positive"}
        />
      </div>

      {tab === "stock" ? (
        <Table head={["Sản phẩm", "Tồn kho", "Mức độ", "Giá vốn TB", ""]}>
          {state.stock.map((item) => {
            const label = skuLabel(state, item.sku);
            const avail = item.onHand - item.reserved;
            const low = item.threshold > 0 && avail <= item.threshold;
            const cost =
              state.costLots.find((c) => c.sku === item.sku)?.avgCostVnd ?? 0;
            const pct = Math.min(
              100,
              Math.round(
                (avail / Math.max(1, item.threshold > 0 ? item.threshold * 4 : avail)) *
                  100,
              ),
            );
            const isOpen = openSku === item.sku;
            return (
              <Fragment key={item.sku}>
                <tr className="transition-colors hover:bg-card2">
                  <Td>
                    <p className="font-semibold">{label.name}</p>
                    <p className="font-data text-[10.5px] text-tx3">
                      {item.sku}
                      {label.variantName ? ` · ${label.variantName}` : ""}
                    </p>
                  </Td>
                  <Td>
                    <span
                      className={`font-data text-[13px] font-bold tnum ${
                        avail === 0 ? "text-tx3" : low ? "text-drop" : ""
                      }`}
                    >
                      {avail}
                    </span>
                    {item.reserved > 0 ? (
                      <span className="ml-1.5 font-data text-[10.5px] text-tx3">
                        (+{item.reserved} giữ)
                      </span>
                    ) : null}
                    {low ? (
                      <Badge className={`ml-2 ${toneClasses.danger}`}>Sắp hết</Badge>
                    ) : null}
                  </Td>
                  <Td>
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-card2">
                      <div
                        className={`h-full rounded-full ${levelColor(avail, item.threshold)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Td>
                  <Td className="font-data text-[12.5px] tnum">{formatVnd(cost)}</Td>
                  <Td>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setOpenSku(isOpen ? null : item.sku);
                        setDelta(0);
                        setReason(ADJUST_REASONS[0]);
                      }}
                    >
                      Điều chỉnh
                    </Button>
                  </Td>
                </tr>
                {isOpen ? (
                  <tr key={`${item.sku}-adjust`} className="bg-card2">
                    <td colSpan={5} className="px-5 py-4">
                      <div className="flex flex-wrap items-end gap-4">
                        <div>
                          <p className="mb-1.5 text-[11px] font-semibold text-tx2">
                            Số lượng thay đổi
                          </p>
                          <Stepper
                            value={delta}
                            onChange={setDelta}
                            min={-item.onHand}
                            max={999}
                            format={(v) => (v > 0 ? `+${v}` : String(v))}
                          />
                        </div>
                        <div className="min-w-52 flex-1">
                          <p className="mb-1.5 text-[11px] font-semibold text-tx2">
                            Lý do (bắt buộc — FR-INV-04)
                          </p>
                          <Select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="!py-2.5"
                          >
                            {ADJUST_REASONS.map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </Select>
                        </div>
                        <Button
                          variant="dark"
                          disabled={delta === 0}
                          onClick={() => {
                            const r = actions.adjustStock(item.sku, delta, reason);
                            if (r.ok) {
                              toast(`Đã điều chỉnh kho — lý do: ${reason}`);
                              setOpenSku(null);
                            } else toast(r.error, "error");
                          }}
                        >
                          Xác nhận
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </Table>
      ) : (
        <Table head={["Thời điểm", "SKU", "Δ", "Lý do", "Tham chiếu"]}>
          {state.movements.slice(0, 100).map((m) => (
            <tr key={m.id}>
              <Td className="font-data text-[11px] text-tx3">
                {formatDateTime(m.at)}
              </Td>
              <Td className="font-data text-[12px] font-semibold">{m.sku}</Td>
              <Td
                className={`font-data font-bold tnum ${
                  m.delta >= 0 ? "text-mint" : "text-drop"
                }`}
              >
                {m.delta >= 0 ? "+" : ""}
                {m.delta}
              </Td>
              <Td className="text-[12.5px]">{movementReasonLabel[m.reason]}</Td>
              <Td className="text-xs text-tx3">
                {m.refId ?? ""}
                {m.note ? ` — ${m.note}` : ""}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <p className="text-xs text-tx3">
        Phiếu nhập hàng là nguồn cập nhật giá vốn moving-average (FR-ACC-02).
      </p>
    </div>
  );
}
