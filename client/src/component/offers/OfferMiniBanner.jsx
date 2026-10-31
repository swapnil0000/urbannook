import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGetHomeComboOffersQuery } from '../../store/api/userApi';
import { getOfferInterests } from '../../utils/offerInterest';
import { useSiteCampaign } from '../../hooks/useSiteCampaign';
import MysteryGiftArt from './MysteryGiftArt';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * The OTHER product's card with the biggest saving in a combo ("FREE Double
 * stand, was ₹449" beats "FREE Single, was ₹399") — the engine's own offerPrice
 * from the home combo builder, so the strip never computes a discount itself.
 * null when the combo has no priced add-on.
 */
const bestAddOn = (combo, productId) => {
  const cards = (combo?.builder?.combos?.[0]?.slots || [])
    .flatMap((s) => s.options)
    .filter((o) => String(o.productId) !== String(productId))
    .flatMap((o) => o.cards || [])
    .filter((c) => !c.outOfStock && Number(c.offerPrice) >= 0 && Number(c.offerPrice) < Number(c.price));
  if (!cards.length) return null;
  const saving = (c) => Number(c.price) - Number(c.offerPrice);
  return cards.reduce((a, b) => (saving(b) > saving(a) ? b : a));
};

/** Photo of the other product a combo needs (the lamp, on the pen stand's page). */
const partnerImage = (combo, productId) => (combo?.builder?.combos?.[0]?.slots || [])
  .flatMap((s) => s.options)
  .find((o) => String(o.productId) !== String(productId))?.cards?.find((c) => c.image)?.image;

// Tiles shown in the desktop row; the rest (and every tile on phones) is in the "View all" sheet.
const DESKTOP_ROW = 4;

/**
 * One offer: reward photo (or gift box / icon), the admin's title, the real
 * add-on price or reward wording, and the badge. `full` is the sheet layout —
 * every line wraps instead of truncating, since there is room to read it all.
 */
