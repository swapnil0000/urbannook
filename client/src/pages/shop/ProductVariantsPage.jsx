import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ProductDetailPage } from "../index";
import { useGetProductByIdQuery, useGetProductsQuery } from "../../store/api/productsApi";
import { useGetProductPromotionsQuery } from "../../store/api/userApi";
import { bestOfferBadge } from "../../utils/offerBadge";
import SEOHead from "../../component/SEOHead";
import StockStatus from "../../component/StockStatus";
import { isVariantOutOfStock } from "../../utils/variantStock";
import { useSiteCampaign } from "../../hooks/useSiteCampaign";
import { trackViewItemList, trackSelectItem } from "../../utils/analytics";

/**
 * Middle layer between the shop grid and the PDP: shown after tapping a
 * product's model card on /products. Lists every variant of that one
 * product (own title, image, price) as its own card. Tapping a variant
 * card goes to the existing /product/:productId/:sku PDP route.
 */

/* ── Variant orbit + poster tiles (2026-11-17). Refs: OffMenu (ring of round
   thumbnails that slowly turns, the picked one grows into the big circle) and
   Show And Tell (every tile its own colour, tilted name stickers).
   All motion is plain CSS (rotate keyframes, scale-in), paused on hover /
   focus and off for reduced motion. Photos are never cropped: object-contain
   with padding, so wide katanas and tall figures both sit whole. ── */
const TONES = [
  { bg: "rgb(var(--gl-lime))", fg: "rgb(var(--gl-forest))" },
  { bg: "rgb(var(--gl-mustard))", fg: "rgb(var(--gl-ink))" },
  { bg: "#FFFFFF", fg: "rgb(var(--gl-ink))" },
  { bg: "rgb(var(--gl-forest))", fg: "rgb(var(--gl-lime))" },
  { bg: "#F3B6A6", fg: "rgb(var(--gl-ink))" },
];
const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const imgOf = (v) => v?.variantImage?.find(Boolean) || "/assets/logo.webp";
const hrefOf = (productId, v) => `/product/${productId}/${encodeURIComponent(v?.sku || v?.variantName)}`;
const onImgErr = (e) => { e.currentTarget.src = "/assets/logo.webp"; };
const RING_MAX = 10;

const ORBIT_CSS = `
.un-orbit-wrap{container-type:inline-size}
.un-orbit,.un-orbit-counter{animation:un-orbit 70s linear infinite}
.un-orbit-counter{animation-direction:reverse}
.un-orbit-wrap:hover .un-orbit,.un-orbit-wrap:hover .un-orbit-counter,.un-orbit-wrap:focus-within .un-orbit,.un-orbit-wrap:focus-within .un-orbit-counter{animation-play-state:paused}
@keyframes un-orbit{to{rotate:360deg}}
.un-grow{animation:un-grow .55s cubic-bezier(.22,1,.36,1) both}
@keyframes un-grow{from{opacity:0;scale:.55}}
@keyframes un-tile{from{opacity:0;transform:translateY(26px)}}
@supports (animation-timeline: view()){@media (prefers-reduced-motion:no-preference){.un-tile{animation:un-tile linear both;animation-timeline:view();animation-range:entry 0% entry 30%}}}
@media (prefers-reduced-motion:reduce){.un-orbit,.un-orbit-counter,.un-grow{animation:none}}
`;

