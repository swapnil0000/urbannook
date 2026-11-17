/* Home page - rebuilt 2026-11-16 from the ui-ux-pro-max design system
   ("Feature-Rich Showcase" + "Ratings focused" patterns), keeping the
   UrbanNook palette (Nook Red / Ink / Paper) and fonts (Archivo, Inter,
   JetBrains Mono). Section order:
     hero -> shop by category -> bestsellers -> why UrbanNook -> new arrivals
     -> shop by series -> reviews + CTA -> make it yours -> FAQ
   UX rules applied: one primary CTA per block, carousel with prev / next /
   pause that stops on hover, focus and reduced motion, touch targets >= 44px,
   text >= 11px, SVG icons (no emoji), visible focus rings. */
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addItem } from '../../store/slices/cartSlice';
import SEOHead from '../../component/SEOHead';
import { productImg, firstVariant, inr } from '../../component/UnProductCard';
import HomeProductCard from '../../component/HomeProductCard';
import FestiveSections from '../../component/festive/FestiveSections';
import FestiveOfferBand from '../../component/festive/FestiveOfferBand';

/* Pure-CSS motion (no JS animation library): items fade/slide in as they scroll
   into view via a native scroll-driven animation (`animation-timeline: view()`).
   Browsers without it, and reduced-motion users, simply see everything in place,
   so content is always in the HTML and visible - nothing hidden from crawlers. */
const Reveal = ({ children, className = '' }) => <div className={`un-rv ${className}`}>{children}</div>;
const Stagger = ({ children, className = '' }) => <div className={className}>{children}</div>;
const StaggerItem = ({ children, className = '' }) => <div className={`un-rv ${className}`}>{children}</div>;
import { useGetFeaturedProductsQuery, useGetProductsQuery, useGetHeroBannerQuery, useGetCategoriesQuery } from '../../store/api/productsApi';
import HeroBanner from '../../component/HeroBanner';
import { useGetTestimonialsQuery, useGetGoogleReviewsQuery } from '../../store/api/testimonialsApi';
import { useGetHomeComboOffersQuery } from '../../store/api/userApi';
import { useGetPublicStatsQuery, shownCount, shownRating } from '../../store/api/statsApi';
import { recordOfferInterest } from '../../utils/offerInterest';
import { trackViewItemList, trackAddToCart } from '../../utils/analytics';
import { CATEGORY_LABEL } from '../../utils/categoryUrl';

const onImgErr = (e) => { e.currentTarget.src = '/assets/logo.webp'; };
const productList = (res) => res?.data?.products || res?.data?.listofPublishedProducts || [];
const REDUCE_MOTION = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

/* ── small SVG icon set (stroke icons, inherit currentColor) ── */
const Icon = ({ name, className = 'w-5 h-5' }) => {
  const p = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    left: <path d="M15 6l-6 6 6 6" />,
    right: <path d="M9 6l6 6-6 6" />,
    pause: <path d="M9 6v12M15 6v12" />,
    play: <path d="M8 5l11 7-11 7z" />,
    print: <><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="9" rx="1" /><path d="M7 18v3h10v-3" /></>,
    truck: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>,
    wallet: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 12h2M3 10h18" /></>,
    shield: <><path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></>,
    star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />,
    plus: <path d="M12 5v14M5 12h14" />,
    brush: <><path d="M14 4l6 6-8 8H6v-6z" /><path d="M12 6l6 6" /></>,
  }[name];
  return (
    <svg viewBox="0 0 24 24" fill={name === 'star' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{p}</svg>
  );
};

const Stars = ({ n = 5, className = 'w-3.5 h-3.5' }) => (
  <span className="inline-flex text-star" aria-label={`${n} out of 5 stars`}>
    {[0, 1, 2, 3, 4].map((i) => <span key={i} className={i < Math.round(n) ? '' : 'opacity-25'}><Icon name="star" className={className} /></span>)}
  </span>
);

/** Tilted pill sticker with a hard ink shadow (CRAV / SweetTape labels). */
const Sticker = ({ children, className = '', tone = 'bg-mustard text-ink' }) => (
  <span className={`inline-block rounded-full border-[3px] border-ink px-3 py-1.5 md:px-4 font-anton uppercase leading-none shadow-[3px_3px_0_rgb(var(--gl-ink))] ${tone} ${className}`}>{children}</span>
);
const POP_BTN = `inline-flex items-center justify-center gap-2 min-h-[52px] px-7 rounded-full border-[3px] border-ink font-anton uppercase tracking-wide text-lg shadow-[4px_4px_0_rgb(var(--gl-ink))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_rgb(var(--gl-ink))] transition-[transform,box-shadow] ${FOCUS}`;

/** Section header: tilted sticker kicker, giant Anton title, optional "View all". */
const SecHead = ({ kicker, title, to, sub, tone = 'text-ink', sticker }) => (
  <Reveal className="flex flex-wrap items-end justify-between gap-4 mb-8 md:mb-12">
    <div>
      {kicker && <Sticker tone={sticker || 'bg-mustard text-ink'} className="-rotate-6 text-sm md:text-lg mb-3">{kicker}</Sticker>}
      <h2 className={`font-anton uppercase leading-[.85] text-[clamp(3rem,9vw,7rem)] ${tone}`}>{title}</h2>
      {sub && <p className="text-sm md:text-base mt-3 max-w-xl opacity-80">{sub}</p>}
    </div>
    {to && <Link to={to} className={`${POP_BTN} bg-cream text-ink`}>View all <Icon name="arrow" className="w-4 h-4" /></Link>}
  </Reveal>
);

/* ══ HERO - "variant wheel" (after the Kumo matcha shot) ═════════════
   One product on a centre stage; its designs sit on an arc around it as
   tilted white tiles. Picking a design turns the whole arc so that design
   slides into the centre, and the stage photo morphs in (scale + blur).
   Auto-play walks through up to 6 designs of a product, then moves to the
   next product. Stops on hover, keyboard focus, the pause button and
   reduced motion. */
const VARIANT_STEP_MS = 3200;
const MAX_AUTO_DESIGNS = 6;

const toFeature = (p) => {
  const variants = (p?.variantDetails || []).filter((v) => (v.variantImage || []).some(Boolean));
  const priced = variants.filter((v) => Number(v.variantPrice) > 0);
  const cheapest = priced.length ? priced.reduce((a, v) => (Number(v.variantPrice) < Number(a.variantPrice) ? v : a)) : null;
  const price = Number(cheapest?.variantPrice) || Number(firstVariant(p)?.variantPrice) || 0;
  const mrp = Number(cheapest?.variantMrp) || 0;
  const tiles = (variants.length ? variants : [{}]).map((v, k) => ({
    key: v.sku || v.variantName || k,
    img: (v.variantImage || []).find(Boolean) || productImg(p),
    cut: ((v.variantImage || []).find(Boolean) || productImg(p)),
    label: v.variantName || p?.productName,
    sku: v.sku || v.variantName || '',
    price: Number(v.variantPrice) || 0,
  }));
  return {
    id: p?.productId,
    name: p?.productName || 'UrbanNook',
    category: p?.productCategory || '',
    variantCount: variants.length,
    price,
    off: mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0,
    tiles,
  };
};


