"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ProductCard } from "@/components/shop/product-card";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PlaceholderArt,
} from "@/components/ui/basics";
import { Countdown, Price, ProgressBar, Stars } from "@/components/ui/commerce";
import { Stepper, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { formatDate, formatVnd } from "@/lib/format";
import { productTypeMeta, toneClasses } from "@/lib/labels";
import {
  actions,
  availableQty,
  currentUser,
  dropForProduct,
  dropPhase,
  dropRemainingForUser,
  flashPrice,
  useAppState,
  useNow,
} from "@/lib/mock/store";

const GALLERY = [
  "ảnh: cả series trên kệ",
  "ảnh: cận mặt figure",
  "ảnh: hộp niêm phong",
  "ảnh: so sánh kích thước",
  "ảnh: unbox on-cam",
];

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const state = useAppState();
  const router = useRouter();
  const toast = useToast();
  const now = useNow();

  const product = state.products.find((p) => p.slug === slug);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [gallery, setGallery] = useState(0);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [reviewStars, setReviewStars] = useState(5);

  if (!product || product.status === "draft") {
    return <EmptyState title="Sản phẩm không tồn tại" />;
  }

  const user = currentUser(state);
  const variant =
    product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const sale = flashPrice(state, variant.id, now);
  const available = availableQty(state, variant.sku);
  const series = product.seriesId
    ? state.series.find((s) => s.id === product.seriesId)
    : undefined;
  const brand = state.brands.find((b) => b.id === product.brandId);
  const drop = dropForProduct(state, product.id);
  const phase = drop ? dropPhase(drop, now, user?.tier) : null;
  const dropItem = drop?.items.find((i) => i.productId === product.id);
  const dropRemaining = drop
    ? dropRemainingForUser(state, drop, product.id, user?.id ?? null)
    : Infinity;
  const campaign = state.preorderCampaigns.find((c) => c.productId === product.id);
  const reviews = state.reviews.filter(
    (r) => r.productId === product.id && r.status === "visible",
  );
  const related = state.products
    .filter(
      (p) =>
        p.id !== product.id &&
        p.status === "active" &&
        (p.seriesId === product.seriesId || p.brandId === product.brandId),
    )
    .slice(0, 4);
  const inWaitlist = user
    ? state.waitlist.some((w) => w.customerId === user.id && w.targetId === product.id)
    : false;

  const archived = product.status === "archived";
  const isPreorder = product.type === "preorder" && campaign;
  const outOfStock = available <= 0 && !isPreorder && !drop;
  const typeMeta = productTypeMeta[product.type];

  function handleAdd() {
    const r = actions.addToCart(product!.id, variant.id, qty);
    if (r.ok) {
      toast("Đã thêm vào giỏ");
      setAdded(true);
      if (addedTimer.current) clearTimeout(addedTimer.current);
      addedTimer.current = setTimeout(() => setAdded(false), 1500);
    } else toast(r.error, "error");
  }

  function handlePreorder() {
    if (!user) {
      router.push("/login");
      return;
    }
    const addr = user.addresses[0];
    const r = actions.placePreorder(
      campaign!.id,
      "vnpay",
      addr
        ? `${addr.recipient} · ${addr.phone} · ${addr.street}, ${addr.ward}, ${addr.district}, ${addr.province}`
        : `${user.name} · ${user.phone}`,
    );
    if (r.ok) {
      toast("Đặt cọc thành công");
      router.push(`/orders/${r.orderId}/confirmation`);
    } else toast(r.error, "error");
  }

  return (
    <div className="space-y-14 py-2 pb-10">
      {/* Breadcrumb */}
      <nav className="-mb-8 flex gap-2 text-xs text-tx3">
        <Link href="/" className="hover:text-pri">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-pri">
          {typeMeta.label}
        </Link>
        <span>/</span>
        <span className="text-tx2">{product.name}</span>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-11">
        {/* Gallery */}
        <div>
          <PlaceholderArt
            emoji={product.emoji}
            label={GALLERY[gallery]}
            ratioClass="aspect-square rounded-xl border border-line text-8xl"
            className="mb-2.5"
          />
          <div className="grid grid-cols-5 gap-2">
            {GALLERY.map((g, i) => (
              <button
                key={g}
                onClick={() => setGallery(i)}
                aria-label={g}
                className={`stripe-art flex aspect-square cursor-pointer items-center justify-center rounded-[9px] border-[1.5px] transition-colors ${
                  i === gallery ? "border-pri" : "border-line hover:border-tx3"
                }`}
              >
                <span className="text-[9px] text-tx3">ảnh {i + 1}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Thông tin + mua */}
        <div>
          <div className="mb-3.5 flex flex-wrap gap-2">
            <Badge className={toneClasses[typeMeta.tone]}>{typeMeta.label}</Badge>
            {!isPreorder && !drop ? (
              <Badge className={available > 0 ? toneClasses.positive : toneClasses.neutral}>
                {available > 0 ? `Còn ${available} hộp` : "Hết hàng"}
              </Badge>
            ) : null}
            {sale ? <Badge className={toneClasses.warning}>Flash sale</Badge> : null}
          </div>
          <h1 className="mb-1.5 text-3xl font-bold tracking-[-0.015em]">
            {product.name}
          </h1>
          <p className="mb-3 text-[13px] text-tx2">
            {brand?.name}
            {series ? ` · ${series.figures.length - 1} nhân vật + 1 secret` : ""}
          </p>
          {product.ratingCount > 0 ? (
            <p className="mb-5 flex items-center gap-2.5">
              <Stars value={product.ratingAvg} />
              <span className="text-xs text-tx3">
                {product.ratingAvg} · {product.ratingCount} đánh giá
              </span>
            </p>
          ) : null}

          <p className="mb-5">
            <Price
              amount={sale ?? variant.priceVnd}
              compareAt={sale ? variant.priceVnd : variant.compareAtVnd}
              className="text-[28px]"
            />
            <span className="ml-1 text-[13px] text-tx3">
              {variant.kind === "whole_set" ? "/ nguyên set" : variant.kind === "single_box" ? "/ hộp" : ""}
            </span>
          </p>

          {product.variants.length > 1 ? (
            <div className="mb-4 grid grid-cols-2 gap-2.5">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  className={`cursor-pointer rounded-[11px] border-[1.5px] px-4 py-3.5 text-left transition-colors ${
                    v.id === variant.id
                      ? "border-pri bg-pri-soft"
                      : "border-line bg-card hover:border-tx3"
                  }`}
                >
                  <span className="mb-0.5 block text-[13.5px] font-semibold">
                    {v.name}
                  </span>
                  <span className="block font-data text-xs text-tx3">
                    {formatVnd(flashPrice(state, v.id, now) ?? v.priceVnd)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <p className="mb-5 text-sm leading-relaxed text-tx2 text-pretty">
            {product.description}
          </p>

          {/* Panel drop */}
          {drop && dropItem ? (
            <Card className="mb-4 space-y-3 border-l-[3px] border-l-pri p-4.5">
              <div className="flex items-center justify-between gap-2">
                {phase === "live" || phase === "early_access" ? (
                  <Badge className="bg-pri-soft text-pri">
                    <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-pri" />
                    Đang mở bán
                  </Badge>
                ) : phase === "scheduled" ? (
                  <Badge className="bg-gold-soft text-gold">
                    Sắp mở · Gold vào sớm {drop.earlyMinutes} phút
                  </Badge>
                ) : (
                  <Badge className="bg-line text-tx3">Đã kết thúc</Badge>
                )}
                <span className="font-data text-[10.5px] text-tx2">
                  TỐI ĐA {dropItem.perLimit}/KHÁCH
                </span>
              </div>
              {phase === "scheduled" ? (
                <Countdown target={drop.startsAt} />
              ) : (
                <>
                  <ProgressBar
                    value={dropItem.sold}
                    max={dropItem.allocation}
                    striped={phase === "live" || phase === "early_access"}
                  />
                  <p className="font-data text-xs">
                    <span className="font-semibold text-pri">{dropItem.sold}</span>
                    <span className="text-tx3">/{dropItem.allocation} đã bán</span>
                    {user && Number.isFinite(dropRemaining) ? (
                      <span className="ml-2 text-tx2">
                        · bạn còn {dropRemaining} suất
                      </span>
                    ) : null}
                  </p>
                </>
              )}
              <p className="text-xs text-tx3">
                Số lượng chỉ trừ khi thanh toán xong — không giữ chỗ ảo.
              </p>
            </Card>
          ) : null}

          {/* Panel pre-order */}
          {isPreorder ? (
            <Card className="mb-4 space-y-2 border-l-[3px] border-l-sky p-4.5">
              <Badge className="bg-sky-soft text-sky">
                Pre-order · Cọc {campaign.depositPercent}%
              </Badge>
              <p className="text-sm">
                Cọc hôm nay{" "}
                <strong className="font-data">
                  {formatVnd(Math.floor((variant.priceVnd * campaign.depositPercent) / 100))}
                </strong>{" "}
                — còn lại{" "}
                <span className="font-data text-sky">
                  {formatVnd(
                    variant.priceVnd -
                      Math.floor((variant.priceVnd * campaign.depositPercent) / 100),
                  )}
                </span>{" "}
                khi hàng về (dự kiến {formatDate(campaign.etaDate)}).
              </p>
              <p className="text-xs text-tx3">
                Còn {campaign.slots - campaign.taken}/{campaign.slots} suất ·{" "}
                {campaign.forfeitPolicy} · đóng đơn {formatDate(campaign.closesAt)}
              </p>
            </Card>
          ) : null}

          {/* CTA */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isPreorder ? (
              <Button
                size="lg"
                className="flex-1"
                onClick={handlePreorder}
                disabled={archived || campaign.taken >= campaign.slots}
              >
                Đặt cọc {formatVnd(Math.floor((variant.priceVnd * campaign.depositPercent) / 100))}{" "}
                hôm nay
              </Button>
            ) : outOfStock ? (
              <>
                <Button size="lg" disabled>
                  Hết hàng
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  disabled={inWaitlist}
                  className={inWaitlist ? "border-gold bg-gold-soft text-gold" : ""}
                  onClick={() => {
                    const r = actions.joinWaitlist("product", product.id);
                    toast(
                      r.ok ? "Sẽ báo bạn qua Zalo và email khi có hàng" : r.error,
                      r.ok ? "success" : "error",
                    );
                  }}
                >
                  {inWaitlist ? "✓ Đã đăng ký nhận tin" : "Báo khi có hàng"}
                </Button>
              </>
            ) : (
              <>
                <Stepper value={qty} onChange={setQty} max={12} />
                <Button
                  size="lg"
                  className={`flex-1 ${added ? "!bg-mint" : ""}`}
                  onClick={handleAdd}
                  disabled={
                    archived ||
                    phase === "scheduled" ||
                    (drop ? dropRemaining <= 0 : false)
                  }
                >
                  {phase === "scheduled"
                    ? "Chưa mở bán"
                    : added
                      ? "✓ Đã thêm vào giỏ"
                      : "Thêm vào giỏ"}
                </Button>
              </>
            )}
          </div>
          <p className="mt-3.5 flex gap-3 text-xs text-tx3">
            <span>Kiểm seal on-cam</span>
            <span>·</span>
            <span>Giao HCM trong 2h</span>
            <span>·</span>
            <span>Điểm Gold ×1.5</span>
          </p>
        </div>
      </div>

      {/* Lineup và tỉ lệ */}
      {series ? (
        <section>
          <div className="mb-1.5 flex flex-wrap items-baseline gap-3.5">
            <h2 className="text-2xl font-bold tracking-[-0.01em]">Lineup và tỉ lệ</h2>
            <span className="font-data text-[10.5px] tracking-[0.08em] text-tx3 uppercase">
              Công bố bởi nhà sản xuất
            </span>
          </div>
          <p className="mb-5 text-[13.5px] text-tx2">
            Mỗi hộp chứa 1 trong {series.figures.length} nhân vật. Tỉ lệ theo công bố
            của hãng — shop không can thiệp, không &quot;chọn hộp&quot;.
          </p>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
            {series.figures.map((f) =>
              f.isSecret ? (
                <div
                  key={f.name}
                  className="relative overflow-hidden rounded-xl border-[1.5px] border-viol bg-gradient-to-br from-viol-soft to-card p-3 text-center transition-transform hover:-translate-y-1"
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
                  className="rounded-xl border border-line bg-card p-3 text-center transition-all hover:-translate-y-1 hover:shadow-soft"
                >
                  <div className="stripe-art mb-2 flex aspect-[1/1.15] items-center justify-center rounded-lg">
                    <span className="text-2xl">{product.emoji}</span>
                  </div>
                  <p className="mb-1.5 text-[12.5px] font-semibold">{f.name}</p>
                  <span className="rounded-full bg-card2 px-2 py-0.5 font-data text-[9.5px] text-tx2">
                    Tỉ lệ {f.ratio}
                  </span>
                </div>
              ),
            )}
          </div>
          <p className="mt-3 text-right">
            <Link
              href={`/series/${series.slug}`}
              className="text-[13px] font-semibold text-viol hover:underline"
            >
              Trang series →
            </Link>
          </p>
        </section>
      ) : null}

      {/* Đánh giá */}
      <section>
        <h2 className="mb-5 text-2xl font-bold tracking-[-0.01em]">
          Đánh giá{" "}
          <span className="font-data text-sm font-normal text-tx3">
            ({reviews.length})
          </span>
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-tx2">
            Chưa có đánh giá — khách đã mua sẽ đánh giá được sau khi nhận hàng.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => {
              const author = state.users.find((u) => u.id === r.customerId);
              return (
                <Card key={r.id} className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <Stars value={r.stars} />
                    {r.pulled ? (
                      <Badge className={toneClasses.positive}>{r.pulled}</Badge>
                    ) : null}
                  </div>
                  <p className="mb-3 text-[13.5px] leading-relaxed text-pretty">
                    {r.content}
                  </p>
                  <p className="text-xs text-tx3">
                    {author?.name ?? "Khách"} · {formatDate(r.createdAt)}
                  </p>
                </Card>
              );
            })}
          </div>
        )}
        {user ? (
          <Card className="mt-5 space-y-3 p-5">
            <p className="text-sm font-semibold">Viết đánh giá (chỉ khách đã mua)</p>
            <div className="flex gap-1 text-gold">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setReviewStars(s)}
                  className="cursor-pointer text-xl"
                  aria-label={`${s} sao`}
                >
                  {s <= reviewStars ? "★" : "☆"}
                </button>
              ))}
            </div>
            <Textarea
              rows={2}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Cảm nhận của bạn…"
            />
            <Button
              size="sm"
              variant="dark"
              onClick={() => {
                const r = actions.addReview(product.id, reviewStars, reviewText);
                if (r.ok) {
                  toast("Cảm ơn bạn đã đánh giá");
                  setReviewText("");
                } else toast(r.error, "error");
              }}
            >
              Gửi đánh giá
            </Button>
          </Card>
        ) : null}
      </section>

      {/* Liên quan */}
      {related.length > 0 ? (
        <section>
          <h2 className="mb-4 text-2xl font-bold tracking-[-0.01em]">
            Cùng series / hãng
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} state={state} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
