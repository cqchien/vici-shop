// Seed cho mock store — dữ liệu tĩnh nằm trong data/*.json (sẽ thay bằng API sau),
// file này chỉ hydrate: đổi offset ngày/giờ tương đối thành ISO timestamp quanh `now`
// và sinh các bản ghi dẫn xuất (movement, shipment, sổ kế toán, điểm) từ đơn mẫu.

import type {
  Brand,
  CartItem,
  CostLot,
  Drop,
  Expense,
  FlashSale,
  JournalEntry,
  Order,
  OrderStatus,
  PaymentMethod,
  Plan,
  PointEntry,
  PreorderCampaign,
  Product,
  ProvisioningRun,
  PurchaseReceipt,
  Review,
  Series,
  Settings,
  Shipment,
  StockItem,
  StockMovement,
  Tenant,
  User,
  Voucher,
  WaitlistEntry,
} from "../types";
import catalogData from "./data/catalog.json";
import financeData from "./data/finance.json";
import inventoryData from "./data/inventory.json";
import ordersData from "./data/orders.json";
import plansData from "./data/plans.json";
import promotionsData from "./data/promotions.json";
import tenantsData from "./data/tenants.json";
import usersData from "./data/users.json";

/** Tenant tham chiếu — dữ liệu nghiệp vụ mock (catalog, đơn, kho…) thuộc về tenant này. */
export const REFERENCE_TENANT_ID = "t_vici";

export interface State {
  version: number;
  currentUserId: string | null;
  // ── Platform plane (ADR-007) ──
  tenants: Tenant[];
  plans: Plan[];
  /** Tenant đang được xem trong storefront/admin (impersonate hoặc theo user). */
  currentTenantId: string;
  /** Khác null khi Platform Operator đang impersonate một tenant. */
  impersonatingTenantId: string | null;
  /** Tiến trình provisioning đang chạy ở wizard /start (null khi không có). */
  provisioning: ProvisioningRun | null;
  // ── Tenant plane (dữ liệu của tenant tham chiếu) ──
  users: User[];
  brands: Brand[];
  series: Series[];
  products: Product[];
  reviews: Review[];
  stock: StockItem[];
  movements: StockMovement[];
  receipts: PurchaseReceipt[];
  costLots: CostLot[];
  cart: CartItem[];
  orders: Order[];
  shipments: Shipment[];
  vouchers: Voucher[];
  flashSales: FlashSale[];
  drops: Drop[];
  preorderCampaigns: PreorderCampaign[];
  waitlist: WaitlistEntry[];
  pointEntries: PointEntry[];
  journal: JournalEntry[];
  expenses: Expense[];
  settings: Settings;
}

