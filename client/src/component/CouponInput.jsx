import { useState } from 'react';
import { useApplyCouponMutation } from '../store/api/userApi';

const CouponInput = ({ appliedCoupon, discount, onCouponApplied, onCouponRemoved }) => {
  const [couponCode, setCouponCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [applyCoupon, { isLoading }] = useApplyCouponMutation();

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const result = await applyCoupon(couponCode.trim().toUpperCase()).unwrap();
      
      if (result.success) {
        const discountAmount = result.data?.summary?.discount || 0;
        const successMessage = result.message || `Coupon applied! You saved ₹${discountAmount}`;
        setSuccess(successMessage);
        setCouponCode('');
        
        // Notify parent component with full summary data
        if (onCouponApplied) {
          onCouponApplied({
            code: couponCode.trim().toUpperCase(),
            discount: discountAmount,
            summary: result.data?.summary
          });
        }
      } else {
        const errorMessage = result.message || 'Failed to apply coupon';
        setError(errorMessage);
      }
    } catch (err) {
      // Extract error message from backend response
      const errorMessage = err?.data?.message || err?.message || 'Invalid or expired coupon code';
      setError(errorMessage);
    }
  };

  const handleRemoveCoupon = async () => {
    setError('');
    setSuccess('');

    try {
      // Call applyCoupon with null to remove the coupon
      const result = await applyCoupon(null).unwrap();
      
      if (result.success) {
        setSuccess('Coupon removed');
        
        // Notify parent component
        if (onCouponRemoved) {
          onCouponRemoved();
        }
        
        // Clear success message after 2 seconds
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(result.message || 'Failed to remove coupon');
      }
    } catch (err) {
      setError(err?.data?.message || 'Failed to remove coupon');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleApplyCoupon();
    }
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
              disabled={isLoading}
              className="flex-1 bg-black/10 border border-white/10 rounded-xl px-4 py-3 text-white  focus:outline-none focus:border-[#F5DEB3] focus:ring-1 focus:ring-[#F5DEB3] transition-all uppercase tracking-wider text-sm disabled:opacity-50"
            />
            <button
              onClick={handleApplyCoupon}
              disabled={isLoading || !couponCode.trim()}
              className="px-6 py-3 bg-[#a89068] text-[#fff] rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
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
            <div className="flex items-center gap-2 text-green-400 text-sm bg-green-400/10 px-4 py-2 rounded-lg border border-green-400/20">
              <i className="fa-solid fa-circle-check"></i>
              <span>{success}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-green-400/10 px-4 py-3 rounded-xl border border-green-400/20">
            <div className="flex items-center gap-3">
              <i className="fa-solid fa-circle-check text-green-400"></i>
              <div>
                <p className="text-sm font-bold text-white uppercase tracking-wider">{appliedCoupon}</p>
                <p className="text-xs text-green-400">You saved ₹{discount?.toLocaleString() || 0}</p>
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
