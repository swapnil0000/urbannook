import { useState } from 'react';
import { useGetProductPromotionsQuery } from '../../store/api/userApi';
import CartValueGift from './CartValueGift';
import { cartValueTarget } from '../../utils/offerBadge';

// Offers this product takes part in, shown on the product page before anything
// is in the cart. Data: GET /promotions/display/product/:id (already sanitized
// by promotionPresentation.service.js), prefetched on the server for product
// pages (entry-server.jsx) so the block is in the HTML and never shifts the
// layout when it arrives.

// Server-side presentation text: "progressText" talks about the cart ("Add 1
// more of this item…"), which reads wrong on a page where the trigger is a
// different product, so it is not shown here.
// Offers shown before "+N more offers" — keeps the box short under the buy buttons.
const COLLAPSED = 2;

const iconFor = (p) => (p.displayType === 'free_gift' ? 'fa-gift' : p.displayType === 'free_shipping' ? 'fa-truck-fast' : 'fa-tag');

// `onApply(promotionId)`: the product page adds this product if needed and
// opens the offer sheet (PromotionUnlockSheet) to add the reward.
/**
 * The offer that gives this offer's reward instead, for the current cart: the
 * cart already qualifies for `p` but has nothing to add for it, because a
 * bigger step of the same ladder took over (2 LED: "Buy 2" replaces "Buy 1"),
 * or another ladder's offer already owns the stand (2 wooden + 1 LED — one
 * offer per product). Only grouped offers count, so an unrelated live offer
 * (the mystery gift) is never named as the holder. null = nothing in the way.
 */
const offerInstead = (p, cartPromotions) => {
  const live = cartPromotions.find((c) => c.id === p.id);
  if (!live || !live.qualifying || live.applied || live.rewardTargetPending) return null;
  const holds = (c) => c.id !== p.id && c.group && c.qualifying && (c.applied || c.rewardTargetPending);
  const sameLadder = cartPromotions.find((c) => holds(c) && c.group === live.group);
  if (sameLadder) return { promo: sameLadder, upgrade: true };
  const other = cartPromotions.find((c) => holds(c) && c.group !== live.group);
  return other ? { promo: other, upgrade: false } : null;
};

const ProductOffers = ({ productId, className = '', onApply, disabled = false, cartTotal = 0, appliedIds = [], cartPromotions = [] }) => {
  const { data } = useGetProductPromotionsQuery(productId, { skip: !productId });
  const all = (data?.data?.promotions || [])
    .filter((p) => p.fullyFunctional !== false)
    .sort((a, b) => (a.displayRank ?? 99) - (b.displayRank ?? 99));
  const gifts = all.filter((p) => p.displayType === 'free_gift' && cartValueTarget(p) != null).slice(0, 1);
  const [expanded, setExpanded] = useState(false);
  // 4 = a gift plus a full 3-step ladder (Buy 1 / 2 / 3 katanas) — a 3 cap hid the top step.
  // Offers the cart can still use first; ones a bigger offer replaced ("Upgraded"/"Covered") last.
  const offers = all.filter((p) => !gifts.includes(p)).slice(0, 4)
    .map((p) => ({ p, instead: offerInstead(p, cartPromotions) }))
    .sort((a, b) => Boolean(a.instead) - Boolean(b.instead));
  if (!offers.length && !gifts.length) return null;
  const hidden = expanded ? 0 : Math.max(0, offers.length - COLLAPSED);

  return (
    <div className={`space-y-3 ${className}`}>
    {gifts.map((g) => <CartValueGift key={g.id} promo={g} target={cartValueTarget(g)} cartTotal={cartTotal} />)}
    {offers.length > 0 && (
    <section className="rounded-xl border border-star/50 bg-star/10 p-3" aria-label="Offers on this product">
      <p className="gl-lbl mb-2 flex items-center gap-1.5 text-[11px] text-ink">
        <span className="text-brand" aria-hidden="true">✦</span> {offers.length === 1 ? 'Offer on this product' : `${offers.length} offers on this product`}
      </p>
      <ul className="space-y-2">
        {offers.slice(0, offers.length - hidden).map(({ p, instead }) => {
          return (
          <li key={p.id} className={`flex min-w-0 items-center gap-3 rounded-lg bg-paper px-3 py-2.5 ${instead ? 'opacity-70' : ''}`}>
            {/* admin's picture for this surface (promotion.placementImages.pdp); text-only + icon when none */}
            {p.image ? (
              <img src={p.image} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-lg object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-brand" aria-hidden="true">
                <i className={`fa-solid ${iconFor(p)} text-xs`} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-snug text-ink">{p.rewardLabel || p.title}</p>
              {p.cardNote ? <p className="text-[11px] text-muted">{p.cardNote}</p> : p.rewardLabel && p.title && p.title !== p.rewardLabel && <p className="truncate text-[11px] text-muted" title={p.title}>{p.title}</p>}
              {instead && (
                <p className="mt-0.5 text-[11px] font-semibold text-brand">
                  {instead.upgrade
                    ? <>Your cart unlocked a bigger offer: {instead.promo.title}</>
                    : <>Your free stand comes from &ldquo;{instead.promo.title}&rdquo; - one stand offer per order</>}
                </p>
              )}
            </div>
            {/* No "Applied" state here: the endpoint evaluates as if one of this
                product were in the cart, so `applied` is true before anything is added. */}
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {p.badge && <span className="rounded-md bg-sale/10 px-2 py-0.5 text-[10px] font-extrabold text-sale">{p.badge === '100% OFF' ? 'FREE' : p.badge}</span>}
              {appliedIds.includes(p.id) ? (
                <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-save/10 px-3 text-xs font-extrabold text-save">
                  <i className="fa-solid fa-check text-[10px]" aria-hidden="true" /> Applied
                </span>
              ) : instead ? (
                <span className="inline-flex h-8 items-center rounded-lg bg-ink/5 px-3 text-xs font-bold text-muted">{instead.upgrade ? 'Upgraded' : 'Covered'}</span>
              ) : onApply && (
                <button
                  type="button"
                  onClick={() => onApply(p.id)}
                  disabled={disabled}
                  className="gl-press h-8 rounded-lg bg-ink px-3.5 text-xs font-bold text-paper transition-colors hover:bg-brand disabled:opacity-50"
                >
                  Apply
                </button>
              )}
            </div>
          </li>
          );
        })}
      </ul>
      {offers.length > COLLAPSED && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-star/60 bg-paper py-2 text-[12.5px] font-bold text-ink transition-colors hover:border-ink"
        >
          {expanded ? 'Show less' : `+${hidden} more ${hidden === 1 ? 'offer' : 'offers'}`}
          <i className={`fa-solid fa-chevron-down text-[10px] transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      )}
    </section>
    )}
    </div>
  );
};

export default ProductOffers;
