"use client";

// Mock store — nguồn dữ liệu duy nhất cho cả storefront và admin (ADR-006).
// State giữ trong memory, persist localStorage; mọi mutation đi qua update()
// để clone → sửa → notify, mô phỏng hành vi API thật (server tính, client hiển thị).

import { useSyncExternalStore } from "react";
import { uid } from "../format";
import { orderTransitions, tierMeta } from "../labels";
import type {
  AccentToken,
  Drop,
  FlashSale,
  MovementReason,
  OrderStatus,
  PaymentMethod,
  Plan,
  PreorderCampaign,
  Product,
  ProvisioningStep,
  PurchaseReceipt,
  Series,
  Settings,
  Tenant,
  TenantStatus,
  User,
  Voucher,
} from "../types";
import { makeSeed, REFERENCE_TENANT_ID, SEED_VERSION, type State } from "./seed";

const KEY = `vici_shop_state_v${SEED_VERSION}`;

let state: State = makeSeed();
let loaded = false;
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // localStorage đầy/bị chặn — mock bỏ qua, phiên vẫn chạy trong memory
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function loadPersisted() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed.version === SEED_VERSION) state = parsed;
    }
  } catch {
    // dữ liệu hỏng — dùng seed
  }
}

// Nạp state đã lưu ngay khi module chạy trên trình duyệt (trước render đầu tiên).
loadPersisted();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function getState(): State {
  return state;
}

// Server render dùng seed cố định để không phụ thuộc localStorage.
const serverState: State = state;

export function useAppState(): State {
  return useSyncExternalStore(subscribe, getState, () => serverState);
}

const emptySubscribe = () => () => {};

/** false trong lượt hydrate (khớp HTML server), true ngay sau đó — tránh hydration mismatch. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

// Đồng hồ dùng chung cho render (lint cấm gọi Date.now() trực tiếp khi render).
let nowCache = Date.now();

function nowSubscribe(onChange: () => void) {
  const t = setInterval(() => {
    nowCache = Date.now();
    onChange();
  }, 1000);
  return () => clearInterval(t);
}

export function useNow(): number {
  return useSyncExternalStore(
    nowSubscribe,
    () => nowCache,
    () => nowCache,
  );
}

function update(fn: (draft: State) => void) {
  const draft = structuredClone(state);
  fn(draft);
  state = draft;
  persist();
  notify();
}

export function resetDemo() {
  state = makeSeed();
  persist();
  notify();
}

// ── Helpers dùng chung (pure, gọi được từ component) ────────

export function availableQty(s: State, sku: string): number {
  const item = s.stock.find((x) => x.sku === sku);
  return item ? item.onHand - item.reserved : 0;
}

export type DropPhase = "scheduled" | "early_access" | "live" | "ended" | "sold_out";

export function dropPhase(drop: Drop, now: number, tier?: User["tier"]): DropPhase {
  const starts = new Date(drop.startsAt).getTime();
  const ends = drop.endsAt ? new Date(drop.endsAt).getTime() : Infinity;
  const soldOut = drop.items.every((i) => i.sold >= i.allocation);
  if (soldOut) return "sold_out";
  if (now >= ends) return "ended";
  if (now >= starts) return "live";
  const earlyAt = starts - drop.earlyMinutes * 60_000;
  if (now >= earlyAt && (tier === "gold" || tier === "collector"))
    return "early_access";
  return "scheduled";
}

export function dropForProduct(s: State, productId: string): Drop | undefined {
  return s.drops.find((d) => d.items.some((i) => i.productId === productId));
}

export function flashPrice(s: State, variantId: string, now: number): number | undefined {
  for (const fs of s.flashSales) {
    if (now < new Date(fs.startsAt).getTime() || now > new Date(fs.endsAt).getTime()) continue;
    const item = fs.items.find((i) => i.variantId === variantId);
    if (item && item.sold < item.cap) return item.salePriceVnd;
  }
  return undefined;
}

/** Số lượng khách còn được mua trong một drop (giới hạn/khách — FR-PROMO-05). */
export function dropRemainingForUser(s: State, drop: Drop, productId: string, userId: string | null): number {
  const item = drop.items.find((i) => i.productId === productId);
  if (!item) return 0;
  const poolLeft = item.allocation - item.sold;
  if (!userId) return Math.min(poolLeft, item.perLimit);
  const bought = s.orders
    .filter((o) => o.customerId === userId && o.dropId === drop.id && o.status !== "cancelled")
    .flatMap((o) => o.lines)
    .filter((l) => l.productId === productId)
    .reduce((sum, l) => sum + l.qty, 0);
  const inCart = s.cart
    .filter((c) => c.productId === productId)
    .reduce((sum, c) => sum + c.qty, 0);
  return Math.max(0, Math.min(poolLeft, item.perLimit - bought - inCart));
}

export function currentUser(s: State): User | null {
  return s.users.find((u) => u.id === s.currentUserId) ?? null;
}

// ── Tenant helpers (ADR-007) ────────────────────────────────

export function tenantById(s: State, id: string | null | undefined): Tenant | undefined {
  return id ? s.tenants.find((t) => t.id === id) : undefined;
}

