import { useEffect, useMemo, useRef, useState } from 'react';
import { useGetHomeComboOffersQuery } from '../../store/api/userApi';
import { getOfferInterests } from '../../utils/offerInterest';
import { useSiteCampaign } from '../../hooks/useSiteCampaign';
import { Garland, HangingDiya } from '../festive/FestiveLights';

/** Faint rangoli-style star used as a watermark inside each banner. */
const Watermark = () => (
  <svg viewBox="0 0 100 100" className="pointer-events-none absolute -bottom-6 -right-5 h-32 w-32 text-star opacity-[0.09]" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    {Array.from({ length: 12 }, (_, i) => (
      <path key={i} transform={`rotate(${i * 30} 50 50)`} d="M50 50C54 38 54 24 50 10C46 24 46 38 50 50Z" />
    ))}
    <circle cx="50" cy="50" r="6" />
    <circle cx="50" cy="50" r="26" strokeDasharray="2 4" />
  </svg>
);

/**
 * Festive offer slider for the variants page of a product. One banner is in
 * focus (the offer the shopper just tapped on the homepage comes first) with the
 * next one peeking in; swipe, arrows or dots move between them. Every word shown
 * is the admin's own: display title, benefit label, and the offer description.
 * With no live offer for this product nothing renders.
 */
const OfferMiniBanner = ({ productId }) => {
  const { data } = useGetHomeComboOffersQuery();
  const { active, can } = useSiteCampaign();
  const lights = active && can('lights');
  const diyas = active && can('diyas');
  const trackRef = useRef(null);
  const [idx, setIdx] = useState(0);

  const lastTapped = getOfferInterests()[0]?.promotionId;
  const offers = useMemo(() => (data?.data?.combos || []).filter((c) => (
    String(c.primaryProductId) === String(productId)
    || (c.builder?.combos || []).some((b) => b.slots.some((s) => s.options.some((o) => String(o.productId) === String(productId))))
  )).sort((a, b) => (String(b.id) === String(lastTapped)) - (String(a.id) === String(lastTapped))).slice(0, 6),
  [data, productId, lastTapped]);

  const n = offers.length;
  useEffect(() => {
    const el = trackRef.current;
    if (!el || n < 2) return undefined;
    const onScroll = () => {
      const step = el.children[1] ? el.children[1].offsetLeft - el.children[0].offsetLeft : el.clientWidth;
      setIdx(Math.max(0, Math.min(n - 1, Math.round(el.scrollLeft / step))));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [n]);

  if (!n) return null;
  const go = (i) => {
    const el = trackRef.current;
    const target = el?.children[Math.max(0, Math.min(n - 1, i))];
    if (el && target) el.scrollTo({ left: target.offsetLeft - el.children[0].offsetLeft, behavior: 'smooth' });
  };

  return (
    <section className="mb-7" aria-label="Offers on this product">
      <div className="relative">
        <div ref={trackRef} className="gl-hscroll -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 pt-1">
          {offers.map((c) => {
            const desc = c.builder?.combos?.[0]?.description || c.badgeText || '';
            const img = c.bannerImage || c.productImage || c.items?.[0]?.image;
            return (
              <article
                key={c.id}
                className={`relative min-h-[132px] shrink-0 snap-start overflow-hidden border border-star/50 text-paper shadow-[0_18px_36px_-20px_rgb(var(--gl-brand-hi))] ${n > 1 ? 'w-[88%] sm:w-[78%] lg:w-[62%]' : 'w-full'}`}
                style={{ background: 'radial-gradient(90% 150% at 0% 0%, rgb(var(--gl-brand-hi) / 0.6), transparent 68%), radial-gradient(60% 120% at 100% 100%, rgb(var(--gl-star) / 0.14), transparent 70%), linear-gradient(135deg, rgb(34 12 14), rgb(var(--gl-ink)))' }}
              >
                <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-star to-transparent" aria-hidden="true" />
                <Watermark />
                {lights && <div className="pointer-events-none absolute inset-x-0 top-0 h-[20px] overflow-hidden opacity-80" aria-hidden="true"><Garland arcs={4} /></div>}
                {diyas && <HangingDiya className="right-4 top-[4px]" length={6} diyaClass="!h-[12px] !w-[15px]" />}

                <div className={`relative flex items-center gap-4 p-4 sm:p-5 ${lights ? 'pt-6 sm:pt-7' : ''}`}>
                  <span className="relative h-[92px] w-[92px] shrink-0 overflow-hidden border border-star/50 bg-white/10 shadow-[0_0_24px_-6px_rgb(var(--gl-star))] sm:h-[108px] sm:w-[108px]">
                    {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="gl-lbl text-[9.5px] text-star" style={{ letterSpacing: '0.22em' }}>✦ {c.badgeLabel || 'Offer'}</p>
                    <h2 className="mt-1 font-archivo text-[19px] font-bold leading-tight tracking-tight sm:text-[22px]" title={c.tagline || c.title}>{c.tagline || c.title}</h2>
                    {c.benefit && (
                      <span className="mt-1.5 inline-block bg-gradient-to-r from-star to-[#f0a52a] px-2.5 py-1 text-[11px] font-bold leading-none text-ink">{c.benefit}</span>
                    )}
                    {desc && <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-paper/70">{desc}</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {n > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button type="button" onClick={() => go(idx - 1)} disabled={idx <= 0} aria-label="Previous offer" className="grid h-7 w-7 place-items-center border border-ink/20 text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-30" style={{ borderRadius: '50%' }}>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            </button>
            <div className="flex items-center gap-1.5">
              {offers.map((c, i) => (
                <button key={c.id} type="button" onClick={() => go(i)} aria-label={`Offer ${i + 1}`} aria-current={i === idx} className={`h-1.5 transition-all ${i === idx ? 'w-6 bg-brand' : 'w-1.5 bg-ink/25 hover:bg-ink/45'}`} style={{ borderRadius: 9999 }} />
              ))}
            </div>
            <button type="button" onClick={() => go(idx + 1)} disabled={idx >= n - 1} aria-label="Next offer" className="grid h-7 w-7 place-items-center border border-ink/20 text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-30" style={{ borderRadius: '50%' }}>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default OfferMiniBanner;
