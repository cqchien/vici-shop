"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductThumb } from "@/components/shop/product-card";
import { Badge, Button, LinkButton } from "@/components/ui/basics";
import { Table, Td } from "@/components/ui/data";
import { Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { formatVnd } from "@/lib/format";
import { productStatusMeta, productTypeMeta, toneClasses } from "@/lib/labels";
import { actions, availableQty, useAppState } from "@/lib/mock/store";
import type { ProductStatus } from "@/lib/types";

export default function AdminProductsPage() {
  const state = useAppState();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | ProductStatus>("");

  const products = state.products.filter(
    (p) =>
      (!q || p.name.toLowerCase().includes(q.toLowerCase())) &&
      (!status || p.status === status),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Tìm theo tên…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="!w-56 !py-2.5"
          />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as "" | ProductStatus)}
            className="!w-40 !py-2.5"
          >
            <option value="">Mọi trạng thái</option>
            <option value="active">Đang bán</option>
            <option value="draft">Nháp</option>
            <option value="archived">Lưu trữ</option>
          </Select>
          <span className="text-[13px] text-tx3">{products.length} sản phẩm</span>
        </div>
        <LinkButton href="/admin/products/new">+ Thêm sản phẩm</LinkButton>
      </div>

      <Table head={["Sản phẩm", "Hãng", "Giá", "Tồn kho", "Trạng thái", ""]}>
        {products.map((p) => {
          const totalAvail = p.variants.reduce(
            (s, v) => s + availableQty(state, v.sku),
            0,
          );
          const minPrice = Math.min(...p.variants.map((v) => v.priceVnd));
          const brand = state.brands.find((b) => b.id === p.brandId);
          return (
            <tr key={p.id} className="transition-colors hover:bg-card2">
              <Td>
                <div className="flex items-center gap-3">
                  <div className="w-10 shrink-0">
                    <ProductThumb product={p} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="line-clamp-1 font-semibold hover:text-pri"
                    >
                      {p.name}
                    </Link>
                    <p className="font-data text-[10.5px] text-tx3">
                      {p.variants.map((v) => v.sku).join(" · ")}
                    </p>
                  </div>
                </div>
              </Td>
              <Td className="text-[12.5px] text-tx2">{brand?.name}</Td>
              <Td className="font-data text-[12.5px] tnum">{formatVnd(minPrice)}</Td>
              <Td
                className={`font-data text-[12.5px] tnum ${totalAvail === 0 ? "font-semibold text-drop" : ""}`}
              >
                {p.type === "preorder" ? "—" : totalAvail}
              </Td>
              <Td>
                <Badge className={toneClasses[productStatusMeta[p.status].tone]}>
                  {productStatusMeta[p.status].label}
                </Badge>
                <Badge
                  className={`ml-1.5 ${toneClasses[productTypeMeta[p.type].tone]}`}
                >
                  {productTypeMeta[p.type].label}
                </Badge>
              </Td>
              <Td>
                <div className="flex justify-end gap-1.5">
                  <LinkButton
                    href={`/admin/products/${p.id}`}
                    variant="secondary"
                    size="sm"
                  >
                    Sửa
                  </LinkButton>
                  {p.status !== "archived" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        actions.archiveProduct(p.id);
                        toast(`Đã lưu trữ "${p.name}"`);
                      }}
                    >
                      Lưu trữ
                    </Button>
                  ) : null}
                </div>
              </Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
