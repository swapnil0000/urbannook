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
  const [mapSuggestions, setMapSuggestions] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const [preciseDetails, setPreciseDetails] = useState({
    landmark: "",
    flatNo: "",
  });
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
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
        { enableHighAccuracy: true },
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
          { withCredentials: true },
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

  // initialize Map with null ( so user can select)
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
      console.log('Setting user profile from API:', userProfileData.data);
      setUserProfile(userProfileData?.data?.data);
      setIsLoading(false);
    } else if (!profileLoading) {
      refetchProfile();
    }
  }, [
    isAuthenticated,
    cartItems.length,
    navigate,
    userProfileData,
    profileLoading,
    refetchProfile,
    showNotification,
    openLoginModal,
  ]);

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
          showNotification(
            "Failed to load pricing. Please refresh the page.",
            "error",
          );
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
      console.error("Failed to apply coupon:", error);
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
      console.error("Failed to remove coupon:", error);
      showNotification(
        "Failed to remove coupon. Please refresh the page.",
        "error",
      );
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
        showNotification("Address confirmed for delivery!", "success");
      }
    } catch (err) {
      // console.log(err?.response);
      const errorMessage =
        err.response?.data?.message || "Failed to save address";
      showNotification(errorMessage, "error");
    }
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
            showNotification(
              `Payment successful! Order ID: ${orderId}`,
              "success",
            );
            dispatch(clearCart());
            setTimeout(() => {
              navigate("/orders");
            }, 2000);
          } catch (verifyError) {
            console.error("Payment verification error:", verifyError);
            setPaymentError(
              "Payment verification failed. Please contact support if amount was debited.",
            );
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
            setPaymentError(
              "Payment was cancelled. Your cart has been preserved. You can retry when ready.",
            );
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
        let userMessage =
          errorDescription || "Payment failed. Please try again.";

        if (errorCode === "BAD_REQUEST_ERROR")
          userMessage =
            "Payment failed due to invalid request. Please try again.";
        else if (errorCode === "GATEWAY_ERROR")
          userMessage =
            "Payment gateway error. Please try again or use a different payment method.";
        else if (errorCode === "SERVER_ERROR")
          userMessage = "Payment server error. Please try again later.";

        setPaymentError(userMessage);
        setShowRetry(true);
      });

      paymentObject.open();
    } catch (error) {
      console.error("Payment initialization failed:", error);
      const errorMessage =
        error.data?.message ||
        error.message ||
        "Failed to initialize payment. Please try again.";
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
      <div className="fixed top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#3a554a] to-[#2e443c] pointer-events-none opacity-50"></div>
      <main className="max-w-[1200px] mx-auto pt-24 lg:pt-36 px-4 lg:px-8 relative z-10">
        <div className="mb-6 lg:mb-8 text-center lg:text-left">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#F5DEB3]/60 font-bold">
            Secure Checkout
          </span>
          <h1 className="text-3xl lg:text-5xl font-serif text-white mt-2">
            Finalize Your Order
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">
          <div className="lg:col-span-5 lg:sticky lg:top-32 order-1 lg:order-2">
            <div className="bg-[#1c2b25] rounded-[2rem] p-6 lg:p-8 shadow-2xl border border-white/5 flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h2 className="text-xl font-serif text-white">Order Summary</h2>
                <span className="text-xs bg-[#F5DEB3]/10 text-[#F5DEB3] px-3 py-1 rounded-full border border-[#F5DEB3]/20">
                  {cartItems.length} Items
                </span>
              </div>
              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 items-center bg-black/10 p-3 rounded-xl border border-white/5"
                  >
                    <div className="w-14 h-14 bg-[#e8e6e1] rounded-lg flex items-center justify-center p-1 shrink-0">
                      <img
                        src={item.image || "/placeholder.jpg"}
                        alt={item.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-[#F5DEB3] truncate">
                        {item.name}
                      </h3>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-400">
                          Qty: {item.quantity}
                        </p>
                        <p className="font-mono text-sm">
                          ₹{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-gradient-to-br from-[#F5DEB3]/20 via-[#F5DEB3]/5 to-transparent p-[1px] rounded-2xl shadow-[0_0_20px_rgba(245,222,179,0.05)]">
                <div className="bg-[#1c2b25] rounded-2xl p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fa-solid fa-tags text-[#F5DEB3]"></i>
                    <h3 className="font-serif text-[#F5DEB3] text-sm tracking-wide">
                      Promotions & Offers
                    </h3>
                  </div>
                  <CouponInput
                    appliedCoupon={appliedCoupon}
                    discount={discount}
                    onCouponApplied={handleCouponApplied}
                    onCouponRemoved={handleCouponRemoved}
                  />
                  {!appliedCoupon && (
                    <div className="mt-4 pt-4 border-t border-white/5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                      <Suspense fallback={<ComponentLoader type="card" />}>
                        <CouponList onCouponApplied={handleCouponApplied} />
                      </Suspense>
                    </div>
                  )}
                </div>
              </div>
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
                  <span className="text-[#F5DEB3]">
                    ₹{finalTotal.toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={handlePayment}
                disabled={isOrdering || !address || !pincode}
                className="hidden lg:block w-full mt-2 py-4 bg-[#F5DEB3] text-[#2e443c] rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isOrdering
                  ? "Processing..."
                  : `Pay ₹${finalTotal.toLocaleString()}`}
              </button>

              <div className="mt-2 flex justify-center gap-4 opacity-50">
                 <i className="fa-brands fa-cc-visa text-2xl"></i>
                 <i className="fa-brands fa-cc-mastercard text-2xl"></i>
                 <i className="fa-brands fa-google-pay text-2xl"></i>
                 <i className="fa-solid fa-building-columns text-2xl"></i>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-serif text-[#F5DEB3] mb-4 flex items-center gap-2">
                <i className="fa-regular fa-user text-sm"></i> Contact Info
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Name
                  </span>
                  {userProfile?.userName || userProfile?.name || "N/A"}
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                  <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Email
                  </span>
                  {userProfile?.userEmail || userProfile?.email || "N/A"}
                </div>
                <div className="bg-black/20 p-3 rounded-lg border border-white/5 md:col-span-2">
                  <span className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Phone
                  </span>
                  {userProfile?.mobileNumber || userProfile?.mobile || "N/A"}
                </div>
              </div>
            </div>

            <div
              className={`bg-white/5 backdrop-blur-md rounded-2xl p-6 border transition-all ${!address ? "border-[#F5DEB3]/50 shadow-[0_0_20px_rgba(245,222,179,0.1)]" : "border-white/10"}`}
            >
              <h2 className="text-lg font-serif text-[#F5DEB3] mb-4 flex items-center gap-2">
                <i className="fa-solid fa-truck-fast text-sm" /> Shipping
                Details
              </h2>
              {!address ? (
                <button
                  onClick={handleOpenMap}
                  disabled={isLocating}
                  className="w-full py-12 border-2 border-dashed border-[#F5DEB3]/30 rounded-2xl flex flex-col items-center gap-3 hover:bg-[#F5DEB3]/5 transition-all"
                >
                  <i
                    className={`fa-solid ${isLocating ? "fa-spinner animate-spin" : "fa-map-location-dot"} text-2xl text-[#F5DEB3]`}
                  />
                  <span className="text-xs font-bold uppercase text-[#F5DEB3]">
                    {isLocating ? "Detecting..." : "Select Location on Map"}
                  </span>
                </button>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-black/30 p-4 rounded-xl border border-[#F5DEB3]/30 flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-[#F5DEB3] text-sm">
                        Delivery To:
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">{address}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleOpenMap}
                        className="text-[10px] text-[#F5DEB3] underline uppercase font-bold text-right"
                      >
                        Change
                      </button>
                      <button
                        onClick={handleResetAddress}
                        className="text-[10px] text-red-400 underline uppercase font-bold text-right"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      value={preciseDetails.flatNo}
                      placeholder="Flat / Floor No."
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white"
                      onChange={(e) =>
                        setPreciseDetails((p) => ({
                          ...p,
                          flatNo: e.target.value,
                        }))
                      }
                    />
                    <input
                      value={preciseDetails.landmark}
                      placeholder="Landmark"
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white"
                      onChange={(e) =>
                        setPreciseDetails((p) => ({
                          ...p,
                          landmark: e.target.value,
                        }))
                      }
                    />
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
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{
                        type: "spring",
                        damping: 25,
                        stiffness: 200,
                      }}
                      className="bg-[#1c2b25] w-full max-w-2xl h-[90vh] sm:h-auto sm:rounded-[2rem] overflow-hidden border-t sm:border border-white/10 shadow-2xl flex flex-col"
                    >
                      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#2e443c] shrink-0">
                        <h3 className="font-serif text-[#F5DEB3]">
                          Adjust Delivery Pin
                        </h3>
                        <button
                          onClick={() => setShowMapModal(false)}
                          className="text-white/60 hover:text-white text-xl"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>

                      <div className="p-4 bg-[#1c2b25] shrink-0 relative z-[110]">
                        <button
                          onClick={getUserCurrentLocation}
                          disabled={isLocating}
                          className="w-full py-3 mb-4 rounded-xl bg-[#F5DEB3]/10 border border-[#F5DEB3]/30 text-[#F5DEB3] font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#F5DEB3]/20 transition-all disabled:opacity-50"
                        >
                          <i
                            className={`fa-solid ${isLocating ? "fa-spinner animate-spin" : "fa-location-crosshairs"}`}
                          ></i>
                          {isLocating ? "Locating..." : "Use Current Location"}
                        </button>

                        <div className="relative mb-2">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearchPlaces(e.target.value)}
                            placeholder="Search area, street, landmark..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#F5DEB3] outline-none pl-11"
                          />
                          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
                        </div>

                        {(searchQuery.length > 0 || isSearching) && (
                          <div className="absolute left-0 right-0 mt-1 bg-[#2e443c] border border-white/10 rounded-xl shadow-2xl z-[120] max-h-[350px] overflow-y-auto custom-scrollbar">
                            {isSearching ? (
                              <div className="w-full p-6 flex flex-col items-center justify-center gap-3">
                                <div className="w-5 h-5 border-2 border-[#F5DEB3] border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">
                                  Searching results...
                                </p>
                              </div>
                            ) : (
                              searchResults.map((item, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleSelectSearchResult(item)}
                                  className="w-full text-left p-4 hover:bg-white/5 border-b border-white/5 last:border-0 flex items-start gap-3 transition-colors group"
                                >
                                  <i className="fa-solid fa-location-dot mt-1 text-gray-500 group-hover:text-[#F5DEB3]"></i>
                                  <div>
                                    <p className="text-sm text-white font-medium group-hover:text-[#F5DEB3]">
                                      {item.structured_formatting.main_text}
                                    </p>
                                    <p className="text-[11px] text-gray-400 line-clamp-1">
                                      {
                                        item.structured_formatting
                                          .secondary_text
                                      }
                                    </p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <div className="relative h-[400px] md:h-[450px] w-full bg-black shrink-0">
                        <div ref={mapElement} className="w-full h-full" />

                        {/* Overlay Instruction Message stays until Suggestions or Search/Locate happens */}
                        {mapSuggestions.length === 0 &&
                          !isSearching &&
                          !isLocating && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 px-10">
                              <div className="bg-black/60 backdrop-blur-md p-5 rounded-2xl border border-white/10 text-center shadow-2xl">
                                <p className="text-[11px] text-[#F5DEB3] font-serif tracking-widest uppercase mb-1">
                                  Navigation Required
                                </p>
                                <p className="text-xs text-white/80 leading-relaxed font-light">
                                  Use current location to set it <br /> or type
                                  in the input above
                                </p>
                              </div>
                            </div>
                          )}

                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-10">
                          <i className="fa-solid fa-location-dot text-4xl text-red-500 drop-shadow-lg"></i>
                        </div>
                      </div>

                      <div className="p-4 bg-[#1c2b25] flex-1 overflow-y-auto border-t border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 text-center">
                          Nearby Suggestions
                        </p>
                        <div className="space-y-2">
                          {mapSuggestions.length > 0 ? (
                            mapSuggestions.map((s, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleConfirmAddress(s)}
                                className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:border-[#F5DEB3]/50 transition-all group"
                              >
                                <p className="text-sm text-white group-hover:text-[#F5DEB3] line-clamp-1">
                                  {s.formattedAddress}
                                </p>
                                <p className="text-[10px] text-gray-500 mt-1">
                                  {s.city}, {s.state} - {s.pinCode}
                                </p>
                              </button>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm italic">
                              Drag the map or use search to find location
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {paymentError && (
              <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/30 text-red-400 text-sm">
                {paymentError}
              </div>
            )}
          </div>
        </div>
      </main>

      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-[#1c2b25]/95 backdrop-blur-xl border-t border-[#F5DEB3]/20 p-4 px-6 z-50 lg:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xl font-serif text-white">
              ₹{finalTotal.toLocaleString()}
            </span>
          </div>
          <button
            onClick={handlePayment}
            disabled={isOrdering || !address}
            className={`flex-1 h-12 rounded-full font-bold uppercase text-[10px] ${!address ? "bg-gray-600" : "bg-[#F5DEB3] text-[#2e443c]"}`}
          >
            Pay Now
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CheckoutPage;