const OfferTile = ({ promo, combo, productId, festive, full = false, className = '' }) => {
  const reward = combo?.builder?.combos?.[0]?.reward;
  const title = combo?.pdpCard?.tagline || combo?.tagline || promo.title;
  const addOn = bestAddOn(combo, productId);
  const detail = promo.rewardLabel && promo.rewardLabel !== title ? promo.rewardLabel : combo?.benefit || promo.subtitle;
  const rawBadge = reward?.badge || promo.badge;
  const badge = rawBadge === '100% OFF' ? 'FREE' : rawBadge; // a 100%-off stand reads as a free one
  const mystery = combo?.mysteryGift;
  const img = mystery ? null : addOn?.image || partnerImage(combo, productId) || combo?.rewardImage;
  const icon = promo.displayType === 'free_gift' ? 'fa-gift' : 'fa-tag';
  const line = full ? '' : 'truncate';
  return (
    <article
      className={`relative flex items-center gap-3 overflow-hidden border bg-ink p-2.5 pr-3 text-paper ${festive ? 'border-star/50' : 'border-ink'} ${className}`}
      style={festive ? { background: 'radial-gradient(80% 140% at 0% 0%, rgb(var(--gl-brand-hi) / 0.45), transparent 70%), rgb(var(--gl-ink))' } : undefined}
    >
      {festive && <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-star to-transparent" aria-hidden="true" />}
      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden border border-star/40 bg-white/10 md:h-14 md:w-14">
        {img
          ? <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />
          : mystery ? <MysteryGiftArt /> : <i className={`fa-solid ${icon} text-lg text-star`} aria-hidden="true" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`${full ? '' : 'line-clamp-2'} font-archivo text-[13.5px] font-bold leading-tight md:text-[15px]`} title={title}>{title}</p>
        {addOn && (
          <p className={`mt-1 ${line} text-[11.5px] leading-tight text-paper/70 md:text-[12.5px]`} title={addOn.variantName}>
            <span className="font-bold text-star">{Number(addOn.offerPrice) === 0 ? 'FREE' : inr(addOn.offerPrice)}</span>{' '}
            <span className="line-through">{inr(addOn.price)}</span> · {addOn.variantName || addOn.productName}
          </p>
        )}
        {detail && (full || !addOn) && (
          <p className={`mt-1 ${line} text-[11.5px] leading-tight text-paper/70 md:text-[12.5px]`} title={detail}>{detail}</p>
        )}
      </div>
      {badge && <span className="shrink-0 bg-star px-1.5 py-1 text-[10px] font-extrabold leading-none text-ink">{badge}</span>}
    </article>
  );
};

/** Every offer in one list — a bottom sheet on phones, a centred panel on desktop. */
const OffersSheet = ({ offers, productId, festive, onClose }) => {
  const panelRef = useRef(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return createPortal(
    <>
      <style>{`
        @keyframes unOsFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes unOsUp   { from { transform: translateY(100%) } to { transform: none } }
        @keyframes unOsPop  { from { opacity: 0; transform: translateY(12px) scale(.97) } to { opacity: 1; transform: none } }
        .un-os-backdrop { animation: unOsFade .25s ease-out both }
        .un-os-sheet    { animation: unOsUp .38s cubic-bezier(.16,1,.3,1) both; max-height: 85vh; max-height: 85dvh }
        @media (min-width: 768px) { .un-os-sheet { animation-name: unOsPop } }
        @media (prefers-reduced-motion: reduce) { .un-os-backdrop, .un-os-sheet { animation: unOsFade .01s linear both } }
      `}</style>
      <div className="fixed inset-0 z-[10000] flex items-end justify-center md:items-center md:p-4">
        <div className="un-os-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="un-os-title"
          tabIndex={-1}
          className="un-os-sheet relative flex w-full flex-col overflow-hidden rounded-t-[1.5rem] bg-paper text-ink shadow-[0_24px_70px_rgba(0,0,0,0.45)] outline-none md:max-w-[480px] md:rounded-[1.25rem]"
        >
          <div className="h-1 w-full bg-gradient-to-r from-brand via-star to-brand" aria-hidden="true" />
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-ink/20 md:hidden" aria-hidden="true" />
          <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-3">
            <div>
              <p className="gl-lbl text-[10px] text-brand" style={{ letterSpacing: '0.2em' }}>✦ Offers on this product</p>
              <h2 id="un-os-title" className="mt-1 font-archivo text-xl font-extrabold tracking-tight">{offers.length} live {offers.length === 1 ? 'offer' : 'offers'}</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Close offers" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-ink/5 hover:text-ink">
              <i className="fa-solid fa-xmark text-base" aria-hidden="true" />
            </button>
          </div>
          <ul className="space-y-2.5 overflow-y-auto overscroll-contain px-4 pb-3">
            {offers.map(({ promo, combo }) => (
              <li key={promo.id}><OfferTile promo={promo} combo={combo} productId={productId} festive={festive} full /></li>
            ))}
          </ul>
          <p className="border-t border-hair px-5 py-3 text-center text-[11.5px] text-muted" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            Applied automatically in your cart, no code needed.
          </p>
        </div>
      </div>
    </>,
    document.body,
  );
};

/**
 * Compact offer strip for the variants page of a product: one slim tile per
 * live offer (horizontal swipe on phones, one row on desktop) so the variant
 * grid stays the first thing a shopper sees, plus a "View all" sheet listing
 * every offer in full. The list is the product's own placement-aware
 * promotions (/promotions/display/product, passed in by the page); the home
 * combo payload only adds the reward photo, the mystery-gift flag and real
 * add-on prices. Every word is the admin's own. Nothing renders when the
 * product has no live offer.
 */
const OfferMiniBanner = ({ productId, promotions = [] }) => {
  const { data } = useGetHomeComboOffersQuery();
  const { active, can } = useSiteCampaign();
  const festive = active && can('sectionAccents');
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const lastTapped = getOfferInterests()[0]?.promotionId;
  const offers = useMemo(() => {
    const combos = new Map((data?.data?.combos || []).map((c) => [String(c.id), c]));
    return promotions
      .filter((p) => p.fullyFunctional !== false)
      .map((p) => ({ promo: p, combo: combos.get(String(p.id)) }))
      // the offer the shopper just tapped on the homepage comes first
      .sort((a, b) => (String(b.promo.id) === String(lastTapped)) - (String(a.promo.id) === String(lastTapped))
        || (a.promo.displayRank ?? 99) - (b.promo.displayRank ?? 99));
  }, [data, promotions, lastTapped]);

  const n = offers.length;
  if (!n) return null;
  // phones: whenever there is more than one (the strip scrolls); desktop: only when the row can't hold them all
  const viewAll = n > 1 ? (n > DESKTOP_ROW ? '' : 'md:hidden') : 'hidden';

  return (
    <section className="mb-5 md:mb-7" aria-label="Offers on this product">
      <div className="mb-2.5 flex items-center gap-3">
        <p className="gl-lbl text-[10px] text-brand" style={{ letterSpacing: '0.2em' }}>✦ {n} {n === 1 ? 'offer' : 'offers'} on this product</p>
        <span className={`h-px flex-1 ${festive ? 'bg-gradient-to-r from-star/70 to-transparent' : 'bg-hair'}`} aria-hidden="true" />
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`${viewAll} gl-lbl inline-flex shrink-0 items-center gap-1 text-[10px] text-ink underline decoration-brand decoration-2 underline-offset-4 hover:text-brand`}
          aria-haspopup="dialog"
        >
          View all ({n}) <i className="fa-solid fa-chevron-up text-[8px]" aria-hidden="true" />
        </button>
      </div>

      <div
        className="gl-hscroll -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:gap-3 md:overflow-visible md:px-0 md:pb-0"
        style={{ gridTemplateColumns: `repeat(${n >= DESKTOP_ROW ? DESKTOP_ROW : Math.max(n, 2)}, minmax(0, 1fr))` }}
      >
        {offers.map(({ promo, combo }, i) => (
          <OfferTile
            key={promo.id}
            promo={promo}
            combo={combo}
            productId={productId}
            festive={festive}
            className={`w-[84%] shrink-0 snap-start sm:w-[60%] md:w-auto ${i >= DESKTOP_ROW ? 'md:hidden' : ''}`}
          />
        ))}
      </div>

      {sheetOpen && <OffersSheet offers={offers} productId={productId} festive={festive} onClose={closeSheet} />}
    </section>
  );
};

export default OfferMiniBanner;