const Hero = ({ products, offers, rating, reviewCount, onOpen }) => {
  const features = useMemo(() => {
    const offerFor = new Map();
    for (const o of offers) if (o?.primaryProductId && !offerFor.has(o.primaryProductId)) offerFor.set(o.primaryProductId, o);
    const valid = products.filter((p) => p?.productId);
    const best = (p) => ((p.tags || []).includes('best_seller') ? 0 : 1);
    const many = (p) => ((p.variantDetails || []).length > 2 ? 0 : 1); // the wheel needs designs to show
    const ordered = [...valid].sort((a, b) => (offerFor.has(b.productId) - offerFor.has(a.productId)) || (many(a) - many(b)) || (best(a) - best(b)));
    // Only designs that have a transparent cut-out go on the wheel - a photo with its
    // studio background would show up as a box. Products with none are skipped.
    const all = ordered.map((p) => ({ ...toFeature(p), offer: offerFor.get(p.productId) || null }));
    const cutOnly = all.map((x) => ({ ...x, tiles: x.tiles.filter((t) => t.cut) })).filter((x) => x.tiles.length);
    return (cutOnly.length ? cutOnly : all).slice(0, 5);
  }, [products, offers]);

  const n = features.length;
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState({}); // chosen design per product
  const [userPaused, setUserPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const idx = n ? i % n : 0;
  const f = features[idx];
  const T = f?.tiles.length || 1;
  const v = Math.min(picked[f?.id] || 0, T - 1);
  const tile = f?.tiles[v];
  const running = !userPaused && !hover && !REDUCE_MOTION && (n > 1 || T > 1);

  useEffect(() => {
    if (!running || !f) return undefined;
    const id = setTimeout(() => {
      if (v + 1 < Math.min(T, MAX_AUTO_DESIGNS)) setPicked((m) => ({ ...m, [f.id]: v + 1 }));
      else if (n > 1) {
        const next = features[(idx + 1) % n];
        setPicked((m) => ({ ...m, [next.id]: 0 }));
        setI((x) => (x + 1) % n);
      } else setPicked((m) => ({ ...m, [f.id]: 0 }));
    }, VARIANT_STEP_MS);
    return () => clearTimeout(id);
  }, [running, v, idx, T, n, f, features]);

  if (!f) return <section aria-label="Loading" className="bg-cream min-h-[640px] md:min-h-[calc(100vh-6.5rem)] animate-pulse" />;

  const setV = (k) => setPicked((m) => ({ ...m, [f.id]: ((k % T) + T) % T }));
  const go = (d) => setI((x) => (x + d + n) % n);
  const open = (sku) => { if (f.offer) recordOfferInterest(f.offer.id, f.id); onOpen(f.id, sku); };
  const btn = `grid place-items-center w-11 h-11 rounded-full border-2 border-ink/80 bg-[#FFF6E8] text-ink hover:bg-ink hover:text-[#FFF6E8] transition-colors ${FOCUS}`;
  const word = (CATEGORY_LABEL[f.category] || f.category || 'UrbanNook').toUpperCase();

  /* Poster hero (2026-11-17, refs: CRAV burgers + SweetTape on landing.love):
     cream field, giant condensed word behind a floating product cut-out,
     tilted sticker badges, small copy blocks in the corners, red wave below. */
  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured products"
      className="relative bg-cream text-ink overflow-hidden"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHover(false); }}
    >
      {/* paper grain */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.35]" style={{ backgroundImage: 'radial-gradient(rgb(120 80 40 / .18) 1px, transparent 1px)', backgroundSize: '6px 6px' }} />

      <div className="relative max-w-[1440px] mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-6 md:pb-10">
        {/* giant word -> product -> outlined brand word, stacked so nothing is hidden */}
        <div className="relative flex flex-col items-center">
          <p key={`w-${f.id}`} aria-hidden="true"
            className="un-hero-in relative z-0 max-w-full whitespace-nowrap text-center font-anton uppercase leading-[.9] text-brand select-none text-[clamp(4rem,17vw,12.5rem)]">
            {word}
          </p>

          <div className="relative z-10 mt-3 md:mt-4 w-full h-[280px] sm:h-[360px] md:h-[clamp(300px,calc(100svh-31rem),440px)]">
            <button onClick={() => open(tile?.sku)} aria-label={`Open ${tile?.label}`}
              className={`group absolute left-1/2 top-0 -translate-x-1/2 h-full ${tile?.cut ? 'w-[78vw] max-w-[360px] md:w-[min(40vw,520px)] md:max-w-none' : 'w-[min(62vw,280px)] sm:w-[320px] md:w-[min(30vw,400px)] rounded-[28px] overflow-hidden border-4 border-ink -rotate-3 shadow-[8px_8px_0_rgb(var(--gl-ink))] bg-white'} ${FOCUS}`}>
              <img
                key={tile?.cut || tile?.img}
                src={tile?.cut || tile?.img}
                alt={tile?.label || f.name}
                fetchPriority={idx === 0 ? 'high' : undefined}
                onError={onImgErr}
                className={`un-pop absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-[1.04] ${tile?.cut ? 'un-cut object-contain' : 'object-contain p-2'}`}
              />
            </button>

            {(f.offer || f.off > 0) && (
              <Sticker className="absolute z-30 left-0 sm:left-[6%] md:left-[16%] top-[14%] -rotate-12 text-sm md:text-xl max-w-[42vw] md:max-w-[240px] !leading-tight text-center whitespace-normal">
                {f.offer ? (f.offer.benefit || f.offer.title) : `${f.off}% off`}
              </Sticker>
            )}
            <Sticker tone="bg-brand text-white" className="absolute z-30 right-0 sm:right-[6%] md:right-[16%] top-[62%] rotate-[10deg] text-sm md:text-xl">
              {f.variantCount > 1 ? `${f.variantCount} designs` : 'Made to order'}
            </Sticker>
            <span aria-hidden="true" className="hidden lg:grid absolute right-[3%] top-[2%] z-30 place-items-center w-28 h-28 rounded-full bg-mustard border-[3px] border-ink text-ink">
              <svg viewBox="0 0 120 120" className="un-spin absolute inset-0 w-full h-full">
                <defs><path id="un-badge-path" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" /></defs>
                <text fontSize="11" fontWeight="800" letterSpacing="2.4" fill="currentColor" style={{ fontFamily: 'Archivo, sans-serif' }}>
                  <textPath href="#un-badge-path">3D-PRINTED · 3D-PRINTED·</textPath>
                </text>
              </svg>
              <Icon name="print" className="w-8 h-8" />
            </span>
          </div>

          <p aria-hidden="true" className="relative z-20 mt-4 md:mt-5 font-anton uppercase leading-none text-[clamp(2.6rem,9vw,6.5rem)] text-mustard [-webkit-text-stroke:3px_rgb(var(--gl-ink))] md:[-webkit-text-stroke:4px_rgb(var(--gl-ink))] [text-shadow:5px_5px_0_rgb(var(--gl-ink))] select-none">
            UrbanNook
          </p>
        </div>

        {/* corner copy: name + rating left, price + buttons right */}
        <div className="relative z-30 mt-4 md:mt-2 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end" aria-live={running ? 'off' : 'polite'}>
          <div key={`c-${f.id}`} className="un-hero-in text-center md:text-left w-full max-w-sm mx-auto md:mx-0 min-w-0">
            <p className="font-archivo font-extrabold text-lg md:text-xl leading-tight truncate h-[1.6rem] md:h-7">{f.name}</p>
            <p className="mt-1 text-[13px] md:text-sm text-ink/75 truncate h-5">
              {tile?.label && tile.label !== f.name ? <>{tile.label} · </> : null}
              {rating ? <><b className="text-ink">{rating}★</b> from {reviewCount}+ reviews</> : '3D printed to order in India'}
            </p>
          </div>

          {/* design switcher */}
          <div className="flex items-center justify-center gap-2">
            {T > 1 && <button onClick={() => setV(v - 1)} aria-label="Previous design" className={btn}><Icon name="left" className="w-4 h-4" /></button>}
            {T > 1 && <span className="font-anton text-lg tabular-nums min-w-[3.5rem] text-center">{v + 1}/{T}</span>}
            {T > 1 && <button onClick={() => setV(v + 1)} aria-label="Next design" className={btn}><Icon name="right" className="w-4 h-4" /></button>}
          </div>

          <div className="flex flex-wrap md:flex-nowrap items-center justify-center md:justify-end gap-3 whitespace-nowrap">
            <span className="font-anton text-2xl md:text-[1.6rem] xl:text-3xl tabular-nums">{f.price > 0 ? `from ${inr(f.price)}` : ''}</span>
            <button onClick={() => open(tile?.sku)} className={`gl-press inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full border-[3px] border-ink bg-brand text-white font-anton uppercase tracking-wide text-lg shadow-[4px_4px_0_rgb(var(--gl-ink))] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_rgb(var(--gl-ink))] transition-[transform,box-shadow] ${FOCUS}`}>
              Shop this <Icon name="arrow" className="w-4 h-4" />
            </button>
            <Link to="/products" className={`inline-flex md:hidden xl:inline-flex items-center justify-center min-h-[48px] px-5 rounded-full border-[3px] border-ink font-anton uppercase tracking-wide text-lg hover:bg-ink hover:text-cream transition-colors ${FOCUS}`}>All</Link>
          </div>
        </div>

        {/* product switcher */}
        {n > 1 && (
          <div className="mt-4 flex items-center justify-center gap-1">
            <button onClick={() => go(-1)} aria-label="Previous product" className={btn}><Icon name="left" className="w-4 h-4" /></button>
            <div className="flex items-center gap-0.5" role="tablist" aria-label="Choose featured product">
              {features.map((x, di) => (
                <button key={x.id || di} role="tab" aria-selected={di === idx} aria-label={`${di + 1} of ${n}: ${x.name}`} onClick={() => setI(di)} className={`h-11 px-1 grid place-items-center ${FOCUS}`}>
                  <span className={`block h-2 rounded-full border-2 border-ink transition-all duration-300 ${di === idx ? 'w-8 bg-brand' : 'w-3 bg-transparent hover:bg-ink/30'}`} />
                </button>
              ))}
            </div>
            <button onClick={() => go(1)} aria-label="Next product" className={btn}><Icon name="right" className="w-4 h-4" /></button>
            {!REDUCE_MOTION && (
              <button onClick={() => setUserPaused((x) => !x)} aria-label={userPaused ? 'Play slideshow' : 'Pause slideshow'} className={btn}>
                <Icon name={userPaused ? 'play' : 'pause'} className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes un-hero-in{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}.un-hero-in{animation:un-hero-in .6s cubic-bezier(.22,1,.36,1) both}@media (prefers-reduced-motion:reduce){.un-hero-in{animation:none}}`}</style>
    </section>
  );
};

/* ══ Page palette (2026-11-17, refs: CRAV burgers + SweetTape on landing.love).
   Each block owns one flat colour; a drifting wave joins two neighbours. ══ */
const COL = {
  cream: ['bg-cream', 'fill-cream'],
  lime: ['bg-lime', 'fill-lime'],
  forest: ['bg-forest', 'fill-forest'],
  mustard: ['bg-mustard', 'fill-mustard'],
  red: ['bg-brand', 'fill-brand'],
  paper: ['bg-paper', 'fill-paper'],
  ink: ['bg-ink', 'fill-ink'],
};
const WRAP = 'max-w-[1280px] mx-auto px-5 md:px-8';
/** Cream "sticker" frame every product card sits in. */
const PopCard = ({ children, className = '' }) => <div className={`h-full ${className}`}>{children}</div>;

/* ══ SHOP BY CATEGORY - lime field, tilted rounded tiles (SweetTape) ══ */
const CategoryGrid = ({ tiles }) => (
  <section className="un-crumple relative isolate text-forest">
    <div className={`${WRAP} py-12 md:py-20`}>
      <SecHead kicker="Find your corner" title={<>Shop by{' '}<br />category</>} tone="text-forest" sticker="bg-forest text-lime" />
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-7">
        {tiles.map((c, k) => (
          <StaggerItem key={c.slug}>
            <Link to={`/category/${c.slug}`}
              className={`group relative block aspect-[4/5] rounded-[30px] border-[3px] border-ink bg-cream overflow-hidden shadow-[6px_6px_0_rgb(var(--gl-ink))] transition-transform duration-300 ${k % 2 ? 'rotate-2' : '-rotate-2'} hover:rotate-0 hover:-translate-y-1.5 motion-reduce:rotate-0 ${FOCUS}`}>
              {c.cut
                ? <img src={c.cut} alt="" loading="lazy" onError={onImgErr} className="un-cut absolute inset-x-0 top-6 bottom-24 m-auto w-[80%] h-[62%] object-contain transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6" />
                : <img src={c.img} alt="" loading="lazy" onError={onImgErr} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />}
              <span aria-hidden="true" className="absolute left-3 top-2 font-anton text-4xl md:text-6xl text-brand [-webkit-text-stroke:2px_rgb(var(--gl-ink))]">0{k + 1}</span>
              <span className="absolute inset-x-2.5 bottom-2.5 rounded-[22px] bg-forest text-lime pl-4 pr-2 py-2.5 flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block font-anton uppercase text-xl md:text-3xl leading-none truncate">{CATEGORY_LABEL[c.name] || c.name}</span>
                  <span className="block text-[12px] md:text-[13px] text-cream/85 mt-1">{c.itemCount} {c.itemCount === 1 ? 'design' : 'designs'}</span>
                </span>
                <span aria-hidden="true" className="shrink-0 grid place-items-center w-10 h-10 rounded-full bg-lime text-forest transition-transform group-hover:rotate-[-45deg]"><Icon name="arrow" className="w-4 h-4" /></span>
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  </section>
);

/* ══ BESTSELLERS - red "menu" board with a checker strip (CRAV) ══ */
const Checker = () => <div aria-hidden="true" className="h-5 md:h-7" style={{ background: 'repeating-conic-gradient(rgb(var(--gl-cream)) 0 25%, transparent 0 50%) 0 0 / 28px 28px' }} />;
const Bestsellers = ({ items, loading, total }) => (
  <section className="text-cream">
    <Checker />
    <div className={`${WRAP} py-12 md:py-20`}>
      <SecHead kicker="Most loved" title="Bestsellers" to="/products" tone="text-cream" />
      {loading
        ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[4/5] bg-white/15 animate-pulse rounded-[26px]" />)}</div>
        : (
          <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {items.slice(0, 8).map((p, i) => <StaggerItem key={p.productId || i}><PopCard><HomeProductCard p={p} index={i} listId="home_best" listName="Bestsellers" /></PopCard></StaggerItem>)}
          </Stagger>
        )}
      <div className="mt-10 flex justify-center"><Link to="/products" className={`${POP_BTN} bg-mustard text-ink`}>See all {total} pieces <Icon name="arrow" className="w-4 h-4" /></Link></div>
    </div>
    <Checker />
  </section>
);

/* ══ WHY URBANNOOK - forest field, curved lime headline + numbered cards (SweetTape) ══ */
const PROMISES = [
  { icon: 'print', title: '3D-printed to order', body: 'Printed after you order - sharp detail, no warehouse stock.' },
  { icon: 'truck', title: 'Dispatched in 48h', body: 'Pan-India delivery, 2-7 days depending on your pincode.' },
  { icon: 'wallet', title: 'Partial COD', body: 'Pay a small advance online, the rest in cash on delivery.' },
  { icon: 'shield', title: 'Free replacement', body: 'Arrived damaged or wrong? Report in 3 days, we replace it free.' },
];
const WhyUs = ({ orders }) => (
  <section className="un-crumple relative isolate text-lime overflow-hidden">
    <div className={`${WRAP} py-12 md:py-20`}>
      <Reveal>
        <h2 className="sr-only">Built when you order. Not before.</h2>
        <svg viewBox="0 0 1200 250" className="w-full h-auto" aria-hidden="true">
          <path id="un-arc" d="M 30 235 Q 600 -15 1170 235" fill="none" />
          <text className="font-anton" fontSize="100" fill="currentColor" letterSpacing="1">
            <textPath href="#un-arc" startOffset="50%" textAnchor="middle">BUILT WHEN YOU ORDER</textPath>
          </text>
        </svg>
        <p aria-hidden="true" className="-mt-2 md:-mt-6 text-center font-anton uppercase text-cream text-[clamp(2.4rem,7vw,5.5rem)] leading-none">Not before.</p>
      </Reveal>
      <div className="mt-8 md:mt-12 flex flex-wrap justify-center gap-x-14 gap-y-4 text-center">
        {orders > 0 && <div><p className="font-anton text-6xl md:text-8xl leading-none">{orders.toLocaleString('en-IN')}+</p><p className="text-cream/80 text-sm mt-1">orders delivered</p></div>}
      </div>
      <Stagger className="mt-10 md:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        {PROMISES.map((x, i) => (
          <StaggerItem key={x.title} className="relative rounded-[28px] bg-cream text-forest p-4 md:p-6 pt-7 flex flex-col min-h-[220px] md:min-h-[270px]">
            <span aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 top-2.5 w-10 h-1.5 rounded-full bg-forest/25" />
            <h3 className="font-anton uppercase text-xl md:text-3xl leading-[.95]">{x.title}</h3>
            <p className="text-[13px] md:text-[15px] leading-relaxed mt-2 text-forest/80 flex-1">{x.body}</p>
            <div className="mt-4 flex items-end justify-between">
              <span className="font-anton text-5xl md:text-7xl leading-none">0{i + 1}</span>
              <span className="grid place-items-center w-11 h-11 rounded-full bg-lime border-2 border-forest"><Icon name={x.icon} className="w-5 h-5" /></span>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  </section>
);

/* ══ PRODUCT RAIL - horizontal on phones, arrows on desktop ══ */
const ProductRail = ({ items, listId, listName }) => {
  const ref = useRef(null);
  const page = (d) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.9, behavior: REDUCE_MOTION ? 'auto' : 'smooth' });
  if (items.length <= 4) {
    return (
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {items.map((p, i) => <StaggerItem key={p.productId || i}><PopCard className={i % 2 ? 'rotate-1' : '-rotate-1'}><HomeProductCard p={p} index={i} listId={listId} listName={listName} /></PopCard></StaggerItem>)}
      </Stagger>
    );
  }
  return (
    <div className="relative">
      <div ref={ref} className="flex gap-4 md:gap-6 overflow-x-auto gl-hscroll snap-x snap-mandatory pt-2 pb-4 -mx-5 px-5 md:mx-0 md:px-1">
        {items.map((p, i) => (
          <div key={p.productId || i} className="snap-start shrink-0 w-[62vw] sm:w-[260px] lg:w-[calc((100%-72px)/4)]">
            <PopCard><HomeProductCard p={p} index={i} listId={listId} listName={listName} /></PopCard>
          </div>
        ))}
      </div>
      <div className="hidden md:flex justify-end gap-2 mt-4">
        {[['left', -1, 'Scroll left'], ['right', 1, 'Scroll right']].map(([ic, d, label]) => (
          <button key={ic} onClick={() => page(d)} aria-label={label} className={`grid place-items-center w-12 h-12 rounded-full border-[3px] border-ink bg-cream shadow-[3px_3px_0_rgb(var(--gl-ink))] hover:bg-ink hover:text-cream transition-colors ${FOCUS}`}>
            <Icon name={ic} className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );
};

/* ══ SHOP BY SERIES - sticker chips ══ */
const SeriesStrip = ({ categories }) => {
  const series = categories.filter((c) => c.kind !== 'category' && c.itemCount > 0).sort((a, b) => b.itemCount - a.itemCount).slice(0, 8);
  if (series.length < 2) return null;
  return (
    <section className={`${WRAP} pb-12 md:pb-20`}>
      <Reveal>
        <h2 className="font-anton uppercase text-3xl md:text-5xl mb-5">Shop by series</h2>
        <div className="flex flex-wrap gap-3">
          {series.map((s, k) => (
            <Link key={s.slug} to={`/category/${s.slug}`}
              className={`inline-flex items-center gap-2 min-h-[48px] px-5 rounded-full border-[3px] border-ink bg-cream font-anton uppercase text-lg shadow-[3px_3px_0_rgb(var(--gl-ink))] ${k % 2 ? 'rotate-2' : '-rotate-2'} hover:rotate-0 hover:bg-brand hover:text-white transition ${FOCUS}`}>
              {s.name}<span className="rounded-full bg-ink text-mustard text-xs px-2 py-0.5 font-inter font-bold">{s.itemCount}</span>
            </Link>
          ))}
        </div>
      </Reveal>
    </section>
  );
};

/* ══ WAVE DIVIDER - a slowly drifting wave between two section colours.
   The path holds two identical periods over 200% width, so sliding it by
   -50% loops without a seam. ══ */
const Wave = ({ bg, fill, flip = false }) => (
  <div aria-hidden="true" className={`relative -my-px h-10 md:h-16 overflow-hidden ${bg} ${flip ? 'rotate-180' : ''}`}>
    <svg className={`un-wave absolute bottom-0 left-0 h-full w-[200%] ${fill}`} viewBox="0 0 1440 60" preserveAspectRatio="none">
      <path d="M0 30 C 120 0 240 0 360 30 S 600 60 720 30 S 960 0 1080 30 S 1320 60 1440 30 V60 H0 Z" />
    </svg>
  </div>
);

/* ══ PHOTO MARQUEE - tilted polaroids drifting right to left, pauses on hover / touch ══ */
const PhotoMarquee = ({ products }) => {
  const shots = useMemo(() => products.flatMap((p) => (p.variantDetails || []).slice(0, 2).map((v) => ({
    img: (v.variantImage || []).find(Boolean), cut: ((v.variantImage || []).find(Boolean)), name: v.variantName || p.productName, id: p.productId, sku: v.sku || '',
  }))).filter((x) => x.img).slice(0, 16), [products]);
  // pause while a mouse is over it or a finger is on it (desktop + mobile), resume on leave/lift
  const [hold, setHold] = useState(false);
  if (shots.length < 6) return null;
  const on = () => setHold(true);
  const off = () => setHold(false);
  return (
    <section aria-label="Every design" className="pt-10 md:pt-16 pb-2">
      <div className="un-marq-wrap overflow-hidden motion-reduce:overflow-x-auto py-4" data-hold={hold || undefined}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') on(); }} onPointerLeave={off}
        onPointerDown={on} onPointerUp={(e) => { if (e.pointerType !== 'mouse') off(); }} onPointerCancel={off}>
        <div className="un-marq flex w-max gap-5 md:gap-7 px-3">
          {[0, 1].map((dup) => shots.map((x, k) => (
            <Link key={`${dup}-${k}`} to={x.sku ? `/product/${x.id}/${x.sku}` : `/products/${x.id}`} aria-hidden={dup === 1 || undefined} tabIndex={dup === 1 ? -1 : undefined}
              className={`group shrink-0 w-40 md:w-56 rounded-[18px] border-[3px] border-ink bg-white p-2 pb-3 shadow-[5px_5px_0_rgb(var(--gl-ink))] ${k % 2 ? 'rotate-3' : '-rotate-3'} ${FOCUS}`}>
              <span className="block aspect-square overflow-hidden rounded-[12px] bg-cream">
                <img src={x.cut || x.img} alt={dup === 1 ? '' : x.name} loading="lazy" decoding="async" onError={onImgErr} className={`w-full h-full ${x.cut ? 'un-cut object-contain p-3' : 'object-cover'}`} />
              </span>
              <span className="block mt-2 font-anton uppercase text-sm md:text-base truncate text-ink">{x.name}</span>
            </Link>
          )))}
        </div>
      </div>
    </section>
  );
};

/* ══ NEW ARRIVALS - mustard field with a dashed flight path (CRAV) ══ */
const Arrivals = ({ items }) => (
  <section className={`relative ${WRAP} py-12 md:py-20`}>
    <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-6 w-full h-40 md:h-56 text-ink/35" viewBox="0 0 1200 200" preserveAspectRatio="none" fill="none">
      <path d="M0 150 C 200 20 380 190 600 90 S 980 10 1200 120" stroke="currentColor" strokeWidth="3" strokeDasharray="14 12" strokeLinecap="round" />
    </svg>
    <div className="relative">
      <Sticker tone="bg-brand text-white" className="hidden md:inline-block absolute right-[8%] top-0 rotate-[8deg] text-xl">Just dropped</Sticker>
      <SecHead kicker="Fresh drop" title="New arrivals" to="/products" tone="text-brand [text-shadow:4px_4px_0_rgb(var(--gl-ink))]" sticker="bg-cream text-ink" />
      <ProductRail items={items} listId="home_new" listName="New Arrivals" />
    </div>
  </section>
);

/* ══ REVIEWS - forest field, "news card" reviews with a big number (SweetTape) ══ */
const ReviewSlider = ({ reviews, rating, total, google, products }) => {
  const ref = useRef(null);
  const page = (d) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.85, behavior: REDUCE_MOTION ? 'auto' : 'smooth' });
  return (
    <section className="un-crumple relative isolate text-lime">
      <div className={`${WRAP} py-12 md:py-20`}>
        <Reveal className="flex flex-wrap items-end justify-between gap-6 mb-8 md:mb-12">
          <div>
            <Sticker tone="bg-lime text-forest" className="-rotate-6 text-sm md:text-lg mb-3">{google?.rating ? 'Google reviews' : 'Customer reviews'}</Sticker>
            <h2 className="font-anton uppercase leading-[.85] text-[clamp(3rem,9vw,7rem)]">Straight from{' '}<br />your desks</h2>
            <p className="mt-4 flex items-center gap-2 text-cream"><Stars n={Number(rating) || 5} className="w-4 h-4" /><b>{rating}</b> · {total}+ reviews</p>
          </div>
          <div className="flex gap-2">
            {[['left', -1, 'Previous reviews'], ['right', 1, 'Next reviews']].map(([ic, d, label]) => (
              <button key={ic} onClick={() => page(d)} aria-label={label} className={`grid place-items-center w-12 h-12 rounded-full border-2 border-lime text-lime hover:bg-lime hover:text-forest transition-colors ${FOCUS}`}>
                <Icon name={ic} className="w-4 h-4" />
              </button>
            ))}
          </div>
        </Reveal>
        <div ref={ref} className="flex gap-4 md:gap-5 overflow-x-auto gl-hscroll snap-x snap-mandatory pb-2 -mx-5 px-5 md:mx-0 md:px-0">
          {reviews.slice(0, 8).map((t, i) => {
            const prod = products.length ? products[i % products.length] : null;
            const cut = prod ? (productImg(prod)) : null;
            return (
              <figure key={i} className="relative snap-start shrink-0 w-[80vw] sm:w-[340px] rounded-[30px] bg-cream text-forest p-5 pt-7 flex flex-col">
                <span aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 top-2.5 w-10 h-1.5 rounded-full bg-forest/25" />
                <blockquote className="font-archivo font-bold text-[15px] md:text-base leading-snug line-clamp-4">“{t.content}”</blockquote>
                {prod && (
                  <span className="mt-4 block h-40 rounded-[22px] overflow-hidden bg-white border-2 border-forest/15">
                    <img src={cut || productImg(prod)} alt="" loading="lazy" onError={onImgErr} className={`w-full h-full object-contain ${cut ? 'un-cut p-3' : 'p-1'}`} />
                  </span>
                )}
                <figcaption className="mt-4 flex items-end justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-bold text-sm truncate">{t.userName}</span>
                    <span className="block text-xs text-forest/70 truncate">{t.source === 'google' ? 'Google review' : 'Verified buyer'}</span>
                  </span>
                  <span className="shrink-0 text-right leading-none">
                    <span className="block font-anton text-5xl">{Number(t.rating || 5).toFixed(0)}<span className="text-2xl">/5</span></span>
                    <Stars n={t.rating} className="w-3 h-3" />
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
        {google?.mapsUrl && (
          <a href={google.mapsUrl} target="_blank" rel="noopener noreferrer" className={`mt-6 inline-flex items-center gap-1.5 min-h-[44px] text-sm font-bold text-lime hover:text-cream ${FOCUS}`}>All reviews on Google <Icon name="arrow" className="w-4 h-4" /></a>
        )}
      </div>
    </section>
  );
};

/* ══ MAKE IT YOURS - big red headline left, tilted photo right (CRAV "Feel the change") ══ */
const ClosingBand = ({ products }) => {
  const p = products.find((x) => (productImg(x))) || products[0];
  const cut = p ? (productImg(p)) : null;
  return (
    <section className={`${WRAP} py-12 md:py-20 grid md:grid-cols-2 gap-10 md:gap-14 items-center`}>
      <Reveal>
        <Sticker tone="bg-brand text-white" className="-rotate-6 text-sm md:text-lg">Customization</Sticker>
        <h2 className="mt-4 font-anton uppercase text-brand leading-[.85] text-[clamp(3.6rem,10vw,8.5rem)]">Make it{' '}<br />yours.</h2>
        <p className="mt-5 text-ink/80 text-base md:text-lg max-w-md">Every piece is printed after you order - a different colour, your name on it or a design we don&apos;t stock is a normal ask. Tell us, and we&apos;ll reply with what&apos;s possible and what it costs.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/customize" className={`${POP_BTN} bg-brand text-white`}><Icon name="brush" className="w-5 h-5" /> Customize a piece</Link>
          <Link to="/products" className={`${POP_BTN} bg-cream text-ink`}>Shop all</Link>
        </div>
      </Reveal>
      {p && (
        <Reveal className="relative">
          <div className="relative aspect-square rounded-[36px] border-4 border-ink bg-mustard overflow-hidden rotate-2 shadow-[10px_10px_0_rgb(var(--gl-ink))]">
            <img src={cut || productImg(p)} alt={p.productName} loading="lazy" onError={onImgErr} className={`w-full h-full ${cut ? 'un-cut un-bob object-contain p-10' : 'object-cover'}`} />
          </div>
          <Sticker className="absolute -left-2 md:-left-6 bottom-10 -rotate-12 text-lg md:text-2xl">Your name here?</Sticker>
          <Sticker tone="bg-lime text-forest" className="absolute -right-1 md:-right-4 top-8 rotate-12 text-base md:text-xl">Any colour</Sticker>
        </Reveal>
      )}
    </section>
  );
};

/* ══ FAQ ══ */
const FAQS = [
  { q: 'Can I customise my piece?', a: "Yes. Every product is 3D-printed to order, so we can change the colour or finish, add your initials or a logo, or tailor it to your setup. Message us before you order and we'll make it yours." },
  { q: 'Do you offer Cash on Delivery (COD)?', a: 'We offer partial COD - pay a small advance online at checkout to confirm the order, and the rest in cash when it arrives. Full COD (no advance) is not available.' },
  { q: 'How long will my order take?', a: 'Each piece is printed after you order and dispatched within 48 hours. It reaches you in 2-7 days depending on your pincode, anywhere in India.' },
  { q: 'Can I return it?', a: "We don't accept returns or exchanges for change of mind, colour or preference. If your item arrives damaged, defective or wrong, report it within 3 days with an unboxing video and we'll replace it free." },
  { q: 'What are the products made of?', a: 'Premium PLA + PETG with a 3D-printed layer texture and glossy resin detailing - sturdy, lightweight and built to last.' },
  { q: 'Do you do bulk orders or corporate gifting?', a: "Yes - custom bulk and corporate gifting with your branding. Reach out via Contact Us and we'll send a quote." },
];
// FAQ answers as schema.org FAQPage, from the same list the page shows.
const FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};
const Faq = () => {
  const [open, setOpen] = useState(0);
  return (
    <section className="max-w-[900px] mx-auto px-5 md:px-8 pb-12 md:pb-20">
      <Reveal className="mb-8 md:mb-10 text-center">
        <h2 className="font-anton uppercase leading-[.85] text-[clamp(3rem,9vw,6.5rem)] text-transparent [-webkit-text-stroke:2px_rgb(var(--gl-ink))] md:[-webkit-text-stroke:3px_rgb(var(--gl-ink))]">Questions?</h2>
        <p className="font-anton uppercase text-brand text-2xl md:text-4xl -mt-1">Answered.</p>
      </Reveal>
      <div className="flex flex-col gap-3">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className={`rounded-[22px] border-[3px] border-ink transition-colors ${isOpen ? 'bg-lime shadow-[5px_5px_0_rgb(var(--gl-ink))]' : 'bg-white'}`}>
              <h3>
                <button id={`faq-q-${i}`} onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen} aria-controls={`faq-a-${i}`}
                  className={`w-full flex items-center justify-between gap-4 text-left px-5 py-4 min-h-[60px] rounded-[20px] ${FOCUS}`}>
                  <span className="font-archivo font-extrabold text-base md:text-lg text-ink">{f.q}</span>
                  <span className={`shrink-0 grid place-items-center w-10 h-10 rounded-full border-2 border-ink transition-transform duration-300 ${isOpen ? 'bg-ink text-lime rotate-45' : 'bg-mustard text-ink'}`}>
                    <Icon name="plus" className="w-4 h-4" />
                  </span>
                </button>
              </h3>
              <div id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`} aria-hidden={!isOpen}
                className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <p className="text-ink/80 text-[15px] md:text-base leading-relaxed px-5 pb-5 pr-14 max-w-2xl">{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-ink/80 text-[15px]">Still curious? <Link to="/contact-us" className={`text-brand font-bold underline underline-offset-4 hover:text-brandHi ${FOCUS}`}>Talk to us</Link></p>
    </section>
  );
};

/* ══ BIG SIGN-OFF - giant outlined brand word with pieces resting on it (CRAV footer) ══ */
const BigSign = ({ products }) => {
  const cuts = products.map((p) => (productImg(p))).filter(Boolean).slice(0, 2);
  return (
    <section aria-hidden="true" className="relative overflow-hidden pt-10 md:pt-16 pb-6 select-none">
      <p className="text-center font-anton uppercase leading-[.8] text-brand text-[clamp(3.6rem,16.5vw,15.5rem)] [-webkit-text-stroke:3px_rgb(var(--gl-ink))] md:[-webkit-text-stroke:6px_rgb(var(--gl-ink))] [text-shadow:6px_6px_0_rgb(var(--gl-ink))] md:[text-shadow:12px_12px_0_rgb(var(--gl-ink))]">UrbanNook</p>
    </section>
  );
};

/** Mobile-only sticky add-to-cart for the lead product, above the bottom nav. */
const StickyAddBar = ({ product, onAdd }) => {
  const [show, setShow] = useState(false);
  const [added, setAdded] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 640 && (window.innerHeight + window.scrollY) < document.body.offsetHeight - 340);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!product) return null;
  const v = firstVariant(product);
  const handle = () => { onAdd(); setAdded(true); setTimeout(() => setAdded(false), 1600); };
  return (
        <div data-sticky-buybar aria-hidden={!show} inert={!show || undefined}
          className={`md:hidden fixed left-0 right-0 z-30 px-3 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${show ? 'translate-y-0 opacity-100' : 'translate-y-[120%] opacity-0 pointer-events-none'}`} style={{ bottom: 'calc(env(safe-area-inset-bottom) + 58px)' }}>
          <div className="flex items-center gap-3 bg-ink text-paper border border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.45)] p-2 rounded-lg">
            <img src={(productImg(product)) || productImg(product)} alt="" className={`w-12 h-12 shrink-0 ${(productImg(product)) ? 'object-contain' : 'object-cover rounded bg-white/10'}`} onError={onImgErr} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold truncate leading-tight">{product.productName}</p>
              <p className="text-xs text-paper/70 leading-tight mt-0.5">
                <b className="text-paper">{inr(v.variantPrice)}</b>
                {Number(v.variantMrp) > Number(v.variantPrice) && <> <s>{inr(v.variantMrp)}</s></>}
              </p>
            </div>
            <button onClick={handle} aria-live="polite" className={`un-btn gl-press shrink-0 min-h-[44px] font-bold text-sm px-5 ${added ? 'bg-save text-white' : 'bg-brand text-white'}`}>
              {!added && <span className="un-fill bg-brandHi" />}
              {added ? 'Added' : 'Add to cart'}
            </button>
          </div>
        </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { data: featRes } = useGetFeaturedProductsQuery({ limit: 1 }, { refetchOnMountOrArgChange: false, refetchOnFocus: false, refetchOnReconnect: false });
  const { data: prodRes, isLoading } = useGetProductsQuery({ page: 1, limit: 24 });
  const products = useMemo(() => productList(prodRes), [prodRes]);
  const { data: catRes } = useGetCategoriesQuery();
  const categories = useMemo(() => catRes?.data || [], [catRes]);
  const { data: homeOffersRes } = useGetHomeComboOffersQuery();
  const homeOffers = useMemo(() => homeOffersRes?.data?.combos || [], [homeOffersRes]);
  const { data: statsRes } = useGetPublicStatsQuery();
  const stats = statsRes?.data;

  // Admin-managed hero (Operations Hub -> Hero banner) wins when it has live slides.
  const { data: heroRes } = useGetHeroBannerQuery();
  const [heroBroken, setHeroBroken] = useState(false);
  const heroSlides = heroBroken ? [] : (heroRes?.data?.slides || []);

  const featured = useMemo(() => productList(featRes)[0] || products[0], [featRes, products]);
  const addOne = (p) => {
    const v = firstVariant(p);
    dispatch(addItem({ id: p.productId, mongoId: p.productId, name: p.productName, price: v.variantPrice, image: v.variantImage?.[0], quantity: 1, selectedVariant: v.variantName }));
    trackAddToCart?.({ itemId: p.productId, itemName: p.productName, itemVariant: v.variantName || '', price: v.variantPrice || 0, quantity: 1 });
  };

  // Tagged rows show only what really carries the tag; too few hides the row.
  const MIN_TAGGED = 2;
  const byTag = (t) => products.filter((p) => (p.tags || []).includes(t));
  const bestsellers = byTag('best_seller').slice(0, 8);
  const arrivals = byTag('new_arrival').filter((p) => !bestsellers.slice(0, 4).includes(p)).slice(0, 8);

  const { data: testRes } = useGetTestimonialsQuery();
  const { data: googleRes } = useGetGoogleReviewsQuery();
  const google = googleRes?.data?.configured ? googleRes.data : null;
  const reviews = useMemo(() => {
    const g = (google?.reviews || []).filter((r) => r.rating >= 4 && r.text)
      .map((r) => ({ userName: r.author, content: r.text, rating: r.rating, photo: r.authorPhoto, source: 'google' }));
    return [...g, ...(testRes?.data?.testimonials || [])];
  }, [google, testRes]);
  const rating = google?.rating ? google.rating.toFixed(1) : shownRating(stats);
  const reviewTotal = google?.total || shownCount(stats, 'totalReviews');

  const catTiles = useMemo(() => categories.filter((c) => c.kind === 'category' && c.itemCount > 0).map((c) => {
    const p = products.find((x) => x.productCategory?.toLowerCase() === c.name.toLowerCase());
    return { ...c, img: p ? productImg(p) : null, cut: p ? (productImg(p)) : null };
  }).filter((c) => c.img).sort((a, b) => b.itemCount - a.itemCount).slice(0, 4), [categories, products]);

  // Page = coloured blocks in order; a wave is drawn wherever the colour changes.
  const blocks = [
    heroSlides.length
      ? { k: 'hero', c: 'ink', node: <HeroBanner slides={heroSlides} autoplay={heroRes?.data?.autoplay} onEmpty={() => setHeroBroken(true)} /> }
      : { k: 'hero', c: 'cream', node: <Hero products={products} offers={homeOffers} rating={rating} reviewCount={reviewTotal} onOpen={(id, sku) => navigate(sku ? `/product/${id}/${sku}` : `/products/${id}`)} /> },
    catTiles.length >= 2 && { k: 'cat', c: 'lime', node: <CategoryGrid tiles={catTiles} /> },
    bestsellers.length >= MIN_TAGGED && { k: 'fest', c: 'mustard', node: <FestiveSections lead={<FestiveOfferBand products={products} />} /> },
    (isLoading || bestsellers.length >= MIN_TAGGED) && { k: 'best', c: 'red', node: <Bestsellers items={bestsellers} loading={isLoading} total={products.length} /> },
    { k: 'why', c: 'forest', node: <WhyUs orders={Number(stats?.totalOrders) || 0} /> },
    { k: 'new', c: 'cream', node: <><PhotoMarquee products={products} />{arrivals.length >= MIN_TAGGED && <Arrivals items={arrivals} />}<SeriesStrip categories={categories} /></> },
    reviews.length > 0 && { k: 'rev', c: 'forest', node: <ReviewSlider reviews={reviews} rating={rating} total={reviewTotal} google={google} products={products} /> },
    { k: 'end', c: 'cream', node: <><ClosingBand products={products} /><Faq /><BigSign products={products} /></> },
  ].filter(Boolean);

  useEffect(() => {
    if (products.length) trackViewItemList?.({ listName: 'Home', listId: 'home', items: products.map((p, i) => ({ itemId: p.productId, itemName: p.productName, price: firstVariant(p)?.variantPrice || 0, index: i })) });
  }, [products]);

  return (
    <div className="font-inter bg-cream text-ink overflow-x-clip">
      <SEOHead url="/" structuredData={FAQ_LD} />
      <style>{`.un-bento{box-shadow:0 1px 2px rgba(20,20,20,.05),0 8px 24px -14px rgba(20,20,20,.18);transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s}@media (hover:hover){.un-bento:hover{transform:scale(1.02);box-shadow:0 2px 4px rgba(20,20,20,.06),0 22px 44px -20px rgba(20,20,20,.3)}.un-bento:hover .gl-img{transform:scale(1.05)}.un-bento:hover .gl-img2{opacity:1}}@media (prefers-reduced-motion:reduce){.un-bento,.un-bento:hover{transform:none;transition:none}}
.un-cut{filter:drop-shadow(0 14px 18px rgb(0 0 0 / .28))}.un-dark .un-cut,.un-cut-dark{filter:drop-shadow(0 18px 26px rgb(0 0 0 / .6))}.un-blend{overflow:hidden;box-shadow:0 30px 70px -25px rgb(0 0 0 / .8),0 0 90px -20px rgb(var(--gl-brand) / .45)}.un-orb{overflow:hidden;box-shadow:0 16px 36px -14px rgb(0 0 0 / .75)}
.un-kb{animation:un-kb 16s ease-in-out infinite alternate;transform-origin:60% 50%}@keyframes un-kb{to{transform:scale(1.07)}}
.un-bob{animation:un-bob 6s ease-in-out infinite}@keyframes un-bob{0%,100%{translate:0 0}50%{translate:0 -14px}}
.un-spin{animation:un-spin 20s linear infinite}@keyframes un-spin{to{transform:rotate(360deg)}}
.un-wave{animation:un-wave 16s linear infinite}@keyframes un-wave{to{transform:translateX(-50%)}}
.un-crumple::before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.14;background:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='700' height='700'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.007' numOctaves='4' seed='9'/><feDiffuseLighting lighting-color='%23fff' surfaceScale='4'><feDistantLight azimuth='45' elevation='50'/></feDiffuseLighting></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.un-pop{animation:un-pop .55s cubic-bezier(.22,1,.36,1) both}@keyframes un-pop{from{opacity:0;transform:translateY(30px) rotate(-5deg) scale(.92)}}
@keyframes un-rv{from{opacity:0;transform:translateY(28px)}}
@supports (animation-timeline: view()){@media (prefers-reduced-motion:no-preference){.un-rv{animation:un-rv linear both;animation-timeline:view();animation-range:entry 0% entry 35%}}}
.un-marq{animation:un-marq 80s linear infinite}.un-marq-wrap[data-hold] .un-marq{animation-play-state:paused}@keyframes un-marq{to{transform:translateX(-50%)}}
.un-qa{display:grid;place-items:center}.un-qa-full{display:none}
@media (hover:hover) and (pointer:fine){.un-qa{left:.75rem;transform:translateY(140%);opacity:0;transition:transform .35s cubic-bezier(.22,1,.36,1),opacity .25s}.un-bento:hover .un-qa,.un-qa:focus-visible{transform:none;opacity:1}.un-qa-full{display:block}.un-qa-icon{display:none}}
@media (prefers-reduced-motion:reduce){.un-pop,.un-kb,.un-bob,.un-spin,.un-wave,.un-marq{animation:none}.un-qa{transition:none}}`}</style>
      <h1 className="sr-only">UrbanNook - 3D printed desk lamps, anime katanas and home decor, made in India</h1>

      {blocks.map((b, i) => (
        <Fragment key={b.k}>
          {i > 0 && blocks[i - 1].c !== b.c && <Wave bg={COL[blocks[i - 1].c][0]} fill={COL[b.c][1]} />}
          <div className={COL[b.c][0]}>{b.node}</div>
        </Fragment>
      ))}

      <StickyAddBar product={featured} onAdd={() => featured && addOne(featured)} />
    </div>
  );
};

export default HomePage;
