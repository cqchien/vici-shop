"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, EmptyState } from "@/components/ui/basics";
import { ShipmentStatusBadge } from "@/components/ui/commerce";
import { Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { formatDateTime, formatVnd } from "@/lib/format";
import {
  orderStatusMeta,
  orderTransitions,
  paymentMethodLabel,
  toneClasses,
} from "@/lib/labels";
import { actions, useAppState } from "@/lib/mock/store";

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  const toast = useToast();
  const order = state.orders.find((o) => o.id === id);
  const [noteDraft, setNoteDraft] = useState("");

  if (!order) return <EmptyState title="Không tìm thấy đơn" />;

  const customer = state.users.find((u) => u.id === order.customerId);
  const shipment = state.shipments.find((s) => s.orderId === order.id);
  const nextStates = orderTransitions[order.status] ?? [];
  const subtotal = order.lines.reduce((s, l) => s + l.unitPriceVnd * l.qty, 0);
  const cogs = order.lines.reduce((s, l) => s + l.costVnd * l.qty, 0);
  const notes = (order.adminNote ?? "").split("\n").filter(Boolean);
  const timeline = [...order.timeline].reverse();

  function addNote() {
    if (!noteDraft.trim()) return;
    const stamp = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    actions.setAdminNote(
      order!.id,
      [`${noteDraft.trim()} — ${stamp}`, ...notes].join("\n"),
    );
    setNoteDraft("");
  }

  return (
    <div>
      <Link href="/admin/orders" className="text-[12.5px] text-tx3 hover:text-pri">
        ← Danh sách đơn hàng
      </Link>
      <div className="mt-3.5 grid items-start gap-4.5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3.5">
          {/* Thông tin đơn */}
          <Card className="p-5.5">
            <div className="mb-3.5 flex items-baseline justify-between">
              <p className="text-base font-bold">Đơn {order.code}</p>
              {order.dropId ? (
                <Badge className={toneClasses.danger}>Drop</Badge>
              ) : order.kind === "preorder" ? (
                <Badge className={toneClasses.info}>Pre-order</Badge>
              ) : (
                <Badge className={toneClasses.neutral}>Thường</Badge>
              )}
            </div>
            <p className="mb-4 text-[13px] leading-relaxed text-tx2">
              {customer?.name} · {customer?.phone}
              <br />
              {order.addressText}
              <br />
              {order.shipMethod} · tạo {formatDateTime(order.createdAt)}
            </p>
            <div className="space-y-2.5 border-t border-line pt-3.5">
              {order.lines.map((l) => (
                <div key={l.variantId} className="flex items-center gap-3 text-sm">
                  <div className="stripe-art flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl">
                    {l.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[13px] font-semibold">{l.name}</p>
                    <p className="font-data text-[10.5px] text-tx3">
                      {l.sku} · ×{l.qty} · vốn {formatVnd(l.costVnd)}
                    </p>
                  </div>
                  <span className="font-data text-[12.5px] tnum">
                    {formatVnd(l.unitPriceVnd * l.qty)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3.5 space-y-1.5 border-t border-line pt-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-tx2">Tiền hàng</span>
                <span className="font-data tnum">{formatVnd(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tx2">Vận chuyển</span>
                <span className="font-data tnum">{formatVnd(order.shipFeeVnd)}</span>
              </div>
              {order.discountVnd > 0 ? (
                <div className="flex justify-between text-mint">
                  <span>Giảm ({order.voucherCode})</span>
                  <span className="font-data tnum">−{formatVnd(order.discountVnd)}</span>
                </div>
              ) : null}
              {order.pointsUsed > 0 ? (
                <div className="flex justify-between text-mint">
                  <span>Điểm</span>
                  <span className="font-data tnum">
                    −{formatVnd(order.pointsUsed * state.settings.pointValueVnd)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between font-semibold">
                <span>Tổng</span>
                <span className="font-data tnum">{formatVnd(order.totalVnd)}</span>
              </div>
              <div className="flex justify-between text-xs text-tx3">
                <span>Lãi gộp ước tính</span>
                <span className="font-data tnum">
                  {formatVnd(subtotal - order.discountVnd - cogs)}
                </span>
              </div>
            </div>
          </Card>

          {/* Lịch sử */}
          <Card className="p-5.5">
            <p className="mb-4 text-[13.5px] font-bold">Lịch sử đơn</p>
            {timeline.map((t, i) => (
              <div key={i} className="flex gap-3.5">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      i === 0 ? "bg-sky text-white" : "bg-mint text-white"
                    }`}
                  >
                    {i === 0 ? "●" : "✓"}
                  </span>
                  {i < timeline.length - 1 ? (
                    <span className="w-0.5 min-h-5 flex-1 bg-mint" />
                  ) : null}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-[13px] font-semibold">
                      {orderStatusMeta[t.status].label}
                    </p>
                    <p className="font-data text-[10.5px] text-tx3">
                      {formatDateTime(t.at)}
                    </p>
                  </div>
                  {t.note ? (
                    <p className="mt-0.5 text-xs text-tx2">{t.note}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </Card>

          {/* Ghi chú nội bộ */}
          <Card className="p-5.5">
            <p className="mb-3.5 text-[13.5px] font-bold">Ghi chú nội bộ</p>
            {notes.length > 0 ? (
              <div className="mb-3.5 space-y-2">
                {notes.map((n, i) => (
                  <p
                    key={i}
                    className="rounded-lg bg-card2 px-3.5 py-2.5 text-[12.5px] text-tx2"
                  >
                    {n}
                  </p>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Input
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                placeholder="Thêm ghi chú nội bộ…"
                className="!bg-card2 !py-2.5 !text-[12.5px]"
              />
              <Button variant="dark" size="sm" onClick={addNote}>
                Gửi
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-3.5">
          <Card className="p-5">
            <p className="mb-3.5 text-[13px] font-bold">Chuyển trạng thái</p>
            <div className="mb-4 space-y-2">
              {order.timeline.map((t, i) => (
                <div
                  key={i}
                  className={`rounded-lg border px-3 py-2 text-[12.5px] font-semibold ${
                    i === order.timeline.length - 1
                      ? "border-mint bg-mint-soft text-mint"
                      : "border-line bg-card text-tx3"
                  }`}
                >
                  {orderStatusMeta[t.status].label}
                </div>
              ))}
            </div>
            {nextStates.length > 0 ? (
              <div className="space-y-2">
                {nextStates.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    className="w-full"
                    variant={
                      s === "cancelled" || s === "returned" ? "secondary" : "primary"
                    }
                    onClick={() => {
                      const r = actions.advanceOrder(order.id, s);
                      toast(
                        r.ok
                          ? `Đơn ${order.code} chuyển sang: ${orderStatusMeta[s].label}`
                          : r.error,
                        r.ok ? "success" : "error",
                      );
                    }}
                  >
                    Chuyển sang: {orderStatusMeta[s].label} →
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-tx3">Đơn đã ở trạng thái cuối.</p>
            )}
          </Card>

          <Card className="p-5 text-sm">
            <p className="mb-2.5 text-[13px] font-bold">Thanh toán</p>
            <ul className="space-y-1.5">
              {order.transactions.map((t) => (
                <li key={t.id} className="flex justify-between text-[12.5px]">
                  <span className="text-tx2">
                    {t.purpose === "deposit"
                      ? "Cọc"
                      : t.purpose === "balance"
                        ? "Còn lại"
                        : t.purpose === "refund"
                          ? "Hoàn"
                          : "Full"}{" "}
                    · {paymentMethodLabel[t.method]}
                    {t.status === "pending" ? " (chờ)" : ""}
                  </span>
                  <span
                    className={`font-data tnum ${t.purpose === "refund" ? "text-drop" : ""}`}
                  >
                    {t.purpose === "refund" ? "−" : ""}
                    {formatVnd(Math.abs(t.amountVnd))}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {shipment ? (
            <Card className="p-5 text-sm">
              <p className="mb-2.5 text-[13px] font-bold">Vận đơn</p>
              <p className="font-data text-[12.5px] font-semibold">
                {shipment.carrier.toUpperCase()} · {shipment.trackingCode}
              </p>
              <div className="mt-2">
                <ShipmentStatusBadge status={shipment.status} />
              </div>
              <p className="mt-2 text-xs text-tx3">
                {shipment.attempts} lần phát · cập nhật{" "}
                {formatDateTime(shipment.updatedAt)}
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
