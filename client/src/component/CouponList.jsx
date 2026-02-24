import { useState, useEffect } from 'react';
import { useGetAvailableCouponsQuery, useApplyCouponMutation } from '../store/api/userApi';
import { useUI } from '../hooks/useRedux';

const CouponList = ({ onCouponApplied }) => {
  const [expandedCoupon, setExpandedCoupon] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(null);
  
  const { data: couponsData, isLoading, error } = useGetAvailableCouponsQuery();
  const [applyCoupon] = useApplyCouponMutation();
  const { showNotification } = useUI();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
      showNotification(err?.data?.message,"error")
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
        <div className="w-10 h-10 border-2 border-[#a89068] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-6 border border-red-100 text-center">
        <i className="fa-solid fa-triangle-exclamation text-red-400 text-2xl mb-2"></i>
        <p className="text-red-500 text-sm">Failed to load coupons</p>
      </div>
    );
  }

  const coupons = couponsData?.data || [];

  if (coupons.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
        <i className="fa-solid fa-ticket text-[#a89068] text-3xl mb-3"></i>
        <p className="text-gray-500 text-sm">No coupons available at the moment</p>
        <p className="text-[#a89068] text-xs mt-2 uppercase tracking-wide font-bold">Check back later for exclusive offers!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {coupons.map((coupon) => {
        const isExpanded = expandedCoupon === coupon.couponCodeId;
        const isApplying = applyingCoupon === coupon.name;
        
        return (
          <div
            key={coupon.couponCodeId}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:border-[#a89068]/50 shadow-sm"
          >
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleCoupon(coupon.couponCodeId)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-serif font-bold text-[#2e443c] text-base">
                        {coupon.name}
                      </span>
                      {coupon.discountType === 'PERCENTAGE' && (
                        <span className="bg-[#2e443c]/10 text-[#2e443c] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#2e443c]/20 uppercase tracking-wide">
                          {coupon.discountValue}% OFF
                        </span>
                      )}
                      {coupon.discountType === 'FIXED' && (
                        <span className="bg-[#a89068]/10 text-[#a89068] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#a89068]/20 uppercase tracking-wide">
                          ₹{coupon.discountValue} OFF
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {coupon.description || 'Get discount on your order'}
                    </p>
                    
                    {coupon.minCartValue > 0 && (
                      <p className="text-[10px] text-[#a89068] font-bold mt-1 uppercase tracking-wider">
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
                    className="px-4 py-2 bg-[#a89068] text-white rounded-lg font-bold uppercase tracking-wider text-[10px] hover:bg-[#2e443c] transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-md"
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
                <div className="px-4 pb-4 pt-4 border-t border-gray-100 bg-[#f5f7f8]">
                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex justify-between border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                      <span className="uppercase tracking-wider font-bold text-[9px]">Discount Type</span>
                      <span className="text-[#2e443c] font-medium capitalize">{coupon.discountType.toLowerCase()}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                      <span className="uppercase tracking-wider font-bold text-[9px]">Discount Value</span>
                      <span className="text-[#2e443c] font-medium">
                        {coupon.discountType === 'PERCENTAGE' 
                          ? `${coupon.discountValue}%` 
                          : `₹${coupon.discountValue}`}
                      </span>
                    </div>
                    {coupon.maxDiscount > 0 && coupon.discountType === 'PERCENTAGE' && (
                      <div className="flex justify-between border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                        <span className="uppercase tracking-wider font-bold text-[9px]">Max Discount</span>
                        <span className="text-[#2e443c] font-medium">₹{coupon.maxDiscount.toLocaleString()}</span>
                      </div>
                    )}
                    {coupon.minCartValue > 0 && (
                      <div className="flex justify-between border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                        <span className="uppercase tracking-wider font-bold text-[9px]">Min Cart Value</span>
                        <span className="text-[#2e443c] font-medium">₹{coupon.minCartValue.toLocaleString()}</span>
                      </div>
                    )}
                    {coupon.usageLimit > 0 && (
                      <div className="flex justify-between border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                        <span className="uppercase tracking-wider font-bold text-[9px]">Usage Limit</span>
                        <span className="text-[#2e443c] font-medium">{coupon.usageLimit} times</span>
                      </div>
                    )}
                    {coupon.expiryDate && (
                      <div className="flex justify-between border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                        <span className="uppercase tracking-wider font-bold text-[9px]">Valid Until</span>
                        <span className="text-[#2e443c] font-medium">
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