export const SEED_VERSION = 5;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export function makeSeed(now: number = Date.now()): State {
  const iso = (ms: number) => new Date(ms).toISOString();
  const daysAgo = (d: number) => iso(now - d * DAY);
  const hoursAhead = (h: number) => iso(now + h * HOUR);

  // ── Hydrate dữ liệu tĩnh từ JSON ──────────────────────────
  const users: User[] = usersData.users.map(({ createdDaysAgo, ...u }) => {
    const user = u as Omit<User, "createdAt">;
    return {
      ...user,
      // Mọi tài khoản (trừ Platform Operator) thuộc tenant tham chiếu.
      tenantId: user.role === "platform_admin" ? undefined : REFERENCE_TENANT_ID,
      createdAt: daysAgo(createdDaysAgo),
    };
  });

  const plans = plansData.plans as Plan[];
  const tenants: Tenant[] = tenantsData.tenants.map(({ createdDaysAgo, ...t }) => ({
    ...(t as Omit<Tenant, "createdAt">),
    createdAt: daysAgo(createdDaysAgo),
  }));

  const brands = catalogData.brands as Brand[];
  const series = catalogData.series as Series[];

  const products: Product[] = catalogData.products.map(
    ({ createdDaysAgo, ...p }) => ({
      ...(p as Omit<Product, "createdAt">),
      createdAt: daysAgo(createdDaysAgo),
    }),
  );

  const reviews: Review[] = catalogData.reviews.map(
    ({ createdDaysAgo, ...r }) => ({
      ...(r as Omit<Review, "createdAt">),
      createdAt: daysAgo(createdDaysAgo),
    }),
  );

  const stock = inventoryData.stock as StockItem[];
  const costLots = inventoryData.costLots as CostLot[];

  const receipts: PurchaseReceipt[] = inventoryData.receipts.map(
    ({ receivedDaysAgo, ...r }) => ({
      ...(r as Omit<PurchaseReceipt, "receivedAt">),
      receivedAt: daysAgo(receivedDaysAgo),
    }),
  );

  const vouchers: Voucher[] = promotionsData.vouchers.map(
    ({ startsDaysAgo, endsDaysAhead, ...v }) => ({
      ...(v as Omit<Voucher, "startsAt" | "endsAt">),
      startsAt: daysAgo(startsDaysAgo),
      endsAt: daysAgo(-endsDaysAhead),
    }),
  );

  const flashSales: FlashSale[] = promotionsData.flashSales.map(
    ({ startsHoursAgo, endsHoursAhead, ...f }) => ({
      ...(f as Omit<FlashSale, "startsAt" | "endsAt">),
      startsAt: hoursAhead(-startsHoursAgo),
      endsAt: hoursAhead(endsHoursAhead),
    }),
  );

  const drops: Drop[] = promotionsData.drops.map(
    ({ startsHoursAhead, endsHoursAhead, ...d }) => ({
      ...(d as Omit<Drop, "startsAt" | "endsAt">),
      startsAt: hoursAhead(startsHoursAhead),
      endsAt: endsHoursAhead !== null ? hoursAhead(endsHoursAhead) : undefined,
    }),
  );

  const preorderCampaigns: PreorderCampaign[] = promotionsData.preorderCampaigns.map(
    ({ opensDaysAgo, closesDaysAhead, etaDaysAhead, ...c }) => ({
      ...(c as Omit<PreorderCampaign, "opensAt" | "closesAt" | "etaDate">),
      opensAt: daysAgo(opensDaysAgo),
      closesAt: daysAgo(-closesDaysAhead),
      etaDate: daysAgo(-etaDaysAhead),
    }),
  );

  const waitlist: WaitlistEntry[] = promotionsData.waitlist.map(
    ({ createdDaysAgo, ...w }) => ({
      ...(w as Omit<WaitlistEntry, "createdAt">),
      createdAt: daysAgo(createdDaysAgo),
    }),
  );

  const expenses: Expense[] = financeData.expenses.map(
    ({ daysAgo: d, ...e }) => ({
      ...(e as Omit<Expense, "at">),
      at: daysAgo(d),
    }),
  );

  const settings = financeData.settings as Settings;

  // ── Movement nhập kho từ phiếu nhập ───────────────────────
  const movements: StockMovement[] = receipts.flatMap((r) =>
    r.lines.map((l, i) => ({
      id: `${r.id}_m${i}`,
      sku: l.sku,
      delta: l.qty,
      reason: "receipt" as const,
      refId: r.id,
      at: r.receivedAt,
    })),
  );

  // ── Sinh đơn hàng mẫu (trải 30 ngày cho báo cáo) ──────────
  const orders: Order[] = [];
  const shipments: Shipment[] = [];
  const pointEntries: PointEntry[] = [];
  const journal: JournalEntry[] = [];
  let journalNo = 1;

  const productById = new Map(products.map((p) => [p.id, p]));
  const costBySku = new Map(costLots.map((c) => [c.sku, c.avgCostVnd]));

  interface RawSeedOrder {
    idx: number;
    customerId: string;
    daysAgo: number;
    status: OrderStatus;
    lines: { productId: string; variantId: string; qty: number }[];
    method: PaymentMethod;
    dropId?: string;
  }

  for (const so of ordersData.seedOrders as RawSeedOrder[]) {
    const status = so.status;
    const method = so.method;
    const at = now - so.daysAgo * DAY;
    const lines = so.lines.map((l) => {
      const p = productById.get(l.productId)!;
      const v = p.variants.find((x) => x.id === l.variantId)!;
      return {
        productId: p.id,
        variantId: v.id,
        sku: v.sku,
        name: p.name,
        variantName: v.name,
        qty: l.qty,
        unitPriceVnd: v.priceVnd,
        costVnd: costBySku.get(v.sku) ?? 0,
        emoji: p.emoji,
      };
    });
    const subtotal = lines.reduce((s, l) => s + l.unitPriceVnd * l.qty, 0);
    const shipFee = subtotal >= settings.freeShipThresholdVnd ? 0 : 35_000;
    const total = subtotal + shipFee;
    const code = `VC-${String(1000 + so.idx)}`;
    const user = users.find((u) => u.id === so.customerId)!;
    const addr = user.addresses[0];

    const done = ["completed", "returned", "shipped", "delivered"].includes(status);
    orders.push({
      id: `o_${so.idx}`,
      code,
      customerId: so.customerId,
      kind: "standard",
      status,
      lines,
      addressText: addr
        ? `${addr.recipient} · ${addr.phone} · ${addr.street}, ${addr.ward}, ${addr.district}, ${addr.province}`
        : "",
      shipMethod: "GHN — Tiêu chuẩn",
      shipFeeVnd: shipFee,
      discountVnd: 0,
      pointsUsed: 0,
      totalVnd: total,
      dropId: so.dropId,
      transactions: [
        {
          id: `tx_${so.idx}`,
          purpose: "full",
          method,
          amountVnd: total,
          status: method === "cod" && !done ? "pending" : "succeeded",
          at: iso(at),
        },
      ],
      timeline: [
        { status: "confirmed", at: iso(at) },
        ...(status !== "confirmed" ? [{ status, at: iso(at + DAY / 2) }] : []),
      ],
      createdAt: iso(at),
    });

    if (done) {
      shipments.push({
        id: `sh_${so.idx}`,
        orderId: `o_${so.idx}`,
        carrier: so.idx % 2 === 0 ? "ghtk" : "ghn",
        trackingCode: `${so.idx % 2 === 0 ? "GHTK" : "GHN"}${884_2100 + so.idx * 17}`,
        status:
          status === "shipped"
            ? "in_transit"
            : status === "returned"
              ? "returned"
              : "delivered",
        feeVnd: shipFee || 35_000,
        attempts: status === "returned" ? 3 : 1,
        updatedAt: iso(at + DAY / 2),
      });
    }

    for (const l of lines) {
      movements.push({
        id: `mv_o${so.idx}_${l.sku}`,
        sku: l.sku,
        delta: -l.qty,
        reason: "sale",
        refId: code,
        at: iso(at),
      });
    }

    if (status === "completed") {
      const cogs = lines.reduce((s, l) => s + l.costVnd * l.qty, 0);
      journal.push({
        id: `je_${so.idx}a`,
        no: journalNo++,
        at: iso(at + DAY / 2),
        lines: [
          { account: "111 Tiền", debitVnd: total, creditVnd: 0 },
          { account: "511 Doanh thu", debitVnd: 0, creditVnd: subtotal },
          { account: "3388 Thu hộ ship", debitVnd: 0, creditVnd: shipFee },
        ],
        source: `order.completed:${code}`,
        memo: `Ghi nhận doanh thu đơn ${code}`,
      });
      journal.push({
        id: `je_${so.idx}b`,
        no: journalNo++,
        at: iso(at + DAY / 2),
        lines: [
          { account: "632 Giá vốn", debitVnd: cogs, creditVnd: 0 },
          { account: "156 Hàng hoá", debitVnd: 0, creditVnd: cogs },
        ],
        source: `order.completed:${code}`,
        memo: `Giá vốn đơn ${code}`,
      });
      const earned = Math.floor(subtotal / settings.pointEarnRate);
      pointEntries.push({
        id: `pe_${so.idx}`,
        customerId: so.customerId,
        delta: earned,
        reason: "earn",
        orderId: `o_${so.idx}`,
        at: iso(at + DAY / 2),
      });
    }
  }

  // ── Đơn pre-order đang chờ hàng ───────────────────────────
  const po = ordersData.preorder;
  const poProduct = productById.get(po.productId)!;
  const poVariant = poProduct.variants.find((v) => v.id === po.variantId)!;
  const poCampaign = preorderCampaigns.find((c) => c.id === po.campaignId);
  const poUser = users.find((u) => u.id === po.customerId)!;
  const poAddr = poUser.addresses[0];
  const poAt = now - po.daysAgo * DAY;
  const poTotal = poVariant.priceVnd;
  const poDeposit = Math.round((poTotal * po.depositPercent) / 100);

  orders.push({
    id: po.id,
    code: po.code,
    customerId: po.customerId,
    kind: "preorder",
    status: "awaiting_stock",
    lines: [
      {
        productId: poProduct.id,
        variantId: poVariant.id,
        sku: poVariant.sku,
        name: poProduct.name,
        variantName: poVariant.name,
        qty: 1,
        unitPriceVnd: poVariant.priceVnd,
        costVnd: costBySku.get(poVariant.sku) ?? 0,
        emoji: poProduct.emoji,
      },
    ],
    addressText: poAddr
      ? `${poAddr.recipient} · ${poAddr.phone} · ${poAddr.street}, ${poAddr.ward}, ${poAddr.district}, ${poAddr.province}`
      : "",
    shipMethod: "GHN — Tiêu chuẩn",
    shipFeeVnd: 0,
    discountVnd: 0,
    pointsUsed: 0,
    totalVnd: poTotal,
    campaignId: po.campaignId,
    depositVnd: poDeposit,
    transactions: [
      {
        id: "tx_po1",
        purpose: "deposit",
        method: "vnpay",
        amountVnd: poDeposit,
        status: "succeeded",
        at: iso(poAt),
      },
    ],
    timeline: [
      { status: "deposit_paid", at: iso(poAt) },
      { status: "awaiting_stock", at: iso(poAt + HOUR) },
    ],
    createdAt: iso(poAt),
  });

  journal.push({
    id: "je_po1",
    no: journalNo++,
    at: iso(poAt),
    lines: [
      { account: "111 Tiền", debitVnd: poDeposit, creditVnd: 0 },
      { account: "131 Khách trả trước", debitVnd: 0, creditVnd: poDeposit },
    ],
    source: `payment.completed:${po.code}`,
    memo: `Cọc pre-order ${po.code} (chưa phải doanh thu)`,
  });

  void poCampaign; // ETA hiển thị lấy trực tiếp từ campaign khi render

  return {
    version: SEED_VERSION,
    currentUserId: null,
    tenants,
    plans,
    currentTenantId: REFERENCE_TENANT_ID,
    impersonatingTenantId: null,
    provisioning: null,
    users,
    brands,
    series,
    products,
    reviews,
    stock,
    movements,
    receipts,
    costLots,
    cart: [],
    orders,
    shipments,
    vouchers,
    flashSales,
    drops,
    preorderCampaigns,
    waitlist,
    pointEntries,
    journal,
    expenses,
    settings,
  };
}
