"use client";

import { useParams } from "next/navigation";
import { ProductCard } from "@/components/shop/product-card";
import { EmptyState, PlaceholderArt } from "@/components/ui/basics";
import { useAppState } from "@/lib/mock/store";

export default function SeriesPage() {
  const { slug } = useParams<{ slug: string }>();
  const state = useAppState();
  const series = state.series.find((s) => s.slug === slug);

  if (!series) return <EmptyState title="Series không tồn tại" />;

  const brand = state.brands.find((b) => b.id === series.brandId);
  const products = state.products.filter(
    (p) => p.seriesId === series.id && p.status === "active",
  );
  const secret = series.figures.find((f) => f.isSecret);
  const emoji = products[0]?.emoji ?? "🧸";

  return (
    <div className="space-y-12 py-4 pb-10">
      {/* Hero series */}
      <header className="grid items-center gap-9 rounded-2xl border border-line bg-card p-7 shadow-soft sm:grid-cols-[1fr_260px] sm:p-10">
        <div>
          <p className="mb-3 font-data text-[11px] font-semibold tracking-[0.14em] text-viol uppercase">
            Series{brand ? ` · ${brand.name}` : ""}
          </p>
          <h1 className="mb-2.5 text-[28px] font-bold tracking-[-0.02em] sm:text-[34px]">
            {series.name}
          </h1>
          <p className="mb-5 max-w-xl text-[14.5px] leading-relaxed text-tx2 text-pretty">
            {series.description}
          </p>
          <div className="flex flex-wrap gap-5 text-[12.5px] text-tx2">
            <span>
              <b className="font-data">{series.figures.length}</b> nhân vật
            </span>
            {secret ? (
              <span>
                <b className="font-data">{secret.ratio}</b> tỉ lệ secret
              </span>
            ) : null}
            <span>
              <b className="font-data">5.000</b> hộp toàn quốc
            </span>
          </div>
        </div>
        <PlaceholderArt
          emoji={emoji}
          label="key art"
          viol
          ratioClass="hidden aspect-square rounded-xl border border-line text-6xl sm:flex"
        />
      </header>

      {/* Lineup */}
      <section>
        <h2 className="mb-4 text-[22px] font-bold tracking-[-0.01em]">
          Lineup đầy đủ
        </h2>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {series.figures.map((f) =>
            f.isSecret ? (
              <div
                key={f.name}
                className="relative overflow-hidden rounded-xl border-[1.5px] border-viol bg-gradient-to-br from-viol-soft to-card p-3 text-center"
              >
                <span className="sheen-overlay" />
                <div className="mb-2 flex aspect-[1/1.15] items-center justify-center rounded-lg bg-card2">
                  <span className="font-data text-3xl font-semibold text-viol">?</span>
                </div>
                <p className="mb-1.5 text-[12.5px] font-bold text-viol">{f.name}</p>
                <span className="rounded-full bg-viol px-2 py-0.5 font-data text-[9.5px] font-semibold text-card">
                  SECRET · {f.ratio}
                </span>
              </div>
            ) : (
              <div
                key={f.name}
                className="rounded-xl border border-line bg-card p-3 text-center"
              >
                <div className="stripe-art mb-2 flex aspect-[1/1.15] items-center justify-center rounded-lg">
                  <span className="text-2xl">{emoji}</span>
                </div>
                <p className="mb-1.5 text-[12.5px] font-semibold">{f.name}</p>
                <span className="rounded-full bg-card2 px-2 py-0.5 font-data text-[9.5px] text-tx2">
                  Tỉ lệ {f.ratio}
                </span>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Sản phẩm trong series */}
      <section>
        <h2 className="mb-4 text-[22px] font-bold tracking-[-0.01em]">
          Sản phẩm trong series
        </h2>
        {products.length === 0 ? (
          <p className="text-sm text-tx2">Chưa có sản phẩm đang bán.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} state={state} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
