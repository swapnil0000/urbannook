import { useState } from 'react';
import { useGetAvailableCouponsQuery } from '../store/api/userApi';
import { useUI } from '../hooks/useRedux';
import { calcLocalDiscount } from '../utils/couponDiscount';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

// Ticket notches are cut out of the card with a mask, so they show the real page background.
const NOTCH = 'radial-gradient(circle 7px at 0 50%, #0000 97%, #000) left / 51% 100% no-repeat, radial-gradient(circle 8px at 100% 50%, #0000 97%, #000) right / 51% 100% no-repeat';
const ticketMask = { WebkitMask: NOTCH, mask: NOTCH };

/**
 * Coupons for the "How would you like to pay?" screen. Prepaid goes straight to Razorpay Magic, so this is
 * the only place to pick a coupon before paying. Nothing here applies by itself: a coupon is applied only
 * when the shopper taps Apply, and only coupons that work on this cart are listed.
 */
const CheckoutCouponTickets = ({ appliedCoupon, discount = 0, cartTotal = 0, isGuest, userId, items, onApplied, onRemove }) => {
  const { data, isLoading } = useGetAvailableCouponsQuery({ userId, items });
  const { showNotification } = useUI();
  const [applying, setApplying] = useState(null);

  // Same list the "Apply Coupon" sheet shows (every admin coupon available to this cart). One that the cart does not
  // qualify for yet stays visible but locked, with how much more to add — exactly like the sheet's CouponList.
  const coupons = (data?.data || [])
    .map((c) => {
      const shortfall = Math.max(0, (c.minCartValue || 0) - cartTotal);
      const savings = calcLocalDiscount(c, cartTotal);
      return { ...c, shortfall, savings, eligible: shortfall === 0 && savings > 0 };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.savings - a.savings || a.shortfall - b.shortfall);

  const apply = async (coupon) => {
    if (applying || appliedCoupon) return;
    // greyed-out coupon: tell the shopper why instead of applying it (or hiding it)
    if (!coupon.eligible) {
      showNotification(
        coupon.shortfall > 0
          ? `This order doesn't satisfy the coupon conditions — add ${inr(coupon.shortfall)} more to use ${coupon.code}`
          : "This order doesn't satisfy the coupon conditions",
        'error',
      );
      return;
    }
    setApplying(coupon.code);
    try {
      if (isGuest) {
        onApplied({ code: coupon.code, discount: coupon.savings, couponData: coupon });
        showNotification(`Coupon applied! You save ${inr(coupon.savings)}`, 'success');
      } else {
        // the server validates and prices it; onApplied stores the result on the cart
        await onApplied({ code: coupon.code });
      }
    } catch (err) {
      showNotification(err?.data?.message || 'Could not apply coupon', 'error');
    } finally {
      setApplying(null);
    }
  };

  if (appliedCoupon) {
    return (
      <div className="mt-4 flex items-center gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3" style={{ borderRadius: 12 }}>
        <i className="fa-solid fa-circle-check text-emerald-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[13px] font-bold tracking-wider text-ink">{appliedCoupon}</p>
          <p className="text-[12px] font-semibold text-emerald-700">{discount > 0 ? `You save ${inr(discount)}` : 'Coupon applied'}</p>
        </div>
        <button type="button" onClick={onRemove} className="text-[12px] font-bold text-rose-500 underline underline-offset-2">Remove</button>
      </div>
    );
  }

  if (isLoading || coupons.length === 0) return null;

  return (
    <div className="mt-5" aria-label="Offers and discounts">
      <h2 className="mb-2.5 text-[18px] font-semibold leading-none tracking-tight text-ink/80">Offers &amp; Discounts</h2>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 gl-hscroll">
        {coupons.map((c) => {
          const title = c.discountType === 'PERCENTAGE'
            ? `${c.discountValue}% off${c.maxDiscountCap ? ` up to ${inr(c.maxDiscountCap)}` : ''}`
            : `Flat ${inr(c.discountValue)} off`;
          const desc = !c.eligible
            ? (c.minCartValue > 0 ? `On orders above ${inr(c.minCartValue)}` : 'Not applicable to this order')
            : c.minCartValue > 0 ? `On orders above ${inr(c.minCartValue)} · Save ${inr(c.savings)} now` : `Save ${inr(c.savings)} on this order`;
          return (
            <button
              key={c.id || c.code}
              type="button"
              onClick={() => apply(c)}
              disabled={!!applying}
              style={{ ...ticketMask, background: 'linear-gradient(100deg,#fdf0b4 0%,#fbe68b 55%,#fceda0 100%)' }}
              className={`relative flex w-[82%] max-w-[330px] shrink-0 snap-start items-center gap-3 overflow-hidden px-5 py-3.5 text-left text-ink sm:w-[300px] ${c.eligible ? 'disabled:opacity-70' : 'opacity-60 grayscale'}`}
              aria-label={`${title}. Coupon code ${c.code}.${c.eligible ? ' Tap to apply' : " This order doesn't satisfy this coupon"}`}
            >
              {/* faint % watermark, like the reference */}
              <span className="pointer-events-none absolute -right-3 -top-4 select-none text-[84px] font-black leading-none text-white/35" aria-hidden="true">%</span>
              <svg viewBox="0 0 48 48" className="h-11 w-11 shrink-0" aria-hidden="true">
                <path d="M24 2l4.6 3.4 5.7-.6 2.2 5.3 5.3 2.2-.6 5.7L45 24l-3.4 4.6.6 5.7-5.3 2.2-2.2 5.3-5.7-.6L24 46l-4.6-3.4-5.7.6-2.2-5.3-5.3-2.2.6-5.7L3 24l3.4-4.6-.6-5.7 5.3-2.2 2.2-5.3 5.7.6L24 2z" fill="#f6d047" />
                <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none"><path d="M17 31L31 17" /></g>
                <circle cx="18" cy="18" r="2.6" fill="#fff" /><circle cx="30" cy="30" r="2.6" fill="#fff" />
              </svg>
              <span className="relative min-w-0 flex-1">
                <span className="block truncate text-[15.5px] font-bold leading-tight">{title}</span>
                <span className="mt-0.5 block truncate text-[12px] leading-tight text-ink/60">{desc}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[12px] font-semibold leading-tight">
                  {applying === c.code ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Applying…</> : c.eligible ? <>Use Coupon Code: {c.code}</> : <>Code: {c.code} · Add {inr(c.shortfall)} more</>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CheckoutCouponTickets;
