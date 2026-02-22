import { useState, useEffect, lazy, Suspense, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat, toLonLat } from "ol/proj";

import {
  useGetUserProfileQuery,
  useGetRazorpayKeyQuery,
  useCreateOrderMutation,
  useApplyCouponMutation,
} from "../store/api/userApi";
import { clearCart } from "../store/slices/cartSlice";
import { useUI } from "../hooks/useRedux";
import CouponInput from "../component/CouponInput";
import { ComponentLoader } from "../component/layout/LoadingSpinner";

const CouponList = lazy(() => import("../component/CouponList"));

const CheckoutPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification, openLoginModal } = useUI();
  const { items: cartItems } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [userProfile, setUserProfile] = useState(null);
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [paymentError, setPaymentError] = useState(null);
  const [showRetry, setShowRetry] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [mapSuggestions, setMapSuggestions] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const [preciseDetails, setPreciseDetails] = useState({
    landmark: "",
    flatNo: "",
  });
  const [savedAddress, setSavedAddress] = useState([]);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const mapElement = useRef();
  const mapRef = useRef();

  const [pricingDetails, setPricingDetails] = useState({
    subtotal: 0,
    gst: 0,
    shipping: 0,
    discount: 0,
    grandTotal: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceTimer = useRef(null);
  const mapDebounceTimer = useRef(null);

  const {
    data: userProfileData,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useGetUserProfileQuery();
  const { data: razorpayKeyData } = useGetRazorpayKeyQuery();
  const [createOrder, { isLoading: isOrdering }] = useCreateOrderMutation();
  const [applyCouponMutation] = useApplyCouponMutation();

  useEffect(() => {
    window.scrollTo(0, 0);
    handleSaveAdress();
  }, []);

  const handleOpenMap = () => {
    setShowMapModal(true);
    initializeMap("", "");
  };

  const handleResetAddress = () => {
    setAddress("");
    setPincode("");
    setPreciseDetails({ landmark: "", flatNo: "" });
    setMapSuggestions([]);
    setSearchQuery("");
    showNotification("Shipping details reset", "info");
  };

  const getUserCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (mapRef.current) {
            mapRef.current.getView().animate({
              center: fromLonLat([longitude, latitude]),
              duration: 1000,
              zoom: 17,
            });
          }
          fetchSuggestions(latitude, longitude);
          setIsLocating(false);
          setSearchResults([]);
        },
        () => {
          showNotification("Location access denied", "error");
          setIsLocating(false);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const handleSearchPlaces = (val) => {
    setSearchQuery(val);
    if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
    if (val.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceTimer.current = setTimeout(async () => {
      try {
        const res = await axios.post(
          `${apiBaseUrl}/user/address/search`,
          { userSearchInput: val },
          { withCredentials: true }
        );
        if (res.data.success) setSearchResults(res.data.data);
      } catch (err) {
        console.error("Search API error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 800);
  };

  const handleSelectSearchResult = (item) => {
    const lat = item.geometry.location.lat;
    const long = item.geometry.location.lng;
    if (mapRef.current) {
      mapRef.current.getView().animate({
        center: fromLonLat([long, lat]),
        duration: 800,
        zoom: 17,
      });
    }
    setSearchResults([]);
    setSearchQuery("");
    fetchSuggestions(lat, long);
  };

  const initializeMap = (lon, lat) => {
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.setTarget(null);
        mapRef.current = null;
      }

      if (mapElement.current) {
        mapRef.current = new Map({
          target: mapElement.current,
          layers: [new TileLayer({ source: new OSM() })],
          view: new View({
            center: fromLonLat([lon, lat]),
            zoom: 17,
          }),
        });

        mapRef.current.on("moveend", () => {
          if (mapDebounceTimer.current) clearTimeout(mapDebounceTimer.current);

          mapDebounceTimer.current = setTimeout(() => {
            const center = mapRef.current.getView().getCenter();
            const [lonArr, latArr] = toLonLat(center);
            fetchSuggestions(latArr, lonArr);
          }, 800);
        });

        setTimeout(() => mapRef.current.updateSize(), 100);
      }
    }, 150);
  };

  useEffect(() => {
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(";").shift();
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

    if (userProfileData?.data) {
      setUserProfile(userProfileData?.data?.data);
      setIsLoading(false);
    } else if (!profileLoading) {
      refetchProfile();
    }
  }, [isAuthenticated, cartItems.length, navigate, userProfileData, profileLoading, refetchProfile, showNotification, openLoginModal]);

  useEffect(() => {
    const fetchInitialPricing = async () => {
      if (cartItems.length > 0) {
        try {
          const result = await applyCouponMutation(null).unwrap();
          if (result.success && result.data?.summary) {
            setPricingDetails({
              subtotal: result.data.summary.subtotal || 0,
              gst: result.data.summary.gst || 0,
              shipping: result.data.summary.shipping || 0,
              discount: result.data.summary.discount || 0,
              grandTotal: result.data.summary.grandTotal || 0,
            });
          }
        } catch (error) {
          console.error("Failed to fetch initial pricing:", error);
          showNotification("Failed to load pricing. Please refresh the page.", "error");
        }
      }
    };
    fetchInitialPricing();
  }, []);

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
          grandTotal: result.data.summary.grandTotal || 0,
        });
        showNotification("Coupon applied successfully!", "success");
      }
    } catch (error) {
      const errorMessage = error.data?.message || "Failed to apply coupon";
      showNotification(errorMessage, "error");
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
          grandTotal: result.data.summary.grandTotal || 0,
        });
        showNotification("Coupon removed", "success");
      }
    } catch (error) {
      showNotification("Failed to remove coupon. Please refresh the page.", "error");
    }
  };

  const finalTotal = pricingDetails.grandTotal;

  const fetchSuggestions = async (la, ln) => {
    try {
      const res = await axios.post(
        `${apiBaseUrl}/user/address/suggestion`,
        { lat: la, long: ln },
        { withCredentials: true },
      );
      if (res.data.success) setMapSuggestions(res.data.data);
    } catch (err) {
      console.error("API Error:", err);
    }
  };

  const handleConfirmAddress = async (suggestion) => {
    const center = mapRef.current.getView().getCenter();
    const [lon, lat] = toLonLat(center);
    try {
      const res = await axios.post(
        `${apiBaseUrl}/user/address/create`,
        {
          lat: lat,
          long: lon,
          placeId: suggestion.placeId,
          formattedAddress: suggestion.formattedAddress,
          city: suggestion.city,
          state: suggestion.state,
          pinCode: suggestion.pinCode,
          landmark: preciseDetails.landmark,
          flatOrFloorNumber: preciseDetails.flatNo,
          addressType: "Home",
        },
        { withCredentials: true },
      );

      if (res.data.success) {
        setAddress(suggestion.formattedAddress);
        setPincode(suggestion.pinCode.toString());
        setShowMapModal(false);
        showNotification(res?.data?.message, "success");
        handleSaveAdress();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to save address";
      showNotification(errorMessage, "error");
    }
  };

  const handleSaveAdress = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/user/address/saved`, {
        withCredentials: true,
      });
      if (res.data.success) setSavedAddress(res.data.data);
    } catch (err) {
      console.error("API Error:", err);
    }
  };

  const selectSavedAddress = (addr) => {
    setAddress(addr.formattedAddress);
    setPincode(addr.pinCode.toString());
    setPreciseDetails({
        landmark: addr.landmark || "", 
        flatNo: addr.flatOrFloorNumber || ""
    });
    showNotification("Saved address selected", "success");
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!address.trim()) {
      showNotification("Please select a delivery address.", "error");
      return;
    }
    setPaymentError(null);
    try {
      const razorpayKey = razorpayKeyData?.data || "rzp_test_RxTeOoN8KmHMGG";
      const orderData = {
        items: cartItems.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
        })),
      };
      const orderResult = await createOrder(orderData).unwrap();
      const res = await loadRazorpay();
      if (!res) return;

      const options = {
        key: razorpayKey,
        amount: orderResult.data?.amount || orderResult.amount,
        currency: "INR",
        name: "Urban Nook",
        description: "Purchase from Urban Nook",
        image: "/assets/logo.jpeg",
        order_id:
          orderResult.data?.razorpayOrderId ||
          orderResult.razorpayOrderId ||
          orderResult.id,
        handler: async function (response) {
          try {
            const orderId = response.razorpay_order_id;
            showNotification(`Payment successful! Order ID: ${orderId}`, "success");
            dispatch(clearCart());
            setTimeout(() => { navigate("/orders"); }, 2000);
          } catch (verifyError) {
            setPaymentError("Payment verification failed. Please contact support if amount was debited.");
            setShowRetry(false);
          }
        },
        prefill: {
          name: userProfile?.userName || userProfile?.name || "",
          email: userProfile?.userEmail || userProfile?.email || "",
          contact: userProfile?.userMobileNumber || userProfile?.mobile || "",
        },
        notes: { address: address, pincode: pincode },
        theme: { color: "#2E443C" },
        modal: {
          ondismiss: function () {
            setPaymentError("Payment was cancelled. Your cart has been preserved. You can retry when ready.");
            setShowRetry(true);
          },
          escape: false,
          confirm_close: true,
        },
      };

      const paymentObject = new window.Razorpay(options);

      paymentObject.on("payment.failed", function (response) {
        const errorCode = response.error.code;
        const errorDescription = response.error.description;
        let userMessage = errorDescription || "Payment failed. Please try again.";

        if (errorCode === "BAD_REQUEST_ERROR") userMessage = "Payment failed due to invalid request. Please try again.";
        else if (errorCode === "GATEWAY_ERROR") userMessage = "Payment gateway error. Please try again or use a different payment method.";
        else if (errorCode === "SERVER_ERROR") userMessage = "Payment server error. Please try again later.";

        setPaymentError(userMessage);
        setShowRetry(true);
      });

      paymentObject.open();
    } catch (error) {
      const errorMessage = error.data?.message || error.message || "Failed to initialize payment. Please try again.";
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
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(245, 222, 179, 0.2); border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(245, 222, 179, 0.5); }
      `}</style>

      <div className="fixed top-0 left-0 w-full h-[400px] bg-gradient-to-b from-[#1a2822] to-transparent pointer-events-none opacity-80 z-0"></div>
      
      <main className="max-w-[1200px] mx-auto pt-24 lg:pt-36 px-4 lg:px-8 relative z-10">
        
        <div className="mb-8 lg:mb-12 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5DEB3]/10 border border-[#F5DEB3]/20 mb-3">
             <span className="w-1.5 h-1.5 rounded-full bg-[#F5DEB3] animate-pulse"></span>
             <span className="text-[9px] uppercase tracking-[0.25em] text-[#F5DEB3] font-bold">Secure Checkout</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-white">Complete your order.</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          <div className="lg:col-span-5 lg:sticky lg:top-32 order-1 lg:order-2 flex flex-col gap-6">
            
            <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5">
              <div className="flex justify-between items-center mb-5">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Your Items</h3>
                  <span className="text-xs bg-white/10 text-white px-2.5 py-1 rounded-md">{cartItems.length}</span>
              </div>
              
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 items-center bg-black/20 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="w-14 h-14 bg-[#e8e6e1] rounded-lg flex items-center justify-center p-1.5 shrink-0">
                      <img
                        src={item.image || "/placeholder.jpg"}
                        alt={item.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-white truncate mb-1">
                        {item.name}
                      </h3>
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                          Qty: {item.quantity}
                        </p>
                        <p className="font-mono text-sm text-[#F5DEB3]">
                          ₹{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative group">

               <div className="absolute -inset-[1px] bg-gradient-to-r from-[#F5DEB3]/50 to-[#F5DEB3]/10 rounded-[2rem] blur-[2px] opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>
               
               <div className="relative bg-[#15251e] border border-[#F5DEB3]/30 rounded-[2rem] p-6 md:p-7 shadow-2xl overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#F5DEB3]/10 blur-3xl rounded-full"></div>
                  
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-full bg-[#F5DEB3]/10 border border-[#F5DEB3]/20 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-ticket text-[#F5DEB3] text-xl"></i>
                    </div>
                    <div>
                      <h3 className="font-serif text-[#F5DEB3] text-xl tracking-wide leading-tight">Apply Promo Code</h3>
                      <p className="text-[10px] text-green-50/60 uppercase tracking-widest mt-1">Unlock exclusive discounts</p>
                    </div>
                  </div>
                  
                  <div className="relative z-10">
                    <CouponInput
                      appliedCoupon={appliedCoupon}
                      discount={discount}
                      onCouponApplied={handleCouponApplied}
                      onCouponRemoved={handleCouponRemoved}
                    />
                  </div>

                  {!appliedCoupon && (
                    <div className="mt-5 pt-5 border-t border-[#F5DEB3]/10 relative z-10">
                      <button
                        onClick={() => setShowCouponModal(true)}
                        className="w-full py-3 px-4 bg-[#F5DEB3]/10 hover:bg-[#F5DEB3]/20 border border-[#F5DEB3]/30 rounded-xl text-[#F5DEB3] font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                      >
                        <i className="fa-solid fa-tags"></i>
                        View All Available Coupons
                      </button>
                    </div>
                  )}
               </div>
            </div>

            <div className="bg-[#1c2b25] rounded-[2rem] p-6 md:p-8 md:mb-4 shadow-xl border border-white/5 relative z-10">
              <h3 className="font-serif text-white text-xl mb-5">Payment Summary</h3>
              
              <div className="space-y-4 text-sm">
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
                
                <AnimatePresence>
                  {appliedCoupon && pricingDetails.discount > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex justify-between text-emerald-400 font-medium bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20"
                    >
                      <span className="flex items-center gap-2">
                          <i className="fa-solid fa-circle-check text-xs"></i> 
                          Discount ({appliedCoupon})
                      </span>
                      <span>-₹{pricingDetails.discount.toLocaleString()}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="flex justify-between items-end pt-5 border-t border-white/10 mt-2">
                  <span className="text-xs uppercase tracking-widest text-gray-500 font-bold">Total To Pay</span>
                  <span className="text-3xl font-serif text-[#F5DEB3]">₹{finalTotal.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={isOrdering || !address}
                className="hidden lg:flex w-full mt-8 py-4 bg-[#F5DEB3] text-[#1c2b25] rounded-xl font-bold uppercase tracking-widest text-[11px] hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_20px_rgba(245,222,179,0.15)] items-center justify-center gap-3"
              >
                {isOrdering ? (
                   <><div className="w-4 h-4 border-2 border-[#1c2b25] border-t-transparent rounded-full animate-spin"></div> Processing...</>
                ) : (
                   <>Proceed to Pay <i className="fa-solid fa-lock"></i></>
                )}
              </button>

              <div className="mt-6 flex justify-center gap-4 opacity-40">
                 <i className="fa-brands fa-cc-visa text-2xl"></i>
                 <i className="fa-brands fa-cc-mastercard text-2xl"></i>
                 <i className="fa-brands fa-google-pay text-2xl"></i>
                 <i className="fa-solid fa-building-columns text-2xl"></i>
              </div>
            </div>

            

          </div>

          <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
            
            <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-6 md:p-8 border border-white/10" style={{
                  'margin-bottom': "1rem"
            }}>
              <h2 className="text-lg font-serif text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#F5DEB3]/20 text-[#F5DEB3] flex items-center justify-center text-xs">1</span> 
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-gray-500 font-bold ml-1">Full Name</label>
                  <div className="w-full bg-black/30 border border-white/5 rounded-xl p-4 text-white text-sm">
                      {userProfile?.userName || userProfile?.name || "N/A"}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-gray-500 font-bold ml-1">Phone Number</label>
                  <div className="w-full bg-black/30 border border-white/5 rounded-xl p-4 text-white text-sm">
                      {userProfile?.mobileNumber || userProfile?.mobile || "N/A"}
                  </div>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[9px] uppercase tracking-widest text-gray-500 font-bold ml-1">Email Address</label>
                  <div className="w-full bg-black/30 border border-white/5 rounded-xl p-4 text-white text-sm">
                      {userProfile?.userEmail || userProfile?.email || "N/A"}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`bg-white/5 backdrop-blur-md rounded-[2rem] p-6 md:p-8 border transition-all duration-500 ${!address ? "border-[#F5DEB3]/40 shadow-[0_0_30px_rgba(245,222,179,0.08)]" : "border-white/10"}`}
            >
              <h2 className="text-lg font-serif text-white mb-6 border-b border-white/10 pb-4 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#F5DEB3]/20 text-[#F5DEB3] flex items-center justify-center text-xs">2</span> 
                Delivery Details
              </h2>
              
              {!address ? (
                <div className="space-y-8">
                  <button
                    onClick={handleOpenMap}
                    disabled={isLocating}
                    className="w-full py-16 border-2 border-dashed border-[#F5DEB3]/30 rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-[#F5DEB3]/5 hover:border-[#F5DEB3]/60 transition-all group"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#F5DEB3]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <i className={`fa-solid ${isLocating ? "fa-spinner animate-spin" : "fa-map-location-dot"} text-2xl text-[#F5DEB3]`} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#F5DEB3]">
                      {isLocating ? "Detecting Location..." : "Pinpoint Delivery Location"}
                    </span>
                  </button>

                  {savedAddress.length > 0 && (
                    <div className="space-y-4 animate-in fade-in duration-700">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                         <i className="fa-solid fa-bookmark text-[8px]"></i> Saved Addresses
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {savedAddress.map((addr, index) => (
                          <button
                            key={index}
                            onClick={() => selectSavedAddress(addr)}
                            className="w-full text-left bg-black/20 border border-white/5 hover:border-[#F5DEB3]/40 p-4 rounded-2xl transition-all group"
                          >
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[8px] bg-[#F5DEB3]/10 text-[#F5DEB3] px-2 py-0.5 rounded-md border border-[#F5DEB3]/20 font-bold uppercase tracking-tighter">
                                    {addr.addressType}
                                </span>
                                <i className="fa-solid fa-chevron-right text-[10px] text-gray-700 group-hover:text-[#F5DEB3] transition-colors"></i>
                            </div>
                            <p className="text-[11px] text-gray-300 line-clamp-2 leading-relaxed h-8">
                                {addr.formattedAddress}
                            </p>
                            <div className="mt-3 pt-3 border-t border-white/5 text-[9px] text-gray-500 flex items-center justify-between">
                                <span>{addr.city}, {addr.state}</span>
                                <span className="font-mono">{addr.pinCode}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-black/40 p-5 rounded-2xl border border-[#F5DEB3]/30 flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-[#F5DEB3] text-xs uppercase tracking-widest mb-1">
                        Delivering To:
                      </h3>
                      <p className="text-sm text-gray-300 leading-relaxed">{address}</p>
                    </div>
                    <div className="flex flex-col gap-3 shrink-0">
                      <button onClick={handleOpenMap} className="text-[10px] text-[#F5DEB3] uppercase font-bold tracking-widest hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                        Change
                      </button>
                      <button onClick={handleResetAddress} className="text-[10px] text-red-400 uppercase font-bold tracking-widest hover:text-red-300 transition-colors px-3 py-1.5">
                        Reset
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[9px] uppercase tracking-widest text-gray-500 font-bold ml-1">Flat / Floor No. (Optional)</label>
                        <input
                            value={preciseDetails.flatNo}
                            placeholder="e.g. Apt 4B, 2nd Floor"
                            className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[#F5DEB3] transition-all"
                            onChange={(e) => setPreciseDetails((p) => ({ ...p, flatNo: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] uppercase tracking-widest text-gray-500 font-bold ml-1">Landmark (Optional)</label>
                        <input
                            value={preciseDetails.landmark}
                            placeholder="e.g. Near Metro Station"
                            className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-[#F5DEB3] transition-all"
                            onChange={(e) => setPreciseDetails((p) => ({ ...p, landmark: e.target.value }))}
                        />
                    </div>
                  </div>
                </div>
              )}
              
              <AnimatePresence
                onExitComplete={() => {
                  if (mapRef.current) {
                    mapRef.current.setTarget(null);
                    mapRef.current = null;
                  }
                }}
              >
                {showMapModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
                  >
                    <motion.div
                      initial={{ y: "100%", scale: 0.95 }}
                      animate={{ y: 0, scale: 1 }}
                      exit={{ y: "100%", scale: 0.95 }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className="bg-[#1c2b25] w-full max-w-3xl h-[95vh] sm:h-[85vh] sm:rounded-[2rem] overflow-hidden border-t sm:border border-white/10 shadow-2xl flex flex-col"
                    >
                      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-[#2e443c] shrink-0">
                        <div>
                            <h3 className="font-serif text-[#F5DEB3] text-xl">Set Delivery Location</h3>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Move pin to exact location</p>
                        </div>
                        <button onClick={() => setShowMapModal(false)} className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/40 transition-colors">
                          <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                      </div>

                      <div className="p-5 bg-[#1c2b25] shrink-0 relative z-[110] border-b border-white/5">
                        <button
                          onClick={getUserCurrentLocation}
                          disabled={isLocating}
                          className="w-full py-3.5 mb-4 rounded-xl bg-[#F5DEB3]/10 border border-[#F5DEB3]/30 text-[#F5DEB3] font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-[#F5DEB3]/20 transition-all disabled:opacity-50"
                        >
                          <i className={`fa-solid ${isLocating ? "fa-spinner animate-spin" : "fa-location-crosshairs"} text-sm`}></i>
                          {isLocating ? "Locating device..." : "Use Current Location"}
                        </button>

                        <div className="relative">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearchPlaces(e.target.value)}
                            placeholder="Search area, street, landmark..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-sm text-white focus:border-[#F5DEB3] outline-none"
                          />
                          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
                        </div>

                        {(searchQuery.length > 0 || isSearching) && (
                          <div className="absolute left-5 right-5 mt-2 bg-[#2e443c] border border-white/10 rounded-2xl shadow-2xl z-[120] max-h-[300px] overflow-y-auto custom-scrollbar">
                            {isSearching ? (
                              <div className="w-full p-8 flex flex-col items-center justify-center gap-3">
                                <div className="w-6 h-6 border-2 border-[#F5DEB3] border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Searching...</p>
                              </div>
                            ) : searchResults.length > 0 ? (
                              searchResults.map((item, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleSelectSearchResult(item)}
                                  className="w-full text-left p-4 hover:bg-white/5 border-b border-white/5 last:border-0 flex items-start gap-4 transition-colors group"
                                >
                                  <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#F5DEB3]/10">
                                     <i className="fa-solid fa-location-dot text-gray-500 group-hover:text-[#F5DEB3] transition-colors"></i>
                                  </div>
                                  <div>
                                    <p className="text-sm text-white font-medium group-hover:text-[#F5DEB3] transition-colors">
                                      {item.structured_formatting.main_text}
                                    </p>
                                    <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                                      {item.structured_formatting.secondary_text}
                                    </p>
                                  </div>
                                </button>
                              ))
                            ) : (
                               <div className="p-6 text-center text-sm text-gray-400">No results found for "{searchQuery}"</div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="relative flex-1 min-h-[300px] w-full bg-[#15251e]">
                        <div ref={mapElement} className="w-full h-full" />

                        {mapSuggestions.length === 0 && !isSearching && !isLocating && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 px-8">
                              <div className="bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-white/10 text-center shadow-2xl">
                                <i className="fa-solid fa-hand-pointer text-2xl text-[#F5DEB3] mb-3 animate-bounce"></i>
                                <p className="text-[11px] text-[#F5DEB3] uppercase tracking-[0.2em] font-bold mb-1">Navigation Required</p>
                                <p className="text-sm text-white/80 leading-relaxed font-light">Drag the map to pinpoint<br/>your exact location</p>
                              </div>
                            </div>
                        )}

                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
                          <i className="fa-solid fa-location-dot text-4xl text-[#F5DEB3] drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]"></i>
                          <div className="w-2 h-1 bg-black/50 rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2 blur-[2px]"></div>
                        </div>
                      </div>

                      <div className="p-5 bg-[#1c2b25] h-[200px] flex flex-col shrink-0 border-t border-white/5 relative z-[110]">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                           <i className="fa-solid fa-list-ul"></i> Select Nearest Match
                        </p>
                        <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
                          {mapSuggestions.length > 0 ? (
                            mapSuggestions.map((s, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleConfirmAddress(s)}
                                className="w-full text-left p-4 rounded-xl bg-black/30 border border-white/5 hover:border-[#F5DEB3]/50 hover:bg-black/50 transition-all group flex items-center justify-between"
                              >
                                <div className="pr-4">
                                    <p className="text-sm text-white group-hover:text-[#F5DEB3] line-clamp-1 transition-colors">
                                    {s.formattedAddress}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">
                                    {s.city}, {s.state} - <span className="text-white font-mono">{s.pinCode}</span>
                                    </p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#F5DEB3] group-hover:text-[#1c3026] text-white/50 transition-colors shrink-0">
                                    <i className="fa-solid fa-check text-xs"></i>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 text-xs italic">
                              Searching for nearby addresses...
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
                {paymentError && (
                <motion.div 
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 backdrop-blur-md rounded-[2rem] p-6 md:p-8 border border-red-500/30 overflow-hidden"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                            <i className="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <div className="flex-1 pt-1">
                            <h3 className="text-lg font-serif text-red-400 mb-1">Transaction Failed</h3>
                            <p className="text-sm text-gray-300 mb-5 leading-relaxed">{paymentError}</p>
                            {showRetry && (
                            <button
                                onClick={handlePayment}
                                disabled={isOrdering}
                                className="px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 w-fit"
                            >
                                <i className="fa-solid fa-rotate-right"></i>
                                Retry Payment
                            </button>
                            )}
                        </div>
                        <button
                            onClick={() => { setPaymentError(null); setShowRetry(false); }}
                            className="text-red-400/50 hover:text-red-400 transition-colors p-1"
                        >
                            <i className="fa-solid fa-xmark text-xl"></i>
                        </button>
                    </div>
                </motion.div>
                )}
            </AnimatePresence>

          </div>

        </div>
      </main>

      <AnimatePresence>
        {showCouponModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowCouponModal(false)}
          >
            <motion.div
              initial={{ y: "100%", scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: "100%", scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1c2b25] w-full max-w-2xl max-h-[85vh] sm:rounded-[2rem] overflow-hidden border-t sm:border border-white/10 shadow-2xl flex flex-col"
            >
              <div className="p-5 md:p-6 border-b border-white/10 flex justify-between items-center bg-[#2e443c] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#F5DEB3]/10 border border-[#F5DEB3]/20 flex items-center justify-center">
                    <i className="fa-solid fa-tags text-[#F5DEB3]"></i>
                  </div>
                  <div>
                    <h3 className="font-serif text-[#F5DEB3] text-xl">Available Coupons</h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                      Select to apply discount
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCouponModal(false)}
                  className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/40 transition-colors"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar">
                <Suspense 
                  fallback={
                    <div className="flex items-center justify-center py-12">
                      <div className="w-10 h-10 border-2 border-[#F5DEB3] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  }
                >
                  <CouponList 
                    onCouponApplied={(couponData) => {
                      handleCouponApplied(couponData);
                      setShowCouponModal(false);
                    }} 
                  />
                </Suspense>
              </div>

              <div className="p-5 md:p-6 border-t border-white/10 bg-[#15251e] shrink-0">
                <button
                  onClick={() => setShowCouponModal(false)}
                  className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-[#15251e]/95 backdrop-blur-xl border-t border-[#F5DEB3]/20 p-4 px-6 z-50 lg:hidden shadow-[0_-20px_40px_rgba(0,0,0,0.6)]"
      >
          <div className="flex items-center gap-5 max-w-[1200px] mx-auto">
            <div className="flex flex-col">
                <span className="text-[9px] text-[#F5DEB3]/70 uppercase tracking-widest font-bold">Total Payable</span>
                <span className="text-2xl font-serif text-white">₹{finalTotal.toLocaleString()}</span>
            </div>
            <button 
                onClick={handlePayment}
                disabled={isOrdering || !address}
                className={`flex-1 h-14 rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 ${
                    !address 
                    ? 'bg-white/5 text-gray-500 border border-white/10' 
                    : 'bg-[#F5DEB3] text-[#1c3026]'
                }`}
            >
                {isOrdering ? (
                    <><div className="w-4 h-4 border-2 border-[#1c3026] border-t-transparent rounded-full animate-spin"></div> Proc...</>
                ) : (!address ? (
                    'Set Address'
                ) : (
                    <>Pay Now <i className="fa-solid fa-lock text-[10px]"></i></>
                ))}
            </button>
          </div>
      </motion.div>

    </div>
  );
};

export default CheckoutPage;