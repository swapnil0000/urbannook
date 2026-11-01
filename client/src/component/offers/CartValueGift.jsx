import { cartValueTarget } from '../../utils/offerBadge';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * Free gift on cart value (every product counts towards it) — the headline
 * offer, so it gets its own festive card above the list, with how far the
 * shopper's cart already is.
 */
const CartValueGift = ({ promo, target, cartTotal, className = '' }) => {
  const left = Math.max(0, target - (Number(cartTotal) || 0));
  const pct = target > 0 ? Math.min(100, Math.round(((Number(cartTotal) || 0) / target) * 100)) : 0;
  const name = String(promo.rewardLabel || promo.title || 'Free gift').replace(/\s*[—-]\s*free\s*$/i, '');
  return (
    <div className={`relative overflow-hidden rounded-xl border border-star/70 bg-ink p-3.5 text-paper ${className}`}
      style={{ background: 'radial-gradient(90% 120% at 100% 0%, rgb(var(--gl-star) / 0.28), transparent 60%), rgb(var(--gl-ink))' }}>
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-brand via-star to-brand" aria-hidden="true" />
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-star text-ink shadow-[0_0_0_5px_rgb(var(--gl-star)/0.2)] motion-safe:animate-bounce [animation-duration:2.2s]" aria-hidden="true">
          <i className="fa-solid fa-gift text-lg" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="gl-lbl text-[10px] text-star">Free gift · on every order</p>
          <p className="mt-0.5 text-base font-black leading-tight">{name} <span className="ml-1 inline-block -rotate-3 bg-brand px-1.5 py-0.5 align-middle text-[11px] font-black text-paper">FREE</span></p>
          {target > 0 && <p className="mt-0.5 text-xs text-paper/70">On orders above {inr(target)} — anything on the site counts</p>}
        </div>
      </div>
      {target > 0 && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper/15">
            <div className="h-full rounded-full bg-gradient-to-r from-star to-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] font-semibold text-star">
            {left > 0 ? `Add ${inr(left)} more to your cart to get it free` : 'Unlocked! Claim it in your cart'}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Cart / mini cart / checkout: the cart-value free gift while it is still
 * locked ("add ₹X more"). Once the cart qualifies, GiftClaimList takes over
 * (claim button), so the two never show the same gift twice. The amount the
 * cart already has comes from the server's own progress (`have`).
 */
export const CartGiftProgress = ({ promotions = [], className = '' }) => {
  const promo = promotions.find((p) => p.displayType === 'free_gift' && !p.qualifying && cartValueTarget(p) != null);
  if (!promo) return null;
  return <CartValueGift promo={promo} target={cartValueTarget(promo)} cartTotal={promo.progress.steps[0].have} className={className} />;
};

export default CartValueGift;
