import { useGetFreeShippingOfferQuery } from '../store/api/userApi';

/**
 * Free-shipping threshold callout — advertises the plain cart-value threshold.
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
 */
const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

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

const FreeShippingStrip = ({ cartTotal = 0, variant = 'card', className = '' }) => {
  const { data } = useGetFreeShippingOfferQuery();
  const config = data?.data;
  const threshold = Number(config?.thresholdAmount) || 0;

  if (!config?.isActive || threshold <= 0) return null;

  const total = Number(cartTotal) || 0;
  const shortfall = Math.max(0, threshold - total);
  const unlocked = total > 0 && shortfall === 0;
  const pct = Math.round(Math.min(total / threshold, 1) * 100);

  const message = unlocked ? (
    <>You've unlocked <b className="text-emerald-700">FREE shipping</b> on this order</>
  ) : total > 0 ? (
    <>Add <b className="text-brand">{inr(shortfall)}</b> more to get <b>FREE shipping</b></>
  ) : (
    <>On all orders above <b>{inr(threshold)}</b></>
  );

  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
          unlocked ? 'border-emerald-200 bg-emerald-50/70' : 'border-brand/25 bg-gradient-to-r from-brand/[0.08] to-white'
        } ${className}`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            unlocked ? 'bg-emerald-600 text-white' : 'bg-brand text-white'
          }`}
          aria-hidden="true"
        >
          <i className={`fa-solid ${unlocked ? 'fa-check' : 'fa-truck-fast'} text-sm`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-ink">
            {unlocked ? 'Free shipping unlocked' : 'Free shipping'}
          </p>
          <p className="text-[12px] text-muted">{message}</p>
          {total > 0 && !unlocked && (
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-hair/70">
              <div className="h-full rounded-full bg-brand transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${
        unlocked
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white'
          : 'border-brand/25 bg-gradient-to-br from-brand/[0.06] via-white to-white'
      } ${className}`}
    >
      <div
        className={`h-1 w-full bg-gradient-to-r ${
          unlocked ? 'from-emerald-500 via-emerald-200 to-emerald-500' : 'from-brand via-[#F5DEB3] to-brand'
        }`}
        aria-hidden="true"
      />
      <div className="p-4">
        <div className="flex items-center gap-1.5">
          <i className={`fa-solid fa-truck-fast text-[11px] ${unlocked ? 'text-emerald-600' : 'text-brand'}`} />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink/70">
            {unlocked ? 'Offer applied' : 'Shipping offer'}
          </span>
        </div>

        <p className="mt-2 flex items-center gap-2 text-[24px] font-extrabold leading-none text-ink">
          {unlocked && <i className="fa-solid fa-circle-check text-[20px] text-emerald-600" />}
          FREE SHIPPING
        </p>
        <p className="mt-1.5 text-[13px] font-semibold text-gray-600">{message}</p>

        {total > 0 && !unlocked && (
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
