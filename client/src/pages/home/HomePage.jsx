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
      {index && (
        <span className="hidden sm:block font-archivo text-5xl md:text-7xl font-extrabold leading-[0.8] tabular-nums select-none -mb-1 text-ink/[0.08]">
          {index}
        </span>
      )}
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
const MarqueeBand = () => (
  <div className="bg-ink text-paper py-4 md:py-5 overflow-hidden border-y border-white/10">
    <div className="un-marquee">
      {[0, 1].map((dup) => (
        <div key={dup} className="flex items-center shrink-0" aria-hidden={dup === 1}>
          {MARQUEE.map((m, i) => (
            <span key={i} className="flex items-center">
              <span className="font-archivo text-xl md:text-3xl font-extrabold tracking-tight px-5 md:px-8 whitespace-nowrap">{m}</span>
              <span className="text-brand text-lg md:text-xl">✳</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  </div>
);

const STATS = [
  { to: 100, suffix: '%', label: 'Made in India' },
  { to: 0, suffix: '', label: 'Mass produced' },
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

/** Hero — split banner carousel (text left, image right). 3 slides:
 *  variants (image itself cycles BMW/Porsche/Lambo) → free shipping → customization.
 *  Dots, arrows, swipe, pause-on-hover. */
const HeroCarousel = ({ featured, onProduct, onShop, onContact }) => {
  const variants = featured?.variantDetails || [];
  const lampImg = productImg(featured);
  const lampPrice = firstVariant(featured)?.variantPrice || 0;

  const slides = [
    {
      key: 'variants', kind: 'variants',
      kicker: 'Auto Series · 3 Marques',
      title: 'Pick your marque.',
      sub: `BMW, Porsche or Lambo — the 3D-printed caliper lamp in your favourite livery${lampPrice ? `, from ₹${lampPrice.toLocaleString()}` : ''}.`,
      ctaLabel: 'Shop the Lamp', cta: () => featured && onProduct(featured.productId),
    },
    {
      key: 'ship', kind: 'static', img: variants[1]?.variantImage?.[0] || lampImg,
      kicker: 'Free Shipping · The Pair',
      title: 'The pair ships free.',
      sub: 'Add the Caliper Lamp + Stationery Pen Stand together and your delivery is on us — anywhere in India.',
      ctaLabel: 'Shop the bundle', cta: () => featured && onProduct(featured.productId),
    },
    {
      key: 'custom', kind: 'static', img: variants[2]?.variantImage?.[0] || lampImg,
      kicker: 'Made to Order',
      title: 'Made your way.',
      sub: 'Every piece is 3D-printed the moment you order — pick a colour, add your initials, make it truly yours.',
      ctaLabel: 'Customise yours', cta: onContact,
    },
  ];

  const n = slides.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [vSel, setVSel] = useState(0);
  const slide = slides[i];

  // outer slide auto-advance
  useEffect(() => {
    if (paused || n <= 1) return undefined;
    const id = setInterval(() => setI((x) => (x + 1) % n), 6000);
    return () => clearInterval(id);
  }, [paused, n]);
  // inner variant cycle — only while the variants slide is showing
  useEffect(() => {
    if (paused || slide.kind !== 'variants' || variants.length <= 1) return undefined;
    const id = setInterval(() => setVSel((x) => (x + 1) % variants.length), 2000);
    return () => clearInterval(id);
  }, [paused, slide.kind, variants.length]);

  const go = (d) => setI((x) => (x + d + n) % n);
  const startX = useRef(null);
  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    startX.current = null;
  };

  const rightImg = slide.kind === 'variants' ? (variants[vSel]?.variantImage?.[0] || lampImg) : slide.img;
  const activeVariant = slide.kind === 'variants' ? variants[vSel] : null;

  return (
    <section className="relative max-w-[1440px] mx-auto md:px-5 md:pt-5">
      <div
        className="relative overflow-hidden md:rounded-[1.75rem] bg-ink"
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      >
        <div className="grid md:grid-cols-2 items-stretch min-h-[88vh] md:min-h-[78vh]">
          {/* LEFT — text (below the image on mobile) */}
          <div className="order-2 md:order-1 relative flex flex-col justify-center px-7 md:px-12 lg:px-16 py-10 md:py-12 text-paper">
            {/* corner meta */}
            <div className="absolute top-6 left-7 md:left-12 lg:left-16 right-7 flex items-center gap-3 text-paper/55">
              <span className="gl-lbl text-[10px]">Est. 2025 — India</span>
              <span className="gl-lbl text-[10px] hidden lg:block">· The Auto Series</span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={slide.key}
                initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="gl-lbl text-brand mb-4">{slide.kicker}</p>
                <h1 className="font-archivo text-[2.75rem] md:text-5xl lg:text-7xl font-extrabold leading-[0.92] tracking-tight">{slide.title}</h1>
                <p className="mt-5 text-paper/80 text-base md:text-lg max-w-md">{slide.sub}</p>

                {slide.kind === 'variants' && variants.length > 1 && (
                  <div className="mt-6 flex items-center gap-2">
                    {variants.slice(0, 3).map((s, si) => (
                      <button key={s.variantName || si} onClick={() => setVSel(si)} aria-label={s.variantName}
                        className={`w-11 h-11 overflow-hidden border-2 transition-all ${vSel === si ? 'border-brand scale-105' : 'border-white/25 opacity-70 hover:opacity-100'}`}>
                        <img src={s.variantImage?.[0]} alt={s.variantName} className="w-full h-full object-cover" onError={onImgErr} />
                      </button>
                    ))}
                    <span className="gl-lbl text-[11px] text-paper/70 ml-1">
                      {activeVariant?.variantName}{activeVariant?.variantPrice ? ` · ₹${activeVariant.variantPrice.toLocaleString()}` : ''}
                    </span>
                  </div>
                )}

                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={slide.cta} className="un-btn gl-press bg-brand text-white font-bold text-sm px-8 py-4">
                    <span className="un-fill bg-brandHi"></span>{slide.ctaLabel}
                  </button>
                  <button onClick={onShop} className="un-btn gl-press border border-white/40 text-white font-bold text-sm px-8 py-4">
                    <span className="un-fill bg-white/10"></span>Shop all
                  </button>
                </div>

                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5">
                  {['48h dispatch', 'Cash on delivery', '7-day returns'].map((t) => (
                    <span key={t} className="flex items-center gap-2 text-xs font-semibold text-paper/70"><span className="w-1.5 h-1.5 rounded-full bg-brand"></span>{t}</span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* controls: arrows (desktop) + dots */}
            <div className="mt-10 flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2">
                <button onClick={() => go(-1)} aria-label="Previous slide" className="grid place-items-center w-9 h-9 border border-white/25 text-paper/80 hover:bg-white/10 hover:border-white/50 transition-colors"><i className="fa-solid fa-chevron-left text-xs" /></button>
                <button onClick={() => go(1)} aria-label="Next slide" className="grid place-items-center w-9 h-9 border border-white/25 text-paper/80 hover:bg-white/10 hover:border-white/50 transition-colors"><i className="fa-solid fa-chevron-right text-xs" /></button>
              </div>
              <div className="flex items-center gap-2">
                {slides.map((_, di) => (
                  <button key={di} onClick={() => setI(di)} aria-label={`Slide ${di + 1}`}
                    className={`h-1.5 transition-all duration-300 ${di === i ? 'w-6 bg-brand' : 'w-2 bg-white/40 hover:bg-white/70'}`} />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — image (on top on mobile). For the variants slide it cycles BMW/Porsche/Lambo. */}
          <div className="order-1 md:order-2 relative min-h-[44vh] md:min-h-full overflow-hidden bg-[#101010]">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-[85%] h-[85%] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(232,93,39,0.30), transparent 70%)' }} />
            </div>
            <AnimatePresence initial={false}>
              <motion.img
                key={rightImg} src={rightImg} alt={featured?.productName || 'UrbanNook'} loading="eager"
                initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 w-full h-full object-cover" onError={onImgErr}
              />
            </AnimatePresence>
            {/* blend the image bottom into the text panel on mobile */}
            <div className="absolute inset-x-0 bottom-0 h-24 md:hidden bg-gradient-to-b from-transparent to-ink" />
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
  const featured = useMemo(() => productList(featRes)[0], [featRes]);
  const heroImg = productImg(featured) || '/assets/hero2.webp';

  // Auto-carousel of the featured product's own shots (different images, one product)
  const carouselImages = useMemo(() => {
    const gallery = (firstVariant(featured)?.variantImage || []).filter(Boolean);
    if (gallery.length > 1) return gallery;
    const all = [...gallery, ...(featured?.secondaryImages || []), featured?.productImg].filter(Boolean);
    const uniq = [...new Set(all)];
    return uniq.length ? uniq : [heroImg];
  }, [featured, heroImg]);

  const { data: prodRes, isLoading } = useGetProductsQuery({ page: 1, limit: 24 });
  const products = useMemo(() => productList(prodRes), [prodRes]);

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
  const bestsellers = (byTag('best_seller').length >= 4 ? byTag('best_seller') : products).slice(0, 8);
  const arrivals = (byTag('new_arrival').length >= 4 ? byTag('new_arrival') : [...products].reverse()).slice(0, 8);

  // Sizing for the single "Collection" grid so 2–7 products never look stranded.
  const collectionCols = n <= 2 ? 'grid-cols-2 max-w-[720px]'
    : n === 3 ? 'grid-cols-2 lg:grid-cols-3 max-w-[1040px]'
    : 'grid-cols-2 lg:grid-cols-4';

  // ── Free-shipping cross-sell (server-driven) ──────────────────────
  // Banner config comes from the free-shipping-offer API. Eligibility (both
  // source + recommended in cart) is enforced server-side at checkout; here
  // we only display it and derive the "unlocked" state from the real cart.
  const dispatch = useDispatch();
  const cartItems = useSelector((s) => s.cart.items);
  const { data: fsRes } = useGetAllFreeShippingBannersQuery();
  const fsBanner = fsRes?.data?.[0] || null;
  const fsSource = fsBanner ? products.find((p) => p.productId === fsBanner.sourceProductId) : null;
  const fsRec = fsBanner ? products.find((p) => p.productId === fsBanner.recommendedProductId) : null;
  const showBundle = Boolean(fsBanner && fsSource && fsRec);
  const bundleTotal = (firstVariant(fsSource)?.variantPrice || 0) + (firstVariant(fsRec)?.variantPrice || 0);
  const cartIds = useMemo(() => new Set(cartItems.map((i) => String(i.mongoId || i.id).split(':')[0])), [cartItems]);
  const bundleUnlocked = showBundle && cartIds.has(fsSource.productId) && cartIds.has(fsRec.productId);
  const srcPrice = firstVariant(fsSource)?.variantPrice || 0;
  const recPrice = firstVariant(fsRec)?.variantPrice || 0;
  const srcInCart = showBundle && cartIds.has(fsSource?.productId);
  const recInCart = showBundle && cartIds.has(fsRec?.productId);
  const inCartCount = (srcInCart ? 1 : 0) + (recInCart ? 1 : 0);

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

      {/* ══ HERO — 3-slide banner carousel ══ */}
      <HeroCarousel
        featured={featured}
        onProduct={(id) => navigate(`/product/${id}`)}
        onShop={() => navigate('/products')}
        onContact={() => navigate('/contact-us')}
      />

      {/* ══ MARQUEE ══ */}
      <div className="mt-4 md:mt-6">
        <MarqueeBand />
      </div>

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
      ) : (
        /* Full catalog: differentiated, tag-driven Bestsellers grid. */
        <section className="bg-surface border-y border-hair mt-4">
          <div className="max-w-[1280px] mx-auto px-5 py-9 md:py-14">
            <SecHead index="01" kicker="The Hype" title="Bestsellers" onView={() => navigate('/products')} />
            {isLoading
              ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">{[...Array(4)].map((_, i) => <div key={i} className="aspect-[4/5] bg-hair animate-pulse rounded-none border border-hair" />)}</div>
              : <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6" stagger={0.06}>{bestsellers.map((p, i) => <StaggerItem key={p.productId || i}><UnProductCard p={p} index={i} listId="home_best" listName="Bestsellers" /></StaggerItem>)}</Stagger>}
          </div>
        </section>
      )}


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
              <span className="gl-lbl text-[8px] text-faint mt-1.5">Easy returns</span>
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
          <Reveal className={`relative border overflow-hidden grid md:grid-cols-2 transition-colors duration-500 ${bundleUnlocked ? 'border-save/50 bg-surface' : 'border-hair bg-surface'}`}>
            {/* LEFT — the pitch */}
            <div className="p-3 md:p-14 flex flex-col justify-center">
              <p className="gl-lbl text-brand mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>Bundle · Free Shipping
              </p>
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
                <div key={it.p.productId} className="contents">
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

      {/* ══ NEW ARRIVALS — rail; only once the catalog can differentiate ══ */}
      {!isFewProducts && (
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
      )}

      {/* ══ STATEMENT — hero carousel on top, manifesto below ══ */}
      <section className="my-6 bg-ink text-paper border-y border-white/10 overflow-hidden">
        <div className="max-w-[1100px] mx-auto px-7 md:px-12 py-12 md:py-24 flex flex-col items-center text-center">
          {/* CAROUSEL — 3D curved coverflow of the product's shots */}
          <div className="relative w-full max-w-[1000px]">
            {/* warm ambient glow behind the stage */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ width: '460px', height: '460px', background: 'radial-gradient(circle, rgba(232,93,39,0.38) 0%, rgba(230,51,41,0.12) 42%, transparent 70%)' }} />
            <CoverflowCarousel images={carouselImages} />
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
      {!isFewProducts && (
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
      )}

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
      <section className="max-w-[1280px] mx-auto px-5 py-5 md:py-16">
        <Reveal className="relative overflow-hidden bg-surface border border-hair p-8 md:p-14">
          <span aria-hidden="true" className="pointer-events-none select-none absolute -right-3 -bottom-10 md:-bottom-16 font-archivo text-[6rem] md:text-[13rem] font-extrabold text-ink/[0.04] leading-none tracking-tight">NOOK</span>
          <div className="relative max-w-2xl">
            <p className="gl-lbl text-brand mb-4">About · Est. 2025 · India</p>
            <TextReveal as="h2" text="We print desk icons." className="font-archivo text-4xl md:text-6xl font-extrabold tracking-tight leading-[0.95]" />
            <p className="mt-5 text-muted text-base md:text-lg max-w-xl">
              UrbanNook is a small Indian studio 3D-printing bold desk pieces — like the caliper lamp that lights up your late-night grind. No warehouses. No mass production. Just made-to-order gear built for <span className="text-ink font-semibold">your</span> setup.
            </p>
            <Stagger className="mt-6 flex flex-wrap gap-2" stagger={0.05}>
              {['3D-Printed', 'Made in India 🇮🇳', 'Small-Batch', 'Car Culture', 'Made to Order'].map((t) => (
                <StaggerItem key={t} as="span" className="gl-lbl text-[10px] border border-hair bg-white px-3 py-1.5">{t}</StaggerItem>
              ))}
            </Stagger>
            <button onClick={() => navigate('/about-us')} className="un-btn gl-press mt-7 bg-ink text-paper font-bold text-sm px-7 py-3.5">
              <span className="un-fill bg-brand"></span>Our Story
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
