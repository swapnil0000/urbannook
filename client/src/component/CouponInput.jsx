import { useState } from 'react';
import { useApplyCouponMutation, useGetAvailableCouponsQuery, useLookupCouponMutation } from '../store/api/userApi';
import { useUI, useAuth } from '../hooks/useRedux';

function calcLocalDiscount(coupon, subtotal) {
  if (!subtotal || subtotal < (coupon.minCartValue || 0)) return 0;
  if (coupon.discountType === 'PERCENTAGE') {
    let amt = Math.floor((subtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountCap) amt = Math.min(amt, coupon.maxDiscountCap);
    return Math.min(amt, subtotal);
  }
  return Math.min(coupon.discountValue || 0, subtotal);
}

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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    setError('');
    setSuccess('');

    if (isGuest) {
      const cleanCode = couponCode.trim().toUpperCase();
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

      const discountAmount = calcLocalDiscount(coupon, cartTotal || 0);
      if (onCouponApplied) onCouponApplied({ code: cleanCode, discount: discountAmount });
      setSuccess(`Coupon applied! You save ₹${discountAmount}`);
      setCouponCode('');
      setTimeout(() => setSuccess(''), 3000);
      return;
    }

    try {
      const result = await applyCoupon({
        couponCode: couponCode?.trim()?.toUpperCase(),
        email: user?.email
      }).unwrap();

      if (result?.success) {
        const discountAmount = result.data?.summary?.discount || 0;
        setSuccess(result.message || `Coupon applied! You saved ₹${discountAmount}`);
        setError('');
        setCouponCode('');
        if (onCouponApplied) {
          onCouponApplied({ code: couponCode.trim().toUpperCase(), discount: discountAmount, summary: result.data?.summary });
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
    <div className="bg-white/5 backdrop-blur-md rounded-2xl mt-3  border border-white/10">

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
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-circle-check text-[#a89068]"></i>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{appliedCoupon}</p>
                <p className="text-xs text-[#a89068]">You saved ₹{discount?.toLocaleString() || 0}</p>
              </div>
            </div>
            <button
              onClick={handleRemoveCoupon}
              disabled={isLoading}
              className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              title="Remove coupon"
            >
              {isLoading ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-times text-lg"></i>
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
