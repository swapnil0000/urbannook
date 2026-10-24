import { useState, useRef, useCallback, useEffect, useId } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addItem } from '../store/slices/cartSlice';
import { useGetHomeComboOffersQuery } from '../store/api/userApi';
import { useSiteCampaign, THEME_COPY } from '../hooks/useSiteCampaign';
import FestiveCountdown from './festive/FestiveCountdown';
import SectionDecor from './festive/SectionDecor';
import ComboBuilderSheet from './ComboBuilderSheet';
import CouponOffersSection from './offers/CouponOffersSection';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

/**
 * Admin-driven homepage offers, sourced from GET /promotions/display/home —
 * ordinary Promotion V2 documents (placement "home") plus the optional
 * `homeCard` presentation fields.
 *
 * Money is never typed anywhere: mrp / price / save / percentOff are computed
 * server-side by the real checkout engine. The admin only picks WORDING
 * (badge, price label, how savings read, button text/link), the image, order
 * and dates. "reward" cards (ladder offers) show the free item instead of a
 * combo price.
 *
 * Layout: every card is the same size and every card's price panel and button
 * sit on the same lines (title block is a fixed height, price + CTA are pushed
 * to the card's bottom), so cards never look staggered.
 *
 * Styling is scoped under `.un-offers` (see index.css): radii use un-r-* classes
 * because the global hard-edged rule zeroes any class containing "rounded-".
 */

// What the headline savings tag says — derived from the computed numbers.
const headlineSavings = (c) => {
  if (c.save > 0) {
    if (c.savingsMode === 'percent' && c.percentOff > 0) return `${c.percentOff}% OFF`;
    if (c.savingsMode === 'label' && c.savingsLabel) return c.savingsLabel;
    return `Save ${inr(c.save)}`;
  }
  if (c.freeShipping) return 'Free Shipping';
  if (c.freeGift) return 'Free Gift';
  return c.savingsLabel || 'Combo Deal';
};

const GiftIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="#8a4b1f" aria-hidden="true">
    <path d="M3 8h18v4H3zM4 13h7v8H5a1 1 0 0 1-1-1zM13 13h7v7a1 1 0 0 1-1 1h-6z" />
    <path d="M12 8c-1-3-3.2-5-5-4.3S5.3 7 12 8Zm0 0c1-3 3.2-5 5-4.3S18.7 7 12 8Z" />
  </svg>
);

const Arrow = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