const VariantOrbit = ({ productId, productName, variants, sel, onPick }) => {
  // a single design gets no ring; few designs get bigger circles so the ring never looks empty
  const ring = variants.length > 1 ? variants.slice(0, RING_MAX) : [];
  const n = ring.length;
  const size = n <= 4 ? 24 : n <= 6 ? 21 : 18; // % of the stage width
  const v = variants[sel] || variants[0];
  const tone = TONES[sel % TONES.length];
  const price = Number(v?.variantPrice || 0);
  const mrp = Number(v?.variantMrp || 0);
  const oos = isVariantOutOfStock(v);
  const track = () => trackSelectItem({ itemId: productId, itemName: productName, itemVariant: v?.variantName, price, listId: "product_variants", listName: `${productName} - Variants`, index: sel });
  return (
    <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 md:gap-12 items-center">
      <div className="un-orbit-wrap relative mx-auto aspect-square w-full max-w-[560px]">
        {/* the turning ring */}
        <div className="un-orbit absolute inset-0">
          {ring.map((x, i) => {
            const a = (i / n) * 360;
            const on = i === sel;
            const t = TONES[i % TONES.length];
            return (
              <button key={x.sku || x.variantName || i} type="button" onClick={() => onPick(i)}
                aria-label={`Show ${x.variantName}`} aria-pressed={on}
                style={{ width: `${size}%`, left: `${50 - size / 2}%`, top: `${50 - size / 2}%`, transform: `rotate(${a}deg) translateY(-${49.5 - size / 2}cqw) rotate(${-a}deg)` }}
                className="group absolute aspect-square focus-visible:outline-none">
                <span className="un-orbit-counter block w-full h-full">
                  <span style={{ background: t.bg }}
                    className={`block w-full h-full overflow-hidden rounded-full border-[3px] transition-transform duration-300 group-hover:scale-110 group-focus-visible:ring-4 group-focus-visible:ring-brand ${on ? "border-brand scale-110 shadow-[3px_3px_0_rgb(var(--gl-ink))]" : "border-ink"}`}>
                    <img src={imgOf(x)} alt="" loading="lazy" decoding="async" onError={onImgErr} className="w-full h-full object-contain p-[14%]" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {/* the picked design, grown into the big circle */}
        <Link key={v?.sku || sel} to={hrefOf(productId, v)} viewTransition onClick={track} style={{ background: tone.bg }}
          className={`un-grow absolute ${n ? (size > 21 ? "inset-[30%]" : size > 18 ? "inset-[28%]" : "inset-[25%]") : "inset-[8%]"} rounded-full border-4 border-ink shadow-[6px_6px_0_rgb(var(--gl-ink))] overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand`}>
          <img src={imgOf(v)} alt={v?.variantName || productName} decoding="async" fetchPriority="high" onError={onImgErr} className="w-full h-full object-contain p-[13%]" />
        </Link>
      </div>

      <div className="text-center md:text-left" aria-live="polite">
        <span className="inline-block -rotate-3 rounded-full border-2 border-ink bg-mustard px-3 py-1 font-anton uppercase text-sm leading-none shadow-[2px_2px_0_rgb(var(--gl-ink))]">Design {sel + 1} of {variants.length}</span>
        <h2 className="mt-3 font-anton uppercase leading-[.9] text-[clamp(2.2rem,8vw,4.5rem)] text-ink break-words">{v?.variantName}</h2>
        <p className="mt-3 flex flex-wrap items-baseline justify-center md:justify-start gap-2">
          <span className="font-anton text-3xl md:text-4xl">{inr(price)}</span>
          {mrp > price && <s className="text-ink/45">{inr(mrp)}</s>}
          {mrp > price && !oos && <span className="rounded-full bg-brand text-white text-xs font-extrabold px-2 py-0.5">{Math.round(((mrp - price) / mrp) * 100)}% OFF</span>}
        </p>
        <StockStatus outOfStock={oos} left={v?.variantQuantity} className="mt-1 justify-center md:justify-start" />
        <div className="mt-5 flex flex-wrap justify-center md:justify-start gap-3">
          <Link to={hrefOf(productId, v)} viewTransition onClick={track} className="inline-flex items-center gap-2 min-h-[52px] px-7 rounded-full border-[3px] border-ink bg-brand text-white font-anton uppercase tracking-wide text-lg shadow-[4px_4px_0_rgb(var(--gl-ink))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_rgb(var(--gl-ink))] transition-[transform,box-shadow]">
            View this design <i className="fa-solid fa-arrow-right text-sm" aria-hidden="true" />
          </Link>
          {variants.length > 1 && (
            <button type="button" onClick={() => onPick((sel + 1) % variants.length)} className="inline-flex items-center gap-2 min-h-[52px] px-6 rounded-full border-[3px] border-ink bg-white font-anton uppercase tracking-wide text-lg hover:bg-lime transition-colors">
              Next <i className="fa-solid fa-rotate-right text-sm" aria-hidden="true" />
            </button>
          )}
        </div>
        {n > 0 && <p className="mt-3 text-[13px] text-ink/60">Tap a circle to see that design.</p>}
      </div>
    </div>
  );
};

const VariantTile = ({ productId, productName, v, i, offerBadge, demand }) => {
  const tone = TONES[i % TONES.length];
  const price = Number(v?.variantPrice || 0);
  const mrp = Number(v?.variantMrp || 0);
  const oos = isVariantOutOfStock(v);
  return (
    <Link to={hrefOf(productId, v)} viewTransition
      onClick={() => trackSelectItem({ itemId: productId, itemName: productName, itemVariant: v?.variantName, price, listId: "product_variants", listName: `${productName} - Variants`, index: i })}
      style={{ background: tone.bg, color: tone.fg }}
      className={`un-tile group flex flex-col h-full rounded-[24px] border-[3px] border-ink overflow-hidden shadow-[5px_5px_0_rgb(var(--gl-ink))] transition-transform duration-300 hover:-translate-y-1 ${i % 2 ? "md:rotate-1" : "md:-rotate-1"} hover:rotate-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand`}>
      <div className="relative aspect-[4/3] p-2">
        <img src={imgOf(v)} alt={v?.variantName || productName} loading="lazy" decoding="async" onError={onImgErr} className="w-full h-full object-contain rounded-[16px] transition-transform duration-500 group-hover:scale-[1.04]" />
      </div>
      <div className="px-3 pb-3 pt-1 flex flex-col flex-1">
        {/* labels sit under the photo, never on it */}
        <div className="mb-1.5 flex flex-wrap gap-1 min-h-[22px]">
          {oos && <span className="rounded-full bg-ink text-white text-[11px] font-bold px-2 py-0.5">Sold out</span>}
          {!oos && (demand || offerBadge) && <span className="rounded-full border-2 border-ink bg-white text-ink px-2 py-0.5 font-anton uppercase text-[11px] leading-tight">{demand || "Offer"}</span>}
          {mrp > price && !oos && <span className="rounded-full border-2 border-ink bg-brand text-white px-2 py-0.5 font-anton uppercase text-[11px] leading-tight">{Math.round(((mrp - price) / mrp) * 100)}% off</span>}
        </div>
        <h3 className="font-anton uppercase text-[17px] md:text-xl leading-[1.05] line-clamp-2 min-h-[2.1em] break-words">{v?.variantName}</h3>
        <p className="mt-auto pt-2 flex items-baseline gap-1.5">
          <span className="font-anton text-xl">{inr(price)}</span>
          {mrp > price && <s className="text-[12px] opacity-60">{inr(mrp)}</s>}
        </p>
      </div>
    </Link>
  );
};

const ProductVariantsPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { data: productResponse, isLoading, error } = useGetProductByIdQuery(productId);
  // Offer badge on every card (server-rendered too, see entry-server.jsx)
  const { data: promoRes } = useGetProductPromotionsQuery(productId);
  const offerBadge = bestOfferBadge(promoRes?.data?.promotions);

  // subtle Diwali accents while a festive campaign is live
  const { active: festiveActive, can } = useSiteCampaign();
  const festive = festiveActive && can('sectionAccents');

  // fetch the product page code now, so tapping a design opens it without a blank flash
  useEffect(() => { ProductDetailPage.preload(); }, []);

  const product = productResponse?.data;
  // the top real sellers of this product's designs (all-time units) get a Bestseller chip
  // sales figures come from the list API (same cached query as the header)
  const { data: listRes } = useGetProductsQuery({ page: 1, limit: 24 });
  const soldSource = (listRes?.data?.listofPublishedProducts || []).find((x) => x.productId === product?.productId) || product;
  const topSellers = new Set((soldSource?.variantDetails || []).filter((v) => Number(v.soldTotal) > 0)
    .sort((a, b) => Number(b.soldTotal) - Number(a.soldTotal)).slice(0, 3).map((v) => v.sku));
  const allVariants = useMemo(() => product?.variantDetails || [], [product]);
  // active designs, in-stock first, so the ring and the big circle open on something buyable
  const variants = useMemo(() => allVariants.filter((v) => v.isActive !== false)
    .sort((a, b) => Number(isVariantOutOfStock(a)) - Number(isVariantOutOfStock(b))), [allVariants]);
  // picked design, remembered per product (a new product opens on its first design)
  const [pick, setPick] = useState({ id: productId, i: 0 });
  const sel = pick.id === productId ? pick.i : 0;
  const setSel = (i) => setPick({ id: productId, i });
  const fromPrice = Math.min(...variants.map((v) => Number(v.variantPrice) || Infinity));
  // Share/search image: the product's own photo, not the site logo (Google showed the
  // logo as this URL's thumbnail). First active variant's first image; an admin SEO override still wins.
  const seoImage = (variants.find((v) => v.isActive !== false && v.variantImage?.length) || variants.find((v) => v.variantImage?.length))?.variantImage?.[0]
    || product?.productImg || undefined;


  useEffect(() => {
    if (product && variants.length > 0) {
      trackViewItemList({
        listName: `${product.productName} - Variants`,
        listId: "product_variants",
        items: variants.map((v, index) => ({
          itemId: product.productId,
          itemName: product.productName,
          price: v.variantPrice || 0,
          itemVariant: v.variantName || "",
          index,
        })),
      });
    }
  }, [product, variants]);

  return (
    <div className="min-h-screen bg-cream relative font-inter text-ink selection:bg-brand selection:text-white pb-10 overflow-x-clip">
      <style>{ORBIT_CSS}</style>
      <SEOHead
        title={product?.productName || "Choose a Variant"}
        description={product?.productDes || "Choose a variant of this UrbanNook product."}
        url={`/product/${productId}`}
        image={seoImage}
      />

      {festive && <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px]" style={{ background: 'radial-gradient(60% 100% at 50% 0%, rgb(var(--gl-star) / 0.16), transparent 70%)' }} aria-hidden="true" />}

      <section className="pt-12 pb-4 md:pt-10 md:pb-5 px-4 md:px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate("/products")}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 border-ink bg-white px-4 font-anton uppercase text-sm hover:bg-lime transition-colors mb-4 md:mb-6"
          >
            <i className="fa-solid fa-arrow-left"></i> Back to Shop
          </button>

          {!isLoading && !error && product && (
            <>
              <h1 className="font-anton uppercase text-brand text-[clamp(2.4rem,9vw,6rem)] leading-[.88] [text-shadow:3px_3px_0_rgb(var(--gl-ink))] mb-2 md:mb-3 break-words">
                {product.productName}
              </h1>
              {variants.length > 0 && (
                <p className="text-[13px] md:text-sm text-muted">
                  {variants.length} {variants.length === 1 ? "design" : "designs"}
                  {Number.isFinite(fromPrice) && <> · from <span className="font-bold text-ink">₹{fromPrice.toLocaleString("en-IN")}</span></>}
                </p>
              )}
              {festive && <span className="mt-3 block h-[3px] w-16 bg-gradient-to-r from-brand via-star to-transparent" aria-hidden="true" />}
              {/* <p className="text-sm md:text-base text-green-50/70 font-light">
                Choose a variant below.
              </p> */}
            </>
          )}
        </div>
      </section>

      <section className="pb-24 px-4 md:px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center py-32">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-hair">
              <i className="fa-solid fa-triangle-exclamation text-4xl text-faint mb-4"></i>
              <h2 className="font-archivo text-2xl font-extrabold text-ink mb-2">Unable to load this product</h2>
              <p className="text-muted mb-6">Please check your connection and try again</p>
              <button
                onClick={() => window.location.reload()}
                className="gl-press bg-brand text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-brandHi transition-colors"
              >
                Retry Connection
              </button>
            </div>
          ) : variants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border border-hair">
              <i className="fa-solid fa-box-open text-4xl text-faint mb-4"></i>
              <h2 className="font-archivo text-2xl font-extrabold text-ink mb-2">No variants available</h2>
            </div>
          ) : (
            <>
              <VariantOrbit productId={product.productId} productName={product.productName} variants={variants} sel={Math.min(sel, variants.length - 1)} onPick={setSel} />
              <h2 className="mt-14 md:mt-20 mb-5 font-anton uppercase text-[clamp(2rem,7vw,4rem)] leading-none">All designs</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {variants.map((v, i) => (
                  <VariantTile key={v._id || v.sku || i} productId={product.productId} productName={product.productName} v={v} i={i}
                    offerBadge={offerBadge} demand={topSellers.has(v.sku) ? "Bestseller" : null} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProductVariantsPage;
