import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEOHead from '../../component/SEOHead';
import OptimizedImage from '../../component/OptimizedImage';
import WishlistButton from '../../component/WishlistButton';
import { useGetFeaturedProductsQuery, useGetProductsQuery } from '../../store/api/productsApi';
import { useGetTestimonialsQuery, useSubmitTestimonialMutation } from '../../store/api/testimonialsApi';
import { trackViewItemList, trackSelectItem } from '../../utils/analytics';

const HOME_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'UrbanNook',
  url: 'https://www.urbannook.in',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://www.urbannook.in/products?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const productList = (res) => res?.data?.products || res?.data?.listofPublishedProducts || [];
const firstVariant = (p) => p?.variantDetails?.[0] || {};
const productImg = (p) => firstVariant(p)?.variantImage?.[0] || p?.productImg || p?.productImage || '/assets/logo.webp';
const productHref = (p) => {
  const sku = firstVariant(p)?.sku;
  return sku ? `/product/${p.productId}/${sku}` : `/product/${p.productId}`;
};

/* ---------------- Editorial product card (3D tilt + glare) ---------------- */
const ProductCard = ({ p, index }) => {
  const navigate = useNavigate();
  const v = firstVariant(p);
  const go = () => {
    trackSelectItem?.({
      itemId: p.productId, itemName: p.productName, itemVariant: v.variantName || '',
      price: v.variantPrice || 0, listId: 'home_grid', listName: 'Home Grid', index,
    });
    navigate(productHref(p));
  };
  const badge = (p.tags || []).includes('best_seller') ? 'Best Seller'
    : (p.tags || []).includes('new_arrival') ? 'New'
    : (p.tags || []).includes('trending') ? 'Trending'
    : (p.tags || []).includes('featured') ? 'Featured' : null;

  return (
    <article className="un-card group relative flex flex-col bg-white border border-un-line" style={{ transitionDelay: `${index * 60}ms` }}>
      <div className="relative aspect-square overflow-hidden bg-un-ink">
        {badge && (
          <span className="absolute top-3 left-3 z-[3] bg-un-red text-white font-mono text-[10px] tracking-[0.14em] uppercase font-semibold px-2.5 py-1">{badge}</span>
        )}
        <div className="absolute top-2.5 right-2.5 z-[3]"><WishlistButton productId={p.productId} /></div>
        <button onClick={go} className="block w-full h-full" aria-label={p.productName}>
          <OptimizedImage
            src={productImg(p)} alt={p.productName}
            className="w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
          />
        </button>
        <span className="un-glare" />
      </div>
      <div className="flex flex-col gap-2 p-4 flex-1" style={{ transform: 'translateZ(24px)' }}>
        <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-un-grey">{p.productCategory || 'Urban Nook'}</span>
        <button onClick={go} className="text-left font-archivo font-extrabold uppercase text-[15px] leading-tight text-un-ink hover:text-un-red transition-colors line-clamp-2">
          {p.productName}
        </button>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-mono font-semibold text-un-red">{inr(v.variantPrice)}</span>
          <button onClick={go} className="un-btn font-archivo font-extrabold text-[11px] tracking-[0.06em] uppercase border-2 border-un-ink px-3.5 py-2 text-un-ink hover:text-white transition-colors">
            <span className="un-fill bg-un-red" />View
          </button>
        </div>
      </div>
    </article>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { data: featRes } = useGetFeaturedProductsQuery({ limit: 1 }, {
    refetchOnMountOrArgChange: false, refetchOnFocus: false, refetchOnReconnect: false,
  });
  const featured = useMemo(() => productList(featRes)[0], [featRes]);
  const heroImg = productImg(featured) || '/assets/hero2.webp';

  const { data: prodRes, isLoading: prodLoading } = useGetProductsQuery({ page: 1, limit: 8 });
  const products = useMemo(() => productList(prodRes), [prodRes]);

  const categories = useMemo(() => {
    const seen = [];
    products.forEach((p) => { if (p.productCategory && !seen.find((c) => c.name === p.productCategory)) seen.push({ name: p.productCategory, img: productImg(p) }); });
    return seen.slice(0, 5);
  }, [products]);

  const { data: testRes } = useGetTestimonialsQuery();
  const testimonials = testRes?.data?.testimonials || [];

  useEffect(() => {
    if (products.length) {
      trackViewItemList?.({
        listName: 'Home Grid', listId: 'home_grid',
        items: products.map((p, i) => ({
          itemId: p.productId, itemName: p.productName,
          price: firstVariant(p)?.variantPrice || 0, itemVariant: firstVariant(p)?.variantName || '', index: i,
        })),
      });
    }
  }, [products]);

  /* testimonial submit (preserved from old UI, restyled) */
  const [submitTestimonial, { isLoading: submitting }] = useSubmitTestimonialMutation();
  const [tName, setTName] = useState('');
  const [tText, setTText] = useState('');
  const [tRating, setTRating] = useState(5);
  const [tDone, setTDone] = useState(false);
  const onSubmitTestimonial = async (e) => {
    e.preventDefault();
    if (!tName.trim() || !tText.trim()) return;
    try {
      await submitTestimonial({ userName: tName.trim(), content: tText.trim(), rating: tRating }).unwrap();
      setTDone(true); setTName(''); setTText(''); setTRating(5);
      setTimeout(() => setTDone(false), 3000);
    } catch (_) { /* silently ignore in demo */ }
  };

  const marquee = testimonials.length ? testimonials : [
    { userName: 'Aryan', content: 'The red glow is unreal on a late-night setup. Way cooler in person.', rating: 5 },
    { userName: 'Simran', content: 'Gifted the Porsche caliper lamp — my brother hasn’t turned it off since.', rating: 5 },
    { userName: 'Kabir', content: 'Pen stand is tiny but adorable. Desk finally looks intentional.', rating: 5 },
  ];

  return (
    <div className="un-eddy bg-un-cream text-un-ink font-inter">
      <SEOHead url="/" structuredData={HOME_STRUCTURED_DATA} />

      {/* ============ HERO ============ */}
      <section className="relative border-b-2 border-un-ink overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-7 pt-16 pb-24 lg:pb-28 grid lg:grid-cols-[1.1fr_.9fr] gap-10 items-center min-h-[calc(100svh-160px)]">
          <div>
            <div className="flex flex-wrap gap-6 font-mono text-[11px] tracking-[0.22em] uppercase text-un-greyd mb-7 un-reveal">
              <span>Est. 2024 → 2040</span>
              <span>Curated / Not Cluttered</span>
              <span className="text-un-red">Drop 047 Live</span>
            </div>
            <h1 className="font-anton uppercase leading-[0.84] tracking-tight text-[clamp(56px,11vw,150px)] un-reveal">
              Make Every<br />
              <span className="text-transparent [-webkit-text-stroke:2px_#141414]">Corner</span><br />
              <span className="text-un-red">Count.</span>
            </h1>
            <p className="max-w-[430px] text-un-greyd text-[17px] mt-8 mb-8 un-reveal">
              3D-crafted lamps, pen stands &amp; desk décor — made to order in India. Aesthetic, fandom-driven gear for the desk that says something about you.
            </p>
            <div className="flex flex-wrap gap-3.5 un-reveal">
              <button onClick={() => navigate('/products')} className="un-btn un-magnet bg-un-red text-white font-archivo font-extrabold uppercase tracking-[0.04em] text-sm px-8 py-4">
                <span className="un-fill bg-un-ink" />Shop The Drop
              </button>
              {featured && (
                <button onClick={() => navigate(productHref(featured))} className="un-btn un-magnet border-2 border-un-ink text-un-ink font-archivo font-extrabold uppercase tracking-[0.04em] text-sm px-8 py-4 hover:text-un-cream transition-colors">
                  <span className="un-fill bg-un-ink" />View Featured
                </button>
              )}
            </div>
          </div>

          {/* hero visual — CALIPER LAMP variant image */}
          <div className="relative hidden lg:block un-reveal">
            <div className="relative aspect-[3/4] max-w-[480px] ml-auto">
              <div className="absolute inset-0 border-2 border-un-ink translate-x-4 translate-y-4" />
              <div className="relative w-full h-full overflow-hidden bg-un-ink un-card">
                <OptimizedImage
                  src={heroImg} alt={featured?.productName || 'Featured product'}
                  className="w-full h-full object-cover"
                  loading="eager" fetchPriority="high"
                />
                <span className="un-glare" />
                <div className="absolute inset-0 bg-un-red mix-blend-multiply opacity-[0.32] pointer-events-none" />
              </div>
              <span className="absolute bottom-5 -left-6 bg-un-ink text-un-cream font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 flex items-center gap-2.5">
                <i className="w-1.5 h-1.5 rounded-full bg-un-red inline-block" />
                {featured?.productName ? `${featured.productName} · Limited` : 'New Drop · Limited'}
              </span>
            </div>
          </div>
        </div>
        {/* scroll cue */}
        <div className="absolute bottom-6 left-7 font-mono text-[10px] tracking-[0.3em] uppercase text-un-grey hidden md:flex items-center gap-3">
          Scroll <span className="w-12 h-px bg-un-grey" /> 001 / 005
        </div>
      </section>

      {/* ============ CATEGORY STRIP ============ */}
      {categories.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-7 py-24">
          <div className="flex items-end justify-between gap-5 flex-wrap mb-11 un-reveal">
            <div>
              <span className="block font-mono text-[11px] tracking-[0.3em] uppercase text-un-red mb-3">002 — Collections</span>
              <h2 className="font-archivo font-black uppercase text-[clamp(34px,5.4vw,60px)] leading-[0.95] tracking-tight">Pick Your Corner</h2>
            </div>
            <button onClick={() => navigate('/products')} className="font-mono text-[11px] tracking-[0.18em] uppercase border-b-2 border-un-red pb-1 hover:tracking-[0.24em] transition-all">View All →</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {categories.map((c, i) => (
              <button key={c.name} onClick={() => navigate(`/products?category=${encodeURIComponent(c.name)}`)}
                className="un-card un-reveal relative aspect-[3/4] overflow-hidden bg-un-ink flex items-end text-left group" style={{ transitionDelay: `${i * 50}ms` }}>
                <OptimizedImage src={c.img} alt={c.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <span className="absolute inset-0 bg-gradient-to-t from-un-ink/85 via-un-ink/20 to-transparent" />
                <span className="un-glare" />
                <span className="relative z-[2] p-4 w-full font-archivo font-black uppercase text-un-cream text-lg">{c.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ============ BEST SELLERS GRID ============ */}
      <section className="max-w-[1280px] mx-auto px-7 pb-24">
        <div className="flex items-end justify-between gap-5 flex-wrap mb-11 un-reveal">
          <div>
            <span className="block font-mono text-[11px] tracking-[0.3em] uppercase text-un-red mb-3">003 — The Collection</span>
            <h2 className="font-archivo font-black uppercase text-[clamp(34px,5.4vw,60px)] leading-[0.95] tracking-tight">The Heavy Rotation</h2>
          </div>
          <button onClick={() => navigate('/products')} className="font-mono text-[11px] tracking-[0.18em] uppercase border-b-2 border-un-red pb-1 hover:tracking-[0.24em] transition-all">Shop All →</button>
        </div>
        {prodLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => <div key={i} className="aspect-[3/4] bg-un-cream2 animate-pulse border border-un-line" />)}
          </div>
        ) : (
          <div className="un-tiltwrap grid grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((p, i) => <ProductCard key={p.productId || i} p={p} index={i} />)}
          </div>
        )}
      </section>

      {/* ============ MANIFESTO ============ */}
      <section className="bg-un-ink text-un-cream border-y-2 border-un-ink py-28">
        <div className="max-w-[1280px] mx-auto px-7">
          <span className="block font-mono text-[11px] tracking-[0.3em] uppercase text-un-red mb-6 un-reveal">004 — Manifesto</span>
          <p className="un-reveal font-archivo font-black uppercase tracking-tight text-[clamp(28px,5vw,60px)] leading-[1.06] max-w-[1000px]">
            Your desk is not furniture. It is the six square feet where your world happens. We build the gear that makes it <span className="text-un-red">yours</span> — one drop at a time.
          </p>
          <div className="mt-14 flex flex-wrap gap-10">
            {[['3D', 'Printed To Order'], ['100%', 'Made In India'], ['COD', 'Available'], ['7-Day', 'Easy Returns']].map(([n, l]) => (
              <div key={l} className="min-w-[150px] un-reveal">
                <div className="font-anton text-[clamp(38px,5vw,58px)] text-un-red leading-none">{n}</div>
                <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-un-grey mt-2">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURE / STEPS ============ */}
      <section className="border-b-2 border-un-ink">
        <div className="grid lg:grid-cols-2 min-h-[540px]">
          <div className="relative overflow-hidden bg-un-ink border-r-0 lg:border-r-2 border-un-ink min-h-[320px]">
            <OptimizedImage src={heroImg} alt="Urban Nook desk gear" className="absolute inset-0 w-full h-full object-cover" />
            <span className="absolute inset-0 bg-un-red mix-blend-multiply opacity-[0.32]" />
          </div>
          <div className="px-8 lg:px-16 py-16 flex flex-col justify-center gap-5">
            <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-un-red un-reveal">005 — How It Works</span>
            <h3 className="font-archivo font-black uppercase text-[clamp(30px,4vw,48px)] leading-[0.98] un-reveal">Built For The Desk That Flexes</h3>
            <div className="flex flex-col mt-2">
              {[
                ['01', 'Pick Your Corner', 'Browse lamps, pen stands & décor — every shelf curated, never cluttered.'],
                ['02', 'Add The Pieces', 'The 3D-printed upgrades that make a desk unmistakably yours.'],
                ['03', 'Upgrade Your Space', 'Fast dispatch, easy returns, COD available. Done.'],
              ].map(([n, h, d]) => (
                <div key={n} className="grid grid-cols-[56px_1fr] gap-4 py-5 border-t border-un-line items-baseline un-reveal last:border-b">
                  <div className="font-anton text-2xl text-un-red">{n}</div>
                  <div><h4 className="font-archivo font-extrabold uppercase text-base">{h}</h4><p className="text-sm text-un-greyd mt-1">{d}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS (reviews) ============ */}
      <section className="py-24 overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-7 mb-10 un-reveal">
          <span className="block font-mono text-[11px] tracking-[0.3em] uppercase text-un-red mb-3 text-center">006 — Word On The Street</span>
          <h2 className="font-archivo font-black uppercase text-[clamp(30px,5vw,54px)] text-center leading-[0.95]">Loved By The Desk Crowd</h2>
        </div>
        <div className="relative w-full overflow-hidden mb-14">
          <div className="un-marquee gap-4">
            {[...marquee, ...marquee].map((t, i) => (
              <div key={i} className="w-80 shrink-0 bg-white border border-un-line p-6 mx-2">
                <div className="text-un-red mb-2 tracking-widest">{'★'.repeat(Math.max(1, Math.min(5, t.rating || 5)))}</div>
                <p className="text-un-greyd text-sm">“{t.content}”</p>
                <p className="mt-4 font-archivo font-extrabold uppercase text-xs">— {t.userName}{t.userLocation ? `, ${t.userLocation}` : ''}</p>
              </div>
            ))}
          </div>
        </div>
        {/* submit (preserved) */}
        <div className="max-w-[560px] mx-auto px-7 un-reveal">
          <form onSubmit={onSubmitTestimonial} className="bg-white border-2 border-un-ink p-6">
            <p className="font-archivo font-black uppercase text-lg mb-4">Drop A Review</p>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((r) => (
                <button type="button" key={r} onClick={() => setTRating(r)} className={`text-2xl leading-none ${r <= tRating ? 'text-un-red' : 'text-un-line'}`}>★</button>
              ))}
            </div>
            <input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Your name" required
              className="w-full border-2 border-un-ink px-3.5 py-3 font-mono text-sm mb-3 focus:outline-none focus:border-un-red bg-white" />
            <textarea value={tText} onChange={(e) => setTText(e.target.value)} placeholder="How’s your setup looking?" required rows={3}
              className="w-full border-2 border-un-ink px-3.5 py-3 font-inter text-sm mb-3 focus:outline-none focus:border-un-red bg-white resize-none" />
            <button type="submit" disabled={submitting} className="un-btn bg-un-red text-white font-archivo font-extrabold uppercase tracking-[0.04em] text-sm px-7 py-3.5 disabled:opacity-60">
              <span className="un-fill bg-un-ink" />{submitting ? 'Sending…' : tDone ? 'Thanks! ✓' : 'Submit Review'}
            </button>
          </form>
        </div>
      </section>

      {/* ============ NEWSLETTER ============ */}
      <section className="py-24 text-center border-t-2 border-un-ink">
        <div className="max-w-[560px] mx-auto px-7 un-reveal">
          <h2 className="font-anton uppercase text-[clamp(40px,7vw,84px)] leading-[0.9]">Don’t Sleep<br />On <span className="text-un-red">Drops</span></h2>
          <p className="text-un-greyd mt-5 mb-8">New pieces land often. Get early access and member-only deals.</p>
          <form onSubmit={(e) => e.preventDefault()} className="flex border-2 border-un-ink bg-white">
            <input type="email" required placeholder="your@email.com" className="flex-1 px-4 py-4 font-mono text-sm bg-transparent focus:outline-none" />
            <button className="un-btn bg-un-red text-white font-archivo font-extrabold uppercase tracking-[0.04em] text-sm px-8"><span className="un-fill bg-un-ink" />Join</button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
