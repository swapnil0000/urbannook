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
const iconFor = (p) => (p.displayType === 'free_gift' ? 'fa-gift' : p.displayType === 'free_shipping' ? 'fa-truck-fast' : 'fa-tag');

// `onApply(promotionId)`: the product page adds this product if needed and
// opens the offer sheet (PromotionUnlockSheet) to add the reward.
const ProductOffers = ({ productId, className = '', onApply, disabled = false, cartTotal = 0, appliedIds = [] }) => {
  const { data } = useGetProductPromotionsQuery(productId, { skip: !productId });
  const all = (data?.data?.promotions || [])
    .filter((p) => p.fullyFunctional !== false)
    .sort((a, b) => (a.displayRank ?? 99) - (b.displayRank ?? 99));
  const gifts = all.filter((p) => p.displayType === 'free_gift' && cartValueTarget(p) != null).slice(0, 1);
  const offers = all.filter((p) => !gifts.includes(p)).slice(0, 3);
  if (!offers.length && !gifts.length) return null;

  return (
    <div className={`space-y-3 ${className}`}>
    {gifts.map((g) => <CartValueGift key={g.id} promo={g} target={cartValueTarget(g)} cartTotal={cartTotal} />)}
    {offers.length > 0 && (
    <section className="rounded-xl border border-star/50 bg-star/10 p-3" aria-label="Offers on this product">
      <p className="gl-lbl mb-2 flex items-center gap-1.5 text-[11px] text-ink">
        <span className="text-brand" aria-hidden="true">✦</span> {offers.length === 1 ? 'Offer on this product' : `${offers.length} offers on this product`}
      </p>
      <ul className="space-y-2">
        {offers.map((p) => (
          <li key={p.id} className="flex min-w-0 items-center gap-3 rounded-lg bg-paper px-3 py-2.5">
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
            </div>
            {/* No "Applied" state here: the endpoint evaluates as if one of this
                product were in the cart, so `applied` is true before anything is added. */}
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {p.badge && <span className="rounded-md bg-sale/10 px-2 py-0.5 text-[10px] font-extrabold text-sale">{p.badge}</span>}
              {appliedIds.includes(p.id) ? (
                <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-save/10 px-3 text-xs font-extrabold text-save">
                  <i className="fa-solid fa-check text-[10px]" aria-hidden="true" /> Applied
                </span>
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
        ))}
      </ul>
    </section>
    )}
    </div>
  );
};

export default ProductOffers;
