import { useGetFreeShippingOfferQuery } from '../store/api/userApi';
import SealBadgeCard, { UnderlineAmount } from './promotions/SealBadgeCard';

/**
 * Free-shipping threshold callout — advertises the plain cart-value threshold
 * AND, once unlocked, highlights the actual ₹ saved — "₹150 Shipping → FREE,
 * you saved ₹150!" — instead of a plain "free shipping" statement.
 *
 * Display only. The threshold and on/off switch come from the admin's
 * free_shipping Promotion via GET /free-shipping-offer, and the server applies
 * it at order time (rp.payment.controller.js). Renders nothing while the
 * promotion is off or has no threshold, so admin alone decides when it shows.
 *
 * Styled after SiteOfferBanner (brand accent bar, light card) so the two read
 * as the same family of offers.
 *
 * @param {number} cartTotal  current cart subtotal, for the "add ₹N more" nudge
 * @param {'card'|'compact'} variant  'card' for checkout, 'compact' for the product page
 * @param {number|null} realShippingAmount  the ACTUAL carrier charge for this
 *   order, once known (checkout, after address+pincode resolve — see
 *   CheckoutPage.jsx's pricingDetails.shipping.realAmount). Before that's
 *   available (cart/mini-cart — no delivery address yet), this is left
 *   undefined/null and the strip falls back to PROVISIONAL_SHIPPING_ESTIMATE,
 *   always labeled "estimated" so it's never mistaken for a confirmed saving.
 * @param {boolean|null} eligibleOverride  the REAL per-cart eligibility,
 *   from evaluating the admin's actual free_shipping Promotion against the
 *   CURRENT cart (its full conditionTree — which may restrict it to specific
 *   products/categories, not just a cart-value threshold) — see
 *   `promo.applied` on the `free_shipping`-displayType entry from
 *   useCartPromotions/useGetCheckoutPromotionsQuery. A plain `cartTotal >=
 *   threshold` comparison alone would show "unlocked" even when the cart's
 *   actual products don't qualify, which is exactly the bug this guards
 *   against. Pass `null`/omit only where that real evaluation genuinely
 *   isn't available yet — the strip then falls back to the threshold-only
 *   estimate, same as before.
 */
const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

// Pre-address placeholder ONLY — explicitly labeled "estimated" everywhere
// it's shown. The real amount (pricingDetails.shipping.realAmount) always
// wins once the carrier rate is known; this is never presented as final.
const PROVISIONAL_SHIPPING_ESTIMATE = 150;

const ProgressBar = ({ pct }) => (
  <div className="relative mt-3 h-2 w-full rounded-full bg-hair/70">
    <div
      className="h-full rounded-full bg-gradient-to-r from-brand/70 to-brand transition-[width] duration-700 ease-out"
      style={{ width: `${Math.max(pct, 4)}%` }}
    />
    {/* truck rides the tip of the fill */}
    <span
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow ring-1 ring-brand/30 transition-[left] duration-700 ease-out"
      style={{ left: `${Math.min(Math.max(pct, 4), 96)}%` }}
      aria-hidden="true"
    >
      <i className="fa-solid fa-truck-fast text-[10px] text-brand" />
    </span>
  </div>
);

const FreeShippingStrip = ({ cartTotal = 0, variant = 'card', className = '', realShippingAmount = null, eligibleOverride = null }) => {
  const { data } = useGetFreeShippingOfferQuery();
  const config = data?.data;
  const threshold = Number(config?.thresholdAmount) || 0;

  if (!config?.isActive || threshold <= 0) return null;

  const total = Number(cartTotal) || 0;
  const shortfall = Math.max(0, threshold - total);
  // The threshold-only comparison is a FALLBACK — it can't know about a
  // promotion's own product/category restrictions, only its ₹ value. Once
  // the caller supplies the real, fully-evaluated eligibility (checked
  // against the actual cart items' full conditionTree), that always wins —
  // this is what stops "unlocked" from showing for a cart that doesn't
  // actually qualify.
  const thresholdOnlyUnlocked = total > 0 && shortfall === 0;
  const unlocked = typeof eligibleOverride === 'boolean' ? eligibleOverride : thresholdOnlyUnlocked;
  const pct = Math.round(Math.min(total / threshold, 1) * 100);

  // Once unlocked, show the ACTUAL ₹ saved — the real carrier charge when
  // it's known (checkout, post-address), else a clearly-labeled estimate so
  // the cart/mini-cart (no address yet) still gives a concrete number
  // without overstating it as confirmed.
  const hasRealAmount = Number(realShippingAmount) > 0;
  const savedAmount = hasRealAmount ? Number(realShippingAmount) : PROVISIONAL_SHIPPING_ESTIMATE;

  // Unlocked state is ALWAYS the same premium seal-badge card everywhere
  // (cart, mini-cart, PDP, checkout) — the exact card CheckoutPage's own
  // order-summary "You're saving ₹X" banner uses (SealBadgeCard.jsx), so a
  // customer never sees two differently-styled "free shipping" messages in
  // one flow. Only the NOT-yet-unlocked progress state below still varies
  // by `variant` (compact vs card), since that's a genuinely different UI
  // need (a progress bar) with no seal-card equivalent.
  if (unlocked) {
    return (
      <div className={className}>
        <SealBadgeCard eyebrowIcon="fa-truck-fast" eyebrowText="Free Shipping Unlocked">
          <span>You're saving</span>
          <UnderlineAmount>{inr(savedAmount)}</UnderlineAmount>
          <span>on delivery{!hasRealAmount && ''}</span>
        </SealBadgeCard>
      </div>
    );
  }

  const message = total > 0 ? (
    <>Add <b className="text-brand">{inr(shortfall)}</b> more to get <b>FREE shipping</b></>
  ) : (
    <>On all orders above <b>{inr(threshold)}</b></>
  );

  // Below this point the offer is NOT yet unlocked — a genuinely different
  // UI need (a progress bar toward the threshold), so it keeps its own
  // look rather than forcing the seal-badge card onto a "not yet" state.
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 border-brand/25 bg-gradient-to-r from-brand/[0.08] to-white ${className}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white" aria-hidden="true">
          <i className="fa-solid fa-truck-fast text-sm" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-ink">Free shipping</p>
          <p className="text-[12px] text-muted">{message}</p>
          {total > 0 && (
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-hair/70">
              <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-brand/25 bg-gradient-to-br from-brand/[0.06] via-white to-white ${className}`}>
      <div className="h-1 w-full bg-gradient-to-r from-brand via-[#F5DEB3] to-brand" aria-hidden="true" />
      <div className="p-4">
        <div className="flex items-center gap-1.5">
          <i className="fa-solid fa-truck-fast text-[11px] text-brand" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink/70">Shipping offer</span>
        </div>

        <p className="mt-2 text-[24px] font-extrabold leading-none text-ink">FREE SHIPPING</p>
        <p className="mt-1.5 text-[13px] font-semibold text-gray-600">{message}</p>

        {total > 0 && (
          <>
            <ProgressBar pct={pct} />
            <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-muted">
              <span>{inr(total)}</span>
              <span>{inr(threshold)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FreeShippingStrip;
