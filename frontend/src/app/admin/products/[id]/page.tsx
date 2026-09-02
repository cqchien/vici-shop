"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { EmptyState } from "@/components/ui/basics";
import { useAppState } from "@/lib/mock/store";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const state = useAppState();
  const product = state.products.find((p) => p.id === id);

  if (!product) return <EmptyState title="Không tìm thấy sản phẩm" />;

  return (
    <div className="space-y-3.5">
      <Link href="/admin/products" className="text-[12.5px] text-tx3 hover:text-pri">
        ← Danh sách sản phẩm
      </Link>
      <ProductForm existing={product} />
    </div>
  );
}
