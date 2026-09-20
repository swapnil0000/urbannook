import { useState } from 'react';
import { useGetAvailableCouponsQuery, useApplyCouponMutation } from '../store/api/userApi';
import { useUI, useAuth } from '../hooks/useRedux';
import { calcLocalDiscount } from '../utils/couponDiscount';

const CouponList = ({ onCouponApplied, userId, isGuest, cartTotal }) => {
  const [applyingCode, setApplyingCode] = useState(null);

  const { data: couponsData, isLoading, error } = useGetAvailableCouponsQuery(userId);
  const [applyCoupon] = useApplyCouponMutation();
  const { showNotification } = useUI();
  const { user } = useAuth();

  const handleApply = async (coupon) => {
    setApplyingCode(coupon.code);
    try {
      if (isGuest) {
        // Guests are validated client-side, so the minimum has to be enforced
        // here. Without it calcLocalDiscount quietly returns 0 and the coupon
        // "applies" for ₹0 — the panel says applied while the summary still
        // shows Apply Coupon. (Signed-in users get this from the server.)
        const subtotal = cartTotal || 0;
        const minCart = coupon.minCartValue || 0;
        if (subtotal < minCart) {
          showNotification(
            `Add ₹${(minCart - subtotal).toLocaleString()} more to use ${coupon.code} (min order ₹${minCart.toLocaleString()})`,
            'error',
          );
          return;
        }

        const discount = calcLocalDiscount(coupon, subtotal);
        if (discount <= 0) {
          showNotification('This coupon gives no discount on your current cart', 'error');
          return;
        }

        if (onCouponApplied) onCouponApplied({ code: coupon.code, discount, couponData: coupon });
        return;
      }
      const result = await applyCoupon({ couponCode: coupon.code, email: user?.email }).unwrap();
      if (result.success && onCouponApplied) {
        onCouponApplied({ code: coupon.code, discount: result.data?.summary?.discount || 0, summary: result.data?.summary });
      }
    } catch (err) {
      showNotification(err?.data?.message || 'Could not apply coupon', 'error');
    } finally {
      setApplyingCode(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-10 h-10 border-2 border-ink border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400 font-medium">Finding your coupons…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
          <i className="fa-solid fa-triangle-exclamation text-red-400 text-lg" />
        </div>
        <p className="text-sm text-red-500 font-medium">Couldn't load coupons</p>
      </div>
    );
  }

  const coupons = couponsData?.data || [];

  if (coupons.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-ink/8 flex items-center justify-center">
          <i className="fa-solid fa-ticket text-ink/40 text-2xl" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-600">No offers right now</p>
          <p className="text-xs text-gray-400 mt-1">New coupons drop regularly — check back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        {coupons.length} offer{coupons.length !== 1 ? 's' : ''} available
      </p>

      {coupons.map((coupon) => {
        const isApplying = applyingCode === coupon.code;
        // What this coupon is actually worth on the cart as it stands, so the
        // button can never promise a saving the cart does not qualify for.
        // If the cart total is unknown, fail OPEN rather than disabling every
        // coupon — handleApply still blocks a ₹0 apply, and the server is the
        // authority for signed-in users either way.
        const knowsCart = typeof cartTotal === 'number' && cartTotal > 0;
        const shortfall = knowsCart ? Math.max(0, (coupon.minCartValue || 0) - cartTotal) : 0;
        const savings = knowsCart ? calcLocalDiscount(coupon, cartTotal) : coupon.discountValue || 0;
        const eligible = !knowsCart || (shortfall === 0 && savings > 0);

        const isPct = coupon.discountType === 'PERCENTAGE';
        const discountLabel = isPct
          ? `${coupon.discountValue}% OFF`
          : `₹${coupon.discountValue} OFF`;

        return (
          <div
            key={coupon.id}
            className="rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
            style={{ border: '1px solid rgba(46,68,60,0.12)' }}
          >
            {/* ── Header band ───────────────────────────────────── */}
            <div
              className="relative px-5 py-4 flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, #2e443c 0%, #3d5c52 60%, #4a6e62 100%)',
              }}
            >
              {/* Left: discount amount */}
              <div>
                <p className="text-3xl font-black text-white leading-none tracking-tight">
                  {isPct ? coupon.discountValue : `₹${coupon.discountValue}`}
                  <span className="text-base font-bold text-white/60 ml-1">
                    {isPct ? '%' : ''} OFF
                  </span>
                </p>
                {isPct && coupon.maxDiscountCap && (
                  <p className="text-[11px] text-white/50 mt-0.5 font-medium">
                    up to ₹{coupon.maxDiscountCap.toLocaleString()}
                  </p>
                )}
                {coupon.title && coupon.title !== coupon.code && (
                  <p className="text-xs text-white/70 mt-1 font-medium line-clamp-1">{coupon.title}</p>
                )}
              </div>

              {/* Right: type badge */}
              <div className="flex flex-col items-end gap-2">
                <span
                  className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                  style={{ background: '#a89068', color: '#fff' }}
                >
                  {isPct ? 'Percentage' : 'Flat'}
                </span>
                {/* Decorative circles */}
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  ))}
                </div>
              </div>

              {/* Top-right star accent */}
              <div className="absolute top-2 right-20 text-white/10 text-2xl select-none pointer-events-none">✦</div>
            </div>

            {/* ── Perforation divider ────────────────────────────── */}
            <div className="relative flex items-center bg-white">
              <div
                className="absolute -left-3 w-6 h-6 rounded-full"
                style={{ background: '#f3f4f6', border: '1px solid rgba(46,68,60,0.1)' }}
              />
              <div className="flex-1 mx-4 border-t-2 border-dashed" style={{ borderColor: 'rgba(46,68,60,0.15)' }} />
              <div
                className="absolute -right-3 w-6 h-6 rounded-full"
                style={{ background: '#f3f4f6', border: '1px solid rgba(46,68,60,0.1)' }}
              />
            </div>

            {/* ── Body ──────────────────────────────────────────── */}
            <div className="bg-white px-5 py-4 space-y-3">
              {/* Code chip */}
              <div
                className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                style={{ background: '#fdf8f3', border: '2px dashed rgba(168,144,104,0.4)' }}
              >
                <code className="font-mono font-black text-ink text-base tracking-widest">
                  {coupon.code}
                </code>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#a89068' }}>
                  Code
                </span>
              </div>

              {/* Description */}
              {coupon.description && (
                <p className="text-xs text-gray-500 leading-relaxed">{coupon.description}</p>
              )}

              {/* Constraint chips */}
              <div className="flex flex-wrap gap-2">
                {coupon.minCartValue > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
                    <i className="fa-solid fa-bag-shopping text-[8px]" />
                    Min. cart ₹{coupon.minCartValue.toLocaleString()}
                  </span>
                )}
                {!coupon.minCartValue && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                    <i className="fa-solid fa-infinity text-[8px]" />
                    No minimum order
                  </span>
                )}
              </div>

              {/* Apply button */}
              {!eligible && shortfall > 0 && (
                <p className="text-[11px] font-semibold text-amber-700">
                  Add ₹{shortfall.toLocaleString()} more to use this coupon
                </p>
              )}

              <button
                onClick={() => handleApply(coupon)}
                disabled={isApplying || !eligible}
                className="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: isApplying ? '#2e443c' : 'linear-gradient(135deg, #a89068 0%, #c4a87a 100%)',
                  color: '#fff',
                  boxShadow: isApplying ? 'none' : '0 4px 14px rgba(168,144,104,0.45)',
                }}
                onMouseEnter={(e) => {
                  if (!isApplying) e.currentTarget.style.background = 'linear-gradient(135deg, #2e443c 0%, #3d5c52 100%)';
                }}
                onMouseLeave={(e) => {
                  if (!isApplying) e.currentTarget.style.background = 'linear-gradient(135deg, #a89068 0%, #c4a87a 100%)';
                }}
              >
                {isApplying ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" />
                    Applying…
                  </>
                ) : !eligible ? (
                  <>
                    <i className="fa-solid fa-bag-shopping" />
                    Add ₹{shortfall.toLocaleString()} more
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-tag" />
                    Apply &amp; Save ₹{savings.toLocaleString()}
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CouponList;
