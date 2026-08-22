import { useState } from 'react';
import { useApplyCouponMutation, useGetAvailableCouponsQuery, useLookupCouponMutation } from '../store/api/userApi';
import { useUI, useAuth } from '../hooks/useRedux';
import { calcLocalDiscount } from '../utils/couponDiscount';

const CouponInput = ({ appliedCoupon, discount, onCouponApplied, onCouponRemoved, isGuest, cartTotal }) => {
  const [couponCode, setCouponCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [applyCoupon, { isLoading }] = useApplyCouponMutation();
  const { showNotification } = useUI();
  const { user } = useAuth();

  // For guests: RTK Query already fetched this for the coupon modal — reuses the cache, no extra request
  const { data: availableCoupons } = useGetAvailableCouponsQuery(undefined, { skip: !isGuest });
  const [lookupCoupon, { isLoading: isLookingUp }] = useLookupCouponMutation();

  // Takes an optional code so the Independence Day banner can apply through
  // this exact path rather than duplicating any of it. onClick hands this a
  // MouseEvent, so only an explicit string counts as an override.
  const handleApplyCoupon = async (codeOverride) => {
    const cleanCode = (typeof codeOverride === 'string' ? codeOverride : couponCode)
      .trim()
      .toUpperCase();

    if (!cleanCode) {
      setError('Please enter a coupon code');
      return;
    }

    setError('');
    setSuccess('');

    if (isGuest) {
      // 1. Try the cached visible-coupons list first (no extra request)
      let coupon = (availableCoupons?.data || []).find(c => c.code === cleanCode);

      // 2. Not in the list? It may be a hidden/secret code — ask the server for its details.
      if (!coupon) {
        try {
          const res = await lookupCoupon(cleanCode).unwrap();
          coupon = (res?.data || [])[0];
        } catch {
          coupon = null;
        }
      }

      if (!coupon) {
        const msg = 'Invalid or inactive coupon code';
        setError(msg);
        showNotification(msg, 'error');
        setTimeout(() => setError(''), 3000);
        return;
      }

      // Guests are validated here rather than on the server, so the minimum has
      // to be checked explicitly. Without this the coupon "applies" for ₹0: the
      // panel claims success while the summary still offers Apply Coupon, which
      // reads as a broken screen. (Signed-in users get this from the server.)
      const subtotal = cartTotal || 0;
      const minCart = coupon.minCartValue || 0;
      if (subtotal < minCart) {
        const msg = `Add ₹${(minCart - subtotal).toLocaleString()} more to use ${cleanCode} (min order ₹${minCart.toLocaleString()})`;
        setError(msg);
        showNotification(msg, 'error');
        setTimeout(() => setError(''), 4000);
        return;
      }

      const discountAmount = calcLocalDiscount(coupon, subtotal);
      if (discountAmount <= 0) {
        const msg = 'This coupon gives no discount on your current cart';
        setError(msg);
        showNotification(msg, 'error');
        setTimeout(() => setError(''), 4000);
        return;
      }

      if (onCouponApplied) onCouponApplied({ code: cleanCode, discount: discountAmount });
      setSuccess(`Coupon applied! You save ₹${discountAmount.toLocaleString()}`);
      setCouponCode('');
      setTimeout(() => setSuccess(''), 3000);
      return;
    }

    try {
      const result = await applyCoupon({
        couponCode: cleanCode,
        email: user?.email
      }).unwrap();

      if (result?.success) {
        const discountAmount = result.data?.summary?.discount || 0;
        setSuccess(result.message || `Coupon applied! You saved ₹${discountAmount}`);
        setError('');
        setCouponCode('');
        if (onCouponApplied) {
          onCouponApplied({ code: cleanCode, discount: discountAmount, summary: result.data?.summary });
        }
        setTimeout(() => setSuccess(''), 2000);
      } else {
        const errorMessage = result.message || 'Failed to apply coupon';
        showNotification(errorMessage, "error");
        setError(errorMessage);
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      const errorMessage = err?.data?.message || err?.message || 'Invalid or expired coupon code';
      showNotification(errorMessage, "error");
      setError(errorMessage);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRemoveCoupon = async () => {
    setError('');
    setSuccess('');

    if (isGuest) {
      if (onCouponRemoved) onCouponRemoved();
      return;
    }

    try {
      const result = await applyCoupon({ couponCode: null, email: user?.email }).unwrap();
      if (result.success) {
        setSuccess('Coupon removed');
        if (onCouponRemoved) onCouponRemoved();
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(result.message || 'Failed to remove coupon');
      }
    } catch (err) {
      setError(err?.data?.message || 'Failed to remove coupon');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleApplyCoupon();
  };

  return (
    /* No dark-theme wrapper here: this sits on the white checkout card, where
       bg-white/5 and border-white/10 render as nothing at all. */
    <div className="mt-3">

      {!appliedCoupon ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyPress}
              placeholder="Enter coupon code..."
              disabled={isLoading || isLookingUp}
              className="flex-1 bg-white border border-[#F5DEB3] rounded-xl px-4 py-3 text-[#2e443c]  focus:outline-none focus:border-[#F5DEB3] focus:ring-1 focus:ring-[#F5DEB3] transition-all uppercase tracking-wider text-sm disabled:opacity-50"
            />
            <button
              onClick={handleApplyCoupon}
              disabled={isLoading || isLookingUp || !couponCode.trim()}
              className="px-6 py-3 bg-[#a89068] text-[#fff] rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#a89068] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(isLoading || isLookingUp) ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                'Apply'
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-gray-500 text-sm bg-white px-4 py-2 rounded-lg border border-green-400/20">
              <i className="fa-solid fa-circle-check"></i>
              <span>{success}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Applied state reads as a win: green, the saving as the biggest
              thing on the row, and a labelled Remove instead of a bare ✕.
              (`border-gray` here was not a real Tailwind class, so this box
              previously had no intentional border colour at all.) */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <i className="fa-solid fa-check text-emerald-600" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold uppercase tracking-wider text-gray-900">
                  {appliedCoupon}
                </p>
                <p className="text-[11px] font-medium text-gray-500">Coupon applied</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-base font-extrabold text-emerald-600">
                −₹{discount?.toLocaleString() || 0}
              </span>
              <button
                onClick={handleRemoveCoupon}
                disabled={isLoading}
                className="text-[11px] font-bold uppercase tracking-wider text-rose-500 transition-colors hover:text-rose-600 disabled:opacity-50"
                title="Remove coupon"
              >
                {isLoading ? <i className="fa-solid fa-spinner fa-spin" /> : 'Remove'}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg border border-red-400/20">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-400 text-sm bg-green-400/10 px-4 py-2 rounded-lg border border-green-400/20">
              <i className="fa-solid fa-circle-check"></i>
              <span>{success}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CouponInput;
