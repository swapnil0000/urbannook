import {
  INDEPENDENCE_OFFER,
  isOfferLive,
  offerAmountLabel,
  offerConditionLabel,
} from '../config/independenceOffer';

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

const IndependenceOfferBanner = ({ cartTotal = 0, onApply, isApplying = false }) => {
  if (!isOfferLive()) return null;

  const code = INDEPENDENCE_OFFER.code;
  const amount = offerAmountLabel();
  const condition = offerConditionLabel();

  // Below the minimum this coupon applies for ₹0, which reads as a broken
  // offer. Show the gap instead — it doubles as a nudge to add one more item.
  const minCart = INDEPENDENCE_OFFER.minCartValue || 0;
  const shortfall = Math.max(0, minCart - (cartTotal || 0));
  const eligible = shortfall === 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#a89068]/30 bg-gradient-to-br from-[#FF9933]/[0.08] via-white to-[#138808]/[0.08]">
      <div className="flex h-1 w-full" aria-hidden="true">
        <span className="flex-1 bg-[#FF9933]" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-[#138808]" />
      </div>

      <div className="p-3.5">
        <div className="flex items-center gap-1.5">
          <Chakra className="h-3.5 w-3.5 shrink-0 text-[#2e443c]/60" />
          <span className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#2e443c]/60">
            Independence Day Special
          </span>
        </div>

        <p className="mt-1.5 text-[15px] font-extrabold leading-tight text-[#2e443c]">
          {amount} OFF{' '}
          <span className="text-[11px] font-semibold text-gray-500">{condition}</span>
        </p>

        <div className="mt-2.5 flex items-center gap-2">
          <span className="flex-1 truncate rounded-lg border border-dashed border-[#a89068]/50 bg-white/70 px-3 py-2 font-mono text-[13px] font-bold tracking-[0.12em] text-[#2e443c]">
            {code}
          </span>
          <button
            type="button"
            onClick={() => onApply?.(code)}
            disabled={!eligible || isApplying}
            className="shrink-0 rounded-lg bg-[#2e443c] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white transition-all hover:bg-[#1c3026] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isApplying ? <i className="fa-solid fa-spinner fa-spin" /> : 'Apply'}
          </button>
        </div>

        {!eligible && (
          <p className="mt-2 text-[11px] font-medium text-[#a89068]">
            Add ₹{shortfall.toLocaleString('en-IN')} more to use this offer
          </p>
        )}
      </div>
    </div>
  );
};

export default IndependenceOfferBanner;
