import React, { useState } from 'react';
import { useGetAvailableCouponsQuery, useApplyCouponMutation } from '../store/api/userApi';

const CouponList = ({ onCouponApplied }) => {
  const [expandedCoupon, setExpandedCoupon] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(null);
  
  const { data: couponsData, isLoading, error } = useGetAvailableCouponsQuery();
  const [applyCoupon] = useApplyCouponMutation();

  const handleApplyCoupon = async (couponCode) => {
    setApplyingCoupon(couponCode);

    try {
      const result = await applyCoupon(couponCode).unwrap();
      
      if (result.success && onCouponApplied) {
        onCouponApplied({
          code: couponCode,
          discount: result.data?.summary?.discount || 0,
          summary: result.data?.summary
        });
      }
    } catch (err) {
      console.error('Failed to apply coupon:', err);
    } finally {
      setApplyingCoupon(null);
    }
  };

  const toggleCoupon = (couponId) => {
    setExpandedCoupon(expandedCoupon === couponId ? null : couponId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 border-2 border-[#F5DEB3] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 rounded-xl p-6 border border-red-500/30 text-center">
        <i className="fa-solid fa-triangle-exclamation text-red-400 text-2xl mb-2"></i>
        <p className="text-red-400 text-sm">Failed to load coupons</p>
      </div>
    );
  }

  const coupons = couponsData?.data || [];

  if (coupons.length === 0) {
    return (
      <div className="bg-white/5 rounded-xl p-8 border border-white/10 text-center">
        <i className="fa-solid fa-ticket text-gray-500 text-3xl mb-3"></i>
        <p className="text-gray-400 text-sm">No coupons available at the moment</p>
        <p className="text-gray-500 text-xs mt-2">Check back later for exclusive offers!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {coupons.map((coupon) => {
        const isExpanded = expandedCoupon === coupon._id;
        const isApplying = applyingCoupon === coupon.name;
        
        return (
          <div
            key={coupon._id}
            className="bg-black/20 rounded-xl border border-white/10 overflow-hidden transition-all hover:border-[#F5DEB3]/30"
          >
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleCoupon(coupon._id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-[#F5DEB3] text-sm uppercase tracking-wider">
                        {coupon.name}
                      </span>
                      {coupon.discountType === 'PERCENTAGE' && (
                        <span className="bg-green-400/20 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-400/30">
                          {coupon.discountValue}% OFF
                        </span>
                      )}
                      {coupon.discountType === 'FIXED' && (
                        <span className="bg-blue-400/20 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-400/30">
                          ₹{coupon.discountValue} OFF
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {coupon.description || 'Get discount on your order'}
                    </p>
                    
                    {coupon.minCartValue > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Min. cart value: ₹{coupon.minCartValue.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyCoupon(coupon.name);
                    }}
                    disabled={isApplying}
                    className="px-4 py-2 bg-[#F5DEB3] text-[#2e443c] rounded-lg font-bold uppercase tracking-wider text-xs hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {isApplying ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      'Apply'
                    )}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-white/10 bg-black/10">
                  <div className="space-y-2 text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Discount Type:</span>
                      <span className="text-white capitalize">{coupon.discountType.toLowerCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount Value:</span>
                      <span className="text-white">
                        {coupon.discountType === 'PERCENTAGE' 
                          ? `${coupon.discountValue}%` 
                          : `₹${coupon.discountValue}`}
                      </span>
                    </div>
                    {coupon.maxDiscount > 0 && coupon.discountType === 'PERCENTAGE' && (
                      <div className="flex justify-between">
                        <span>Max Discount:</span>
                        <span className="text-white">₹{coupon.maxDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    {coupon.minCartValue > 0 && (
                      <div className="flex justify-between">
                        <span>Min Cart Value:</span>
                        <span className="text-white">₹{coupon.minCartValue.toLocaleString()}</span>
                      </div>
                    )}
                    {coupon.usageLimit > 0 && (
                      <div className="flex justify-between">
                        <span>Usage Limit:</span>
                        <span className="text-white">{coupon.usageLimit} times</span>
                      </div>
                    )}
                    {coupon.expiryDate && (
                      <div className="flex justify-between">
                        <span>Valid Until:</span>
                        <span className="text-white">
                          {new Date(coupon.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};

export default CouponList;
