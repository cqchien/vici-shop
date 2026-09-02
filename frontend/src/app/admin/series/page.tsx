"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui/basics";
import { Dialog, useToast } from "@/components/ui/overlay";
import { FormField, Input, Select, Textarea, Toggle } from "@/components/ui/form";
import { uid } from "@/lib/format";
import { actions, useAppState } from "@/lib/mock/store";
import type { Figure, Series } from "@/lib/types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function SeriesEditor({
  existing,
  onClose,
}: {
  existing?: Series;
  onClose: () => void;
}) {
  const state = useAppState();
  const toast = useToast();
  const [name, setName] = useState(existing?.name ?? "");
  const [brandId, setBrandId] = useState(existing?.brandId ?? state.brands[0]?.id ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [figures, setFigures] = useState<Figure[]>(
    existing?.figures ?? [{ name: "", ratio: "1/6", isSecret: false }],
  );

  const secretCount = figures.filter((f) => f.isSecret).length;
  const lineupOk = secretCount === 1 && figures.every((f) => f.name.trim());

  function setFigure(i: number, patch: Partial<Figure>) {
    setFigures((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  return (
    <div className="space-y-3.5">
      <FormField label="Tên series">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="!bg-card2" />
      </FormField>
      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>
      <FormField label="Mô tả">
        <Textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="!bg-card2"
        />
      </FormField>

      <div className="grid grid-cols-[1fr_100px_90px_36px] gap-2 border-b border-line px-1 pb-2 font-data text-[9.5px] tracking-[0.06em] text-tx3 uppercase">
        <span>Nhân vật</span>
        <span>Tỉ lệ</span>
        <span>Secret</span>
        <span />
      </div>
      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {figures.map((f, i) => (
          <div key={i} className="grid grid-cols-[1fr_100px_90px_36px] items-center gap-2">
            <Input
              placeholder="Tên nhân vật"
              value={f.name}
              onChange={(e) => setFigure(i, { name: e.target.value })}
              className="!bg-card2 !py-2"
            />
            <Input
              placeholder="1/6"
              value={f.ratio}
              onChange={(e) => setFigure(i, { ratio: e.target.value })}
              className="!bg-card2 !py-2 font-data !text-[12.5px]"
            />
            <Toggle on={f.isSecret} onChange={(v) => setFigure(i, { isSecret: v })} />
            <button
              aria-label="Xoá nhân vật"
              onClick={() => setFigures((fs) => fs.filter((_, idx) => idx !== i))}
              className="cursor-pointer text-[15px] text-tx3 hover:text-drop"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          setFigures((fs) => [...fs, { name: "", ratio: "1/6", isSecret: false }])
        }
      >
        + Thêm nhân vật
      </Button>

      <div className="flex items-center justify-between border-t border-line pt-3.5">
        <span
          className={`text-[13px] font-semibold ${lineupOk ? "text-mint" : "text-drop"}`}
        >
          {lineupOk
            ? "✓ Lineup hợp lệ"
            : secretCount !== 1
              ? `Lineup cần đúng 1 secret (đang có ${secretCount})`
              : "Nhân vật nào cũng cần tên"}
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button
            onClick={() => {
              if (!name.trim()) return toast("Tên series bắt buộc", "error");
              if (!lineupOk) return toast("Lineup chưa hợp lệ — kiểm tra secret và tên", "error");
              actions.saveSeries({
                id: existing?.id ?? uid("s"),
                brandId,
                name,
                slug: existing?.slug ?? slugify(name),
                description,
                figures: figures.filter((f) => f.name.trim()),
              });
              toast(`Đã lưu lineup ${name}`);
              onClose();
            }}
          >
            Lưu lineup
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSeriesPage() {
  const state = useAppState();
  const [editing, setEditing] = useState<Series | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-tx3">{state.series.length} series</p>
        <Button onClick={() => setCreating(true)}>+ Series mới</Button>
      </div>

      <div className="grid gap-3.5 md:grid-cols-2">
        {state.series.map((s) => {
          const brand = state.brands.find((b) => b.id === s.brandId);
          const secret = s.figures.find((f) => f.isSecret);
          const linked = state.products.filter((p) => p.seriesId === s.id);
          return (
            <Card key={s.id} className="p-5.5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-[15px] font-bold">{s.name}</p>
                  <p className="mt-0.5 text-xs text-tx3">{brand?.name}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setEditing(s)}>
                  Sửa lineup
                </Button>
              </div>
              <p className="mb-3 line-clamp-2 text-[13px] text-tx2">{s.description}</p>
              <div className="mb-3 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                {s.figures.map((f) => (
                  <div
                    key={f.name}
                    className={`rounded-lg border p-1.5 text-center ${
                      f.isSecret
                        ? "border-viol bg-viol-soft"
                        : "border-line bg-card2"
                    }`}
                    title={`${f.name} · ${f.ratio}`}
                  >
                    <span
                      className={`block truncate text-[9.5px] font-semibold ${
                        f.isSecret ? "text-viol" : ""
                      }`}
                    >
                      {f.isSecret ? "?" : f.name}
                    </span>
                    <span className="block font-data text-[8.5px] text-tx3">
                      {f.ratio}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-tx3">
                {s.figures.length} nhân vật
                {secret ? (
                  <>
                    {" "}
                    · secret <span className="font-data text-viol">{secret.ratio}</span>
                  </>
                ) : null}{" "}
                · {linked.length} sản phẩm gắn với series
              </p>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? `Lineup — ${editing.name}` : "Series mới"}
        wide
      >
        <SeriesEditor
          existing={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      </Dialog>
    </div>
  );
}
