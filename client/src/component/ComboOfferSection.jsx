import { useState, useRef, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { addItem } from '../store/slices/cartSlice';
import { useGetHomeComboOffersQuery } from '../store/api/userApi';
import { useSiteCampaign, THEME_COPY } from '../hooks/useSiteCampaign';
import FestiveCountdown from './festive/FestiveCountdown';
import SectionDecor from './festive/SectionDecor';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

// Offer media is ONE ratio for every card: 1:1 square (admin uploads 1200×1200).
// object-cover crops from the centre, so keep the product in the middle ~70%.
const MEDIA = 'relative w-full aspect-square overflow-hidden rounded-[16px] bg-surface';

/**
 * Admin-driven homepage offers, sourced from GET /promotions/display/home —
 * ordinary Promotion V2 documents (placement "home", a 2-product condition, a
 * reward on one of them) plus the optional `homeCard` presentation fields.
 *
 * Money is never typed anywhere: mrp / price / save / percentOff are computed
 * server-side by the real checkout engine. The admin only picks WORDING
 * (badge, price label, how savings read, button text/link), the image, order,
 * and dates (the promotion's own — an ended promotion simply isn't returned).
 *
 * Image: the admin's uploaded offer image (4:5, object-cover) or, if none, the
 * first product's photo with the second product inset — same 4:5 frame, so
 * cards stay uniform whatever gets uploaded.
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

const OfferCard = ({ combo, festive, priceLabel }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);

  const first = combo.items[0];
  const second = combo.items[1];
  const tag = headlineSavings(combo);
  const showExtraLabel = combo.savingsLabel && combo.savingsMode !== 'label' && combo.savingsLabel !== tag;
  const cta = combo.ctaLabel || (combo.ctaAction === 'link' ? 'View Offer' : 'Add to Cart');

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

  const onCta = () => {
    if (combo.ctaAction === 'link' && combo.ctaUrl) {
      if (/^https:\/\//i.test(combo.ctaUrl)) window.location.assign(combo.ctaUrl);
      else navigate(combo.ctaUrl);
      return;
    }
    addBoth();
  };

  const viewOffer = () => navigate(`/products/${first?.productId}`);

  const customBadge = combo.badgeLabel; // shown only when the admin chose one

  return (
    <article
      className={`group relative flex h-full flex-col rounded-[22px] border-2 border-star/60 bg-gradient-to-b from-paper to-surface p-[3px] pb-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-star hover:shadow-[0_16px_34px_-14px_rgb(0_0_0/0.6)] ${festive ? 'un-fest-glow' : ''}`}
    >
      {/* ── image: square, nearly flush with the border, rounded all round ── */}
      <button type="button" onClick={viewOffer} className={`${MEDIA} text-left cursor-pointer focus-visible:outline-none`} aria-label={`View ${combo.title}`}>
        {combo.bannerImage ? (
          <img src={combo.bannerImage} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <>
            <img src={first?.image || '/assets/logo.webp'} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
            {second && (
              <span className="absolute bottom-2.5 right-2.5 aspect-square w-[32%] overflow-hidden rounded-xl border-[3px] border-paper bg-white shadow-lg">
                <img src={second.image || '/assets/logo.webp'} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = '/assets/logo.webp'; }} />
              </span>
            )}
          </>
        )}
        {customBadge && (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-brand px-2 py-1 text-[9px] gl-lbl tracking-wider text-white shadow-sm">✦ {customBadge}</span>
        )}
      </button>

      {/* ── stacked content, same rhythm as the reference ─────────────── */}
      <div className="flex flex-1 flex-col px-2.5 pt-3">
        <h3 className="text-center font-archivo text-[19px] font-extrabold leading-tight text-ink line-clamp-2 sm:text-[20px]">{combo.title}</h3>
        {combo.subtitle && combo.subtitle !== combo.title && (
          <p className="mt-1.5 text-center text-[16px] font-medium leading-snug text-muted line-clamp-1">{combo.subtitle}</p>
        )}

        {/* pricing box with the caption tucked under it as a tab */}
        <div className="mt-3 rounded-[14px] bg-star/25">
          <div className="rounded-[14px] border border-star/30 bg-white px-3 py-2.5 shadow-[0_1px_0_rgb(var(--gl-star)/0.25)]">
            <span className="block text-[16px] leading-none text-faint">MRP <span className="line-through">{inr(combo.mrp)}</span></span>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="min-w-0 whitespace-nowrap leading-none">
                <span className="text-[15px] font-medium text-sale">{priceLabel}</span>{' '}
                <span className="text-[22px] font-extrabold text-sale">{inr(combo.price)}</span>
              </span>
              <span className={`shrink-0 rounded-l-full rounded-r-[5px] bg-save py-1.5 pl-3 pr-2 text-[12px] font-bold leading-none text-white ${festive ? 'un-shine' : ''}`}>{tag}</span>
            </div>
            {showExtraLabel && <span className="mt-1.5 inline-block rounded-full bg-ink px-2.5 py-0.5 text-[10px] font-bold text-star">{combo.savingsLabel}</span>}
          </div>
          <p className="px-2 py-1.5 text-center text-[13.5px] font-bold leading-tight text-ink">
            {combo.badgeText || 'Buy together & save'}
          </p>
        </div>

        <button
          type="button"
          onClick={onCta}
          className={`mt-4 flex h-[58px] w-full items-center justify-center gap-2 rounded-[14px] text-[21px] font-extrabold tracking-tight shadow-[0_6px_14px_-6px_rgb(0_0_0/0.55)] transition-colors ${
            added ? 'border-2 border-ink bg-white text-ink' : 'bg-ink text-paper hover:bg-black'
          }`}
        >
          {added ? 'Added ✓' : cta}
        </button>
      </div>
    </article>
  );
};

