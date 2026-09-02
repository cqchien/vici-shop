import type { State } from "./seed";
import type { Order } from "../types";

/** Đơn tính doanh thu = completed (FR-ACC-01). */
export function completedOrders(s: State): Order[] {
  return s.orders.filter((o) => o.status === "completed");
}

export function orderRevenue(o: Order): number {
  return o.lines.reduce((sum, l) => sum + l.unitPriceVnd * l.qty, 0) - o.discountVnd;
}

export function orderCogs(o: Order): number {
  return o.lines.reduce((sum, l) => sum + l.costVnd * l.qty, 0);
}

function completedAt(o: Order): string {
  return o.timeline.find((t) => t.status === "completed")?.at ?? o.createdAt;
}

/** Doanh thu theo ngày cho N ngày gần nhất (điền 0 cho ngày trống). */
export function revenueByDay(s: State, days: number, now: number): { date: string; value: number }[] {
  const byDay = new Map<string, number>();
  for (const o of completedOrders(s)) {
    const day = completedAt(o).slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + orderRevenue(o));
  }
  const out: { date: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date, value: byDay.get(date) ?? 0 });
  }
  return out;
}

export function revenueInRange(s: State, fromMs: number, toMs: number): number {
  return completedOrders(s)
    .filter((o) => {
      const t = new Date(completedAt(o)).getTime();
      return t >= fromMs && t < toMs;
    })
    .reduce((sum, o) => sum + orderRevenue(o), 0);
}

export interface SellerRow {
  sku: string;
  name: string;
  variantName: string;
  emoji: string;
  qty: number;
  revenue: number;
}

export function topSellers(s: State, limit: number): SellerRow[] {
  const map = new Map<string, SellerRow>();
  for (const o of completedOrders(s)) {
    for (const l of o.lines) {
      const row = map.get(l.sku) ?? {
        sku: l.sku,
        name: l.name,
        variantName: l.variantName,
        emoji: l.emoji,
        qty: 0,
        revenue: 0,
      };
      row.qty += l.qty;
      row.revenue += l.unitPriceVnd * l.qty;
      map.set(l.sku, row);
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function lowStockItems(s: State) {
  return s.stock.filter(
    (item) => item.threshold > 0 && item.onHand - item.reserved <= item.threshold,
  );
}

export function skuLabel(s: State, sku: string): { name: string; variantName: string; emoji: string } {
  for (const p of s.products) {
    const v = p.variants.find((x) => x.sku === sku);
    if (v) return { name: p.name, variantName: v.name, emoji: p.emoji };
  }
  return { name: sku, variantName: "", emoji: "📦" };
}

/** Giá trị tồn kho theo giá vốn (FR-REP-04). */
export function inventoryValue(s: State): number {
  return s.stock.reduce((sum, item) => {
    const cost = s.costLots.find((c) => c.sku === item.sku)?.avgCostVnd ?? 0;
    return sum + item.onHand * cost;
  }, 0);
}
