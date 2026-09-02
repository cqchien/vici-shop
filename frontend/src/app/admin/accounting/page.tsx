"use client";

import { useMemo, useState } from "react";
import { Badge, Card, StatTile, Button } from "@/components/ui/basics";
import { Table, Td, Tabs } from "@/components/ui/data";
import { Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { formatDate, formatDateTime, formatVnd } from "@/lib/format";
import { toneClasses } from "@/lib/labels";
import { actions, useAppState, useNow } from "@/lib/mock/store";
import { completedOrders, orderCogs, orderRevenue } from "@/lib/mock/selectors";

const DAY = 86_400_000;

const EXPENSE_CATEGORIES = [
  "Vận hành",
  "Mặt bằng",
  "Vận chuyển",
  "Marketing",
  "Đóng gói",
  "Nhân sự",
  "Khác",
];

export default function AccountingPage() {
  const state = useAppState();
  const toast = useToast();
  const now = useNow();
  const [tab, setTab] = useState<"pnl" | "ledger" | "expenses">("pnl");
  const [exCategory, setExCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [exAmount, setExAmount] = useState("");
  const [exNote, setExNote] = useState("");

  // P&L 30 ngày gần nhất
  const pnl = useMemo(() => {
    const from = now - 30 * DAY;
    const orders = completedOrders(state).filter(
      (o) => new Date(o.createdAt).getTime() >= from,
    );
    const revenue = orders.reduce((s, o) => s + orderRevenue(o), 0);
    const cogs = orders.reduce((s, o) => s + orderCogs(o), 0);
    const gatewayFee = orders
      .flatMap((o) => o.transactions)
      .filter(
        (t) => t.status === "succeeded" && t.method !== "cod" && t.purpose !== "refund",
      )
      .reduce((s, t) => s + Math.round(t.amountVnd * 0.011), 0); // ~1.1% phí cổng
    const expenses = state.expenses
      .filter((e) => new Date(e.at).getTime() >= from)
      .reduce((s, e) => s + e.amountVnd, 0);
    const profit = revenue - cogs - gatewayFee - expenses;
    return { revenue, cogs, gatewayFee, expenses, profit };
  }, [state, now]);

  const depositLiability = state.orders
    .filter(
      (o) =>
        o.kind === "preorder" &&
        ["deposit_paid", "awaiting_stock", "balance_due"].includes(o.status),
    )
    .reduce((s, o) => s + (o.depositVnd ?? 0), 0);

  function logExpense() {
    const r = actions.addExpense(exCategory, Number(exAmount), exNote);
    if (r.ok) {
      toast("Đã ghi chi phí vào sổ");
      setExAmount("");
      setExNote("");
    } else toast(r.error, "error");
  }

  return (
    <div className="space-y-4">
      {/* KPI 30 ngày */}
      <div className="grid gap-3.5 sm:grid-cols-3">
        <StatTile
          label="Doanh thu 30 ngày"
          value={formatVnd(pnl.revenue)}
          tone="positive"
        />
        <StatTile
          label="Chi phí 30 ngày (vốn + vận hành)"
          value={formatVnd(pnl.cogs + pnl.expenses + pnl.gatewayFee)}
          tone="danger"
        />
        <StatTile
          label="Lợi nhuận ước tính"
          value={formatVnd(pnl.profit)}
          tone={pnl.profit >= 0 ? "default" : "danger"}
        />
      </div>

      <div className="grid items-start gap-3.5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3.5">
          <Tabs
            tabs={[
              { key: "pnl", label: "Lãi / lỗ" },
              { key: "ledger", label: `Sổ cái (${state.journal.length})` },
              { key: "expenses", label: `Chi phí (${state.expenses.length})` },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === "pnl" ? (
            <Card className="p-5.5">
              <table className="w-full max-w-lg text-sm">
                <tbody className="divide-y divide-line">
                  <tr>
                    <td className="py-2.5">Doanh thu thuần (đơn hoàn tất)</td>
                    <td className="py-2.5 text-right font-data font-semibold tnum">
                      {formatVnd(pnl.revenue)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-tx2">
                      − Giá vốn hàng bán (moving average)
                    </td>
                    <td className="py-2.5 text-right font-data text-drop tnum">
                      −{formatVnd(pnl.cogs)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-tx2">− Phí cổng thanh toán (~1,1%)</td>
                    <td className="py-2.5 text-right font-data text-drop tnum">
                      −{formatVnd(pnl.gatewayFee)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-tx2">− Chi phí vận hành</td>
                    <td className="py-2.5 text-right font-data text-drop tnum">
                      −{formatVnd(pnl.expenses)}
                    </td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-2.5">= Lợi nhuận</td>
                    <td
                      className={`py-2.5 text-right font-data tnum ${
                        pnl.profit >= 0 ? "text-mint" : "text-drop"
                      }`}
                    >
                      {formatVnd(pnl.profit)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-3.5 text-xs text-tx3">
                Tiền cọc pre-order đang giữ:{" "}
                <strong className="font-data tnum">{formatVnd(depositLiability)}</strong>{" "}
                — là khoản khách trả trước, chưa ghi nhận doanh thu (FR-ACC-01).
              </p>
            </Card>
          ) : null}

          {tab === "ledger" ? (
            <Table head={["Số", "Ngày", "Diễn giải", "Tài khoản", "Nợ", "Có"]}>
              {state.journal.map((j) =>
                j.lines.map((l, i) => (
                  <tr key={`${j.id}_${i}`} className={i === 0 ? "" : "opacity-70"}>
                    <Td className="font-data text-[11.5px] tnum">
                      {i === 0 ? `#${j.no}` : ""}
                    </Td>
                    <Td className="font-data text-[10.5px] text-tx3">
                      {i === 0 ? formatDate(j.at) : ""}
                    </Td>
                    <Td className="max-w-52">
                      {i === 0 ? (
                        <>
                          <p className="line-clamp-1 text-xs">{j.memo}</p>
                          <p className="font-data text-[9.5px] text-tx3">{j.source}</p>
                        </>
                      ) : null}
                    </Td>
                    <Td className="text-xs">{l.account}</Td>
                    <Td className="font-data text-[11.5px] tnum">
                      {l.debitVnd ? formatVnd(l.debitVnd) : ""}
                    </Td>
                    <Td className="font-data text-[11.5px] tnum">
                      {l.creditVnd ? formatVnd(l.creditVnd) : ""}
                    </Td>
                  </tr>
                )),
              )}
            </Table>
          ) : null}

          {tab === "expenses" ? (
            <Table head={["Ngày", "Danh mục", "Ghi chú", "Số tiền"]}>
              {state.expenses.map((e) => (
                <tr key={e.id}>
                  <Td className="font-data text-[10.5px] text-tx3">
                    {formatDateTime(e.at)}
                  </Td>
                  <Td>
                    <Badge className={toneClasses.danger}>{e.category}</Badge>
                  </Td>
                  <Td className="text-[12.5px]">{e.note}</Td>
                  <Td className="font-data text-[12.5px] font-bold text-drop tnum">
                    −{formatVnd(e.amountVnd)}
                  </Td>
                </tr>
              ))}
            </Table>
          ) : null}
        </div>

        {/* Ghi chi phí — form luôn hiện (v3) */}
        <Card className="p-5">
          <p className="mb-3.5 text-[13px] font-bold">Ghi chi phí</p>
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-tx2">Mô tả</p>
              <Input
                value={exNote}
                onChange={(e) => setExNote(e.target.value)}
                placeholder="Thuê mặt bằng tháng 8…"
                className="!bg-card2 !py-2.5 !text-[12.5px]"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-tx2">Số tiền (₫)</p>
              <Input
                type="number"
                value={exAmount}
                onChange={(e) => setExAmount(e.target.value)}
                className="!bg-card2 !py-2.5 font-data !text-[12.5px]"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-tx2">Danh mục</p>
              <Select
                value={exCategory}
                onChange={(e) => setExCategory(e.target.value)}
                className="!bg-card2 !py-2.5 !text-[12.5px]"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
            <Button variant="dark" className="w-full" onClick={logExpense}>
              Ghi vào sổ
            </Button>
            <p className="text-[11px] text-tx3">
              Mỗi chi phí tự sinh bút toán Nợ 642 / Có 111 trong sổ cái.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
