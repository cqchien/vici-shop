// Domain types cho mock store — bám theo docs/30-domain/04-data-models.md.
// Khi backend sẵn sàng, các type này map 1-1 sang API DTO.

// `admin` = chủ shop của tenant (tenant_admin); `platform_admin` = Platform Operator (không thuộc tenant nào).
export type Role = "customer" | "staff" | "admin" | "platform_admin";
export type Tier = "standard" | "silver" | "gold" | "collector";

// ── Tenant & Billing (platform plane — ADR-007/008) ─────────

export type TenantStatus =
  | "provisioning"
  | "active"
  | "past_due"
  | "suspended"
  | "archived";

export type PlanCode = "starter" | "shop" | "collector";

export interface PlanLimits {
  products: number;
  ordersMonth: number;
  staffSeats: number;
}

export interface Plan {
  code: PlanCode;
  name: string;
  priceVndMonth: number;
  limits: PlanLimits;
  features: { drop: boolean; preorder: boolean; customDomain: boolean };
  txnFeePercent: number;
}

export type AccentToken = "pri" | "viol" | "sky" | "mint" | "gold" | "drop";

export interface TenantBranding {
  logoEmoji: string;
  accentToken: AccentToken;
  tagline: string;
}

export interface Tenant {
  id: string;
  subdomain: string;
  displayName: string;
  status: TenantStatus;
  planCode: PlanCode;
  branding: TenantBranding;
  ownerName: string;
  ownerEmail: string;
  customDomain?: string;
  /** Lượng dùng hiện tại — mock cập nhật thô, backend thật do billing-service tổng hợp. */
  usage: { products: number; ordersMonth: number; staffSeats: number };
  mrrVnd: number;
  createdAt: string;
  suspendedReason?: string;
}

export type ProvisioningStepKey =
  | "account"
  | "subscription"
  | "seed_config"
  | "seed_catalog"
  | "subdomain"
  | "notify";

export interface ProvisioningStep {
  key: ProvisioningStepKey;
  label: string;
  status: "pending" | "running" | "done";
}

export interface ProvisioningRun {
  tenantId: string;
  steps: ProvisioningStep[];
  startedAt: string;
}

export interface Address {
  id: string;
  recipient: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  street: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
  /** Tenant mà tài khoản này thuộc về; `platform_admin` không có (undefined). */
  tenantId?: string;
  tier: Tier;
  points: number;
  spent12m: number;
  addresses: Address[];
  locked: boolean;
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
}

export interface Figure {
  name: string;
  ratio: string; // "1/12"
  isSecret: boolean;
}

export interface Series {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  description: string;
  figures: Figure[];
}

export type ProductType = "regular" | "blind_box" | "preorder" | "drop_exclusive";
export type ProductStatus = "draft" | "active" | "archived";
export type VariantKind = "standard" | "single_box" | "whole_set";

export interface Variant {
  id: string;
  sku: string;
  name: string;
  priceVnd: number;
  compareAtVnd?: number;
  kind: VariantKind;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  brandId: string;
  seriesId?: string;
  type: ProductType;
  status: ProductStatus;
  tags: string[];
  variants: Variant[];
  ratingAvg: number;
  ratingCount: number;
  emoji: string; // "ảnh" mock — hiển thị giữa PlaceholderArt sọc chéo
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  customerId: string;
  stars: number;
  content: string;
  status: "visible" | "hidden";
  createdAt: string;
  pulled?: string; // nhân vật bốc được (hiển thị pill "RA MÂY MƯA")
}

// ── Inventory ────────────────────────────────────────────────

export interface StockItem {
  sku: string;
  onHand: number;
  reserved: number;
  threshold: number;
}

export type MovementReason =
  | "sale"
  | "return"
  | "adjustment"
  | "receipt"
  | "stocktake";

export interface StockMovement {
  id: string;
  sku: string;
  delta: number;
  reason: MovementReason;
  note?: string;
  refId?: string;
  at: string;
}

export interface ReceiptLine {
  sku: string;
  qty: number;
  unitCostVnd: number;
}

export interface PurchaseReceipt {
  id: string;
  supplier: string;
  lines: ReceiptLine[];
  receivedAt: string;
  paymentStatus: "unpaid" | "partial" | "paid";
}

