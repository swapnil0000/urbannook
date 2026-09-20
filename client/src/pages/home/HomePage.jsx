import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import SEOHead from '../../component/SEOHead';
import UnProductCard, { productImg, firstVariant, inr } from '../../component/UnProductCard';
import { Reveal, Stagger, StaggerItem, Parallax, TextReveal, useInView, motion, AnimatePresence } from '../../component/motion';
import { useGetFeaturedProductsQuery, useGetProductsQuery } from '../../store/api/productsApi';
import { useGetTestimonialsQuery } from '../../store/api/testimonialsApi';
import { useGetAllFreeShippingBannersQuery } from '../../store/api/freeShippingApi';
import { addItem } from '../../store/slices/cartSlice';
import { trackViewItemList, trackAddToCart } from '../../utils/analytics';

const onImgErr = (e) => { e.currentTarget.src = '/assets/logo.webp'; };

const HOME_STRUCTURED_DATA = {
  '@context': 'https://schema.org', '@type': 'WebSite', name: 'UrbanNook', url: 'https://www.urbannook.in',
  potentialAction: { '@type': 'SearchAction', target: 'https://www.urbannook.in/products?q={search_term_string}', 'query-input': 'required name=search_term_string' },
};
const productList = (res) => res?.data?.products || res?.data?.listofPublishedProducts || [];
const stars = (n) => { const r = Math.max(1, Math.min(5, n || 5)); return '★'.repeat(r) + '☆'.repeat(5 - r); };

const MARQUEE = ['3D-Printed', 'Made to Order', 'Pan-India Delivery', 'Car Culture', 'Desk Icons', 'Cash on Delivery'];

const Kicker = ({ children, className = '' }) => <p className={`gl-lbl text-brand ${className}`}>{children}</p>;

/** Editorial section header with a ghosted index numeral + rising title. */
const SecHead = ({ index, kicker, title, onView }) => (
  <Reveal className="flex items-end justify-between gap-4 mb-8">
    <div className="flex items-end gap-4 md:gap-5">
      {/* {index && (
        <span className="hidden sm:block font-archivo text-5xl md:text-7xl font-extrabold leading-[0.8] tabular-nums select-none -mb-1 text-ink/[0.08]">
          {index}
        </span>
      )} */}
      <div>
        <Kicker className="mb-2">{kicker}</Kicker>
        <h2 className="font-archivo text-3xl md:text-5xl font-extrabold tracking-tight leading-[0.95]">{title}</h2>
      </div>
    </div>
    {onView && (
      <button onClick={onView} className="gl-lbl text-[11px] shrink-0 inline-flex items-center gap-1.5 border-b-2 border-current pb-0.5 hover:text-brand hover:border-brand transition-colors">
        View all →
      </button>
    )}
  </Reveal>
);

/** Full-width kinetic marquee band (ink). */
// const MarqueeBand = () => (
//   <div className="bg-ink text-paper py-4 md:py-5 overflow-hidden border-y border-white/10">
//     <div className="un-marquee">
//       {[0, 1].map((dup) => (
//         <div key={dup} className="flex items-center shrink-0" aria-hidden={dup === 1}>
//           {MARQUEE.map((m, i) => (
//             <span key={i} className="flex items-center">
//               <span className="font-archivo text-xl md:text-3xl font-extrabold tracking-tight px-5 md:px-8 whitespace-nowrap">{m}</span>
//               <span className="text-brand text-lg md:text-xl">✳</span>
//             </span>
//           ))}
//         </div>
//       ))}
//     </div>
//   </div>
// );

/* The middle figure is maintained by hand — bump it when the milestone moves.
   It used to read "0 — Mass produced", which was meant as a boast about not
   mass producing but rendered as a large animated zero and simply looked like
   a number that had failed to load. A "+" is deliberate: the claim stays true
   as the count grows, so a stale value is never a false one. */
const STATS = [
  { to: 100, suffix: '%', label: 'Made in India' },
  { to: 900, suffix: '+', label: 'Orders delivered' },
  { to: 48, suffix: 'h', label: 'To ship' },
];