/** Tenant đang "được xem": tenant đang impersonate, hoặc theo currentTenantId. */
export function currentTenant(s: State): Tenant {
  return (
    tenantById(s, s.impersonatingTenantId) ??
    tenantById(s, s.currentTenantId) ??
    s.tenants.find((t) => t.id === REFERENCE_TENANT_ID) ??
    s.tenants[0]
  );
}

export function planFor(s: State, tenant: Tenant): Plan {
  return s.plans.find((p) => p.code === tenant.planCode) ?? s.plans[0];
}

export const tenantStatusFlow: Record<TenantStatus, TenantStatus[]> = {
  provisioning: ["active"],
  active: ["suspended", "archived"],
  past_due: ["active", "suspended"],
  suspended: ["active", "archived"],
  archived: [],
};

export const PROVISIONING_STEPS: { key: ProvisioningStep["key"]; label: string }[] = [
  { key: "account", label: "Tạo tài khoản chủ shop" },
  { key: "subscription", label: "Kích hoạt gói dịch vụ" },
  { key: "seed_config", label: "Cấu hình mặc định (ship, điểm, giữ hàng)" },
  { key: "seed_catalog", label: "Seed catalog mẫu" },
  { key: "subdomain", label: "Mở địa chỉ web {sub}.vici.shop" },
  { key: "notify", label: "Gửi email chào mừng" },
];

export interface CartTotals {
  subtotal: number;
  shipFee: number;
  voucherDiscount: number;
  pointsDiscount: number;
  total: number;
}

export function computeTotals(
  s: State,
  opts: {
    voucher?: Voucher | null;
    pointsUsed?: number;
    now: number;
    /** Phí của phương thức vận chuyển đã chọn (hỏa tốc/nhận tại shop); mặc định theo ngưỡng freeship. */
    shipFeeVnd?: number;
  },
): CartTotals {
  const subtotal = s.cart.reduce((sum, c) => {
    const p = s.products.find((x) => x.id === c.productId);
    const v = p?.variants.find((x) => x.id === c.variantId);
    if (!p || !v) return sum;
    const price = flashPrice(s, v.id, opts.now) ?? v.priceVnd;
    return sum + price * c.qty;
  }, 0);
  let shipFee =
    opts.shipFeeVnd ??
    (subtotal >= s.settings.freeShipThresholdVnd || subtotal === 0 ? 0 : 35_000);
  let voucherDiscount = 0;
  const vc = opts.voucher;
  if (vc && subtotal >= vc.minOrderVnd) {
    if (vc.kind === "percent") voucherDiscount = Math.floor((subtotal * vc.value) / 100);
    else if (vc.kind === "fixed") voucherDiscount = Math.min(vc.value, subtotal);
    else shipFee = 0;
  }
  const maxByPercent = Math.floor(((subtotal - voucherDiscount) * s.settings.maxPointPercent) / 100);
  const pointsDiscount = Math.min(
    (opts.pointsUsed ?? 0) * s.settings.pointValueVnd,
    maxByPercent,
  );
  const total = Math.max(0, subtotal - voucherDiscount - pointsDiscount + shipFee);
  return { subtotal, shipFee, voucherDiscount, pointsDiscount, total };
}

type Result = { ok: true } | { ok: false; error: string };

function moveStock(draft: State, sku: string, delta: number, reason: MovementReason, refId?: string, note?: string) {
  const item = draft.stock.find((x) => x.sku === sku);
  if (item) item.onHand += delta;
  draft.movements.unshift({
    id: uid("mv"),
    sku,
    delta,
    reason,
    refId,
    note,
    at: new Date().toISOString(),
  });
}

function addJournal(draft: State, lines: { account: string; debitVnd: number; creditVnd: number }[], source: string, memo: string) {
  const no = Math.max(0, ...draft.journal.map((j) => j.no)) + 1;
  draft.journal.unshift({
    id: uid("je"),
    no,
    at: new Date().toISOString(),
    lines,
    source,
    memo,
  });
}

// ── Actions ─────────────────────────────────────────────────

