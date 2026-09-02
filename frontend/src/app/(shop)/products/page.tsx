"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ProductCard } from "@/components/shop/product-card";
import { EmptyState } from "@/components/ui/basics";
import { Chip } from "@/components/ui/data";
import { Select, Toggle } from "@/components/ui/form";
import { availableQty, useAppState } from "@/lib/mock/store";
import type { ProductType } from "@/lib/types";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

const typeChips: { value: "" | ProductType; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "blind_box", label: "Blind box" },
  { value: "regular", label: "Figure" },
  { value: "preorder", label: "Pre-order" },
  { value: "drop_exclusive", label: "Drop" },
];

function ProductList() {
  const state = useAppState();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [brandId, setBrandId] = useState("");
  const [type, setType] = useState<"" | ProductType>("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<"new" | "price_asc" | "price_desc">("new");

  const products = useMemo(() => {
    let list = state.products.filter((p) => p.status === "active");
    if (q.trim()) {
      const nq = normalize(q);
      list = list.filter(
        (p) =>
          normalize(p.name).includes(nq) ||
          p.tags.some((t) => normalize(t).includes(nq)),
      );
    }
    if (brandId) list = list.filter((p) => p.brandId === brandId);
    if (type) list = list.filter((p) => p.type === type);
    if (inStockOnly)
      list = list.filter((p) =>
        p.variants.some((v) => availableQty(state, v.sku) > 0),
      );
    const price = (p: (typeof list)[number]) =>
      Math.min(...p.variants.map((v) => v.priceVnd));
    if (sort === "price_asc") list = [...list].sort((a, b) => price(a) - price(b));
    else if (sort === "price_desc") list = [...list].sort((a, b) => price(b) - price(a));
    else list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [state, q, brandId, type, inStockOnly, sort]);

  return (
    <div className="py-4">
      <h1 className="mb-1 text-3xl font-bold tracking-[-0.015em]">Cửa hàng</h1>
      <p className="mb-6 text-[13.5px] text-tx2">
        {products.length} sản phẩm
        {q.trim() ? (
          <>
            {" "}
            cho từ khoá “<span className="font-semibold text-tx">{q}</span>”
          </>
        ) : null}
      </p>

      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className="w-11 text-xs font-semibold text-tx3">Hãng</span>
        <Chip label="Tất cả" active={brandId === ""} onClick={() => setBrandId("")} />
        {state.brands.map((b) => (
          <Chip
            key={b.id}
            label={b.name}
            active={brandId === b.id}
            onClick={() => setBrandId(b.id)}
          />
        ))}
      </div>
      <div className="mb-7 flex flex-wrap items-center gap-2">
        <span className="w-11 text-xs font-semibold text-tx3">Loại</span>
        {typeChips.map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            active={type === t.value}
            onClick={() => setType(t.value)}
          />
        ))}
        <div className="ml-4">
          <Toggle on={inStockOnly} onChange={setInStockOnly} label="Chỉ hàng có sẵn" />
        </div>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="ml-auto !w-auto py-2 text-[12.5px]"
        >
          <option value="new">Mới nhất</option>
          <option value="price_asc">Giá tăng dần</option>
          <option value="price_desc">Giá giảm dần</option>
        </Select>
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="Không tìm thấy sản phẩm phù hợp"
          hint="Thử bỏ bớt bộ lọc — hoặc đăng ký waitlist để được báo khi hàng về."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} state={state} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductList />
    </Suspense>
  );
}
