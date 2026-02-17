import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { useGetUserProfileQuery, useGetRazorpayKeyQuery, useCreateOrderMutation, useApplyCouponMutation } from '../store/api/userApi';
import { clearCart } from '../store/slices/cartSlice';
import { useUI } from '../hooks/useRedux';
import CouponInput from '../component/CouponInput';
import { ComponentLoader } from '../component/layout/LoadingSpinner';

// Lazy load heavy components
const CouponList = lazy(() => import('../component/CouponList'));

const CheckoutPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification, openLoginModal } = useUI();
  const { items: cartItems } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  const [userProfile, setUserProfile] = useState(null);
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [paymentError, setPaymentError] = useState(null);
  const [showRetry, setShowRetry] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    address: '',
    pincode: ''
  });
  const [pricingDetails, setPricingDetails] = useState({
    subtotal: 0,
    gst: 0,
    shipping: 0,
    discount: 0,
    grandTotal: 0
  });

  // API Hooks
  const { data: userProfileData, isLoading: profileLoading, refetch: refetchProfile } = useGetUserProfileQuery();
  const { data: razorpayKeyData } = useGetRazorpayKeyQuery();
  const [createOrder, { isLoading: isOrdering }] = useCreateOrderMutation();
  const [applyCouponMutation] = useApplyCouponMutation();

  useEffect(() => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    const userToken = getCookie('userAccessToken');
    const hasLocalUser = localStorage.getItem('user');
    const isLoggedIn = isAuthenticated || userToken || hasLocalUser;
    
    if (!isLoggedIn) {
      showNotification('Please login to access checkout', 'error');
      openLoginModal();
      navigate('/');
      return;
    }
    
    if (cartItems.length === 0) {
      navigate('/products');
      return;
    }
    
    // Handle user profile data
    if (userProfileData?.data) {
      console.log('Setting user profile from API:', userProfileData.data);
      setUserProfile(userProfileData?.data?.data);
      setIsLoading(false);
    } else if (!profileLoading) {
      // Only fetch if we don't have profile data yet
      console.log('Fetching user profile...');
      refetchProfile();
    }
  }, [isAuthenticated, cartItems.length, navigate, userProfileData, profileLoading, refetchProfile, showNotification, openLoginModal]);

  // Fetch initial pricing details on page load
  useEffect(() => {
    const fetchInitialPricing = async () => {
      if (cartItems.length > 0) {
        try {
          // Call apply coupon API without coupon code to get pricing details
          const result = await applyCouponMutation(null).unwrap();
          if (result.success && result.data?.summary) {
            setPricingDetails({
              subtotal: result.data.summary.subtotal || 0,
              gst: result.data.summary.gst || 0,
              shipping: result.data.summary.shipping || 0,
              discount: result.data.summary.discount || 0,
              grandTotal: result.data.summary.grandTotal || 0
            });
          }
        } catch (error) {
          console.error('Failed to fetch initial pricing:', error);
          showNotification('Failed to load pricing. Please refresh the page.', 'error');
        }
      }
    };

    fetchInitialPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fill address and pincode from user profile
  useEffect(() => {
    if (userProfile) {
      if (userProfile.userAddress && !address) {
        setAddress(userProfile.userAddress);
      }
      if (userProfile.userPinCode && !pincode) {
        setPincode(userProfile.userPinCode);
      }
    }
  }, [userProfile]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCouponApplied = async (couponData) => {
    try {
      const result = await applyCouponMutation(couponData.code).unwrap();
      if (result.success && result.data?.summary) {
        setAppliedCoupon(couponData.code);
        setDiscount(result.data.summary.discount || 0);
        setPricingDetails({
          subtotal: result.data.summary.subtotal || 0,
          gst: result.data.summary.gst || 0,
          shipping: result.data.summary.shipping || 0,
          discount: result.data.summary.discount || 0,
          grandTotal: result.data.summary.grandTotal || 0
        });
        showNotification('Coupon applied successfully!', 'success');
      }
    } catch (error) {
      console.error('Failed to apply coupon:', error);
      const errorMessage = error.data?.message || 'Failed to apply coupon';
      showNotification(errorMessage, 'error');
    }
  };

  const handleCouponRemoved = async () => {
    try {
      const result = await applyCouponMutation(null).unwrap();
      if (result.success && result.data?.summary) {
        setAppliedCoupon(null);
        setDiscount(0);
        setPricingDetails({
          subtotal: result.data.summary.subtotal || 0,
          gst: result.data.summary.gst || 0,
          shipping: result.data.summary.shipping || 0,
          discount: result.data.summary.discount || 0,
          grandTotal: result.data.summary.grandTotal || 0
        });
        showNotification('Coupon removed', 'success');
      }
    } catch (error) {
      console.error('Failed to remove coupon:', error);
      showNotification('Failed to remove coupon. Please refresh the page.', 'error');
    }
  };

  const finalTotal = pricingDetails.grandTotal;

  const validateForm = () => {
    const errors = { address: '', pincode: '' };
    let isValid = true;
    
    if (!address.trim()) {
      errors.address = 'Address is required';
      isValid = false;
    } else if (address.trim().length < 10) {
      errors.address = 'Address must be at least 10 characters';
      isValid = false;
    } else if (address.trim().length > 200) {
      errors.address = 'Address must not exceed 200 characters';
      isValid = false;
    }
    
    if (!pincode.trim()) {
      errors.pincode = 'Pincode is required';
      isValid = false;
    } else if (!/^\d{6}$/.test(pincode)) {
      errors.pincode = 'Pincode must be exactly 6 digits';
      isValid = false;
    } else {
      const pincodeNum = parseInt(pincode);
      if (pincodeNum < 100000 || pincodeNum > 999999) {
        errors.pincode = 'Please enter a valid Indian pincode';
        isValid = false;
      }
    }
    
    setValidationErrors(errors);
    return isValid;
  };

  const handlePayment = async () => {
    if (!validateForm()) {
      showNotification('Please fix the errors in the form before proceeding.', 'error');
      return;
    }

    setPaymentError(null);
    setShowRetry(false);

    try {
      const razorpayKey = razorpayKeyData?.data || 'rzp_test_RxTeOoN8KmHMGG';
      
      const orderData = {
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
        }))
      };
      
      const orderResult = await createOrder(orderData).unwrap();
      const res = await loadRazorpay();
      
      if (!res) {
        setPaymentError('Razorpay SDK failed to load. Please check your connection and try again.');
        setShowRetry(true);
        return;
      }

      const options = {
        key: razorpayKey,
        amount: orderResult.data?.amount || orderResult.amount,
        currency: orderResult.data?.currency || orderResult.currency || 'INR',
        name: 'Urban Nook',
        description: 'Purchase from Urban Nook',
        image: '/assets/logo.jpeg',
        order_id: orderResult.data?.razorpayOrderId || orderResult.razorpayOrderId || orderResult.id,
        handler: async function (response) {
          try {
            const orderId = response.razorpay_order_id;
            showNotification(`Payment successful! Order ID: ${orderId}`, 'success');
            dispatch(clearCart());
            setTimeout(() => { navigate('/orders'); }, 2000);
          } catch (verifyError) {
            console.error('Payment verification error:', verifyError);
            setPaymentError('Payment verification failed. Please contact support if amount was debited.');
            setShowRetry(false);
          }
        },
        prefill: {
          name: userProfile?.userName || userProfile?.name || '',
          email: userProfile?.userEmail || userProfile?.email || '',
          contact: userProfile?.userMobileNumber || userProfile?.mobile || ''
        },
        notes: { address: address, pincode: pincode },
        theme: { color: '#2E443C' },
        modal: {
          ondismiss: function() {
            setPaymentError('Payment was cancelled. Your cart has been preserved. You can retry when ready.');
            setShowRetry(true);
          },
          escape: false,
          confirm_close: true
        }
      };

      const paymentObject = new window.Razorpay(options);
      
      paymentObject.on('payment.failed', function (response) {
        const errorCode = response.error.code;
        const errorDescription = response.error.description;
        let userMessage = errorDescription || 'Payment failed. Please try again.';
        
        if (errorCode === 'BAD_REQUEST_ERROR') userMessage = 'Payment failed due to invalid request. Please try again.';
        else if (errorCode === 'GATEWAY_ERROR') userMessage = 'Payment gateway error. Please try again or use a different payment method.';
        else if (errorCode === 'SERVER_ERROR') userMessage = 'Payment server error. Please try again later.';
        
        setPaymentError(userMessage);
        setShowRetry(true);
      });
      
      paymentObject.open();
      
    } catch (error) {
      console.error('Payment initialization failed:', error);
      const errorMessage = error.data?.message || error.message || 'Failed to initialize payment. Please try again.';
      setPaymentError(errorMessage);
      setShowRetry(true);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#2e443c]">
        <div className="w-12 h-12 border-2 border-[#F5DEB3] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#2e443c] min-h-screen font-sans text-[#e8e6e1] selection:bg-[#F5DEB3] selection:text-[#2e443c] pb-24 lg:pb-0">
      
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#3a554a] to-[#2e443c] pointer-events-none opacity-50"></div>

      <main className="max-w-[1200px] mx-auto pt-24 lg:pt-36 px-4 lg:px-8 relative z-10">
        
        {/* Title Section */}
        <div className="mb-6 lg:mb-8 text-center lg:text-left">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#F5DEB3]/60 font-bold">Secure Checkout</span>
          <h1 className="text-3xl lg:text-5xl font-serif text-white mt-2">Finalize Your Order</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">
          
          {/* --- RIGHT: Order Summary (MOVED TO TOP FOR MOBILE) --- */}
          <div className="lg:col-span-5 lg:sticky lg:top-32 order-1 lg:order-2">
            <div className="bg-[#1c2b25] rounded-[2rem] p-6 lg:p-8 shadow-2xl border border-white/5 flex flex-col gap-6">
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h2 className="text-xl font-serif text-white">Order Summary</h2>
                <span className="text-xs bg-[#F5DEB3]/10 text-[#F5DEB3] px-3 py-1 rounded-full border border-[#F5DEB3]/20">
                  {cartItems.length} Items
                </span>
              </div>
              
              {/* Cart Items List */}
              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center bg-black/10 p-3 rounded-xl border border-white/5">
                    <div className="w-14 h-14 bg-[#e8e6e1] rounded-lg flex items-center justify-center p-1 shrink-0">
                      <img 
                        src={item.image || '/placeholder.jpg'} 
                        alt={item.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-[#F5DEB3] truncate">{item.name}</h3>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                        <p className="font-mono text-sm">₹{(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* --- HIGH VISIBILITY COUPON SECTION --- */}
              {/* Wrapped in a glowing gradient border to instantly catch the user's eye */}
              <div className="bg-gradient-to-br from-[#F5DEB3]/20 via-[#F5DEB3]/5 to-transparent p-[1px] rounded-2xl shadow-[0_0_20px_rgba(245,222,179,0.05)]">
                 <div className="bg-[#1c2b25] rounded-2xl p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <i className="fa-solid fa-tags text-[#F5DEB3]"></i>
                        <h3 className="font-serif text-[#F5DEB3] text-sm tracking-wide">Promotions & Offers</h3>
                    </div>
                    
                    <CouponInput 
                      appliedCoupon={appliedCoupon}
                      discount={discount}
                      onCouponApplied={handleCouponApplied}
                      onCouponRemoved={handleCouponRemoved}
                    />

                    {/* Scrollable Coupon List inside the box */}
                    {!appliedCoupon && (
                      <div className="mt-4 pt-4 border-t border-white/5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                          <Suspense fallback={<ComponentLoader type="card" />}>
                            <CouponList onCouponApplied={handleCouponApplied} />
                          </Suspense>
                      </div>
                    )}
                 </div>
              </div>

              {/* Totals */}
              <div className="space-y-3 pt-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>₹{pricingDetails.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>GST (18%)</span>
                  <span>₹{pricingDetails.gst.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span>₹{pricingDetails.shipping.toLocaleString()}</span>
                </div>
                {appliedCoupon && pricingDetails.discount > 0 && (
                  <div className="flex justify-between text-green-400 font-medium">
                    <span>Discount ({appliedCoupon})</span>
                    <span>-₹{pricingDetails.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-white pt-4 border-t border-white/10 mt-2">
                  <span>Total To Pay</span>
                  <span className="text-[#F5DEB3]">₹{finalTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Desktop Pay Button */}
              <button 
                onClick={handlePayment}
                disabled={isOrdering || !address || !pincode}
                className="hidden lg:block w-full mt-2 py-4 bg-[#F5DEB3] text-[#2e443c] rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isOrdering ? 'Processing...' : `Pay ₹${finalTotal.toLocaleString()}`}
              </button>

              <div className="mt-2 flex justify-center gap-4 opacity-50">
                 <i className="fa-brands fa-cc-visa text-2xl"></i>
                 <i className="fa-brands fa-cc-mastercard text-2xl"></i>
                 <i className="fa-brands fa-google-pay text-2xl"></i>
                 <i className="fa-solid fa-building-columns text-2xl"></i>
              </div>
            </div>
          </div>

          {/* --- LEFT: Shipping Form (MOVED BELOW FOR MOBILE) --- */}
          <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
            
            {/* Section 1: Contact Details */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-serif text-[#F5DEB3] mb-4 flex items-center gap-2">
                <i className="fa-regular fa-user text-sm"></i> Contact Info
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Name</span>
                  {userProfile?.userName || userProfile?.name || 'N/A'}
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Email</span>
                  {userProfile?.userEmail || userProfile?.email || 'N/A'}
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5 md:col-span-2">
                  <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">Phone</span>
                  {userProfile?.mobileNumber || userProfile?.mobile || 'N/A'}
                </div>
              </div>
            </div>

            {/* Section 2: Delivery Address */}
            <div className={`bg-white/5 backdrop-blur-md rounded-2xl p-6 border transition-all ${!address ? 'border-[#F5DEB3]/50 shadow-[0_0_20px_rgba(245,222,179,0.1)]' : 'border-white/10'}`}>
              <h2 className="text-lg font-serif text-[#F5DEB3] mb-4 flex items-center gap-2">
                <i className="fa-solid fa-truck-fast text-sm"></i> Shipping Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Street Address <span className="text-red-400">*</span></label>
                  <textarea 
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (validationErrors.address) setValidationErrors(prev => ({ ...prev, address: '' }));
                    }}
                    placeholder="House No, Building, Street, Area..."
                    className={`w-full bg-black/20 border rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-all resize-none h-24 ${
                      validationErrors.address 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : 'border-white/10 focus:border-[#F5DEB3] focus:ring-[#F5DEB3]'
                    }`}
                  />
                  {validationErrors.address && (
                    <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation"></i>
                      {validationErrors.address}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Pincode <span className="text-red-400">*</span></label>
                  <input 
                    type="tel" 
                    value={pincode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ''); 
                      setPincode(value);
                      if (validationErrors.pincode) setValidationErrors(prev => ({ ...prev, pincode: '' }));
                    }}
                    maxLength={6}
                    placeholder="e.g. 110001"
                    className={`w-full bg-black/20 border rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-all tracking-widest ${
                      validationErrors.pincode 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : 'border-white/10 focus:border-[#F5DEB3] focus:ring-[#F5DEB3]'
                    }`}
                  />
                  {validationErrors.pincode && (
                    <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation"></i>
                      {validationErrors.pincode}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Error Display */}
            {paymentError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 backdrop-blur-md rounded-2xl p-6 border border-red-500/30"
              >
                <div className="flex items-start gap-3">
                  <i className="fa-solid fa-circle-exclamation text-red-400 text-xl mt-1"></i>
                  <div className="flex-1">
                    <h3 className="text-lg font-serif text-red-400 mb-2">Payment Failed</h3>
                    <p className="text-sm text-gray-300 mb-4">{paymentError}</p>
                    {showRetry && (
                      <button
                        onClick={handlePayment}
                        disabled={isOrdering}
                        className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <i className="fa-solid fa-rotate-right"></i>
                        Retry Payment
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setPaymentError(null);
                      setShowRetry(false);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <i className="fa-solid fa-xmark text-xl"></i>
                  </button>
                </div>
              </motion.div>
            )}

          </div>

        </div>
      </main>

      {/* --- MOBILE STICKY BOTTOM BAR --- */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-[#1c2b25]/95 backdrop-blur-xl border-t border-[#F5DEB3]/20 p-4 px-6 z-50 lg:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      >
         <div className="flex items-center gap-4">
            <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Total</span>
                <span className="text-xl font-serif text-white">₹{finalTotal.toLocaleString()}</span>
                {pricingDetails.discount > 0 && (
                  <span className="text-xs text-green-400">Saved ₹{pricingDetails.discount.toLocaleString()}</span>
                )}
            </div>
            <button 
                onClick={handlePayment}
                disabled={isOrdering}
                className={`flex-1 h-12 rounded-full font-bold uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                    !address || !pincode 
                    ? 'bg-gray-600 text-gray-300' 
                    : 'bg-[#F5DEB3] text-[#2e443c]'
                }`}
            >
                {isOrdering ? '...' : (!address || !pincode ? 'Enter Address' : 'Pay Now')}
                <i className="fa-solid fa-arrow-right"></i>
            </button>
         </div>
      </motion.div>

    </div>
  );
};

export default CheckoutPage;