export const actions = {
  // Auth (mock): đăng nhập bằng email có sẵn, không mật khẩu thật
  login(email: string): Result {
    const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return { ok: false, error: "Không tìm thấy tài khoản với email này" };
    if (user.locked) return { ok: false, error: "Tài khoản đã bị khoá" };
    update((d) => {
      d.currentUserId = user.id;
      d.impersonatingTenantId = null;
      // Tenant admin/staff/customer → xem storefront/admin của tenant mình.
      if (user.tenantId) d.currentTenantId = user.tenantId;
    });
    return { ok: true };
  },

  logout() {
    update((d) => {
      d.currentUserId = null;
      d.impersonatingTenantId = null;
      d.currentTenantId = REFERENCE_TENANT_ID;
    });
  },

  register(name: string, email: string, phone: string): Result {
    if (state.users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
      return { ok: false, error: "Email đã được đăng ký" };
    const id = uid("u");
    update((d) => {
      d.users.push({
        id,
        email,
        name,
        phone,
        role: "customer",
        tier: "standard",
        points: 0,
        spent12m: 0,
        addresses: [],
        locked: false,
        createdAt: new Date().toISOString(),
      });
      d.currentUserId = id;
    });
    return { ok: true };
  },

  // Cart
  addToCart(productId: string, variantId: string, qty: number): Result {
    const s = state;
    const now = Date.now();
    const product = s.products.find((p) => p.id === productId);
    const variant = product?.variants.find((v) => v.id === variantId);
    if (!product || !variant || product.status !== "active")
      return { ok: false, error: "Sản phẩm không còn bán" };

    const drop = dropForProduct(s, productId);
    if (drop) {
      const user = currentUser(s);
      if (!user) return { ok: false, error: "Đăng nhập để mua hàng drop" };
      const phase = dropPhase(drop, now, user.tier);
      if (phase === "scheduled") return { ok: false, error: "Drop chưa mở bán" };
      if (phase === "ended" || phase === "sold_out")
        return { ok: false, error: "Drop đã kết thúc" };
      const remaining = dropRemainingForUser(s, drop, productId, user.id);
      if (qty > remaining)
        return { ok: false, error: `Vượt giới hạn mua (còn được mua ${remaining})` };
    }

    const inCart = s.cart.find((c) => c.variantId === variantId)?.qty ?? 0;
    if (product.type !== "preorder" && qty + inCart > availableQty(s, variant.sku))
      return { ok: false, error: "Không đủ hàng trong kho" };

    update((d) => {
      const existing = d.cart.find((c) => c.variantId === variantId);
      if (existing) existing.qty += qty;
      else d.cart.push({ productId, variantId, qty });
    });
    return { ok: true };
  },

  setCartQty(variantId: string, qty: number) {
    update((d) => {
      const item = d.cart.find((c) => c.variantId === variantId);
      if (!item) return;
      if (qty <= 0) d.cart = d.cart.filter((c) => c.variantId !== variantId);
      else item.qty = qty;
    });
  },

  clearCart() {
    update((d) => {
      d.cart = [];
    });
  },

  // Checkout — mô phỏng saga: reserve → charge → tạo đơn (FR-ORD-03)
  placeOrder(opts: {
    addressText: string;
    shipMethod: string;
    shipFeeVnd?: number;
    method: PaymentMethod;
    voucherCode?: string;
    pointsUsed: number;
  }): { ok: true; orderId: string } | { ok: false; error: string } {
    const s = state;
    const now = Date.now();
    const user = currentUser(s);
    if (!user) return { ok: false, error: "Chưa đăng nhập" };
    if (s.cart.length === 0) return { ok: false, error: "Giỏ hàng trống" };

    for (const c of s.cart) {
      const p = s.products.find((x) => x.id === c.productId);
      const v = p?.variants.find((x) => x.id === c.variantId);
      if (!p || !v) return { ok: false, error: "Giỏ hàng có sản phẩm không hợp lệ" };
      if (c.qty > availableQty(s, v.sku))
        return { ok: false, error: `"${p.name}" không đủ hàng` };
    }

    const voucher = opts.voucherCode
      ? s.vouchers.find((v) => v.code === opts.voucherCode && v.status === "active")
      : null;
    if (opts.voucherCode && !voucher)
      return { ok: false, error: "Voucher không hợp lệ" };
    if (voucher && voucher.usedCount >= voucher.totalUses)
      return { ok: false, error: "Voucher đã hết lượt dùng" };
    if (opts.pointsUsed > user.points)
      return { ok: false, error: "Không đủ điểm" };

    const totals = computeTotals(s, {
      voucher,
      pointsUsed: opts.pointsUsed,
      now,
      shipFeeVnd: opts.shipFeeVnd,
    });
    const orderId = uid("o");
    const code = `VC-${1000 + s.orders.length + 1}`;

    update((d) => {
      const lines = d.cart.map((c) => {
        const p = d.products.find((x) => x.id === c.productId)!;
        const v = p.variants.find((x) => x.id === c.variantId)!;
        const price = flashPrice(d, v.id, now) ?? v.priceVnd;
        return {
          productId: p.id,
          variantId: v.id,
          sku: v.sku,
          name: p.name,
          variantName: v.name,
          qty: c.qty,
          unitPriceVnd: price,
          costVnd: d.costLots.find((cl) => cl.sku === v.sku)?.avgCostVnd ?? 0,
          emoji: p.emoji,
        };
      });

      // Trừ tồn + tăng sold của drop/flash sale
      for (const l of lines) {
        moveStock(d, l.sku, -l.qty, "sale", code);
        const drop = dropForProduct(d, l.productId);
        const dItem = drop?.items.find((i) => i.productId === l.productId);
        if (dItem) dItem.sold += l.qty;
        for (const fs of d.flashSales) {
          const fi = fs.items.find((i) => i.variantId === l.variantId);
          if (fi && flashPrice(d, l.variantId, now) === l.unitPriceVnd) fi.sold += l.qty;
        }
      }

      if (voucher) {
        const vc = d.vouchers.find((v) => v.id === voucher.id)!;
        vc.usedCount += 1;
      }

      if (opts.pointsUsed > 0) {
        const u = d.users.find((x) => x.id === user.id)!;
        u.points -= opts.pointsUsed;
        d.pointEntries.unshift({
          id: uid("pe"),
          customerId: user.id,
          delta: -opts.pointsUsed,
          reason: "spend",
          orderId,
          at: new Date().toISOString(),
        });
      }

      const dropId = lines
        .map((l) => dropForProduct(d, l.productId)?.id)
        .find((x) => x !== undefined);

      d.orders.unshift({
        id: orderId,
        code,
        customerId: user.id,
        kind: "standard",
        status: "confirmed", // mock: gateway/COD xác nhận ngay
        lines,
        addressText: opts.addressText,
        shipMethod: opts.shipMethod,
        shipFeeVnd: totals.shipFee,
        discountVnd: totals.voucherDiscount,
        pointsUsed: opts.pointsUsed,
        totalVnd: totals.total,
        voucherCode: voucher?.code,
        dropId,
        transactions: [
          {
            id: uid("tx"),
            purpose: "full",
            method: opts.method,
            amountVnd: totals.total,
            status: opts.method === "cod" ? "pending" : "succeeded",
            at: new Date().toISOString(),
          },
        ],
        timeline: [{ status: "confirmed", at: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
      });

      d.cart = [];
    });
    return { ok: true, orderId };
  },

  // Pre-order: đặt cọc theo campaign (FR-ORD-07)
  placePreorder(campaignId: string, method: PaymentMethod, addressText: string):
    | { ok: true; orderId: string }
    | { ok: false; error: string } {
    const s = state;
    const user = currentUser(s);
    if (!user) return { ok: false, error: "Chưa đăng nhập" };
    const campaign = s.preorderCampaigns.find((c) => c.id === campaignId);
    if (!campaign) return { ok: false, error: "Campaign không tồn tại" };
    const now = Date.now();
    if (now < new Date(campaign.opensAt).getTime() || now > new Date(campaign.closesAt).getTime())
      return { ok: false, error: "Ngoài thời gian nhận đặt trước" };
    if (campaign.taken >= campaign.slots)
      return { ok: false, error: "Đã hết suất đặt trước" };
    const product = s.products.find((p) => p.id === campaign.productId);
    const variant = product?.variants[0];
    if (!product || !variant) return { ok: false, error: "Sản phẩm không hợp lệ" };

    const deposit = Math.floor((variant.priceVnd * campaign.depositPercent) / 100);
    const orderId = uid("o");
    const code = `VC-${2000 + s.orders.filter((o) => o.kind === "preorder").length + 1}`;

    update((d) => {
      d.preorderCampaigns.find((c) => c.id === campaignId)!.taken += 1;
      d.orders.unshift({
        id: orderId,
        code,
        customerId: user.id,
        kind: "preorder",
        status: "awaiting_stock",
        lines: [
          {
            productId: product.id,
            variantId: variant.id,
            sku: variant.sku,
            name: product.name,
            variantName: variant.name,
            qty: 1,
            unitPriceVnd: variant.priceVnd,
            costVnd: d.costLots.find((cl) => cl.sku === variant.sku)?.avgCostVnd ?? 0,
            emoji: product.emoji,
          },
        ],
        addressText,
        shipMethod: "GHN — Tiêu chuẩn",
        shipFeeVnd: 0,
        discountVnd: 0,
        pointsUsed: 0,
        totalVnd: variant.priceVnd,
        campaignId,
        depositVnd: deposit,
        transactions: [
          {
            id: uid("tx"),
            purpose: "deposit",
            method,
            amountVnd: deposit,
            status: "succeeded",
            at: new Date().toISOString(),
          },
        ],
        timeline: [
          { status: "deposit_paid", at: new Date().toISOString() },
          { status: "awaiting_stock", at: new Date().toISOString() },
        ],
        createdAt: new Date().toISOString(),
      });
      addJournal(
        d,
        [
          { account: "111 Tiền", debitVnd: deposit, creditVnd: 0 },
          { account: "131 Khách trả trước", debitVnd: 0, creditVnd: deposit },
        ],
        `payment.completed:${code}`,
        `Cọc pre-order ${code} (chưa phải doanh thu)`,
      );
    });
    return { ok: true, orderId };
  },

  payBalance(orderId: string, method: PaymentMethod): Result {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order || order.status !== "balance_due")
      return { ok: false, error: "Đơn chưa tới bước thanh toán nốt" };
    const balance = order.totalVnd - (order.depositVnd ?? 0);
    update((d) => {
      const o = d.orders.find((x) => x.id === orderId)!;
      o.transactions.push({
        id: uid("tx"),
        purpose: "balance",
        method,
        amountVnd: balance,
        status: "succeeded",
        at: new Date().toISOString(),
      });
      o.status = "confirmed";
      o.timeline.push(
        { status: "balance_paid", at: new Date().toISOString() },
        { status: "confirmed", at: new Date().toISOString() },
      );
      addJournal(
        d,
        [
          { account: "111 Tiền", debitVnd: balance, creditVnd: 0 },
          { account: "131 Khách trả trước", debitVnd: 0, creditVnd: balance },
        ],
        `payment.completed:${o.code}`,
        `Thanh toán phần còn lại ${o.code}`,
      );
    });
    return { ok: true };
  },

  cancelOrder(orderId: string): Result {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, error: "Không tìm thấy đơn" };
    const cancellable: OrderStatus[] = [
      "pending_payment",
      "confirmed",
      "deposit_paid",
      "awaiting_stock",
      "balance_due",
    ];
    if (!cancellable.includes(order.status))
      return { ok: false, error: "Đơn đã đóng gói — không thể huỷ (FR-ORD-04)" };
    update((d) => {
      const o = d.orders.find((x) => x.id === orderId)!;
      o.status = "cancelled";
      o.timeline.push({ status: "cancelled", at: new Date().toISOString() });
      // Nhả tồn (hàng drop không hoàn allocation — chống bot giữ-nhả)
      if (o.kind === "standard") {
        for (const l of o.lines) moveStock(d, l.sku, l.qty, "return", o.code, "Huỷ đơn");
      }
      const paid = o.transactions.filter((t) => t.status === "succeeded");
      for (const t of paid) {
        o.transactions.push({
          id: uid("tx"),
          purpose: "refund",
          method: t.method,
          amountVnd: -t.amountVnd,
          status: "succeeded",
          at: new Date().toISOString(),
        });
      }
    });
    return { ok: true };
  },

  requestReturn(orderId: string, reason: string): Result {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order || order.status !== "delivered")
      return { ok: false, error: "Chỉ đổi trả trong 7 ngày sau khi giao" };
    update((d) => {
      const o = d.orders.find((x) => x.id === orderId)!;
      o.status = "return_requested";
      o.timeline.push({
        status: "return_requested",
        at: new Date().toISOString(),
        note: reason,
      });
    });
    return { ok: true };
  },

  // Admin: chuyển trạng thái theo state machine (FR-ORD-02/06)
  advanceOrder(orderId: string, next: OrderStatus): Result {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, error: "Không tìm thấy đơn" };
    const allowed = orderTransitions[order.status] ?? [];
    if (!allowed.includes(next))
      return { ok: false, error: `Không thể chuyển ${order.status} → ${next}` };

    update((d) => {
      const o = d.orders.find((x) => x.id === orderId)!;
      o.status = next;
      o.timeline.push({ status: next, at: new Date().toISOString() });

      if (next === "shipped" && !d.shipments.some((sh) => sh.orderId === o.id)) {
        d.shipments.unshift({
          id: uid("sh"),
          orderId: o.id,
          carrier: "ghn",
          trackingCode: `GHN${Math.floor(Math.random() * 900000 + 100000)}`,
          status: "picked_up",
          feeVnd: o.shipFeeVnd || 35_000,
          attempts: 1,
          updatedAt: new Date().toISOString(),
        });
      }
      if (next === "delivered") {
        const sh = d.shipments.find((x) => x.orderId === o.id);
        if (sh) {
          sh.status = "delivered";
          sh.updatedAt = new Date().toISOString();
        }
        // COD: thu tiền khi giao thành công (FR-PAY-05)
        const cod = o.transactions.find((t) => t.method === "cod" && t.status === "pending");
        if (cod) cod.status = "succeeded";
      }
      if (next === "completed") {
        const subtotal = o.lines.reduce((s, l) => s + l.unitPriceVnd * l.qty, 0);
        const cogs = o.lines.reduce((s, l) => s + l.costVnd * l.qty, 0);
        addJournal(
          d,
          [
            { account: "111 Tiền", debitVnd: o.totalVnd, creditVnd: 0 },
            { account: "511 Doanh thu", debitVnd: 0, creditVnd: subtotal - o.discountVnd },
            { account: "3388 Thu hộ ship", debitVnd: 0, creditVnd: o.shipFeeVnd },
          ],
          `order.completed:${o.code}`,
          `Ghi nhận doanh thu đơn ${o.code}`,
        );
        addJournal(
          d,
          [
            { account: "632 Giá vốn", debitVnd: cogs, creditVnd: 0 },
            { account: "156 Hàng hoá", debitVnd: 0, creditVnd: cogs },
          ],
          `order.completed:${o.code}`,
          `Giá vốn đơn ${o.code}`,
        );
        const u = d.users.find((x) => x.id === o.customerId);
        if (u) {
          const mult = tierMeta[u.tier].multiplier;
          const earned = Math.floor(((subtotal - o.discountVnd) / d.settings.pointEarnRate) * mult);
          u.points += earned;
          u.spent12m += subtotal - o.discountVnd;
          d.pointEntries.unshift({
            id: uid("pe"),
            customerId: u.id,
            delta: earned,
            reason: "earn",
            orderId: o.id,
            at: new Date().toISOString(),
          });
        }
      }
      if (next === "returned") {
        for (const l of o.lines) moveStock(d, l.sku, l.qty, "return", o.code, "Đổi trả");
        const paid = o.transactions.filter((t) => t.status === "succeeded" && t.purpose !== "refund");
        for (const t of paid) {
          o.transactions.push({
            id: uid("tx"),
            purpose: "refund",
            method: t.method,
            amountVnd: -t.amountVnd,
            status: "succeeded",
            at: new Date().toISOString(),
          });
        }
      }
      if (next === "balance_due") {
        // hàng về → mở thanh toán phần còn lại (notification mock)
      }
    });
    return { ok: true };
  },

  setAdminNote(orderId: string, note: string) {
    update((d) => {
      const o = d.orders.find((x) => x.id === orderId);
      if (o) o.adminNote = note;
    });
  },

  // Catalog admin
  saveProduct(product: Product) {
    update((d) => {
      const idx = d.products.findIndex((p) => p.id === product.id);
      if (idx >= 0) d.products[idx] = product;
      else d.products.unshift(product);
      for (const v of product.variants) {
        if (!d.stock.some((s) => s.sku === v.sku))
          d.stock.push({ sku: v.sku, onHand: 0, reserved: 0, threshold: 5 });
        if (!d.costLots.some((c) => c.sku === v.sku))
          d.costLots.push({ sku: v.sku, avgCostVnd: 0 });
      }
    });
  },

  archiveProduct(productId: string) {
    update((d) => {
      const p = d.products.find((x) => x.id === productId);
      if (p) p.status = "archived";
      d.cart = d.cart.filter((c) => c.productId !== productId);
    });
  },

  saveSeries(s: Series) {
    update((d) => {
      const idx = d.series.findIndex((x) => x.id === s.id);
      if (idx >= 0) d.series[idx] = s;
      else d.series.push(s);
    });
  },

  hideReview(reviewId: string) {
    update((d) => {
      const r = d.reviews.find((x) => x.id === reviewId);
      if (r) r.status = r.status === "visible" ? "hidden" : "visible";
    });
  },

  addReview(productId: string, stars: number, content: string): Result {
    const user = currentUser(state);
    if (!user) return { ok: false, error: "Chưa đăng nhập" };
    const purchased = state.orders.some(
      (o) =>
        o.customerId === user.id &&
        ["delivered", "completed"].includes(o.status) &&
        o.lines.some((l) => l.productId === productId),
    );
    if (!purchased)
      return { ok: false, error: "Chỉ khách đã mua mới được đánh giá (FR-CAT-10)" };
    update((d) => {
      d.reviews.unshift({
        id: uid("rv"),
        productId,
        customerId: user.id,
        stars,
        content,
        status: "visible",
        createdAt: new Date().toISOString(),
      });
      const p = d.products.find((x) => x.id === productId)!;
      const visible = d.reviews.filter((r) => r.productId === productId && r.status === "visible");
      p.ratingCount = visible.length;
      p.ratingAvg = Math.round((visible.reduce((s, r) => s + r.stars, 0) / visible.length) * 10) / 10;
    });
    return { ok: true };
  },

  // Inventory
  adjustStock(sku: string, delta: number, note: string): Result {
    const item = state.stock.find((s) => s.sku === sku);
    if (!item) return { ok: false, error: "SKU không tồn tại" };
    if (item.onHand + delta < 0) return { ok: false, error: "Tồn không thể âm" };
    if (!note.trim()) return { ok: false, error: "Điều chỉnh tồn phải có lý do (FR-INV-04)" };
    update((d) => {
      moveStock(d, sku, delta, "adjustment", undefined, note);
    });
    return { ok: true };
  },

  createReceipt(receipt: Omit<PurchaseReceipt, "id" | "receivedAt">): Result {
    if (receipt.lines.length === 0) return { ok: false, error: "Phiếu nhập trống" };
    update((d) => {
      const id = uid("rc");
      const receivedAt = new Date().toISOString();
      d.receipts.unshift({ ...receipt, id, receivedAt });
      let totalCost = 0;
      for (const l of receipt.lines) {
        const stock = d.stock.find((s) => s.sku === l.sku);
        const lot = d.costLots.find((c) => c.sku === l.sku);
        const prevQty = stock?.onHand ?? 0;
        // Giá vốn moving average (FR-ACC-02)
        if (lot) {
          lot.avgCostVnd =
            prevQty + l.qty > 0
              ? Math.round((lot.avgCostVnd * prevQty + l.unitCostVnd * l.qty) / (prevQty + l.qty))
              : l.unitCostVnd;
        }
        moveStock(d, l.sku, l.qty, "receipt", id);
        totalCost += l.qty * l.unitCostVnd;

        // Hàng pre-order về → chuyển đơn awaiting_stock sang balance_due (FR-ORD-08)
        for (const o of d.orders) {
          if (o.kind === "preorder" && o.status === "awaiting_stock" && o.lines.some((ol) => ol.sku === l.sku)) {
            o.status = "balance_due";
            o.timeline.push({
              status: "balance_due",
              at: receivedAt,
              note: "Hàng đã về kho — mời thanh toán phần còn lại",
            });
          }
        }
        // Đánh thức waitlist (FR-PROMO-07)
        for (const w of d.waitlist) {
          const product = d.products.find(
            (p) => p.id === w.targetId && p.variants.some((v) => v.sku === l.sku),
          );
          if (w.targetType === "product" && product && !w.notifiedAt)
            w.notifiedAt = receivedAt;
        }
      }
      addJournal(
        d,
        [
          { account: "156 Hàng hoá", debitVnd: totalCost, creditVnd: 0 },
          { account: "331 Phải trả NCC", debitVnd: 0, creditVnd: totalCost },
        ],
        `purchase_receipt.created:${id}`,
        `Nhập hàng từ ${receipt.supplier}`,
      );
    });
    return { ok: true };
  },

  // Promotion
  saveVoucher(v: Voucher) {
    update((d) => {
      const idx = d.vouchers.findIndex((x) => x.id === v.id);
      if (idx >= 0) d.vouchers[idx] = v;
      else d.vouchers.unshift(v);
    });
  },

  saveDrop(drop: Drop) {
    update((d) => {
      const idx = d.drops.findIndex((x) => x.id === drop.id);
      if (idx >= 0) d.drops[idx] = drop;
      else d.drops.unshift(drop);
    });
  },

  saveFlashSale(fs: FlashSale) {
    update((d) => {
      const idx = d.flashSales.findIndex((x) => x.id === fs.id);
      if (idx >= 0) d.flashSales[idx] = fs;
      else d.flashSales.unshift(fs);
    });
  },

  saveCampaign(c: PreorderCampaign) {
    update((d) => {
      const idx = d.preorderCampaigns.findIndex((x) => x.id === c.id);
      if (idx >= 0) d.preorderCampaigns[idx] = c;
      else d.preorderCampaigns.unshift(c);
    });
  },

  joinWaitlist(targetType: "product" | "drop", targetId: string): Result {
    const user = currentUser(state);
    if (!user) return { ok: false, error: "Đăng nhập để nhận thông báo" };
    if (state.waitlist.some((w) => w.customerId === user.id && w.targetId === targetId))
      return { ok: false, error: "Bạn đã đăng ký rồi" };
    update((d) => {
      d.waitlist.unshift({
        id: uid("wl"),
        customerId: user.id,
        targetType,
        targetId,
        createdAt: new Date().toISOString(),
      });
    });
    return { ok: true };
  },

  leaveWaitlist(entryId: string) {
    update((d) => {
      d.waitlist = d.waitlist.filter((w) => w.id !== entryId);
    });
  },

  // Loyalty & customer admin
  adjustPoints(customerId: string, delta: number, note: string): Result {
    if (!note.trim()) return { ok: false, error: "Điều chỉnh điểm phải có lý do (FR-LOY-06)" };
    update((d) => {
      const u = d.users.find((x) => x.id === customerId);
      if (!u) return;
      u.points = Math.max(0, u.points + delta);
      d.pointEntries.unshift({
        id: uid("pe"),
        customerId,
        delta,
        reason: "adjust",
        note,
        at: new Date().toISOString(),
      });
    });
    return { ok: true };
  },

  toggleLockUser(userId: string) {
    update((d) => {
      const u = d.users.find((x) => x.id === userId);
      if (u) u.locked = !u.locked;
    });
  },

  updateProfile(patch: { name?: string; phone?: string }) {
    update((d) => {
      const u = d.users.find((x) => x.id === d.currentUserId);
      if (!u) return;
      if (patch.name) u.name = patch.name;
      if (patch.phone) u.phone = patch.phone;
    });
  },

  // Finance
  addExpense(category: string, amountVnd: number, note: string): Result {
    if (amountVnd <= 0) return { ok: false, error: "Số tiền phải dương" };
    update((d) => {
      d.expenses.unshift({
        id: uid("ex"),
        category,
        amountVnd,
        at: new Date().toISOString(),
        note,
      });
      addJournal(
        d,
        [
          { account: `642 Chi phí (${category})`, debitVnd: amountVnd, creditVnd: 0 },
          { account: "111 Tiền", debitVnd: 0, creditVnd: amountVnd },
        ],
        "manual",
        note || `Chi phí ${category}`,
      );
    });
    return { ok: true };
  },

  saveSettings(patch: Partial<Settings>) {
    update((d) => {
      d.settings = { ...d.settings, ...patch };
    });
  },

  // ── Tenant & Billing (platform plane) ─────────────────────

  /** Onboarding: tạo tenant ở trạng thái provisioning + khởi tạo tiến trình saga (mock bằng timer ở wizard). */
  checkSubdomain(value: string): Result {
    const v = value.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(v))
      return { ok: false, error: "3–40 ký tự, chỉ gồm a-z, 0-9, dấu gạch ngang" };
    if (["www", "admin", "api", "platform", "app", "start"].includes(v))
      return { ok: false, error: "Địa chỉ này được giữ lại cho hệ thống" };
    if (state.tenants.some((t) => t.subdomain === v))
      return { ok: false, error: "Địa chỉ này đã có cửa hàng khác dùng" };
    return { ok: true };
  },

  createTenant(input: {
    displayName: string;
    subdomain: string;
    planCode: Plan["code"];
    seedCatalog: boolean;
    ownerName: string;
    ownerEmail: string;
    logoEmoji: string;
    accentToken: AccentToken;
  }): { ok: true; tenantId: string } | { ok: false; error: string } {
    const check = actions.checkSubdomain(input.subdomain);
    if (!check.ok) return check;
    const id = uid("t");
    const plan = state.plans.find((p) => p.code === input.planCode) ?? state.plans[0];
    const ownerId = uid("u");
    update((d) => {
      // Tài khoản chủ shop (mock của gRPC auth.AttachTenant) — role admin, gắn tenant mới.
      d.users.push({
        id: ownerId,
        email: input.ownerEmail.trim(),
        name: input.ownerName.trim(),
        phone: "",
        role: "admin",
        tenantId: id,
        tier: "standard",
        points: 0,
        spent12m: 0,
        addresses: [],
        locked: false,
        createdAt: new Date().toISOString(),
      });
      d.tenants.unshift({
        id,
        subdomain: input.subdomain.trim().toLowerCase(),
        displayName: input.displayName.trim(),
        status: "provisioning",
        planCode: input.planCode,
        branding: {
          logoEmoji: input.logoEmoji || "🛍️",
          accentToken: input.accentToken,
          tagline: "",
        },
        ownerName: input.ownerName.trim(),
        ownerEmail: input.ownerEmail.trim(),
        usage: { products: 0, ordersMonth: 0, staffSeats: 1 },
        mrrVnd: plan.priceVndMonth,
        createdAt: new Date().toISOString(),
      });
      const steps: ProvisioningStep[] = PROVISIONING_STEPS.filter(
        (s) => s.key !== "seed_catalog" || input.seedCatalog,
      ).map((s, i) => ({
        key: s.key,
        label: s.label.replace("{sub}", input.subdomain),
        status: i === 0 ? "running" : "pending",
      }));
      d.provisioning = { tenantId: id, startedAt: new Date().toISOString(), steps };
    });
    return { ok: true, tenantId: id };
  },

  /** Wizard gọi từng bước để "chạy" saga (mock). */
  advanceProvisioning() {
    update((d) => {
      const run = d.provisioning;
      if (!run) return;
      const runningIdx = run.steps.findIndex((s) => s.status === "running");
      if (runningIdx === -1) return;
      run.steps[runningIdx].status = "done";
      const next = run.steps[runningIdx + 1];
      if (next) next.status = "running";
    });
  },

  completeProvisioning(tenantId: string) {
    update((d) => {
      const t = d.tenants.find((x) => x.id === tenantId);
      if (t) t.status = "active";
      if (d.provisioning?.tenantId === tenantId) {
        d.provisioning.steps.forEach((s) => (s.status = "done"));
      }
    });
  },

  clearProvisioning() {
    update((d) => {
      d.provisioning = null;
    });
  },

  setTenantStatus(tenantId: string, next: TenantStatus, reason?: string): Result {
    const t = state.tenants.find((x) => x.id === tenantId);
    if (!t) return { ok: false, error: "Không tìm thấy tenant" };
    if (!tenantStatusFlow[t.status].includes(next))
      return { ok: false, error: `Không thể chuyển ${t.status} → ${next}` };
    update((d) => {
      const x = d.tenants.find((y) => y.id === tenantId)!;
      x.status = next;
      x.suspendedReason = next === "suspended" ? reason : undefined;
    });
    return { ok: true };
  },

  changePlan(tenantId: string, planCode: Plan["code"]): Result {
    const t = state.tenants.find((x) => x.id === tenantId);
    const plan = state.plans.find((p) => p.code === planCode);
    if (!t || !plan) return { ok: false, error: "Tenant hoặc gói không hợp lệ" };
    // Hạ gói bị chặn nếu lượng dùng vượt hạn mức gói mới (FR-BIL-04).
    if (
      t.usage.products > plan.limits.products ||
      t.usage.staffSeats > plan.limits.staffSeats
    )
      return {
        ok: false,
        error: "Lượng dùng hiện tại vượt hạn mức gói mới — giảm bớt trước khi hạ gói",
      };
    update((d) => {
      const x = d.tenants.find((y) => y.id === tenantId)!;
      x.planCode = planCode;
      x.mrrVnd = plan.priceVndMonth;
    });
    return { ok: true };
  },

  updateBranding(
    tenantId: string,
    patch: Partial<Tenant["branding"]> & { displayName?: string; customDomain?: string },
  ) {
    update((d) => {
      const t = d.tenants.find((x) => x.id === tenantId);
      if (!t) return;
      if (patch.displayName !== undefined) t.displayName = patch.displayName;
      if (patch.customDomain !== undefined)
        t.customDomain = patch.customDomain || undefined;
      t.branding = {
        ...t.branding,
        ...(patch.logoEmoji !== undefined ? { logoEmoji: patch.logoEmoji } : {}),
        ...(patch.accentToken !== undefined ? { accentToken: patch.accentToken } : {}),
        ...(patch.tagline !== undefined ? { tagline: patch.tagline } : {}),
      };
    });
  },

  /** Platform Operator "mở trang quản trị" của một tenant (FR-TEN-09). */
  impersonateTenant(tenantId: string) {
    update((d) => {
      d.impersonatingTenantId = tenantId;
    });
  },

  stopImpersonating() {
    update((d) => {
      d.impersonatingTenantId = null;
    });
  },
};