export interface CostLot {
  sku: string;
  avgCostVnd: number;
}

// ── Cart & Order ─────────────────────────────────────────────

export interface CartItem {
  productId: string;
  variantId: string;
  qty: number;
}

export type OrderKind = "standard" | "preorder";

export type OrderStatus =
  | "pending_payment"
  | "confirmed"
  | "packing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "return_requested"
  | "returned"
  // pre-order
  | "deposit_paid"
  | "awaiting_stock"
  | "balance_due"
  | "balance_paid";

export interface OrderLine {
  productId: string;
  variantId: string;
  sku: string;
  name: string;
  variantName: string;
  qty: number;
  unitPriceVnd: number;
  costVnd: number;
  emoji: string;
}

export type PaymentMethod = "vnpay" | "momo" | "zalopay" | "cod";
export type PaymentPurpose = "full" | "deposit" | "balance" | "refund";

export interface PaymentTx {
  id: string;
  purpose: PaymentPurpose;
  method: PaymentMethod;
  amountVnd: number;
  status: "pending" | "succeeded" | "failed";
  at: string;
}

export interface TimelineEntry {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  code: string;
  customerId: string;
  kind: OrderKind;
  status: OrderStatus;
  lines: OrderLine[];
  addressText: string;
  shipMethod: string;
  shipFeeVnd: number;
  discountVnd: number;
  pointsUsed: number;
  totalVnd: number;
  voucherCode?: string;
  dropId?: string;
  campaignId?: string;
  depositVnd?: number;
  transactions: PaymentTx[];
  timeline: TimelineEntry[];
  adminNote?: string;
  createdAt: string;
}

export type ShipmentStatus =
  | "pending"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned";

export interface Shipment {
  id: string;
  orderId: string;
  carrier: "ghn" | "ghtk";
  trackingCode: string;
  status: ShipmentStatus;
  feeVnd: number;
  attempts: number;
  updatedAt: string;
}

// ── Promotion ────────────────────────────────────────────────

export type VoucherKind = "percent" | "fixed" | "freeship";

export interface Voucher {
  id: string;
  code: string;
  kind: VoucherKind;
  value: number; // % hoặc VND
  minOrderVnd: number;
  totalUses: number;
  perCustomer: number;
  usedCount: number;
  startsAt: string;
  endsAt: string;
  status: "draft" | "active" | "paused";
}

export interface FlashSaleItem {
  variantId: string;
  salePriceVnd: number;
  cap: number;
  sold: number;
}

export interface FlashSale {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  items: FlashSaleItem[];
}

export interface DropItem {
  productId: string;
  allocation: number;
  perLimit: number;
  sold: number;
}

export interface Drop {
  id: string;
  name: string;
  startsAt: string;
  endsAt?: string;
  earlyMinutes: number; // early access cho gold/collector
  items: DropItem[];
}

export interface PreorderCampaign {
  id: string;
  productId: string;
  opensAt: string;
  closesAt: string;
  depositPercent: number;
  etaDate: string;
  slots: number;
  taken: number;
  forfeitPolicy: string;
}

export interface WaitlistEntry {
  id: string;
  customerId: string;
  targetType: "product" | "drop";
  targetId: string;
  createdAt: string;
  notifiedAt?: string;
}

// ── Loyalty & Finance ────────────────────────────────────────

export type PointReason = "earn" | "spend" | "expire" | "adjust";

export interface PointEntry {
  id: string;
  customerId: string;
  delta: number;
  reason: PointReason;
  orderId?: string;
  note?: string;
  at: string;
}

export interface JournalLine {
  account: string;
  debitVnd: number;
  creditVnd: number;
}

export interface JournalEntry {
  id: string;
  no: number;
  at: string;
  lines: JournalLine[];
  source: string; // "order.completed:ORD-..." | "manual"
  memo: string;
}

export interface Expense {
  id: string;
  category: string;
  amountVnd: number;
  at: string;
  note: string;
}

export interface Settings {
  freeShipThresholdVnd: number;
  holdMinutes: number;
  pointEarnRate: number; // VND mỗi 1 điểm khi tích
  pointValueVnd: number; // giá trị 1 điểm khi tiêu
  maxPointPercent: number; // % tối đa của đơn trả bằng điểm
}
