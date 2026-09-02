"use client";

import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";

export default function NewProductPage() {
  return (
    <div className="space-y-3.5">
      <Link href="/admin/products" className="text-[12.5px] text-tx3 hover:text-pri">
        ← Danh sách sản phẩm
      </Link>
      <ProductForm />
    </div>
  );
}
