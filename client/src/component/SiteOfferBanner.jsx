import { isOfferLive, offerAmountLabel, offerConditionLabel } from '../config/siteOffer';
import useOfferTerms from '../hooks/useOfferTerms';

/**
 * Site offer strip for checkout — tells a shopper which code to use and applies
 * it in one tap. Checkout is a light surface, so this uses the light palette
 * with the popup's brand accent, so the two still read as one offer.
 */

const SiteOfferBanner = ({
  cartTotal = 0,
  onApply,
  isApplying = false,
  appliedCoupon = null,
}) => {
  // Live coupon terms — never the bundled defaults, so the code shown here is
  // always the one checkout will actually accept.
  const { terms } = useOfferTerms();

  // Hooks must run unconditionally, so these gates come after the hook call.
  //
  // This now lives at the top of the checkout page rather than inside the
  // "Available coupons" sheet, so it no longer sits next to CouponList's card
  // for the same offer and needs no de-duplication. `isOfferLive()` removes it
  // on its own the moment the campaign window closes.
  if (!isOfferLive() || terms.available === false) return null;

  const code = terms.couponCode;
  const amount = offerAmountLabel(terms);
  const condition = offerConditionLabel(terms);

  // Below the minimum this coupon applies for ₹0, which reads as a broken
  // offer. Show the gap instead — it doubles as a nudge to add one more item.
  const minCart = terms.minCartValue || 0;
  const shortfall = Math.max(0, minCart - (cartTotal || 0));

  // The cart holds one coupon at a time. Once this one is on, the button stops
  // being an action — and while a different coupon is on, applying this would
  // silently swap it, so that is blocked too rather than left to guesswork.
  const isApplied = !!appliedCoupon && appliedCoupon === code;
  const otherCouponApplied = !!appliedCoupon && appliedCoupon !== code;
  const eligible = shortfall === 0 && !isApplied && !otherCouponApplied;

  return (
    <div className="relative overflow-hidden rounded-xl border border-brand/25 bg-gradient-to-br from-brand/[0.06] via-white to-white">
      <div className="h-1 w-full bg-gradient-to-r from-brand via-[#F5DEB3] to-brand" aria-hidden="true" />

      <div className="p-4">
        <div className="flex items-center gap-1.5">
          <i className="fa-solid fa-ticket text-[11px] text-brand" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink/70">
            Your special offer
          </span>
        </div>

        {/* The saving is the headline. At 15px it was competing with body copy
            and shoppers were scrolling straight past the offer. */}
        <p className="mt-2 text-[26px] font-extrabold leading-none text-ink">
          {amount} OFF
        </p>
        <p className="mt-1 text-[12px] font-semibold text-gray-500">{condition}</p>

        <div className="mt-3 flex items-stretch gap-2">
          <span className="flex flex-1 items-center truncate rounded-lg border border-dashed border-brand/60 bg-white/80 px-3 py-2.5 font-mono text-[15px] font-bold tracking-[0.12em] text-ink">
            {code}
          </span>
          <button
            type="button"
            onClick={() => onApply?.(code)}
            disabled={!eligible || isApplying}
            className={`shrink-0 rounded-lg px-5 text-[12px] font-bold uppercase tracking-wider transition-all disabled:cursor-not-allowed ${
              isApplied
                ? 'bg-emerald-600 text-white disabled:opacity-100'
                : 'bg-ink text-white hover:bg-ink disabled:opacity-40'
            }`}
          >
            {isApplying ? (
              <i className="fa-solid fa-spinner fa-spin" />
            ) : isApplied ? (
              <>
                <i className="fa-solid fa-check mr-1.5" />
                Applied
              </>
            ) : (
              'Apply'
            )}
          </button>
        </div>

        {isApplied ? (
          <p className="mt-2.5 text-[12px] font-semibold text-emerald-700">
            Discount applied to your order
          </p>
        ) : otherCouponApplied ? (
          <p className="mt-2.5 text-[12px] font-semibold text-brand">
            {appliedCoupon} is already applied — remove it to use this offer
          </p>
        ) : (
          shortfall > 0 && (
            <p className="mt-2.5 text-[12px] font-semibold text-brand">
              Add ₹{shortfall.toLocaleString('en-IN')} more to use this offer
            </p>
          )
        )}
      </div>
    </div>
  );
};

export default SiteOfferBanner;