/** Number that eases 0→value the first time it scrolls into view. */
const CountUp = ({ to = 0, suffix = '', duration = 1.4 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setVal(to); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
};

/** Photo-led review card for the testimonial wall. */
const ReviewCard = ({ t, img, tag, onClick }) => (
  <figure
    onClick={onClick}
    className="group relative shrink-0 w-[288px] sm:w-[330px] aspect-[5/6] overflow-hidden bg-hair mr-4 md:mr-5 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-24px_rgba(20,20,20,0.55)]"
  >
    <img src={img} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-125" onError={onImgErr} />
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
    <span className="absolute top-4 right-4 gl-lbl text-[8px] text-white/90 border border-white/40 px-2 py-1 backdrop-blur-sm">✓ Verified</span>
    <figcaption className="absolute inset-x-3 bottom-3 p-4 bg-paper/95 backdrop-blur">
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="w-9 h-9 rounded-full bg-brand text-white grid place-items-center font-archivo font-extrabold text-sm shrink-0">{(t.userName || 'U').charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="gl-lbl text-[10px] text-ink truncate">{t.userName}</p>
          <span className="text-star text-[11px] leading-none">{stars(t.rating)}</span>
        </div>
        <span className="gl-lbl text-[8px] text-brand shrink-0 max-w-[92px] truncate">{tag} →</span>
      </div>
      <p className="text-ink text-[13px] leading-snug line-clamp-3">“{t.content}”</p>
    </figcaption>
  </figure>
);

/** Slowly rotating circular-text stamp — an editorial accent to fill space. */
const RotatingSeal = ({ text = '· MADE TO ORDER · 3D-PRINTED IN INDIA ' }) => (
  <div className="w-full h-full animate-[spin_16s_linear_infinite]">
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <defs>
        <path id="un-seal-path" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" fill="none" />
      </defs>
      <text fontSize="10.5" fontWeight="700" letterSpacing="1.6"
        style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
        fill="rgb(var(--gl-paper))" stroke="rgba(0,0,0,0.35)" strokeWidth="0.4">
        <textPath href="#un-seal-path" startOffset="0">{text.toUpperCase()}</textPath>
      </text>
    </svg>
  </div>
);

/** 3D curved coverflow carousel — ported from the reference: cards on a curved
 *  plane, center flat & forward, sides angled/blurred, auto-scrolls right→left,
 *  pauses on hover, click a card to focus it. Responsive (sizes scale to width). */
const CoverflowCarousel = ({ images }) => {
  const N = images.length;
  const [active, setActive] = useState(Math.min(2, Math.max(N - 1, 0)));
  const [paused, setPaused] = useState(false);
  const stageRef = useRef(null);
  const [stageW, setStageW] = useState(360);

  useEffect(() => {
    const measure = () => { if (stageRef.current) setStageW(stageRef.current.offsetWidth); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  useEffect(() => {
    if (N <= 1 || paused) return undefined;
    const id = setInterval(() => setActive((a) => (a + 1) % N), 3000);
    return () => clearInterval(id);
  }, [N, paused]);

  const cardW = Math.min(stageW * 0.74, 380);
  const cardH = cardW * 0.74;          // ~4:3, matches the reference 380×280
  const shift = Math.min(stageW * 0.5, 280);

  return (
    <div
      ref={stageRef}
      className="relative w-full flex items-center justify-center select-none"
      style={{ perspective: '1500px', height: cardH + 56 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative" style={{ transformStyle: 'preserve-3d', width: cardW, height: cardH }}>
        {images.map((src, i) => {
          let offset = i - active;
          if (offset < -Math.floor(N / 2)) offset += N;
          if (offset > Math.floor(N / 2)) offset -= N;
          const abs = Math.abs(offset);
          return (
            <div
              key={i}
              onClick={() => setActive(i)}
              className="absolute inset-0 overflow-hidden border border-white/10 shadow-2xl bg-ink cursor-pointer"
              style={{
                transform: `translateX(${offset * shift}px) translateZ(${-abs * 140}px) rotateY(${-offset * 15}deg) scale(${abs === 0 ? 1.05 : 1 - abs * 0.1})`,
                opacity: abs === 0 ? 1 : abs === 1 ? 0.8 : 0.4,
                filter: abs === 0 ? 'none' : 'blur(1px) brightness(0.85)',
                zIndex: 10 - abs,
                display: abs <= 2 ? 'block' : 'none',
                transition: 'transform 0.7s cubic-bezier(0.25,1,0.5,1), opacity 0.7s ease, filter 0.7s ease',
              }}
            >
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover pointer-events-none" onError={onImgErr} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FAQS = [
  { q: 'Can I customise my piece?', a: "Yes! Every product is 3D-printed to order, so we can tweak the colour or finish, add your initials or a logo, or tailor it to your setup. Just message us before you order and we'll make it yours." },
  { q: 'Do you offer Cash on Delivery (COD)?', a: 'Absolutely — COD is available everywhere across India. Pay at your doorstep when the order arrives; no prepayment needed.' },
  { q: 'How long will my order take?', a: 'Each piece is printed after you order, so it dispatches within ~48 hours and reaches you in 2–7 days depending on your pincode. Pan-India delivery on every order.' },
  { q: 'What if I want to return it?', a: "7-day easy returns on unused items. If anything arrives damaged or defective, we'll replace it free — just share a quick photo." },
  { q: 'What are the products made of?', a: 'Premium PLA + PETG with a signature 3D-printed layer texture and glossy resin detailing — sturdy, lightweight, and built to live on your desk for years.' },
  { q: 'Do you do bulk orders or corporate gifting?', a: "Yes — we love custom bulk and corporate gifting with your branding. Reach out via Contact Us and we'll sort a quote for you." },
];

/** Accordion FAQ — one item open at a time, smooth height animation. */
const FaqSection = ({ onContact }) => {
  const [open, setOpen] = useState(0);
  return (
    <section className="max-w-[860px] mx-auto px-5 py-5 md:py-20">
      <Reveal className="text-center mb-8 md:mb-10">
        <Kicker className="justify-center">Good to know</Kicker>
        <h2 className="font-archivo text-3xl md:text-5xl font-extrabold tracking-tight mt-2">Questions? Answered.</h2>
      </Reveal>
      <div className="border-t border-hair">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="border-b border-hair">
              <button onClick={() => setOpen(isOpen ? -1 : i)} className="w-full flex items-center justify-between gap-4 text-left py-5 group" aria-expanded={isOpen}>
                <span className={`font-bold text-base md:text-lg transition-colors ${isOpen ? 'text-brand' : 'text-ink group-hover:text-brand'}`}>{f.q}</span>
                <span className={`shrink-0 w-7 h-7 grid place-items-center border text-lg leading-none transition-all duration-300 ${isOpen ? 'bg-brand border-brand text-white rotate-45' : 'border-hair text-ink group-hover:border-ink'}`}>+</span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="text-muted leading-relaxed pb-5 pr-8 md:pr-10 max-w-2xl">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <Reveal className="text-center mt-8">
        <p className="text-muted text-sm">Still curious? <button onClick={onContact} className="text-brand font-bold underline underline-offset-2 hover:text-brandHi">Talk to us →</button></p>
      </Reveal>
    </section>
  );
};

/** Mobile-only sticky "add to cart" bar — slides up once you scroll past the hero,
 *  sits just above the bottom nav, hides near the footer. */
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
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 90, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="md:hidden fixed left-0 right-0 z-30 px-3"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 58px)' }}
        >
          <div className="flex items-center gap-3 bg-ink text-paper border border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.45)] p-2">
            <img src={productImg(product)} alt="" className="w-12 h-12 object-cover shrink-0 bg-white/10" onError={onImgErr} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold truncate leading-tight">{product.productName}</p>
              <p className="text-[11px] text-paper/60 leading-tight"><b className="text-paper">{inr(v.variantPrice)}</b> · Free shipping on the pair</p>
            </div>
            <button onClick={handle} className={`un-btn gl-press shrink-0 font-bold text-xs px-5 py-3 ${added ? 'bg-save text-white' : 'bg-brand text-white'}`}>
              {!added && <span className="un-fill bg-brandHi"></span>}
              {added ? '✓ Added' : 'Add'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/** Refer & Save teaser — shares the brand (Web Share API, falls back to copy link). */
const ReferSave = () => {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = 'https://www.urbannook.in';
    const text = 'Check out UrbanNook — 3D-printed desk lamps & décor, made to order in India.';
    try {
      if (navigator.share) await navigator.share({ title: 'UrbanNook', text, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* user dismissed the share sheet */ }
  };
  return (
    <section className="max-w-[1280px] mx-auto px-5 py-5 md:py-14">
      <Reveal className="relative overflow-hidden bg-ink text-paper border border-white/10 p-8 md:p-14 text-center md:text-left">
        <span aria-hidden="true" className="pointer-events-none select-none absolute -right-2 -bottom-10 md:-bottom-16 font-archivo text-[8rem] md:text-[14rem] font-extrabold text-white/[0.05] leading-none">₹</span>
        <div className="relative md:flex md:items-center md:justify-between gap-8">
          <div className="max-w-xl md:mx-0 mx-auto">
            <p className="gl-lbl text-brand mb-3">Refer &amp; Save</p>
            <h3 className="font-archivo text-3xl md:text-5xl font-extrabold tracking-tight leading-[0.95]">Know someone whose<br className="hidden md:block" /> desk needs this?</h3>
            <p className="text-paper/70 mt-4 max-w-md md:mx-0 mx-auto">Share UrbanNook with a friend. Our referral rewards are launching soon — share now and you&apos;ll be first in line to earn.</p>
          </div>
          <button onClick={share} className="un-btn gl-press mt-6 md:mt-0 shrink-0 bg-brand text-white font-bold text-sm px-8 py-4 inline-flex items-center gap-2">
            <span className="un-fill bg-brandHi"></span>
            <i className="fa-solid fa-share-nodes" /> {copied ? 'Link copied ✓' : 'Share UrbanNook'}
          </button>
        </div>
      </Reveal>
    </section>
  );
};

/* ══ HERO — "THE DROP" ══════════════════════════════════════════════════
   Catalogue-forward on a dark stage. Two things share the first screen:
   a featured piece with its headline, and a rail of the ENTIRE catalogue
   underneath it — so nothing above the fold is empty, which was the whole
   problem with a tall editorial banner on this shop.

   Why the pieces sit in light tiles rather than floating on the dark:
   every product here is photographed as a cut-out on a light studio grey.
   On a dark page there is no blend mode that removes that grey — screen
   and lighten make it glow, multiply crushes it to black. So the frame is
   made deliberate: a lit tile on a dark wall, which is how drop stores
   present product anyway, and multiply inside the tile then dissolves the
   grey into it completely.

   The featured tile still scan-prints on each rotation — the one motion
   carried over from the build-plate idea, now at tile scale where it costs
   no empty space.
   ═══════════════════════════════════════════════════════════════════ */

const HERO_ROTATE_MS = 6000;
const BUNDLE_MS = 6000;   // how long one free-shipping offer holds the panel

const REDUCE_MOTION =
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** What the featured slot needs from one product. */
const toFeature = (p) => {
  const variants = (p?.variantDetails || []).filter(
    (v) => (v.variantImage || []).filter(Boolean).length > 0,
  );
  const priced = variants.filter((v) => Number(v.variantPrice) > 0);
  const cheapest = priced.length
    ? priced.reduce((a, v) => (Number(v.variantPrice) < Number(a.variantPrice) ? v : a))
    : null;
  const price = Number(cheapest?.variantPrice) || Number(firstVariant(p)?.variantPrice) || 0;
  const mrp = Number(cheapest?.variantMrp) || 0;
  /* What the carousel rides on. With several variants it is one tile per
     variant — BMW / Porsche / Lamborghini / Ferrari, or the eleven katana
     designs. With a single variant there is nothing to compare, so it falls
     back to that variant's own gallery: either way the rail is never one
     lone tile sitting in a wide gap. */
  const tiles = variants.length > 1
    ? variants.map((v, k) => ({
        key: v.sku || v.variantName || k,
        img: (v.variantImage || []).filter(Boolean)[0],
        label: v.variantName || p?.productName,
        sku: v.sku || v.variantName,
      }))
    : (variants[0]?.variantImage || []).filter(Boolean).map((img, k) => ({
        key: `${variants[0]?.sku || 'v'}-${k}`,
        img,
        label: variants[0]?.variantName || p?.productName,
        sku: variants[0]?.sku || variants[0]?.variantName,
      }));

  return {
    id: p?.productId,
    name: p?.productName || 'UrbanNook',
    category: p?.productCategory || '',
    variantName: cheapest?.variantName || '',
    variantCount: variants.length,
    price,
    off: mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0,
    tiles: tiles.filter((t) => t.img).length ? tiles.filter((t) => t.img) : [{ key: 'fallback', img: productImg(p), label: p?.productName, sku: '' }],
  };
};

const HeroCarousel = ({ products = [], onProduct, onVariant, onShop }) => {
  // The first few products take turns in the featured slot; the rail below
  // carries the whole catalogue regardless.
  const features = useMemo(
    () => products.slice(0, 4).filter((p) => p?.productId).map(toFeature),
    [products],
  );

  /* The rotation above already covers the first few products, so the strip
     below carries the remainder. On a catalogue too small to have a remainder
     it falls back to everything, rather than rendering an empty row. */
  const strip = useMemo(() => {
    const shown = new Set(features.map((x) => x.id));
    const rest = products.filter((p) => p?.productId && !shown.has(p.productId));
    return rest.length ? { items: rest, isRest: true } : { items: products, isRest: false };
  }, [products, features]);

  const n = features.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const idx = n ? i % n : 0;
  const f = features[idx];

  useEffect(() => {
    if (paused || REDUCE_MOTION || n <= 1) return undefined;
    const id = setInterval(() => setI((x) => (x + 1) % n), HERO_ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, n]);

  const go = (d) => setI((x) => (x + d + n) % n);

  const railRef = useRef(null);
  const scrollRail = (d) => {
    const el = railRef.current;
    if (!el) return;
    // roughly one tile per tap, whatever that tile's natural width turned out to be
    const step = el.firstElementChild?.getBoundingClientRect().width || el.clientWidth * 0.6;
    el.scrollBy({ left: d * (step + 16), behavior: 'smooth' });
  };

  // A new featured product means a new set of variants — start at the front.
  useEffect(() => { railRef.current?.scrollTo({ left: 0 }); }, [idx]);

  if (!f) return <section className="bg-ink min-h-[calc(100svh-6.25rem)] animate-pulse" />;

  return (
    <section className="relative bg-ink text-paper overflow-hidden">
      <style>{`
        @keyframes un-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .un-in { animation: un-in 520ms cubic-bezier(.16,1,.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .un-in { animation: none; }
        }
      `}</style>

      {/* ambient: one red wash + a faint rule grid, nothing that eats space */}
      <div className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(55% 45% at 68% 38%, rgb(var(--gl-brand) / 0.20), transparent 70%)' }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,.6) 1px, transparent 1px)',
          backgroundSize: '12.5% 100%',
        }} />

      <div
        className="relative flex flex-col min-h-[calc(100svh-6.25rem)] md:min-h-[calc(100vh-6.5rem)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* ── TOP: the featured piece ── */}
        <div className="flex-1 flex flex-col md:flex-row items-center gap-7 md:gap-10 px-5 md:px-10 pt-7 md:pt-10">
          {/* copy */}
          <div key={`t-${f.id}`} className="un-in order-2 md:order-1 w-full md:w-[27rem] lg:w-[30rem] md:shrink-0">
            <p className="gl-lbl text-brand mb-3">
              Drop {String(idx + 1).padStart(2, '0')} · Made to order
            </p>
            <h1 className="font-archivo text-[2.2rem] sm:text-5xl lg:text-6xl font-extrabold leading-[0.95] tracking-tight break-words">
              {f.name}
            </h1>

            <div className="mt-4 flex items-baseline flex-wrap gap-x-3 gap-y-1">
              {f.variantCount > 1 && (
                <span className="text-paper/75 text-sm md:text-base">{f.variantCount} variants</span>
              )}
              {f.price > 0 && (
                <>
                  {f.variantCount > 1 && <span className="text-paper/30">·</span>}
                  <span className="text-paper/75 text-sm md:text-base">
                    from <b className="text-paper font-extrabold">₹{f.price.toLocaleString('en-IN')}</b>
                  </span>
                </>
              )}
              {f.off > 0 && <span className="gl-lbl text-[10px] text-white bg-brand px-2 py-0.5">{f.off}% off</span>}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => onProduct(f.id)} className="un-btn gl-press bg-brand text-white font-bold text-sm px-7 py-3.5">
                <span className="un-fill bg-brandHi"></span>Shop this drop
              </button>
              <button onClick={onShop} className="un-btn gl-press border border-white/35 text-white font-bold text-sm px-7 py-3.5">
                <span className="un-fill bg-white/10"></span>Shop all
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              {['48h dispatch', 'Cash on delivery', '7-day replacement'].map((t) => (
                <span key={t} className="flex items-center gap-2 text-[11px] font-semibold text-paper/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />{t}
                </span>
              ))}
            </div>

            {n > 1 && (
              <div className="mt-7 flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {features.map((s, di) => (
                    <button key={s.id || di} onClick={() => setI(di)} aria-label={`Show ${s.name}`}
                      className={`h-1 transition-all duration-300 ${di === idx ? 'w-7 bg-brand' : 'w-3 bg-white/30 hover:bg-white/60'}`} />
                  ))}
                </div>
                <span className="gl-lbl text-[10px] text-paper/40 tabular-nums">
                  {String(idx + 1).padStart(2, '0')}/{String(n).padStart(2, '0')}
                </span>
                <div className="flex items-center gap-1.5 ml-auto md:ml-2">
                  <button onClick={() => go(-1)} aria-label="Previous"
                    className="grid place-items-center w-8 h-8 border border-white/20 text-paper/70 hover:text-paper hover:border-white/50 transition-colors">
                    <i className="fa-solid fa-chevron-left text-[10px]" />
                  </button>
                  <button onClick={() => go(1)} aria-label="Next"
                    className="grid place-items-center w-8 h-8 border border-white/20 text-paper/70 hover:text-paper hover:border-white/50 transition-colors">
                    <i className="fa-solid fa-chevron-right text-[10px]" />
                  </button>
                </div>
              </div>
            )}
          </div>


          <div className="order-1 md:order-2 flex-1 min-w-0 w-full">
            <div key={`r-${f.id}`} className="un-in relative">
              <div
                ref={railRef}
                className="flex gap-3 md:gap-4 overflow-x-auto gl-hscroll snap-x snap-mandatory pb-1"
                style={{ touchAction: 'pan-x' }}
              >
                {f.tiles.map((t) => (
                  /* Fixed width AND fixed aspect, so every tile is the same size
                     whatever the photo's ratio is — the shots run 0.75 to 1.0,
                     and sizing each tile to its own photo made the rail change
                     size every time the banner rotated. */
                  <button
                    key={t.key}
                    onClick={() => onVariant(f.id, t.sku)}
                    aria-label={`Shop ${t.label}`}
                    className="group relative shrink-0 snap-start text-left border border-white/10 overflow-hidden w-[62vw] max-w-[240px] sm:w-[clamp(190px,20vw,260px)] sm:max-w-none"
                  >
                    <div className="relative w-full aspect-[4/5] overflow-hidden bg-surface">
                      {/* A blurred copy fills the box behind the real photo, so
                          the tile can be a fixed shape without cropping the
                          product or leaving a hard letterbox edge. The shots
                          sit on soft studio gradients, so the blurred backdrop
                          reads as a continuation of that backdrop. */}
                      <img
                        src={t.img}
                        alt=""
                        aria-hidden="true"
                        onError={onImgErr}
                        className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl"
                      />
                      <img
                        src={t.img}
                        alt={t.label}
                        loading="eager"
                        onError={onImgErr}
                        className="relative w-full h-full object-contain transition-transform duration-[900ms] group-hover:scale-[1.04]"
                      />
                    </div>
                    <div className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white border-t border-hair">
                      <span className="gl-lbl text-[10px] text-ink truncate min-w-0">{t.label}</span>
                      <span className="gl-lbl text-[10px] text-brand shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">Shop →</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* desktop scrub — mobile just swipes */}
              {f.tiles.length > 1 && (
                <div className="hidden md:flex items-center gap-2 mt-3">
                  <button onClick={() => scrollRail(-1)} aria-label="Scroll variants left"
                    className="grid place-items-center w-8 h-8 border border-white/20 text-paper/70 hover:text-paper hover:border-white/50 transition-colors">
                    <i className="fa-solid fa-chevron-left text-[10px]" />
                  </button>
                  <button onClick={() => scrollRail(1)} aria-label="Scroll variants right"
                    className="grid place-items-center w-8 h-8 border border-white/20 text-paper/70 hover:text-paper hover:border-white/50 transition-colors">
                    <i className="fa-solid fa-chevron-right text-[10px]" />
                  </button>
                  <span className="gl-lbl text-[10px] text-paper/40 ml-1">
                    {String(f.tiles.length).padStart(2, '0')} {f.variantCount > 1 ? 'variants' : 'views'} · swipe
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BOTTOM: the rest of the drop ─────────────────────────────
             Only what the featured rotation above has NOT already shown, so
             the same piece is not on screen twice. The row ends on a Shop-all
             tile rather than trailing off into dead space, and the tiles
             stretch to share whatever width is left — a short catalogue fills
             the row instead of leaving a gap, a long one just scrolls. */}
        <div className="shrink-0 px-5 md:px-10 pt-7 pb-7">
          <div className="flex items-baseline justify-between gap-4 mb-3">
            {/* <span className="gl-lbl text-[10px] text-paper/50">
              {strip.isRest ? 'More from the drop' : 'The drop'} · {String(strip.items.length).padStart(2, '0')} pieces
            </span> */}
            <button onClick={onShop}
              className="gl-lbl text-[10px] text-paper/70 hover:text-brand border-b border-white/25 hover:border-brand pb-0.5 transition-colors">
              Shop all →
            </button>
          </div>

          <div className="flex gap-3 md:gap-4 overflow-x-auto gl-hscroll pb-1 snap-x items-stretch">
            {strip.items.map((p, k) => (
              <div key={p.productId || k}
                className="snap-start shrink-0 grow basis-[142px] sm:basis-[158px] md:basis-[176px] max-w-[360px]">
                <UnProductCard p={p} index={k} listId="home_drop" listName="The Drop" />
              </div>
            ))}

            <button
              onClick={onShop}
              className="snap-start shrink-0 grow basis-[142px] sm:basis-[158px] md:basis-[176px] max-w-[360px] gl-press border border-white/15 hover:border-brand/60 hover:bg-white/[0.03] transition-colors flex flex-col items-center justify-center gap-2 py-8"
            >
              <span className="grid place-items-center w-10 h-10 rounded-full border border-white/25 text-paper/80">
                <i className="fa-solid fa-arrow-right text-xs" />
              </span>
              <span className="gl-lbl text-[10px] text-paper/70">Shop all</span>
              <span className="gl-lbl text-[9px] text-paper/35">{String(products.length).padStart(2, '0')} pieces</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { data: featRes } = useGetFeaturedProductsQuery({ limit: 1 }, { refetchOnMountOrArgChange: false, refetchOnFocus: false, refetchOnReconnect: false });
  const { data: prodRes, isLoading } = useGetProductsQuery({ page: 1, limit: 24 });
  const products = useMemo(() => productList(prodRes), [prodRes]);

  /* products?featured=true currently answers "No Published Product found"
     even though a product does carry the tag, so this cannot be the only
     source — when it comes back empty, fall back to the catalogue we have
     already loaded rather than to productImg(undefined), which resolves to
     the logo placeholder. That fallback is what put the logo on the page. */
  const featured = useMemo(() => productList(featRes)[0] || products[0], [featRes, products]);
  const heroImg = productImg(featured);

  // Auto-carousel of the featured product's own shots (different images, one product)
  const carouselImages = useMemo(() => {
    const real = (list) => [...new Set(list.filter((x) => x && !x.includes('/assets/logo')))];

    const gallery = real((firstVariant(featured)?.variantImage || []));
    if (gallery.length > 1) return gallery;

    const own = real([...gallery, ...(featured?.secondaryImages || []), featured?.productImg]);
    if (own.length > 1) return own;

    /* Still thin — build the reel from the catalogue instead, so the coverflow
       always has something to rotate. A single-image "carousel" reads as a
       broken carousel, and a single LOGO image reads as a broken page. */
    const across = real(products.map(productImg)).slice(0, 8);
    return across.length ? across : own.length ? own : gallery;
  }, [featured, products]);


  // ── Catalog-size-aware merchandising ──────────────────────────────
  // Below MERCH_THRESHOLD we can't fill separate Bestsellers / New /
  // Feed grids without repeating the same SKUs, so we show ONE curated
  // "Collection" and lean on editorial + the bundle. Cross the threshold
  // and the page automatically splits into differentiated, tag-driven
  // sections. Nothing here hardcodes the current 2-product catalog.
  const MERCH_THRESHOLD = 8;
  const n = products.length;
  const isFewProducts = n > 0 && n < MERCH_THRESHOLD;

  const byTag = (t) => products.filter((p) => (p.tags || []).includes(t));

  /* A tagged section shows ONLY what carries the tag. It used to fall back to
     the whole catalogue whenever fewer than four products were tagged, which
     is why untagged pieces were appearing under "Bestsellers" — a shopper
     reading that row was being told something untrue about them. Too few to
     be a row now hides the row instead. */
  const MIN_TAGGED = 2;
  const bestsellers = byTag('best_seller').slice(0, 8);
  const arrivals = byTag('new_arrival').slice(0, 8);

  // Sizing for the single "Collection" grid so 2–7 products never look stranded.
  const colsFor = (k) => (k <= 2 ? 'grid-cols-2 max-w-[720px]'
    : k === 3 ? 'grid-cols-2 lg:grid-cols-3 max-w-[1040px]'
    : 'grid-cols-2 lg:grid-cols-4');
  const collectionCols = colsFor(n);

  // ── Free-shipping cross-sell (server-driven) ──────────────────────
  // Banner config comes from the free-shipping-offer API. Eligibility (both
  // source + recommended in cart) is enforced server-side at checkout; here
  // we only display it and derive the "unlocked" state from the real cart.
  const dispatch = useDispatch();
  const cartItems = useSelector((s) => s.cart.items);
  const cartIds = useMemo(() => new Set(cartItems.map((i) => String(i.mongoId || i.id).split(':')[0])), [cartItems]);
  const { data: fsRes } = useGetAllFreeShippingBannersQuery();

  /* The API returns one row per DIRECTION, so A→B and B→A both come back for
     the same pair — six rows for three actual bundles today. Dedupe on the
     unordered pair, and drop any whose products are not in the loaded
     catalogue. Only the FIRST row was being read before, so the other offers
     never reached the page at all. */
  const bundles = useMemo(() => {
    const out = [];
    const seen = new Set();
    (fsRes?.data || []).forEach((b) => {
      const src = products.find((x) => x.productId === b.sourceProductId);
      const rec = products.find((x) => x.productId === b.recommendedProductId);
      if (!src || !rec || src.productId === rec.productId) return;
      const key = [src.productId, rec.productId].sort().join('|');
      if (seen.has(key)) return;
      seen.add(key);
      out.push({ key, banner: b, src, rec });
    });
    return out;
  }, [fsRes, products]);

  /* Lead with the bundle the shopper is closest to unlocking — exactly one of
     its two pieces already in the cart — so the card speaks to their cart
     instead of being a generic promo. Derived during render, not in an effect,
     so a manual pick still wins and nothing re-renders itself. */
  const autoBundle = useMemo(() => {
    const half = bundles.findIndex((b) => cartIds.has(b.src.productId) !== cartIds.has(b.rec.productId));
    return half >= 0 ? half : 0;
  }, [bundles, cartIds]);

  /* Left to itself the panel showed offer 1 and gave no sign the other two
     existed — no motion, and a dot row under the CTA that nobody looks at.
     It now rotates on its own, and stops the moment the shopper picks one. */
  const [pickedBundle, setPickedBundle] = useState(null);
  const [rotBundle, setRotBundle] = useState(null);
  const [bundlePaused, setBundlePaused] = useState(false);
  const rawBi = pickedBundle ?? rotBundle ?? autoBundle;
  const bi = bundles.length ? ((rawBi % bundles.length) + bundles.length) % bundles.length : 0;
  const bundle = bundles[bi] || null;

  useEffect(() => {
    if (pickedBundle != null || bundlePaused || bundles.length < 2 || REDUCE_MOTION) return undefined;
    const id = setInterval(
      () => setRotBundle((x) => ((x ?? autoBundle) + 1) % bundles.length),
      BUNDLE_MS,
    );
    return () => clearInterval(id);
  }, [pickedBundle, bundlePaused, bundles.length, autoBundle]);

  const showBundle = Boolean(bundle);
  const fsBanner = bundle?.banner || null;
  const fsSource = bundle?.src || null;
  const fsRec = bundle?.rec || null;
  const srcPrice = firstVariant(fsSource)?.variantPrice || 0;
  const recPrice = firstVariant(fsRec)?.variantPrice || 0;
  const bundleTotal = srcPrice + recPrice;
  const srcInCart = showBundle && cartIds.has(fsSource.productId);
  const recInCart = showBundle && cartIds.has(fsRec.productId);
  const inCartCount = (srcInCart ? 1 : 0) + (recInCart ? 1 : 0);
  const bundleUnlocked = inCartCount === 2;

  const addOne = (p) => {
    const v = firstVariant(p);
    dispatch(addItem({ id: p.productId, mongoId: p.productId, name: p.productName, price: v.variantPrice, image: v.variantImage?.[0], quantity: 1, selectedVariant: v.variantName }));
    trackAddToCart?.({ itemId: p.productId, itemName: p.productName, itemVariant: v.variantName || '', price: v.variantPrice || 0, quantity: 1 });
  };
  const addBundle = () => {
    if (fsSource && !cartIds.has(fsSource.productId)) addOne(fsSource);
    if (fsRec && !cartIds.has(fsRec.productId)) addOne(fsRec);
  };

  const collections = useMemo(() => {
    const seen = [];
    products.forEach((p) => { if (p.productCategory && !seen.find((c) => c.name === p.productCategory)) seen.push({ name: p.productCategory, img: productImg(p), count: '' }); });
    const soon = [{ name: 'Wall Posters', img: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80', soon: true }, { name: 'Desk Décor', img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80', soon: true }];
    return [...seen, ...soon].slice(0, 4);
  }, [products]);
  const hasRealCollections = collections.filter((c) => !c.soon).length >= 3;

  const { data: testRes } = useGetTestimonialsQuery();
  const testimonials = (testRes?.data?.testimonials || []).slice(0, 3);
  const fallbackReviews = [
    { userName: 'Aryan', content: "The red glow is unreal on a late-night setup. Way cooler in person.", rating: 5 },
    { userName: 'Simran', content: "Gifted the Porsche caliper — my brother hasn't turned it off since.", rating: 5 },
    { userName: 'Kabir', content: "Pen stand is tiny but adorable. Desk finally looks intentional.", rating: 4 },
  ];
  const reviews = testimonials.length ? testimonials : fallbackReviews;

  useEffect(() => {
    if (products.length) trackViewItemList?.({ listName: 'Home', listId: 'home', items: products.map((p, i) => ({ itemId: p.productId, itemName: p.productName, price: firstVariant(p)?.variantPrice || 0, index: i })) });
  }, [products]);

  return (
    <div className="font-inter bg-paper text-ink">
      <SEOHead url="/" structuredData={HOME_STRUCTURED_DATA} />

      {/* ══ HERO — the drop ══ */}
      <HeroCarousel
        products={products}
        onProduct={(id) => navigate(`/products/${id}`)}
        /* a variant tile goes straight to that variant's page, not the list */
        onVariant={(id, sku) => navigate(sku ? `/product/${id}/${sku}` : `/products/${id}`)}
        onShop={() => navigate('/products')}
      />

      {/* ══ MARQUEE ══ — butted straight against the plate, no gutter: both
          are ink, so the hero runs into the band with no visible seam. */}
      {/* <MarqueeBand /> */}

      {/* ══ CATEGORY PILLS ══ */}
      {/* <Reveal className="max-w-[1280px] mx-auto px-5 pt-8" y={18}>
        <div className="flex gap-2.5 overflow-x-auto gl-hscroll pb-1">
          <button onClick={() => navigate('/products')} className="shrink-0 un-btn gl-press bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-full">
            <span className="un-fill bg-brandHi"></span>Shop All
          </button>
          {['💡 Lamps', '✏️ Pen Stands', '🎁 Gifting', 'Under ₹500', '✨ New'].map((c) => (
            <button key={c} onClick={() => navigate('/products')} className="shrink-0 gl-press border border-hair bg-white text-sm font-semibold px-5 py-2.5 rounded-full hover:border-ink transition-colors">{c}</button>
          ))}
        </div>
      </Reveal> */}

      {/* ══ SOCIAL PROOF + PAYMENT — editorial stat tiles ══ */}
    
      {/* ══ PRODUCTS — adaptive to catalog size ══ */}
      {isFewProducts ? (
        /* Small, curated catalog: ONE collection, no repeated grids. */
        <section className="bg-surface border-y border-hair mt-4">
          <div className="max-w-[1280px] mx-auto px-5 py-9 md:py-14">
            <SecHead index="01" kicker="The Collection" title="Everything we make" onView={() => navigate('/products')} />
            {isLoading
              ? <div className={`grid ${collectionCols} mx-auto gap-3 md:gap-6`}>{[...Array(Math.max(n, 2))].map((_, i) => <div key={i} className="aspect-[4/5] bg-hair animate-pulse rounded-none border border-hair" />)}</div>
              : <Stagger className={`grid ${collectionCols} mx-auto gap-3 md:gap-6`} stagger={0.08}>{products.map((p, i) => <StaggerItem key={p.productId || i}><UnProductCard p={p} index={i} listId="home_collection" listName="Collection" /></StaggerItem>)}</Stagger>}
            <Reveal className="text-center mt-4 md:mt-6">
              <p className="text-muted text-sm max-w-md mx-auto">A tight, made-to-order range — no filler, no warehouse leftovers. <b className="text-ink">More drops on the way.</b></p>
            </Reveal>
          </div>
        </section>
      ) : bestsellers.length >= MIN_TAGGED ? (
        /* Full catalog: differentiated, tag-driven Bestsellers grid. */
        <section className="bg-surface border-y border-hair mt-4">
          <div className="max-w-[1280px] mx-auto px-5 py-9 md:py-14">
            <SecHead index="01" kicker="The Hype" title="Bestsellers" onView={() => navigate('/products')} />
            {isLoading
              ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">{[...Array(4)].map((_, i) => <div key={i} className="aspect-[4/5] bg-hair animate-pulse rounded-none border border-hair" />)}</div>
              : <Stagger className={`grid ${colsFor(bestsellers.length)} mx-auto gap-4 md:gap-6`} stagger={0.06}>{bestsellers.map((p, i) => <StaggerItem key={p.productId || i}><UnProductCard p={p} index={i} listId="home_best" listName="Bestsellers" /></StaggerItem>)}</Stagger>}
          </div>
        </section>
      ) : null}


        <Reveal className="max-w-[1280px] mx-auto px-5 py-5 md:py-7" y={18}>
        <div className="border border-hair overflow-hidden">
          <div className="h-1 bg-brand"></div>
          {/* bold stat tiles with hairline grid (gap-px over a hair bg) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-hair">
            <div className="bg-surface px-3 py-3.5 md:py-6 flex flex-col items-center justify-center text-center">
              <div className="flex items-baseline gap-1">
                <span className="font-archivo text-2xl md:text-4xl font-extrabold text-brand leading-none tabular-nums">4.9</span>
                <span className="text-muted text-xs font-bold">/5</span>
              </div>
              <span className="text-star text-[10px] mt-1 tracking-tight">★★★★★</span>
              <span className="gl-lbl text-[8px] text-faint mt-1">Avg rating</span>
            </div>
            <div className="bg-surface px-3 py-3.5 md:py-6 flex flex-col items-center justify-center text-center">
              <span className="font-archivo text-2xl md:text-4xl font-extrabold text-brand leading-none">2,000+</span>
              <span className="gl-lbl text-[8px] text-faint mt-1.5">Desks upgraded</span>
            </div>
            <div className="bg-surface px-3 py-3.5 md:py-6 flex flex-col items-center justify-center text-center">
              <span className="font-archivo text-2xl md:text-4xl font-extrabold text-brand leading-none">100%</span>
              <span className="gl-lbl text-[8px] text-faint mt-1.5">Made in India 🇮🇳</span>
            </div>
            <div className="bg-surface px-3 py-3.5 md:py-6 flex flex-col items-center justify-center text-center">
              <span className="font-archivo text-2xl md:text-4xl font-extrabold text-brand leading-none">7-Day</span>
              <span className="gl-lbl text-[8px] text-faint mt-1.5">Easy replacement</span>
            </div>
          </div>
          {/* secure-checkout + payment strip */}
          {/* <div className="border-t border-hair bg-white px-4 py-2.5 flex items-center justify-center gap-x-3 gap-y-1.5 flex-wrap">
            <span className="gl-lbl text-[9px] text-ink flex items-center gap-1.5">
              <i className="fa-solid fa-lock text-[9px] text-save" /> Secure checkout
            </span>
            <span className="hidden sm:block w-px h-3.5 bg-hair" />
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {['VISA', 'Mastercard', 'UPI', 'RuPay', 'COD'].map((x) => (
                <span key={x} className="gl-lbl text-[9px] text-muted border border-hair px-2 py-1 bg-surface">{x}</span>
              ))}
            </div>
          </div> */}
        </div>
      </Reveal>


      {/* ══ BUNDLE — free-shipping cross-sell (server-driven, interactive) ══ */}
      {showBundle && (
        <section className="max-w-[1280px] mx-auto px-5  md:py-14">
          <style>{`
            @keyframes un-bprog { from { width: 0; } to { width: 100%; } }
            .un-bprog { animation: un-bprog ${BUNDLE_MS}ms linear both; }
            @media (prefers-reduced-motion: reduce) { .un-bprog { animation: none; width: 100%; } }
          `}</style>
          <Reveal
            onMouseEnter={() => setBundlePaused(true)}
            onMouseLeave={() => setBundlePaused(false)}
            className={`relative border overflow-hidden grid md:grid-cols-2 transition-colors duration-500 ${bundleUnlocked ? 'border-save/50 bg-surface' : 'border-hair bg-surface'}`}
          >
            {/* LEFT — the pitch */}
            <div className="p-3 md:p-14 flex flex-col justify-center">
              <p className="gl-lbl text-brand mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
                Bundle · Free Shipping{bundles.length > 1 && <> · {String(bundles.length).padStart(2, '0')} offers</>}
              </p>

              {/* The switcher sits ABOVE the headline, not under the CTA where
                  the old 1px dot row went unnoticed. Each chip shows the two
                  products in that offer, so it is visible at a glance that
                  there is more than one — and the bar under the active chip
                  shows it is cycling on its own. */}
              {bundles.length > 1 && (() => {
                /* Segmented bar, the way stories mark progress: one thin
                   segment per offer, the current one filling with the rotation
                   timer. It says "there are three of these and they are
                   cycling" without a row of 28px thumbnails, which at that size
                   were unreadable mush. Each segment is a full-height tap
                   target even though the bar itself is 3px. */
                const autoRunning = pickedBundle == null && !bundlePaused && !REDUCE_MOTION;
                return (
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex items-center gap-1.5 w-full max-w-[190px]">
                      {bundles.map((b, k) => (
                        <button
                          key={b.key}
                          onClick={() => setPickedBundle(k)}
                          aria-label={`Offer ${k + 1} of ${bundles.length}: ${b.src.productName} + ${b.rec.productName}`}
                          aria-current={k === bi}
                          className="flex-1 py-2 group"
                        >
                          <span className="block h-[3px] bg-ink/15 overflow-hidden">
                            {k < bi && <span className="block h-full w-full bg-ink/35" />}
                            {k === bi && (
                              autoRunning
                                ? <span key={`p-${bi}`} className="un-bprog block h-full bg-brand" />
                                : <span className="block h-full w-full bg-brand" />
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                    <span className="gl-lbl text-[10px] text-faint tabular-nums shrink-0">
                      {String(bi + 1).padStart(2, '0')}/{String(bundles.length).padStart(2, '0')}
                    </span>
                  </div>
                );
              })()}
              <h3 className="font-archivo text-3xl md:text-5xl font-extrabold tracking-tight leading-[0.92]">
                {bundleUnlocked ? <>Free shipping<br />unlocked 🎉</> : inCartCount === 1 ? <>You're one<br />away</> : <>Buy the pair,<br />ship free</>}
              </h3>
              <p className="text-muted mt-4 max-w-md">
                {bundleUnlocked ? (
                  <>Both items are in your cart — delivery is on us at checkout.</>
                ) : inCartCount === 1 ? (
                  <>Just add <b className="text-ink">{srcInCart ? fsRec.productName : fsSource.productName}</b> and your delivery is <b className="text-ink">free</b>.</>
                ) : (
                  <>Add <b className="text-ink">{fsSource.productName}</b> + <b className="text-ink">{fsRec.productName}</b> together and your delivery is <b className="text-ink">free</b>.</>
                )}
              </p>

              {/* savings math */}
              <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm text-muted">₹{srcPrice.toLocaleString()}</span>
                <span className="text-faint text-sm">+</span>
                <span className="text-sm text-muted">₹{recPrice.toLocaleString()}</span>
                <span className="text-faint text-sm">=</span>
                <span className="font-archivo text-2xl font-extrabold text-ink">₹{bundleTotal.toLocaleString()}</span>
                <span className={`gl-lbl text-[10px] px-2 py-1 ml-1 ${bundleUnlocked ? 'bg-save text-white' : 'bg-save/10 text-save'}`}>Delivery FREE</span>
              </div>

              {/* progress toward unlock */}
              {!bundleUnlocked && (
                <div className="mt-5 max-w-[220px]">
                  <div className="h-1.5 bg-black/10 overflow-hidden">
                    <div className="h-full bg-brand transition-all duration-500" style={{ width: `${(inCartCount / 2) * 100}%` }} />
                  </div>
                  <p className="gl-lbl text-[9px] text-faint mt-1.5">{inCartCount} of 2 in cart</p>
                </div>
              )}

              {bundleUnlocked ? (
                <button onClick={() => navigate('/checkout')} className="un-btn gl-press mt-6 self-start bg-ink text-paper font-bold text-sm px-8 py-4">
                  <span className="un-fill bg-save"></span>Go to Checkout →
                </button>
              ) : (
                <button onClick={addBundle} className="un-btn gl-press mt-6 self-start bg-brand text-white font-bold text-sm px-8 py-4">
                  <span className="un-fill bg-brandHi"></span>{inCartCount === 1 ? 'Unlock free shipping →' : (fsBanner.ctaLabel || 'Add both to cart')}
                </button>
              )}

            </div>

            {/* RIGHT — the two items as an equation, each addable */}
            <div className="relative flex items-center justify-center gap-2 sm:gap-3 p-6 md:p-8 bg-surface md:min-h-[300px]">
              {[{ p: fsSource, inCart: srcInCart, price: srcPrice }, { p: fsRec, inCart: recInCart, price: recPrice }].map((it, idx) => (
                <div key={`${bundle.key}-${it.p.productId}`} className="contents">
                  {idx === 1 && <span className="font-archivo text-2xl md:text-3xl font-extrabold text-faint shrink-0 self-center mb-10">+</span>}
                  <div className="flex-1 max-w-[150px]">
                    <button onClick={() => navigate(`/product/${it.p.productId}`)} aria-label={it.p.productName} className="group relative block w-full aspect-square overflow-hidden border border-hair bg-surface">
                      <img src={productImg(it.p)} alt={it.p.productName} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={onImgErr} />
                      {it.inCart && <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-save text-white grid place-items-center text-[11px] shadow">✓</span>}
                    </button>
                    <p className="text-[11px] font-bold text-ink mt-2 leading-snug line-clamp-1">{it.p.productName}</p>
                    <div className="flex items-center justify-between gap-1 mt-1">
                      <span className="text-[11px] font-extrabold text-ink">₹{it.price.toLocaleString()}</span>
                      {it.inCart ? (
                        <span className="gl-lbl text-[8px] text-save">✓ Added</span>
                      ) : (
                        <button onClick={() => addOne(it.p)} className="gl-lbl text-[8px] text-brand border border-brand/40 px-1.5 py-0.5 hover:bg-brand hover:text-white transition-colors">+ Add</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ══ NEW ARRIVALS — rail; only what actually carries the tag ══ */}
      {/* {!isFewProducts && arrivals.length >= MIN_TAGGED && (
        <section className="max-w-[1280px] mx-auto px-5 pb-4">
          <SecHead index="02" kicker="Fresh Drop" title="New Arrivals" onView={() => navigate('/products')} />
          <Stagger className="flex gap-4 md:gap-6 overflow-x-auto gl-hscroll snap-x snap-mandatory pb-3 -mx-5 px-5" stagger={0.06}>
            {arrivals.map((p, i) => (
              <StaggerItem key={p.productId || i} className="shrink-0 w-[68vw] sm:w-[280px] snap-start">
                <UnProductCard p={p} index={i} listId="home_new" listName="New Arrivals" />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )} */}

      {/* ══ STATEMENT — hero carousel on top, manifesto below ══ */}
      <section className="my-6 bg-ink text-paper border-y border-white/10 overflow-hidden">
        <div className="max-w-[1100px] mx-auto px-7 md:px-12 py-12 md:py-24 flex flex-col items-center text-center">
          {/* CAROUSEL — 3D curved coverflow of the product's shots */}
          <div className="relative w-full max-w-[1000px]">
            {/* warm ambient glow behind the stage */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ width: '460px', height: '460px', background: 'radial-gradient(circle, rgba(232,93,39,0.38) 0%, rgba(230,51,41,0.12) 42%, transparent 70%)' }} />
            {/* Nothing to rotate before the catalogue lands — an empty stage
                is better than a stage of placeholders. */}
            {carouselImages.length > 0 && <CoverflowCarousel images={carouselImages} />}
          </div>

          {/* MANIFESTO — below the carousel */}
          <div className="mt-10 md:mt-14 max-w-2xl">
            <p className="gl-lbl mb-4 text-brand">The UrbanNook Way</p>
            <TextReveal as="h2" text="Built to order. Not to sit in a warehouse." delay={0.1} className="font-archivo text-4xl md:text-6xl font-extrabold tracking-tight leading-[0.95] text-paper" />
            <Reveal delay={0.2} className="mt-6 text-paper/70 text-base md:text-lg mx-auto max-w-md">Every piece is 3D-printed the moment you order it — less waste, sharper detail, and a finish you won't find on a shelf.</Reveal>
            <motion.div className="mt-8 h-px w-24 bg-white/30 mx-auto origin-center" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }} />
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-md mx-auto">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="font-archivo text-3xl md:text-5xl font-extrabold tracking-tight tabular-nums text-paper"><CountUp to={s.to} suffix={s.suffix} /></div>
                  <div className="gl-lbl text-[9px] mt-1.5 text-paper/50">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ SHOP BY COLLECTION — only when there are real categories to browse ══ */}
      {!isFewProducts && hasRealCollections && (
        <section className="max-w-[1280px] mx-auto px-5 py-9 md:py-14">
          <SecHead index="03" kicker="Find Your Corner" title="Shop by Collection" />
          <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4" stagger={0.07}>
            {collections.map((c, i) => (
              <StaggerItem key={i}>
                <button onClick={() => navigate(c.soon ? '/products' : `/products?category=${encodeURIComponent(c.name)}`)} className="gl-pcard un-card group relative rounded-none overflow-hidden aspect-[4/5] bg-hair cursor-pointer text-left w-full">
                  <img src={c.img} alt={c.name} loading="lazy" className="gl-img absolute inset-0 w-full h-full object-cover" onError={onImgErr} />
                  <span className="un-glare"></span>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent"></div>
                  {c.soon && <span className="absolute top-3 left-3 z-[3] gl-lbl text-[8px] bg-white/90 text-ink px-2 py-1 rounded">Coming soon</span>}
                  <div className="absolute bottom-0 p-4 text-white z-[3]"><p className="font-archivo font-extrabold text-lg tracking-tight">{c.name}</p><p className="text-white/70 text-xs">{c.soon ? 'Notify me' : 'Shop now →'}</p></div>
                </button>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* ══ SHOP THE FEED — needs enough distinct products to avoid repeats ══ */}
      {/* {!isFewProducts && (
        <section className="bg-surface border-y border-hair">
          <div className="max-w-[1280px] mx-auto px-5 py-9 md:py-14">
            <Reveal className="text-center mb-8"><Kicker className="justify-center">@urbannook.store</Kicker><h2 className="font-archivo text-3xl md:text-5xl font-extrabold tracking-tight mt-2">Shop the Feed</h2><p className="text-muted text-sm mt-2">Tap a shot to shop it</p></Reveal>
            <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-3" stagger={0.06}>
              {products.slice(0, 8).map((p, i) => (
                <StaggerItem key={i}>
                  <button onClick={() => navigate(`/product/${p.productId}`)} className="gl-pcard un-card group relative aspect-square rounded-none overflow-hidden bg-hair cursor-pointer w-full">
                    <img src={productImg(p)} alt="" loading="lazy" className="gl-img w-full h-full object-cover" onError={onImgErr} />
                    <span className="un-glare"></span>
                    <span className="absolute bottom-3 left-3 z-[3] bg-white/90 backdrop-blur text-ink text-xs font-bold px-2.5 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition">Shop this →</span>
                  </button>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      )} */}

      {/* ══ TESTIMONIALS — two-row review wall (opposite directions, hover to pause + zoom, tap to shop) ══ */}
      <section className="bg-paper py-4 md:py-20 overflow-hidden">
        <Reveal className="max-w-[1280px] mx-auto px-5 flex items-end justify-between gap-4 mb-8">
          <div>
            <Kicker>★ 4.9 · 2,000+ Reviews</Kicker>
            <h2 className="font-archivo text-3xl md:text-5xl font-extrabold tracking-tight mt-2">Straight from your desks</h2>
          </div>
          <span className="hidden sm:block gl-lbl text-[10px] text-faint whitespace-nowrap">Hover to pause · zoom · tap to shop</span>
        </Reveal>

        <div className="relative">
          {/* edge fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-14 md:w-28 bg-gradient-to-r from-paper to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-14 md:w-28 bg-gradient-to-l from-paper to-transparent z-10" />

          {/* single fast row */}
          <div className="un-marquee" style={{ animationDuration: '22s' }}>
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0" aria-hidden={dup === 1}>
                {reviews.map((t, i) => {
                  const prod = products.length ? products[i % products.length] : null;
                  return <ReviewCard key={i} t={t} img={prod ? productImg(prod) : heroImg} tag={prod?.productName || 'UrbanNook'} onClick={() => prod && navigate(`/product/${prod.productId}`)} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <FaqSection onContact={() => navigate('/contact-us')} />

      {/* ══ REFER & SAVE ══ */}
      <ReferSave />

      {/* ══ NEWSLETTER — doubles as the "we're just getting started" beat ══ */}
      <section className="max-w-[820px] mx-auto px-5 py-5 md:py-20 text-center">
        <Kicker className="justify-center mb-3">{isFewProducts ? 'The next drop' : 'Join the list'}</Kicker>
        <TextReveal as="h2" text={isFewProducts ? 'Be first to the next piece' : 'Get first access to drops'} className="font-archivo text-3xl md:text-5xl font-extrabold tracking-tight" />
        <p className="text-muted mt-4">{isFewProducts ? 'We add new made-to-order pieces often. Join for early access + 10% off your first order.' : 'New pieces land often. Members get early access + 10% off the first order.'}</p>
        <form onSubmit={(e) => e.preventDefault()} className="mt-7 flex max-w-md mx-auto rounded-xl overflow-hidden border border-ink bg-white">
          <input type="email" placeholder="Enter your email" className="flex-1 px-4 py-4 text-sm outline-none bg-transparent" />
          <button className="un-btn gl-press bg-brand text-white font-bold text-sm px-7"><span className="un-fill bg-brandHi"></span>Join</button>
        </form>
        <p className="gl-lbl text-[9px] text-faint mt-4">No spam · Unsubscribe anytime</p>
      </section>

      {/* ══ ABOUT — compact brand intro, kept at the bottom above the footer ══ */}
      {/* ══ CUSTOMIZE — every piece is printed to order, so this is a normal
             ask rather than an exception. Replaces the old "About" panel:
             that told people who we are, this gives them something to do. ══ */}
      <section className="max-w-[1280px] mx-auto px-5 py-5 md:py-16">
        <Reveal className="relative overflow-hidden bg-surface border border-hair p-8 md:p-14">
          <span aria-hidden="true" className="pointer-events-none select-none absolute -right-3 -bottom-10 md:-bottom-16 font-archivo text-[6rem] md:text-[13rem] font-extrabold text-ink/[0.04] leading-none tracking-tight">YOURS</span>
          <div className="relative max-w-2xl">
            <p className="gl-lbl text-brand mb-4">Customization · Made to order</p>
            <TextReveal as="h2" text="Make it yours." className="font-archivo text-4xl md:text-6xl font-extrabold tracking-tight leading-[0.95]" />
            <p className="mt-5 text-muted text-base md:text-lg max-w-xl">
              Nothing here sits in a warehouse — every piece is 3D-printed once you order it.
              So a different colour, your name on the side, or a livery we don&apos;t stock is a
              normal ask. Tell us what you want and we&apos;ll come back with what&apos;s
              possible and <span className="text-ink font-semibold">what it costs</span>.
            </p>
            <Stagger className="mt-6 flex flex-wrap gap-2" stagger={0.05}>
              {['Custom colours', 'Name / text on it', 'Your own livery', 'Gifting', 'Bulk orders'].map((t) => (
                <StaggerItem key={t} as="span" className="gl-lbl text-[10px] border border-hair bg-white px-3 py-1.5">{t}</StaggerItem>
              ))}
            </Stagger>
            <button onClick={() => navigate('/customize')} className="un-btn gl-press mt-7 bg-ink text-paper font-bold text-sm px-7 py-3.5">
              <span className="un-fill bg-brand"></span>Customize a piece
            </button>
          </div>
        </Reveal>
      </section>

      {/* mobile sticky add-to-cart — featured product */}
      <StickyAddBar product={featured} onAdd={() => featured && addOne(featured)} />
    </div>
  );
};

export default HomePage;
