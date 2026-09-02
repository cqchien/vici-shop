"use client";

import Link from "next/link";
import { DropCard } from "@/components/shop/drop-card";
import { ProductCard } from "@/components/shop/product-card";
import { LinkButton, PlaceholderArt } from "@/components/ui/basics";
import { Countdown } from "@/components/ui/commerce";
import { dropPhase, useAppState, useNow } from "@/lib/mock/store";

export default function HomePage() {
  const state = useAppState();
  const now = useNow();

  const activeProducts = state.products.filter((p) => p.status === "active");
  const newArrivals = [...activeProducts]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);
  const drops = state.drops
    .filter((d) => ["live", "early_access", "scheduled"].includes(dropPhase(d, now)))
    .slice(0, 2);
  const flash = state.flashSales.find(
    (f) => now >= new Date(f.startsAt).getTime() && now <= new Date(f.endsAt).getTime(),
  );
  const featured = state.series[0];
  const featuredSecret = featured?.figures.find((f) => f.isSecret);
  const featuredBrand = state.brands.find((b) => b.id === featured?.brandId);

  return (
    <div className="pb-10">
      {/* Hero — 2 cột theo v3 */}
      <section className="grid items-center gap-10 py-8 sm:py-14 lg:grid-cols-[1.08fr_0.92fr] lg:gap-13">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-medium text-tx2">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
            Art toy chính hãng · 42 Lý Tự Trọng, Q.1, TP.HCM
          </div>
          <h1 className="mb-5 text-[38px] leading-[1.06] font-bold tracking-[-0.025em] text-balance sm:text-[54px]">
            Săn secret.
            <br />
            Sưu tầm nghiêm túc.
          </h1>
          <p className="mb-7 max-w-md text-base leading-relaxed text-tx2 text-pretty">
            Blind box với tỉ lệ công bố minh bạch, drop giới hạn mở đúng giờ,
            pre-order cọc 30%. Mọi hộp được kiểm seal on-camera trước khi giao.
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/products" size="lg">
              Khám phá cửa hàng
            </LinkButton>
            <LinkButton href="/drops" variant="secondary" size="lg" className="text-tx">
              Drop đang mở →
            </LinkButton>
          </div>
          <div className="mt-10 flex gap-7 border-t border-line pt-7">
            {[
              { v: "12.400+", l: "nhà sưu tầm" },
              { v: "100%", l: "kiểm seal on-cam" },
              { v: "2h", l: "giao nội thành HCM" },
            ].map((s) => (
              <div key={s.l}>
                <div className="font-data text-xl font-semibold">{s.v}</div>
                <div className="mt-0.5 text-xs text-tx3">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative hidden lg:block">
          <PlaceholderArt
            emoji="☁️"
            label="hero: hình figure chủ đạo"
            ratioClass="aspect-[1/1.05] rounded-2xl border border-line text-8xl shadow-soft"
          />
          {featuredSecret ? (
            <div className="absolute -bottom-4 -left-4 flex items-center gap-3 rounded-xl border border-line bg-card px-4.5 py-3.5 shadow-lift">
              <span className="font-data text-[19px] font-semibold text-viol">
                {featuredSecret.ratio}
              </span>
              <span className="text-xs leading-snug text-tx2">
                tỉ lệ secret
                <br />
                series mới nhất
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {/* Drops */}
      {drops.length > 0 ? (
        <section className="mt-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold tracking-[-0.01em]">Drops</h2>
            <Link
              href="/drops"
              className="text-[13px] font-semibold text-tx2 hover:text-pri"
            >
              Xem tất cả →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {drops.map((d) => (
              <DropCard key={d.id} drop={d} state={state} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Flash sale */}
      {flash ? (
        <section className="mt-10 rounded-2xl border border-line border-l-[3px] border-l-gold bg-card p-6 shadow-soft">
          <div className="mb-4 flex flex-wrap items-baseline gap-3">
            <h2 className="font-display text-lg font-bold">⚡ {flash.name}</h2>
            <span className="font-data text-xs text-gold">
              kết thúc sau <Countdown target={flash.endsAt} compact />
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {flash.items.map((fi) => {
              const product = state.products.find((p) =>
                p.variants.some((v) => v.id === fi.variantId),
              );
              return product ? (
                <ProductCard key={fi.variantId} product={product} state={state} />
              ) : null;
            })}
          </div>
        </section>
      ) : null}

      {/* Hàng mới về */}
      <section className="mt-14">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold tracking-[-0.01em]">Hàng mới về</h2>
          <Link
            href="/products"
            className="text-[13px] font-semibold text-tx2 hover:text-pri"
          >
            Cả cửa hàng →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {newArrivals.map((p) => (
            <ProductCard key={p.id} product={p} state={state} />
          ))}
        </div>
      </section>

      {/* Series nổi bật */}
      {featured ? (
        <Link
          href={`/series/${featured.slug}`}
          className="mt-14 grid items-center gap-9 rounded-2xl border border-line bg-card p-7 shadow-soft transition-shadow hover:shadow-lift sm:grid-cols-[1fr_280px] sm:p-10"
        >
          <div>
            <div className="mb-3 font-data text-[11px] font-semibold tracking-[0.14em] text-viol uppercase">
              Series nổi bật{featuredBrand ? ` · ${featuredBrand.name}` : ""}
            </div>
            <div className="mb-2.5 font-display text-2xl font-bold tracking-[-0.01em] sm:text-3xl">
              {featured.name}
            </div>
            <p className="mb-4 max-w-lg text-[14.5px] leading-relaxed text-tx2 text-pretty">
              {featured.description}
            </p>
            <span className="text-[13.5px] font-semibold text-viol">
              Xem lineup và tỉ lệ →
            </span>
          </div>
          <PlaceholderArt
            emoji="☁️"
            label="ảnh series"
            viol
            ratioClass="hidden aspect-square rounded-xl border border-line text-6xl sm:flex"
          />
        </Link>
      ) : null}
    </div>
  );
}
