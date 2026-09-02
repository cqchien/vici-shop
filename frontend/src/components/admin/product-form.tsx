"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card } from "@/components/ui/basics";
import { FormField, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { uid } from "@/lib/format";
import { actions, useAppState } from "@/lib/mock/store";
import type { Product, ProductStatus, ProductType, Variant } from "@/lib/types";

const emojis = ["🧸", "☁️", "🌙", "🦊", "🌊", "🐉", "🐈", "🐻", "🏆", "🎂"];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ProductForm({ existing }: { existing?: Product }) {
  const state = useAppState();
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [brandId, setBrandId] = useState(existing?.brandId ?? state.brands[0]?.id ?? "");
  const [seriesId, setSeriesId] = useState(existing?.seriesId ?? "");
  const [type, setType] = useState<ProductType>(existing?.type ?? "regular");
  const [status, setStatus] = useState<ProductStatus>(existing?.status ?? "draft");
  const [tags, setTags] = useState(existing?.tags.join(", ") ?? "");
  const [emoji, setEmoji] = useState(existing?.emoji ?? "🧸");
  const [variants, setVariants] = useState<Variant[]>(
    existing?.variants ?? [
      { id: uid("v"), sku: "", name: "Bản tiêu chuẩn", priceVnd: 0, kind: "standard" },
    ],
  );

  function setVariant(i: number, patch: Partial<Variant>) {
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }

  function save() {
    if (!name.trim()) return toast("Tên sản phẩm bắt buộc", "error");
    if (variants.some((v) => !v.sku.trim() || v.priceVnd <= 0))
      return toast("Mỗi variant cần SKU và giá > 0", "error");
    const product: Product = {
      id: existing?.id ?? uid("p"),
      name,
      slug: existing?.slug ?? slugify(name),
      description,
      brandId,
      seriesId: seriesId || undefined,
      type,
      status,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      variants,
      ratingAvg: existing?.ratingAvg ?? 0,
      ratingCount: existing?.ratingCount ?? 0,
      emoji,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    actions.saveProduct(product);
    toast("Đã lưu sản phẩm");
    router.push("/admin/products");
  }

  return (
    <div className="grid items-start gap-4.5 lg:grid-cols-[1fr_340px]">
      <Card className="p-6">
        <p className="mb-4.5 text-sm font-bold">Thông tin cơ bản</p>
        <div className="space-y-4">
          <FormField label="Tên sản phẩm">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="!bg-card2"
            />
          </FormField>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <FormField label="Hãng">
              <Select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="!bg-card2"
              >
                {state.brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Loại sản phẩm">
              <Select
                value={type}
                onChange={(e) => setType(e.target.value as ProductType)}
                className="!bg-card2"
              >
                <option value="blind_box">Blind box</option>
                <option value="regular">Figure</option>
                <option value="preorder">Pre-order</option>
                <option value="drop_exclusive">Drop</option>
              </Select>
            </FormField>
            <FormField label="Series (blind box)">
              <Select
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
                className="!bg-card2"
              >
                <option value="">— Không thuộc series —</option>
                {state.series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Trạng thái">
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                className="!bg-card2"
              >
                <option value="draft">Nháp</option>
                <option value="active">Đang bán</option>
                <option value="archived">Lưu trữ</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Mô tả">
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="!bg-card2"
            />
          </FormField>
          <FormField label="Tags (phân tách bằng dấu phẩy)">
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="!bg-card2"
            />
          </FormField>
        </div>

        <div className="mt-5 space-y-2.5 border-t border-line pt-4.5">
          <p className="text-sm font-bold">Variant và giá</p>
          {variants.map((v, i) => (
            <div
              key={v.id}
              className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-4"
            >
              <Input
                placeholder="SKU"
                value={v.sku}
                onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })}
                className="!bg-card2 font-data !text-[12.5px]"
              />
              <Input
                placeholder="Tên variant"
                value={v.name}
                onChange={(e) => setVariant(i, { name: e.target.value })}
                className="!bg-card2"
              />
              <Input
                type="number"
                placeholder="Giá (VND)"
                value={v.priceVnd || ""}
                onChange={(e) => setVariant(i, { priceVnd: Number(e.target.value) })}
                className="!bg-card2 font-data"
              />
              <div className="flex gap-2">
                <Select
                  value={v.kind}
                  onChange={(e) =>
                    setVariant(i, { kind: e.target.value as Variant["kind"] })
                  }
                  className="!bg-card2"
                >
                  <option value="standard">Thường</option>
                  <option value="single_box">1 hộp</option>
                  <option value="whole_set">Nguyên set</option>
                </Select>
                {variants.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Xoá variant"
                    onClick={() =>
                      setVariants((vs) => vs.filter((_, idx) => idx !== i))
                    }
                  >
                    ✕
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setVariants((vs) => [
                ...vs,
                { id: uid("v"), sku: "", name: "", priceVnd: 0, kind: "standard" },
              ])
            }
          >
            + Thêm variant
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <p className="mb-3.5 text-sm font-bold">Ảnh sản phẩm</p>
        <div className="stripe-art mb-3.5 flex aspect-square items-center justify-center rounded-[10px] border border-dashed border-line2 text-7xl">
          {emoji}
        </div>
        <p className="mb-2 text-xs text-tx3">
          Mock: chọn emoji đại diện — kéo thả ảnh thật khi có API media.
        </p>
        <div className="mb-5 flex flex-wrap gap-1">
          {emojis.map((e) => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              aria-label={`Chọn ${e}`}
              className={`cursor-pointer rounded-lg p-1.5 text-xl ${
                e === emoji ? "bg-pri-soft" : "hover:bg-card2"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <Button size="lg" className="w-full" onClick={save}>
          {existing ? "Lưu sản phẩm" : "Tạo sản phẩm"}
        </Button>
      </Card>
    </div>
  );
}