const GAP = 12; // px, matches gap-3 (the phone carousel)

const ComboOfferSection = ({ title, subtitle }) => {
  const { data, isLoading } = useGetHomeComboOffersQuery();
  const { active, can, themeKey } = useSiteCampaign();
  const combos = data?.data?.combos || [];
  const trackRef = useRef(null);
  const [idx, setIdx] = useState(0);

  const festive = active && can('sectionAccents');
  const copy = THEME_COPY[themeKey] || {};
  const n = combos.length;

  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || !el.firstChild) return;
    setIdx(Math.round(el.scrollLeft / (el.firstChild.offsetWidth + GAP)));
  }, []);

  const go = (i) => {
    const el = trackRef.current;
    if (!el || !el.children[i]) return;
    el.scrollTo({ left: el.children[i].offsetLeft - el.offsetLeft, behavior: 'smooth' });
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll, n]);

  if (isLoading || n === 0) return null;

  const eyebrow = festive ? copy.eyebrow || 'Festive Offers' : 'Limited Time';
  const heading = title || (festive ? copy.offersTitle || 'Festive Offers' : 'Combo Offers');
  const sub = subtitle || (festive ? copy.offersSubtitle : '');
  const priceDefault = festive ? copy.priceLabel || 'Festive Price' : 'Combo Price';

  // Compact, uniform cards: 1 offer centred, 2 side by side, 3+ in a grid
  // (a snap carousel on phones). One height, one media ratio.
  const layout = n === 1
    ? 'max-w-[300px] mx-auto'
    : n === 2
      ? 'md:grid md:grid-cols-2 max-w-[640px] mx-auto'
      : 'md:grid md:grid-cols-2 lg:grid-cols-3 max-w-[960px] mx-auto';

  return (
    <section className="relative overflow-hidden bg-ink pt-12 pb-10 sm:pt-14 sm:pb-12" aria-label={heading}>
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

        <div
          ref={trackRef}
          className={`flex gap-3 overflow-x-auto md:gap-4 md:overflow-visible snap-x gl-hscroll pb-2 md:pb-0 ${layout}`}
        >
          {combos.map((combo) => (
            <div key={combo.id} className={`snap-start shrink-0 md:shrink ${n === 1 ? 'w-full' : 'w-[74vw] max-w-[300px] md:w-auto md:max-w-none'}`}>
              <OfferCard combo={combo} festive={festive} priceLabel={combo.priceLabel || priceDefault} />
            </div>
          ))}
        </div>

        {n > 1 && (
          <div className="md:hidden flex items-center justify-center gap-4 mt-5">
            <button type="button" onClick={() => go(Math.max(0, idx - 1))} className="w-9 h-9 rounded-full border border-paper/25 text-paper/80 grid place-items-center hover:border-paper/60 transition-colors" aria-label="Previous offer">‹</button>
            <div className="flex items-center gap-1.5">
              {combos.map((c, i) => (
                <button key={c.id} type="button" onClick={() => go(i)} aria-label={`Go to offer ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-star' : 'w-1.5 bg-paper/30'}`} />
              ))}
            </div>
            <button type="button" onClick={() => go(Math.min(n - 1, idx + 1))} className="w-9 h-9 rounded-full border border-paper/25 text-paper/80 grid place-items-center hover:border-paper/60 transition-colors" aria-label="Next offer">›</button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ComboOfferSection;
