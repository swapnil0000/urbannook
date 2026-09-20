import { isOfferLive, offerAmountLabel, offerConditionLabel } from '../config/independenceOffer';
import useOfferTerms from '../hooks/useOfferTerms';

/**
 * Independence Day offer strip for the checkout promo area — the thing that
 * tells a shopper at checkout that a sale is on and which code to use.
 *
 * Checkout is a light surface, so this deliberately does not reuse the popup's
 * dark palette, only its tricolour language, so the two still read as one
 * campaign. It disappears on its own when the campaign window closes.
 */

const Chakra = ({ className = '' }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
    <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="24" cy="24" r="4" fill="currentColor" />
    {Array.from({ length: 12 }, (_, i) => (
      <line
        key={i}
        x1="24"
        y1="6"
        x2="24"
        y2="24"
        stroke="currentColor"
        strokeWidth="1.6"
        transform={`rotate(${i * 30} 24 24)`}
      />
    ))}
  </svg>
);

const IndependenceOfferBanner = ({
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
    <div className="relative overflow-hidden rounded-xl border border-brand/30 bg-gradient-to-br from-[#FF9933]/[0.08] via-white to-[#138808]/[0.08]">
      <div className="flex h-1 w-full" aria-hidden="true">
        <span className="flex-1 bg-[#FF9933]" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-[#138808]" />
      </div>

      <div className="p-4">
        <div className="flex items-center gap-1.5">
          <Chakra className="h-4 w-4 shrink-0 text-ink/70" />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink/70">
            Independence Day Special
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

export default IndependenceOfferBanner;
