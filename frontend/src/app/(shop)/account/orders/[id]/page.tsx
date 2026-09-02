"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, EmptyState } from "@/components/ui/basics";
import { OrderStatusBadge, ShipmentStatusBadge } from "@/components/ui/commerce";
import { Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { formatDate, formatDateTime, formatVnd } from "@/lib/format";
import { orderStatusMeta, paymentMethodLabel, toneClasses } from "@/lib/labels";
import { actions, currentUser, useAppState } from "@/lib/mock/store";

export default function MyOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  const toast = useToast();
  const user = currentUser(state)!;
  const order = state.orders.find((o) => o.id === id && o.customerId === user.id);
  const [returnReason, setReturnReason] = useState("");
  const [showReturn, setShowReturn] = useState(false);

  if (!order) return <EmptyState title="Không tìm thấy đơn hàng" />;

  const shipment = state.shipments.find((s) => s.orderId === order.id);
  const campaign = order.campaignId
    ? state.preorderCampaigns.find((c) => c.id === order.campaignId)
    : undefined;
  const cancellable = [
    "pending_payment",
    "confirmed",
    "deposit_paid",
    "awaiting_stock",
    "balance_due",
  ].includes(order.status);
  const balance = order.totalVnd - (order.depositVnd ?? 0);
  const timeline = [...order.timeline].reverse();

  return (
    <div>
      <Link
        href="/account/orders"
        className="text-[12.5px] text-tx3 hover:text-pri"
      >
        ← Tất cả đơn hàng
      </Link>
      <div className="mt-3 mb-5 flex items-baseline justify-between">
        <h2 className="text-[21px] font-bold tracking-[-0.01em]">
          Đơn {order.code}
        </h2>
        {order.kind === "preorder" ? (
          <Badge className={toneClasses.info}>Pre-order</Badge>
        ) : (
          <OrderStatusBadge status={order.status} />
        )}
      </div>

      <div className="space-y-4.5">
        {/* Sản phẩm + tổng tiền */}
        <Card className="p-5.5">
          <div className="space-y-3">
            {order.lines.map((l) => (
              <div key={l.variantId} className="flex items-center gap-4 text-sm">
                <div className="stripe-art flex h-[78px] w-[68px] shrink-0 items-center justify-center rounded-[10px] text-2xl">
                  {l.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[15px] font-semibold">{l.name}</p>
                  <p className="mt-0.5 text-[12.5px] text-tx2">
                    {l.variantName} ×{l.qty}
                  </p>
                </div>
                <span className="font-data tnum">
                  {formatVnd(l.unitPriceVnd * l.qty)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-line pt-3.5 text-[13.5px]">
            <div className="flex justify-between">
              <span className="text-tx2">Vận chuyển — {order.shipMethod}</span>
              <span className="font-data tnum">
                {order.shipFeeVnd === 0 ? "Miễn phí" : formatVnd(order.shipFeeVnd)}
              </span>
            </div>
            {order.discountVnd > 0 ? (
              <div className="flex justify-between text-mint">
                <span>Giảm giá {order.voucherCode ? `(${order.voucherCode})` : ""}</span>
                <span className="font-data tnum">−{formatVnd(order.discountVnd)}</span>
              </div>
            ) : null}
            {order.kind === "preorder" ? (
              <>
                <div className="flex justify-between">
                  <span className="text-tx2">Tổng giá trị</span>
                  <span className="font-data tnum">{formatVnd(order.totalVnd)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Đã cọc</span>
                  <span className="font-data tnum">
                    {formatVnd(order.depositVnd ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sky">
                  <span>Còn lại khi hàng về</span>
                  <span className="font-data tnum">{formatVnd(balance)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-[15px] font-semibold">
                <span>Tổng</span>
                <span className="font-data tnum">{formatVnd(order.totalVnd)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Hành trình đơn hàng */}
        <Card className="p-6">
          <h3 className="mb-5 font-display text-[14.5px] font-bold">
            Hành trình đơn hàng
          </h3>
          {timeline.map((t, i) => {
            const isLatest = i === 0;
            const isLast = i === timeline.length - 1;
            return (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isLatest ? "bg-sky text-white" : "bg-mint text-white"
                    }`}
                  >
                    {isLatest ? "●" : "✓"}
                  </span>
                  {!isLast ? (
                    <span className="w-0.5 min-h-7 flex-1 bg-mint" />
                  ) : null}
                </div>
                <div className="flex-1 pb-5">
                  <div className="flex items-baseline justify-between">
                    <p className="text-[13.5px] font-semibold">
                      {orderStatusMeta[t.status].label}
                    </p>
                    <p className="font-data text-[10.5px] text-tx3">
                      {formatDateTime(t.at)}
                    </p>
                  </div>
                  {t.note ? (
                    <p className="mt-0.5 text-[12.5px] text-tx2 text-pretty">
                      {t.note}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
          {campaign && order.kind === "preorder" ? (
            <p className="text-xs text-tx3">
              Hàng về dự kiến {formatDate(campaign.etaDate)} · {campaign.forfeitPolicy}
            </p>
          ) : null}
        </Card>

        {/* Thanh toán phần còn lại (pre-order) */}
        {order.kind === "preorder" && order.status !== "cancelled" ? (
          <div className="flex items-center justify-between rounded-xl border border-line2 bg-card2 px-5.5 py-4.5">
            <div>
              <p className="text-[13.5px] font-semibold">
                Thanh toán phần còn lại — {formatVnd(balance)}
              </p>
              <p className="mt-0.5 text-xs text-tx3">
                {order.status === "balance_due"
                  ? "Hàng đã về kho — bạn có 7 ngày để thanh toán."
                  : "Nút mở khi hàng về kho. Vici báo qua Zalo và email."}
              </p>
            </div>
            {order.status === "balance_due" ? (
              <Button
                onClick={() => {
                  const r = actions.payBalance(order.id, "vnpay");
                  toast(
                    r.ok ? "Đã thanh toán đủ — đơn chuyển sang xử lý" : r.error,
                    r.ok ? "success" : "error",
                  );
                }}
              >
                Thanh toán ngay
              </Button>
            ) : (
              <Button disabled>Chưa mở</Button>
            )}
          </div>
        ) : null}

        {/* Giao hàng + thanh toán */}
        <div className="grid gap-4.5 sm:grid-cols-2">
          <Card className="p-5.5 text-sm">
            <h3 className="mb-2 font-display text-[14.5px] font-bold">Giao hàng</h3>
            <p className="text-[13px] leading-relaxed text-tx2">{order.addressText}</p>
            <p className="mt-1 text-xs text-tx3">{order.shipMethod}</p>
            {shipment ? (
              <div className="mt-3 rounded-[10px] bg-card2 px-3.5 py-3">
                <p className="font-data text-xs font-semibold">
                  {shipment.carrier.toUpperCase()} · {shipment.trackingCode}
                </p>
                <div className="mt-1.5">
                  <ShipmentStatusBadge status={shipment.status} />
                </div>
              </div>
            ) : null}
          </Card>

          <Card className="p-5.5 text-sm">
            <h3 className="mb-2 font-display text-[14.5px] font-bold">Thanh toán</h3>
            <ul className="space-y-1.5">
              {order.transactions.map((t) => (
                <li key={t.id} className="flex justify-between text-[13px]">
                  <span className="text-tx2">
                    {t.purpose === "deposit"
                      ? "Cọc"
                      : t.purpose === "balance"
                        ? "Phần còn lại"
                        : t.purpose === "refund"
                          ? "Hoàn tiền"
                          : "Thanh toán"}{" "}
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
        </div>

        {/* Hành động */}
        <div className="flex flex-wrap gap-2.5">
          {cancellable ? (
            <Button
              variant="secondary"
              className="hover:!border-drop hover:!text-drop"
              onClick={() => {
                const r = actions.cancelOrder(order.id);
                toast(r.ok ? "Đã huỷ đơn" : r.error, r.ok ? "success" : "error");
              }}
            >
              Huỷ đơn
            </Button>
          ) : null}
          {order.status === "delivered" && !showReturn ? (
            <Button variant="secondary" onClick={() => setShowReturn(true)}>
              Yêu cầu đổi trả (trong 7 ngày)
            </Button>
          ) : null}
        </div>
        {showReturn ? (
          <Card className="space-y-2.5 p-4.5">
            <Textarea
              rows={2}
              placeholder="Lý do đổi trả…"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
            />
            <Button
              size="sm"
              variant="dark"
              onClick={() => {
                const r = actions.requestReturn(order.id, returnReason);
                toast(
                  r.ok ? "Đã gửi yêu cầu đổi trả" : r.error,
                  r.ok ? "success" : "error",
                );
                setShowReturn(false);
              }}
            >
              Gửi yêu cầu
            </Button>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
