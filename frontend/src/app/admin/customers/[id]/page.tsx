"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, EmptyState } from "@/components/ui/basics";
import { OrderStatusBadge } from "@/components/ui/commerce";
import { Input, Stepper } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { formatDateTime, formatVnd } from "@/lib/format";
import { pointReasonLabel, tierMeta, toneClasses } from "@/lib/labels";
import { actions, useAppState } from "@/lib/mock/store";

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  const toast = useToast();
  const user = state.users.find((u) => u.id === id && u.role === "customer");
  const [delta, setDelta] = useState(0);
  const [note, setNote] = useState("");

  if (!user) return <EmptyState title="Không tìm thấy khách hàng" />;

  const orders = state.orders
    .filter((o) => o.customerId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const points = state.pointEntries
    .filter((p) => p.customerId === user.id)
    .sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div>
      <Link href="/admin/customers" className="text-[12.5px] text-tx3 hover:text-pri">
        ← Danh sách khách hàng
      </Link>
      <div className="mt-3.5 grid items-start gap-4.5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3.5">
          {/* Hồ sơ + đơn gần đây */}
          <Card className="p-5.5">
            <div className="mb-4 flex items-baseline justify-between">
              <p className="text-[17px] font-bold">{user.name}</p>
              <Badge className={toneClasses[tierMeta[user.tier].tone]}>
                {tierMeta[user.tier].label}
              </Badge>
            </div>
            <p className="mb-5 text-[13px] text-tx2">
              {user.email} · {user.phone} · {orders.length} đơn hàng ·{" "}
              {formatVnd(user.spent12m)} chi tiêu 12 tháng
              {user.locked ? " · tài khoản đang khoá" : ""}
            </p>
            <p className="mb-2.5 text-[13px] font-bold">Lịch sử đơn hàng gần đây</p>
            {orders.length === 0 ? (
              <p className="text-sm text-tx2">Chưa có đơn nào.</p>
            ) : (
              <div className="divide-y divide-line">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-[12.5px]"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="font-data font-semibold hover:text-pri"
                      >
                        {o.code}
                      </Link>{" "}
                      <span className="text-tx2">
                        · {o.lines[0]?.name}
                        {o.lines.length > 1 ? ` +${o.lines.length - 1}` : ""}
                      </span>
                    </span>
                    <OrderStatusBadge status={o.status} />
                    <span className="w-24 text-right font-data tnum">
                      {formatVnd(o.totalVnd)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Lịch sử điểm */}
          <Card className="p-5.5">
            <p className="mb-2.5 text-[13px] font-bold">Lịch sử điểm</p>
            {points.length === 0 ? (
              <p className="text-sm text-tx2">Chưa có giao dịch điểm.</p>
            ) : (
              <div className="divide-y divide-line">
                {points.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2.5 text-[12.5px]"
                  >
                    <div>
                      <p className="font-semibold">{pointReasonLabel[p.reason]}</p>
                      <p className="text-xs text-tx3">
                        {formatDateTime(p.at)}
                        {p.note ? ` — ${p.note}` : ""}
                      </p>
                    </div>
                    <span
                      className={`font-data font-bold tnum ${
                        p.delta >= 0 ? "text-mint" : "text-drop"
                      }`}
                    >
                      {p.delta >= 0 ? "+" : ""}
                      {p.delta.toLocaleString("vi-VN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar: điều chỉnh điểm + khoá */}
        <div className="space-y-3.5">
          <Card className="p-5">
            <p className="mb-3.5 text-[13px] font-bold">Điều chỉnh điểm thủ công</p>
            <p className="mb-3.5 font-data text-[22px] font-bold tnum">
              {user.points.toLocaleString("vi-VN")}{" "}
              <span className="text-[11px] font-normal text-tx3">điểm hiện có</span>
            </p>
            <div className="mb-3">
              <Stepper
                value={delta}
                onChange={setDelta}
                min={-Math.min(500, user.points)}
                max={5000}
                step={50}
                format={(v) => (v > 0 ? `+${v}` : String(v))}
              />
            </div>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Lý do (bắt buộc — FR-LOY-06)"
              className="mb-3.5 !bg-card2 !py-2.5 !text-[12.5px]"
            />
            <Button
              variant="dark"
              className="w-full"
              disabled={delta === 0}
              onClick={() => {
                const r = actions.adjustPoints(user.id, delta, note);
                if (r.ok) {
                  toast(
                    `Đã điều chỉnh ${delta > 0 ? "+" : ""}${delta} điểm cho ${user.name}`,
                  );
                  setDelta(0);
                  setNote("");
                } else toast(r.error, "error");
              }}
            >
              Áp dụng điều chỉnh
            </Button>
          </Card>

          <Card className="p-5">
            <p className="mb-2 text-[13px] font-bold">Trạng thái tài khoản</p>
            <p className="mb-3.5 text-xs text-tx3">
              Khoá khi phát hiện gian lận drop / bom hàng. Khách bị khoá không đăng
              nhập được.
            </p>
            <Button
              variant={user.locked ? "secondary" : "danger"}
              className="w-full"
              onClick={() => {
                actions.toggleLockUser(user.id);
                toast(user.locked ? "Đã mở khoá tài khoản" : "Đã khoá tài khoản");
              }}
            >
              {user.locked ? "Mở khoá tài khoản" : "Khoá tài khoản"}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
