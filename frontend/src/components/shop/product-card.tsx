"use client";

import Link from "next/link";
import { toneClasses, productTypeMeta } from "@/lib/labels";
import { formatVnd } from "@/lib/format";
import type { Product } from "@/lib/types";
import type { State } from "@/lib/mock/seed";
import {
  availableQty,
  dropForProduct,
  flashPrice,
  useNow,
} from "@/lib/mock/store";
import { Badge, PlaceholderArt } from "@/components/ui/basics";
import { Price } from "@/components/ui/commerce";

/** "Ảnh" sản phẩm — stripe art + emoji (mock, thay bằng <Image /> khi có API). */
export function ProductThumb({
  product,
  size = "md",
  tag,
}: {
  product: Pick<Product, "emoji" | "name">;
  size?: "sm" | "md" | "lg";
  tag?: React.ReactNode;
}) {
  const sizeClass =
    size === "sm"
      ? "h-12 w-12 rounded-lg text-xl"
      : size === "lg"
        ? "aspect-square w-full rounded-xl text-7xl"
        : "aspect-square w-full rounded-none text-6xl";
  return (
    <div role="img" aria-label={product.name} className="contents">
      <PlaceholderArt emoji={product.emoji} tag={tag} ratioClass={sizeClass} />
    </div>
  );
}

/** Tag pill trên ảnh theo loại sản phẩm / tình trạng kho (DESIGN.md §6). */
function productTag(product: Product, available: boolean) {
  if (!available && product.type !== "preorder")
    return <Badge className={toneClasses.neutral}>Hết hàng</Badge>;
  if (product.type === "regular")
    return <Badge className={toneClasses.positive}>Có sẵn</Badge>;
  const meta = productTypeMeta[product.type];
  return <Badge className={toneClasses[meta.tone]}>{meta.label}</Badge>;
}

export function ProductCard({ product, state }: { product: Product; state: State }) {
  const now = useNow();
  const base = product.variants[0];
  const sale = base ? flashPrice(state, base.id, now) : undefined;
  const available =
    product.variants.some((v) => availableQty(state, v.sku) > 0) ||
    Boolean(dropForProduct(state, product.id));
  const brand = state.brands.find((b) => b.id === product.brandId);
  const campaign =
    product.type === "preorder"
      ? state.preorderCampaigns.find((c) => c.productId === product.id)
      : undefined;
  const deposit =
    campaign && base
      ? Math.floor((base.priceVnd * campaign.depositPercent) / 100)
      : undefined;
  const dimmed = !available && product.type !== "preorder";

  return (
    <Link href={`/products/${product.slug}`} className="group">
      <div
        className={`overflow-hidden rounded-xl border border-line bg-card shadow-soft transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lift ${
          dimmed ? "opacity-55" : ""
        }`}
      >
        <ProductThumb product={product} tag={productTag(product, available)} />
        <div className="px-4 pt-3.5 pb-4">
          {brand ? (
            <p className="mb-0.5 text-[11px] font-medium text-tx3">{brand.name}</p>
          ) : null}
          <p className="mb-2 line-clamp-2 text-[14.5px] leading-snug font-semibold">
            {product.name}
          </p>
          <div className="flex items-center justify-between gap-2">
            {base ? (
              <Price
                amount={sale ?? base.priceVnd}
                compareAt={sale ? base.priceVnd : base.compareAtVnd}
                className="text-[15px]"
              />
            ) : null}
            {product.type === "regular" || product.type === "blind_box" ? (
              <span
                className={`text-[11px] font-semibold ${available ? "text-mint" : "text-tx3"}`}
              >
                {available ? "Còn hàng" : "Hết hàng"}
              </span>
            ) : null}
          </div>
          {deposit ? (
            <p className="mt-1 text-[11.5px] font-medium text-sky">
              Cọc {campaign!.depositPercent}% — {formatVnd(deposit)} hôm nay
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
