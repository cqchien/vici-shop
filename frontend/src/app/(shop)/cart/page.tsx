"use client";

import Link from "next/link";
import { ProductThumb } from "@/components/shop/product-card";
import { Card, EmptyState, LinkButton } from "@/components/ui/basics";
import { Price } from "@/components/ui/commerce";
import { Stepper } from "@/components/ui/form";
import { formatVnd } from "@/lib/format";
import {
  actions,
  availableQty,
  computeTotals,
  flashPrice,
  useAppState,
  useNow,
} from "@/lib/mock/store";

export default function CartPage() {
  const state = useAppState();
  const now = useNow();
  const count = state.cart.reduce((s, c) => s + c.qty, 0);

  if (state.cart.length === 0) {
    return (
      <div className="mx-auto max-w-4xl py-6">
        <h1 className="mb-6 text-[28px] font-bold tracking-[-0.015em]">Giỏ hàng</h1>
        <EmptyState
          title="Giỏ hàng đang trống"
          hint="Secret không tự về — bắt đầu từ series mới nhất."
          action={<LinkButton href="/products">Khám phá cửa hàng</LinkButton>}
        />
      </div>
    );
  }

  const totals = computeTotals(state, { now });

  return (
    <div className="mx-auto max-w-5xl py-6">
      <h1 className="mb-6 text-[28px] font-bold tracking-[-0.015em]">
        Giỏ hàng{" "}
        <span className="font-data text-[15px] font-normal text-tx3">({count})</span>
      </h1>
      <div className="grid items-start gap-7 lg:grid-cols-[1fr_330px]">
        <div className="space-y-3">
          {state.cart.map((c) => {
            const product = state.products.find((p) => p.id === c.productId);
            const variant = product?.variants.find((v) => v.id === c.variantId);
            if (!product || !variant) return null;
            const sale = flashPrice(state, variant.id, now);
            const price = sale ?? variant.priceVnd;
            const available = availableQty(state, variant.sku);
            const unavailable = product.status !== "active" || available < c.qty;
            return (
              <div
                key={c.variantId}
                className={`flex items-center gap-4 rounded-xl border bg-card p-4 ${
                  unavailable ? "border-drop" : "border-line"
                }`}
              >
                <div className="w-[76px] shrink-0">
                  <ProductThumb product={product} size="sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${product.slug}`}
                    className="line-clamp-1 text-sm font-semibold hover:text-pri"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-tx3">{variant.name}</p>
                  {unavailable ? (
                    <p className="mt-1 text-xs font-semibold text-drop">
                      {product.status !== "active"
                        ? "Ngừng bán — vui lòng xoá"
                        : `Chỉ còn ${available} sản phẩm`}
                    </p>
                  ) : null}
                </div>
                <Stepper
                  value={c.qty}
                  min={1}
                  onChange={(v) => actions.setCartQty(c.variantId, v)}
                />
                <div className="w-28 shrink-0 text-right">
                  <Price
                    amount={price * c.qty}
                    compareAt={sale ? variant.priceVnd * c.qty : undefined}
                    className="text-sm"
                  />
                  <button
                    onClick={() => actions.setCartQty(c.variantId, 0)}
                    className="mt-1 block w-full cursor-pointer text-right text-[11.5px] text-tx3 underline hover:text-pri"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <Card className="sticky top-[86px] p-5.5 shadow-soft">
          <h2 className="mb-4 font-display text-base font-bold">Tóm tắt</h2>
          <div className="mb-3.5 space-y-2.5 text-[13.5px]">
            <div className="flex justify-between">
              <span className="text-tx2">Tạm tính</span>
              <span className="font-data tnum">{formatVnd(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tx2">Vận chuyển</span>
              {totals.shipFee === 0 ? (
                <span className="font-semibold text-mint">Miễn phí</span>
              ) : (
                <span className="font-data tnum">{formatVnd(totals.shipFee)}</span>
              )}
            </div>
            {totals.shipFee > 0 ? (
              <p className="text-xs text-tx3">
                Mua thêm{" "}
                <span className="font-data">
                  {formatVnd(state.settings.freeShipThresholdVnd - totals.subtotal)}
                </span>{" "}
                để được miễn phí vận chuyển.
              </p>
            ) : null}
          </div>
          <div className="mb-4.5 flex items-baseline justify-between border-t border-line pt-3.5">
            <span className="text-sm font-semibold">Thanh toán hôm nay</span>
            <span className="font-data text-[19px] font-semibold tnum">
              {formatVnd(totals.total)}
            </span>
          </div>
          <LinkButton href="/checkout" size="lg" className="w-full">
            Thanh toán →
          </LinkButton>
          <p className="mt-3 text-center text-[11px] text-tx3">
            Sản phẩm được giữ {state.settings.holdMinutes} phút trong lúc thanh toán.
            Voucher và điểm áp dụng ở bước sau.
          </p>
        </Card>
      </div>
    </div>
  );
}
