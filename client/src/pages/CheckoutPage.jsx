import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import NewHeader from '../component/layout/NewHeader';
import Footer from '../component/layout/Footer';
import { useGetUserProfileMutation, useGetRazorpayKeyQuery, useCreateOrderMutation } from '../store/api/userApi';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items: cartItems, totalAmount } = useSelector((state) => state.cart);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  const [userProfile, setUserProfile] = useState(null);
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [getUserProfile] = useGetUserProfileMutation();
  const { data: razorpayKeyData } = useGetRazorpayKeyQuery();
  const [createOrder] = useCreateOrderMutation();


  const fetchUserProfile = async () => {
    try {
      // Get email from multiple sources
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userEmail = user?.email || user?.userEmail || localUser?.email || localStorage.getItem('userEmail');
      
      console.log('Fetching profile for email:', userEmail);
      
      if (!userEmail) {
        alert('User email not found. Please login again.');
        return;
      }
      
      const result = await getUserProfile({ userEmail }).unwrap();
      const profileData = result.data || result;
      setUserProfile(profileData);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setIsLoading(false);
    }
  };

  // Effect to fetch user profile
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      await fetchUserProfile();
      if (!isMounted) return;
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  },);

  // Effect to check authentication and cart
  useEffect(() => {
    // Check multiple auth sources
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
      console.log('Not authenticated, redirecting to home');
      alert('Please login to access checkout');
      navigate('/');
      return;
    }
    if (cartItems.length === 0) {
      console.log('Cart is empty, redirecting to products');
      navigate('/products');
      return;
    }
  }, [isAuthenticated, cartItems, navigate]);

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
      alert('Please enter address and pincode before proceeding to payment.');
      return;
    }

    try {
      // Get Razorpay key
      const razorpayKey = razorpayKeyData?.razorPayApiKey || 'rzp_test_9WaeLLJnOFJHHX';
      
      // Create order - use correct productId from cart items
      console.log('Cart items for order:', cartItems);
      
      const orderData = {
        amount: totalAmount,
        currency: 'INR',
        items: cartItems.map(item => {
          console.log('Processing item:', item);
          return {
            productId: item.id // Use the id field which should be the productId like "UN-PROD-103"
          };
        })
      };
      
      console.log('Order data being sent:', orderData);
      
      const orderResult = await createOrder(orderData).unwrap();


      console.log(orderResult,"orderResultorderResultorderResultorderResult")
      
      // Load Razorpay SDK
      const res = await loadRazorpay();
      if (!res) {
        alert('Razorpay SDK failed to load. Please check your connection.');
        return;
      }

      const options = {
        key: razorpayKey,
        amount: orderResult.amount,
        currency: orderResult.currency,
        name: 'Urban Nook',
        description: 'Purchase from Urban Nook',
        image: '/assets/logo.webp',
        order_id: orderResult.id,
        handler: function (response) {
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
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      
    } catch (error) {
      console.error('Payment initialization failed:', error);
      alert('Failed to initialize payment. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F9F9F7]">
        <div className="animate-spin h-10 w-10 border-4 border-[#2E443C] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#F9F9F7] min-h-screen font-sans text-[#1a2822]">
      <NewHeader />
      <main className="max-w-[1200px] mx-auto pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-serif text-[#1a2822] mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="text-xl font-serif mb-6">Order Summary</h2>
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 pb-4 border-b border-gray-100">
                  <img 
                    src={item.image || '/placeholder.jpg'} 
                    alt={item.name}
                    className="w-16 h-16 object-contain bg-gray-50 rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{item.name}</h3>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-semibold">₹{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total</span>
                <span>₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="text-xl font-serif mb-6">Shipping Information</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input 
                  type="text" 
                  value={userProfile?.userName || userProfile?.name || ''} 
                  disabled 
                  className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input 
                  type="email" 
                  value={userProfile?.userEmail || userProfile?.email || ''} 
                  disabled 
                  className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mobile</label>
                <input 
                  type="tel" 
                  value={userProfile?.userMobileNumber || userProfile?.mobile || ''} 
                  disabled 
                  className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Address *</label>
                <textarea 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your complete address"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:border-[#2E443C] focus:outline-none"
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Pincode *</label>
                <input 
                  type="text" 
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Enter pincode"
                  className="w-full p-3 border border-gray-200 rounded-lg focus:border-[#2E443C] focus:outline-none"
                  required
                />
              </div>
            </div>

            <button 
              onClick={handlePayment}
              disabled={!address.trim() || !pincode.trim()}
              className="w-full py-4 bg-[#2E443C] text-white rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-[#1a2822] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Pay ₹{totalAmount.toLocaleString()} with Razorpay
            </button>
            
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">Secure payment powered by Razorpay</p>
              <p className="text-xs text-gray-500 mt-1">Supports UPI, Cards, Net Banking & Wallets</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CheckoutPage;