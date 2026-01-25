import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetUserProfileQuery, useGetRazorpayKeyQuery, useCreateOrderMutation } from '../store/api/userApi';
import { useCartData } from '../hooks/useCartSync';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items: cartItems, totalAmount } = useSelector((state) => state.cart);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  const [userProfile, setUserProfile] = useState(null);
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // API Hooks
  const { data: userProfileData, isLoading: profileLoading, refetch: refetchProfile } = useGetUserProfileQuery();
  const { data: razorpayKeyData } = useGetRazorpayKeyQuery();
  const [createOrder, { isLoading: isOrdering }] = useCreateOrderMutation();
  const { refetch: refetchCart } = useCartData();

  const fetchUserProfile = async () => {
    try {
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      const email = user?.email || user?.userEmail || localUser?.email || localStorage.getItem('userEmail');
      
      if (!email) {
        alert('User email not found. Please login again.');
        return;
      }
      
      const result = await refetchProfile();
      const profileData = result.data?.data || result.data;
      setUserProfile(profileData);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setIsLoading(false);
    }
  };

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
      alert('Please login to access checkout');
      navigate('/');
      return;
    }
    
    // Fetch cart data when checkout page loads
    refetchCart();
    
    if (cartItems.length === 0) {
      navigate('/products');
      return;
    }
    
    if (userProfileData?.data) {
      setUserProfile(userProfileData?.data);
      setIsLoading(false);
    } else if (!profileLoading) {
      fetchUserProfile();
    }
  }, [isAuthenticated, cartItems, navigate, userProfileData, profileLoading, refetchCart]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!address.trim() || !pincode.trim()) {
      alert('Please enter your delivery address and pincode.');
      return;
    }

    try {
      // Get Razorpay key from API response
      const razorpayKey = razorpayKeyData?.data || 'rzp_test_RxTeOoN8KmHMGG';
      
      const orderData = {
        amount: totalAmount,
        currency: 'INR',
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
        }))
      };
      
      const orderResult = await createOrder(orderData).unwrap();
      console.log('Order Result:', orderResult);
      
      const res = await loadRazorpay();
      
      if (!res) {
        alert('Razorpay SDK failed to load. Please check your connection.');
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
        handler: function (response) {
          console.log('Payment Success:', response);
          alert(`Payment successful! Payment ID: ${response.razorpay_payment_id}`);
          navigate('/orders');
        },
        prefill: {
          name: userProfile?.userName || userProfile?.name || '',
          email: userProfile?.userEmail || userProfile?.email || '',
          contact: userProfile?.userMobileNumber || userProfile?.mobile || ''
        },
        notes: {
          address: address,
          pincode: pincode
        },
        theme: {
          color: '#2E443C'
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal closed');
          }
        }
      };

      console.log('Razorpay Options:', options);
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      
    } catch (error) {
      console.error('Payment initialization failed:', error);
      alert('Failed to initialize payment. Please try again.');
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
            <div className="bg-[#1c2b25] rounded-[2rem] p-6 lg:p-8 shadow-2xl border border-white/5">
              <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
                <h2 className="text-xl font-serif text-white">Order Summary</h2>
                <span className="text-xs bg-[#F5DEB3]/10 text-[#F5DEB3] px-3 py-1 rounded-full border border-[#F5DEB3]/20">
                  {cartItems.length} Items
                </span>
              </div>
              
              {/* Cart Items List */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar mb-6">
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

              {/* Totals */}
              <div className="space-y-3 pt-4 border-t border-white/10 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>₹{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span className="text-[#F5DEB3]">Free</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-white pt-4 border-t border-white/10 mt-2">
                  <span>Total To Pay</span>
                  <span>₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Desktop Pay Button */}
              <button 
                onClick={handlePayment}
                disabled={isOrdering || !address || !pincode}
                className="hidden lg:block w-full mt-8 py-4 bg-[#F5DEB3] text-[#2e443c] rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isOrdering ? 'Processing...' : `Pay ₹${totalAmount.toLocaleString()}`}
              </button>

              <div className="mt-6 flex justify-center gap-4 opacity-50">
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
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House No, Building, Street, Area..."
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#F5DEB3] focus:ring-1 focus:ring-[#F5DEB3] transition-all resize-none h-24"
                  />
                </div>
                
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Pincode <span className="text-red-400">*</span></label>
                  <input 
                    type="tel" 
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    maxLength={6}
                    placeholder="e.g. 110001"
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#F5DEB3] focus:ring-1 focus:ring-[#F5DEB3] transition-all tracking-widest"
                  />
                </div>
              </div>
            </div>
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
                <span className="text-xl font-serif text-white">₹{totalAmount.toLocaleString()}</span>
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