// Brass hanging diya: chains, glowing flame, engraved bowl. Sways from its hook.
const OrnateDiya = ({ className = '', length = 10, size = 30, delay = 0 }) => {
  const id = useId().replace(/:/g, '');
  const gold = 'rgb(var(--gl-star))';
  return (
    <div className={`un-sway absolute ${className}`} style={{ transformOrigin: 'top center', animationDelay: `${delay}s` }} aria-hidden="true">
      <span className="mx-auto block w-px" style={{ height: length, background: 'rgb(var(--gl-star) / 0.8)' }} />
      <svg viewBox="0 0 40 44" width={size} height={size * 1.1} className="block overflow-visible" style={{ filter: 'drop-shadow(0 0 6px rgb(255 170 40 / 0.55))' }}>
        <defs>
          <linearGradient id={`bowl${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8a5126" />
            <stop offset="0.5" stopColor="#5a3015" />
            <stop offset="1" stopColor="#2f180a" />
          </linearGradient>
          <radialGradient id={`flame${id}`} cx="0.5" cy="0.75" r="0.7">
            <stop offset="0" stopColor="#fff3b0" />
            <stop offset="0.45" stopColor="#ffc83d" />
            <stop offset="1" stopColor="#f58a1f" />
          </radialGradient>
          <radialGradient id={`glow${id}`}>
            <stop offset="0" stopColor="#ffc83d" stopOpacity="0.75" />
            <stop offset="0.55" stopColor="#f58a1f" stopOpacity="0.35" />
            <stop offset="1" stopColor="#f58a1f" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="20" cy="2.2" r="1.7" fill="none" stroke={gold} strokeWidth="0.9" />
        <path d="M20 3.9 7 22M20 3.9 33 22M20 3.9V20" stroke={gold} strokeWidth="0.8" strokeLinecap="round" opacity="0.85" />
        <circle cx="20" cy="19" r="14" fill={`url(#glow${id})`} />
        <path className="un-flame" d="M20 8.5C23.6 13 24.8 16.2 24.8 19a4.8 4.8 0 0 1-9.6 0C15.2 16.2 16.4 13 20 8.5Z" fill={`url(#flame${id})`} style={{ transformOrigin: '20px 22px' }} />
        <path d="M20 14c1.6 2.2 2.2 3.7 2.2 5a2.2 2.2 0 0 1-4.4 0c0-1.3.6-2.8 2.2-5Z" fill="#fff6d6" opacity="0.9" />
        <path d="M35 22.5q4.2-.8 5.2-4.2-.2 5.4-5.2 7.7Z" fill={`url(#bowl${id})`} />
        <path d="M5 22.5h30c0 9.5-6.8 15.5-15 15.5S5 32 5 22.5Z" fill={`url(#bowl${id})`} />
        <ellipse cx="20" cy="22.5" rx="15" ry="2.6" fill="#2f180a" />
        <ellipse cx="20" cy="22.2" rx="15" ry="2.1" fill="none" stroke="#b8803a" strokeWidth="0.8" />
        <path d="M9 27.5q11 4.2 22 0" fill="none" stroke="rgb(255 214 150 / 0.28)" strokeWidth="0.9" strokeLinecap="round" />
        {[11, 15.5, 20, 24.5, 29].map((x) => <circle key={x} cx={x} cy={x === 20 ? 31 : 29.8} r="0.9" fill="#d9a05a" opacity="0.7" />)}
        <circle cx="20" cy="41.6" r="1.3" fill="#b8803a" />
      </svg>
    </div>
  );
};

const OfferCard = ({ combo, festive, priceLabel }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  const isReward = combo.kind === 'reward';
  const { can } = useSiteCampaign();
  const [builderOpen, setBuilderOpen] = useState(false);

  const first = combo.items[0];
  const second = combo.items[1];
  const tag = headlineSavings(combo);
  const cta = combo.ctaLabel || (combo.ctaAction === 'link' ? 'View Offer' : 'Add to Cart');
  const badge = combo.badgeLabel || (isReward ? 'Free Reward' : 'Combo Offer');
  const caption = combo.badgeText || (isReward ? 'Free with your purchase' : 'Buy together & save');

  const addBoth = () => {
    combo.items.forEach((item) => {
      dispatch(addItem({
        id: item.productId,
        mongoId: item.productId,
        name: item.productName,
        price: item.price,
        image: item.image,
        quantity: 1,
        selectedVariant: item.variantName,
        sku: item.sku,
      }));
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const openSheet = () => setBuilderOpen(true);

  const goTo = (url) => {
    if (/^https:\/\//i.test(url)) window.location.assign(url);
    else navigate(url);
  };

  const onCta = () => {
    // reward / combo cards open the combo builder sheet
    if (isReward && combo.ctaAction === 'choose' && combo.builder?.combos?.length) { openSheet(); return; }
    if (combo.ctaAction === 'link' && combo.ctaUrl) { goTo(combo.ctaUrl); return; }
    if (combo.builder?.combos?.length) { openSheet(); return; }
    addBoth();
  };

  const viewOffer = () => {
    if (isReward) { onCta(); return; }
    navigate(`/products/${first?.productId}`);
  };

  return (
    <article className="un-card un-r-card un-shine group relative flex h-full flex-col p-[5px]">
      {/* image — one fixed 4:3 frame for every card, centre-cropped, never distorted */}
      <button type="button" onClick={viewOffer} className="un-r-media relative block aspect-[4/3] w-full shrink-0 cursor-pointer overflow-hidden bg-surface text-left focus-visible:outline-none" aria-label={`View ${combo.title}`}>
        {combo.bannerImage ? (
          <img src={combo.bannerImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <>
            <img src={first?.image || '/assets/logo.webp'} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
            {second && (
              <span className="un-r-12 absolute bottom-2 right-2 aspect-square w-[34%] overflow-hidden border-[3px] border-paper bg-white shadow-lg">
                <img src={second.image || '/assets/logo.webp'} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
              </span>
            )}
          </>
        )}
        {festive && can('diyas') && (
          <>
            <OrnateDiya className="right-[13%] top-0" length={6} size={26} />
            <OrnateDiya className="right-[3.5%] top-0" length={24} size={30} delay={0.8} />
          </>
        )}
        <span className="un-r-4 absolute left-2 top-2 inline-flex items-center gap-1.5 bg-brand px-2.5 py-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-white shadow-md">
          <span aria-hidden="true">✦</span> {badge}
        </span>
      </button>

      <div className="flex min-h-0 flex-1 flex-col px-2.5 pb-2.5 pt-3">
        {/* fixed-height title block: titles of any length keep the price panel aligned */}
        <div className="shrink-0 pb-2.5">
          <h3 className="line-clamp-1 font-archivo text-[19px] font-bold leading-[1.25] tracking-tight text-ink" title={combo.title}>{combo.title}</h3>
          {/* subtitle hidden for now (re-enable by restoring this line):
          {subtitle && <p className="mt-1 line-clamp-1 text-[12.5px] font-normal leading-snug text-muted">{subtitle}</p>} */}
        </div>

        <div className="mt-auto">
          {/* price panel floats on a beige caption tray (the tray's top edge hides under the panel) */}
          <div className="un-r-tray border border-star/45 bg-gradient-to-b from-star/15 to-star/30">
            <div className="un-r-panel-all un-panel-shadow -mx-px -mt-px border border-star/40 bg-gradient-to-b from-white to-paper/40 py-2.5 pl-3 pr-[3px]">
              {isReward ? (
                <>
                  <p className="text-[11px] font-normal leading-none text-faint">Included with your order</p>
                  <div className="mt-2 flex items-center justify-between gap-1.5">
                    <p className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
                      <span className="text-[12.5px] font-medium text-sale">Reward</span>
                      <span className="font-archivo text-[21px] font-bold leading-none text-sale">FREE</span>
                    </p>
                    {(combo.savingsLabel || combo.rewardValue) && (
                      <span className="un-r-save max-w-[50%] shrink-0 truncate bg-save px-2.5 py-1.5 text-[11.5px] font-semibold leading-none text-white">{combo.savingsLabel || `Worth ${inr(combo.rewardValue)}`}</span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[11px] font-normal leading-none text-faint">MRP <span className="line-through">{inr(combo.mrp)}</span></p>
                  <div className="mt-2 flex items-center justify-between gap-1.5">
                    <p className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
                      <span className="text-[12.5px] font-medium text-sale">{priceLabel}</span>
                      <span className="font-archivo text-[21px] font-bold leading-none text-sale">{inr(combo.price)}</span>
                    </p>
                    <span className="un-r-save max-w-[48%] shrink-0 truncate bg-save px-2.5 py-1.5 text-[11.5px] font-semibold leading-none text-white">{tag}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-[7px]">
              <GiftIcon />
              <span className="line-clamp-1 text-[10.5px] font-medium leading-tight text-ink">{caption}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCta}
            className={`un-r-12 mt-3 flex h-[50px] w-full items-center justify-center gap-2 text-[16px] font-semibold transition-colors ${added ? 'border-2 border-ink bg-white text-ink' : 'bg-ink text-paper hover:bg-black'}`}
          >
            {added ? 'Added ✓' : <>{cta} <Arrow /></>}
          </button>
        </div>
      </div>

      {builderOpen && <ComboBuilderSheet combo={combo} onClose={() => setBuilderOpen(false)} />}
    </article>
  );
};

const ComboOfferSection = ({ title, subtitle }) => {
  const { data, isLoading } = useGetHomeComboOffersQuery();
  const { active, can, themeKey } = useSiteCampaign();
  const combos = data?.data?.combos || [];
  const trackRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const [scrollable, setScrollable] = useState(false);

  const festive = active && can('sectionAccents');
  const copy = THEME_COPY[themeKey] || {};
  const n = combos.length;

  const stepOf = (el) => (el.children[1] ? el.children[1].offsetLeft - el.children[0].offsetLeft : el.clientWidth);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el || !el.firstChild) return;
    setScrollable(el.scrollWidth > el.clientWidth + 4);
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setIdx(atEnd ? el.children.length - 1 : Math.min(el.children.length - 1, Math.round(el.scrollLeft / stepOf(el))));
  }, []);

  const go = (i) => {
    const el = trackRef.current;
    const target = el?.children[Math.max(0, Math.min(n - 1, i))];
    if (!el || !target) return;
    el.scrollTo({ left: target.offsetLeft - el.children[0].offsetLeft, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => { el.removeEventListener('scroll', measure); ro?.disconnect(); };
  }, [measure, n]);

  if (isLoading) return null;
  // no combo offers: coupons (if any) still show on their own
  if (n === 0) return <CouponOffersSection />;

  const eyebrow = festive ? copy.eyebrow || 'Festive Offers' : 'Limited Time';
  const heading = title || (festive ? copy.offersTitle || 'Festive Offers' : 'Combo Offers');
  const sub = subtitle || (festive ? copy.offersSubtitle : '');
  const priceDefault = festive ? copy.priceLabel || 'Festive Price' : 'Combo Price';

  return (
    <section className="un-offers relative overflow-hidden bg-ink pt-12 pb-10 sm:pt-14 sm:pb-12" aria-label={heading}>
      {festive && (
        <>
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 55% at 50% 0%, rgb(var(--gl-brand) / 0.22), transparent 70%)' }} aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-star/60 to-transparent" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-star/40 to-transparent" aria-hidden="true" />
          <SectionDecor />
        </>
      )}

      <div className="relative z-10 max-w-[1100px] mx-auto px-4 lg:px-8">
        <div className="mb-5 text-center sm:mb-7">
          <span className="inline-flex items-center gap-2 gl-lbl text-[11px] text-star tracking-[0.18em]">
            <span aria-hidden="true">✦</span> {eyebrow} <span aria-hidden="true">✦</span>
          </span>
          <h2 className="font-archivo font-extrabold text-[26px] sm:text-4xl leading-tight text-paper mt-1.5">{heading}</h2>
          {sub && <p className="text-paper/70 text-sm sm:text-base mt-2 max-w-xl mx-auto">{sub}</p>}
          {festive && <div className="mt-3 flex justify-center"><FestiveCountdown tone="light" /></div>}
        </div>

        <div ref={trackRef} className="un-track gl-hscroll mx-auto flex w-fit max-w-full snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-4 pt-1 sm:gap-4 sm:px-6">
          {combos.map((combo) => (
            <div key={combo.id} className="w-[66vw] max-w-[296px] shrink-0 snap-start sm:w-[292px]">
              <OfferCard combo={combo} festive={festive} priceLabel={combo.priceLabel || priceDefault} />
            </div>
          ))}
        </div>

        {scrollable && (
          <div className="mt-1 flex items-center justify-center gap-4">
            <button type="button" onClick={() => go(idx - 1)} disabled={idx <= 0} className="un-nav grid h-11 w-11 place-items-center rounded-full disabled:opacity-35" aria-label="Previous offer">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
            </button>
            <div className="flex items-center gap-2">
              {combos.map((c, i) => (
                <button key={c.id} type="button" onClick={() => go(i)} aria-label={`Go to offer ${i + 1}`} aria-current={i === idx} className={`h-2.5 w-2.5 rounded-full transition-colors ${i === idx ? 'bg-star' : 'bg-paper/30 hover:bg-paper/60'}`} />
              ))}
            </div>
            <button type="button" onClick={() => go(idx + 1)} disabled={idx >= n - 1} className="un-nav grid h-11 w-11 place-items-center rounded-full disabled:opacity-35" aria-label="Next offer">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          </div>
        )}

        <CouponOffersSection variant="strip" />
      </div>
    </section>
  );
};

export default ComboOfferSection;
