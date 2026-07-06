import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEOHead from '../../component/SEOHead';
import OptimizedImage from '../../component/OptimizedImage';
import UnProductCard, { productImg, firstVariant } from '../../component/UnProductCard';
import { useGetFeaturedProductsQuery, useGetProductsQuery } from '../../store/api/productsApi';
import { useGetTestimonialsQuery } from '../../store/api/testimonialsApi';
import { trackViewItemList } from '../../utils/analytics';

const HOME_STRUCTURED_DATA = {
  '@context': 'https://schema.org', '@type': 'WebSite', name: 'UrbanNook', url: 'https://www.urbannook.in',
  potentialAction: { '@type': 'SearchAction', target: 'https://www.urbannook.in/products?q={search_term_string}', 'query-input': 'required name=search_term_string' },
};
const productList = (res) => res?.data?.products || res?.data?.listofPublishedProducts || [];
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const Kicker = ({ children }) => <p className="gl-lbl text-brand mb-1">{children}</p>;
const SecHead = ({ kicker, title, onView }) => (
  <div className="flex items-end justify-between mb-7">
    <div><Kicker>{kicker}</Kicker><h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">{title}</h2></div>
    {onView && <button onClick={onView} className="text-sm font-bold underline underline-offset-4 decoration-2 hover:text-brand cursor-pointer">View all →</button>}
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { data: featRes } = useGetFeaturedProductsQuery({ limit: 1 }, { refetchOnMountOrArgChange: false, refetchOnFocus: false, refetchOnReconnect: false });
  const featured = useMemo(() => productList(featRes)[0], [featRes]);
  const heroImg = productImg(featured) || '/assets/hero2.webp';

  const { data: prodRes, isLoading } = useGetProductsQuery({ page: 1, limit: 8 });
  const products = useMemo(() => productList(prodRes), [prodRes]);
  const best = products.slice(0, 4);
  const fresh = products.length > 4 ? products.slice(4, 8) : [...products].reverse().slice(0, 4);

  const penStand = useMemo(() => products.find((p) => /pen/i.test(p.productCategory || '') || /pen/i.test(p.productName || '')), [products]);

  const collections = useMemo(() => {
    const seen = [];
    products.forEach((p) => { if (p.productCategory && !seen.find((c) => c.name === p.productCategory)) seen.push({ name: p.productCategory, img: productImg(p), count: '' }); });
    const soon = [{ name: 'Wall Posters', img: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80', soon: true }, { name: 'Desk Décor', img: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80', soon: true }];
    return [...seen, ...soon].slice(0, 4);
  }, [products]);

  const { data: testRes } = useGetTestimonialsQuery();
  const testimonials = (testRes?.data?.testimonials || []).slice(0, 3);
  const fallbackReviews = [
    { userName: 'Aryan', content: 'The red glow is unreal on a late-night setup. Way cooler in person.', rating: 5 },
    { userName: 'Simran', content: 'Gifted the Porsche caliper — my brother hasn’t turned it off since.', rating: 5 },
    { userName: 'Kabir', content: 'Pen stand is tiny but adorable. Desk finally looks intentional.', rating: 4 },
  ];
  const reviews = testimonials.length ? testimonials : fallbackReviews;

  useEffect(() => {
    if (products.length) trackViewItemList?.({ listName: 'Home', listId: 'home', items: products.map((p, i) => ({ itemId: p.productId, itemName: p.productName, price: firstVariant(p)?.variantPrice || 0, index: i })) });
  }, [products]);

  // countdown (cosmetic)
  const [cd, setCd] = useState({ d: 2, h: 11, m: 45, s: 30 });
  useEffect(() => {
    const t = setInterval(() => setCd((p) => {
      let s = ((p.d * 24 + p.h) * 60 + p.m) * 60 + p.s - 1; if (s < 0) s = 0;
      return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
    }), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="font-jakarta bg-paper text-ink">
      <SEOHead url="/" structuredData={HOME_STRUCTURED_DATA} />

      {/* HERO */}
      <div className="relative max-w-[1400px] mx-auto md:px-5 md:pt-5">
        <div className="relative overflow-hidden md:rounded-[1.5rem] min-h-[74vh] md:min-h-[66vh] flex items-center bg-ink">
          <OptimizedImage src={heroImg} alt={featured?.productName || 'Featured'} className="absolute inset-0 w-full h-full object-cover opacity-90" loading="eager" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent"></div>
          <div className="relative px-7 md:px-16 max-w-xl text-white">
            <p className="gl-lbl text-white/80 mb-4">Summer Drop · Auto Series</p>
            <h1 className="text-5xl md:text-7xl font-extrabold leading-[0.95] tracking-tight">Light up<br />your grind.</h1>
            <p className="mt-5 text-white/85 text-lg max-w-md">3D-printed desk lamps &amp; décor, made to order in India. Warm, aggressive ambient glow for late-night sessions.</p>
            <div className="mt-7 flex items-center gap-3">
              <span className="gl-lbl text-white/70 text-[10px] mr-1">Ends in</span>
              {[['days', cd.d], ['hrs', cd.h], ['min', cd.m], ['sec', cd.s]].map(([l, val], i) => (
                <div key={l} className="flex items-center gap-3">
                  {i > 0 && <span className="text-xl font-bold text-white/50">:</span>}
                  <div className="text-center"><div className="text-2xl font-extrabold tabular-nums">{pad(val)}</div><div className="text-[9px] text-white/60 uppercase tracking-wider">{l}</div></div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={() => navigate('/products')} className="gl-press bg-brand text-white font-bold text-sm px-8 py-3.5 rounded-xl hover:bg-brandHi transition-colors">Shop Now</button>
              {featured && <button onClick={() => navigate(`/product/${featured.productId}`)} className="gl-press border border-white/40 text-white font-bold text-sm px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors">View Lamp</button>}
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY PILLS */}
      <div className="max-w-[1280px] mx-auto px-5 pt-6">
        <div className="flex gap-2.5 overflow-x-auto gl-hscroll pb-1">
          <button onClick={() => navigate('/products')} className="shrink-0 gl-press bg-brand text-white text-sm font-semibold px-5 py-2.5 rounded-full">Shop All</button>
          {['💡 Lamps', '✏️ Pen Stands', '🎁 Gifting', 'Under ₹500', '✨ New'].map((c) => (
            <button key={c} onClick={() => navigate('/products')} className="shrink-0 gl-press border border-hair text-sm font-semibold px-5 py-2.5 rounded-full hover:border-ink transition-colors">{c}</button>
          ))}
        </div>
      </div>

      {/* SOCIAL PROOF + PAYMENT */}
      <div className="max-w-[1280px] mx-auto px-5 py-7">
        <div className="rounded-2xl border border-hair bg-[#FAFAFA] px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2"><span className="text-star text-lg">★★★★★</span><span className="font-extrabold">4.9</span><span className="text-muted text-sm">/ 5</span></div>
            <span className="hidden sm:block w-px h-8 bg-hair"></span>
            <p className="text-sm text-muted"><b className="text-ink">2,000+</b> desks upgraded · <b className="text-ink">100%</b> made in India</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-muted">
            {['VISA', 'Mastercard', 'UPI', 'RuPay', 'COD'].map((x) => <span key={x} className="border border-hair rounded px-2 py-1 bg-white">{x}</span>)}
          </div>
        </div>
      </div>

      {/* BESTSELLERS */}
      <section className="max-w-[1280px] mx-auto px-5 pt-4 pb-12">
        <SecHead kicker="The Hype" title="Bestsellers" onView={() => navigate('/products')} />
        {isLoading
          ? <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">{[...Array(4)].map((_, i) => <div key={i} className="aspect-[4/5] bg-[#F2F2F2] animate-pulse rounded-2xl border border-hair" />)}</div>
          : <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">{best.map((p, i) => <UnProductCard key={p.productId || i} p={p} index={i} listId="home_best" listName="Bestsellers" />)}</div>}
      </section>

      {/* BUNDLE */}
      <section className="max-w-[1280px] mx-auto px-5 py-10">
        <div className="rounded-[1.5rem] border border-hair overflow-hidden bg-[#FAFAFA] grid md:grid-cols-2">
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <p className="gl-lbl text-brand mb-2">Bundle · Save ₹99</p>
            <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">Complete your desk</h3>
            <p className="text-muted mt-3 max-w-md">{featured?.productName || 'Brake Caliper Lamp'} + a matching pen stand — the full setup, bundled.</p>
            <div className="mt-5 flex items-center gap-3"><span className="text-2xl font-extrabold">₹1,799</span><span className="text-faint line-through">₹1,898</span><span className="gl-lbl text-[10px] bg-save/10 text-save px-2 py-1 rounded">Save ₹99</span></div>
            <button onClick={() => featured && navigate(`/product/${featured.productId}`)} className="gl-press mt-6 self-start bg-brand text-white font-bold text-sm px-8 py-3.5 rounded-xl hover:bg-brandHi transition-colors">Shop the Bundle</button>
          </div>
          <div className="relative min-h-[280px] flex items-center justify-center gap-2 p-6 bg-white">
            <OptimizedImage src={heroImg} alt="" className="w-1/2 aspect-square object-cover rounded-2xl border border-hair" />
            <span className="text-3xl font-extrabold text-faint">+</span>
            <OptimizedImage src={penStand ? productImg(penStand) : heroImg} alt="" className="w-1/2 aspect-square object-cover rounded-2xl border border-hair" />
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="max-w-[1280px] mx-auto px-5 py-8">
        <SecHead kicker="Fresh Drop" title="New Arrivals" onView={() => navigate('/products')} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">{fresh.map((p, i) => <UnProductCard key={p.productId || i} p={p} index={i} listId="home_new" listName="New Arrivals" />)}</div>
      </section>

      {/* SHOP BY COLLECTION */}
      <section className="max-w-[1280px] mx-auto px-5 py-10">
        <div className="mb-7"><Kicker>Find Your Corner</Kicker><h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Shop by Collection</h2></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {collections.map((c, i) => (
            <button key={i} onClick={() => navigate(c.soon ? '/products' : `/products?category=${encodeURIComponent(c.name)}`)} className="gl-pcard group relative rounded-2xl overflow-hidden aspect-[4/5] bg-[#F2F2F2] cursor-pointer text-left">
              <OptimizedImage src={c.img} alt={c.name} className="gl-img absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent"></div>
              <div className="absolute bottom-0 p-4 text-white"><p className="font-bold text-lg">{c.name}</p><p className="text-white/70 text-xs">{c.soon ? 'Coming soon' : 'Shop now'}</p></div>
            </button>
          ))}
        </div>
      </section>

      {/* SHOP THE FEED */}
      <section className="max-w-[1280px] mx-auto px-5 py-12">
        <div className="text-center mb-7"><Kicker>@urbannook.store</Kicker><h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Shop the Feed</h2><p className="text-muted text-sm mt-2">Tap a shot to shop it</p></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(products.length ? products : []).slice(0, 4).map((p, i) => (
            <button key={i} onClick={() => navigate(`/product/${p.productId}`)} className="gl-pcard group relative aspect-square rounded-2xl overflow-hidden bg-[#F2F2F2] cursor-pointer">
              <OptimizedImage src={productImg(p)} alt="" className="gl-img w-full h-full object-cover" />
              <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur text-ink text-xs font-bold px-2.5 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition">Shop this →</span>
            </button>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-[#FAFAFA] border-y border-hair py-14">
        <div className="max-w-[1280px] mx-auto px-5">
          <div className="text-center mb-8"><Kicker>Real Reviews</Kicker><h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Loved by the desk crowd</h2></div>
          <div className="grid md:grid-cols-3 gap-5">
            {reviews.map((r, i) => (
              <div key={i} className="bg-white rounded-2xl border border-hair p-6">
                <div className="text-star mb-2">{'★'.repeat(Math.max(1, Math.min(5, r.rating || 5)))}{'☆'.repeat(5 - Math.max(1, Math.min(5, r.rating || 5)))}</div>
                <p className="text-muted">“{r.content}”</p>
                <p className="mt-4 font-bold text-sm">{r.userName}{r.userLocation ? `, ${r.userLocation}` : ''} · Verified</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="max-w-[720px] mx-auto px-5 py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Get first access to drops</h2>
        <p className="text-muted mt-3">New pieces land often. Members get early access + 10% off the first order.</p>
        <form onSubmit={(e) => e.preventDefault()} className="mt-6 flex max-w-md mx-auto rounded-xl overflow-hidden border border-ink">
          <input type="email" placeholder="Enter your email" className="flex-1 px-4 py-3.5 text-sm outline-none" />
          <button className="gl-press bg-brand text-white font-bold text-sm px-6 hover:bg-brandHi transition-colors">Join</button>
        </form>
      </section>
    </div>
  );
};

export default HomePage;
