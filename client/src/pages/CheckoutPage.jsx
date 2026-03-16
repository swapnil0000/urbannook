import { useState, useEffect, lazy, Suspense, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import {
  useGetUserProfileQuery,
  useGetRazorpayKeyQuery,
  useCreateOrderMutation,
  useApplyCouponMutation,
  useGetSavedAddressesQuery,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useUpdateCartMutation,
  useUpdateUserProfileMutation,
} from "../store/api/userApi";
import { useUI } from "../hooks/useRedux";
import { logout } from "../store/slices/authSlice";
import { clearCart } from "../store/slices/cartSlice";
import CouponInput from "../component/CouponInput";
import { ComponentLoader } from "../component/layout/LoadingSpinner";

// Lazy load heavy components
const CouponList = lazy(() => import("../component/CouponList"));
const MapModal = lazy(() => import("../component/MapModal"));
const MobileNumberModal = lazy(() => import("../component/MobileNumberModal"));

const CheckoutPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification, openLoginModal } = useUI();
  const showNotificationRef = useRef(showNotification);
  const openLoginModalRef = useRef(openLoginModal);
  useEffect(() => { showNotificationRef.current = showNotification; }, [showNotification]);
  useEffect(() => { openLoginModalRef.current = openLoginModal; }, [openLoginModal]);
  const { items: cartItems, selections: cartSelections } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const paymentCompletedRef = useRef(false);
  const cartLoadedRef = useRef(false);
  const wasGuestRef = useRef(false);

  const [userProfile, setUserProfile] = useState(null);
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [showRetry, setShowRetry] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [preciseDetails, setPreciseDetails] = useState({
    landmark: "",
    flatNo: "",
  });
  const [savedAddress, setSavedAddress] = useState([]);
  const [currentAddressId, setCurrentAddressId] = useState(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [senderMobile, setSenderMobile] = useState("");
  const [mobileErrors, setMobileErrors] = useState("");
  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const [isSavingMobile, setIsSavingMobile] = useState(false);
  const [useDifferentDeliveryContact, setUseDifferentDeliveryContact] = useState(false);
  const [deliveryMobile, setDeliveryMobile] = useState("");
  const [deliveryMobileErrors, setDeliveryMobileErrors] = useState("");

  const [pricingDetails, setPricingDetails] = useState({
    subtotal: 0,
    shipping: 50,
    discount: 0,
  });

  const { data: userProfileData, isLoading: profileLoading, refetch: refetchProfile } = useGetUserProfileQuery();
  const { data: razorpayKeyData } = useGetRazorpayKeyQuery();
  const [createOrder, { isLoading: isOrdering }] = useCreateOrderMutation();
  const [applyCouponMutation] = useApplyCouponMutation();
  const [updateAddress] = useUpdateAddressMutation();
  const [deleteAddress] = useDeleteAddressMutation();
  const [updateCart] = useUpdateCartMutation();
  const [updateUserProfile] = useUpdateUserProfileMutation();
  const { data: savedAddressData, refetch: refetchAddresses } = useGetSavedAddressesQuery();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    handleSaveAdress();
  }, [savedAddressData?.data]);

  const handleOpenMap = () => {
    setShowMapModal(true);
  };

  const handleAddressConfirm = (suggestion, addressId) => {
    setAddress(suggestion.formattedAddress);
    setPincode(suggestion.pinCode.toString());
    setCurrentAddressId(addressId);
    refetchAddresses();
  };

  const handleResetAddress = () => {
    setAddress("");
    setPincode("");
    setPreciseDetails({ landmark: "", flatNo: "" });
    setCurrentAddressId(null);
    setIsEditingMode(false);
    showNotification("Shipping details reset", "info");
  };

  const handleScrollToAddress = () => {
    // Find the Delivery Details section and scroll to it
    const deliverySection = document.querySelector('[data-section="delivery-details"]');
    if (deliverySection) {
      // Add a small delay to ensure the DOM is ready
      setTimeout(() => {
        deliverySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleUpdateAddressDetails = async () => {
    if (!currentAddressId || !address) return;

    try {
      const selectedFullAddr =
        savedAddress.find((a) => a.addressId === currentAddressId) || {};

      const addressData = {
        addressId: currentAddressId,
        landmark: preciseDetails.landmark,
        flatOrFloorNumber: preciseDetails.flatNo,
        formattedAddress: address,
        pinCode: pincode,
        lat: selectedFullAddr.location?.coordinates[1] || 0,
        long: selectedFullAddr.location?.coordinates[0] || 0,
        city: selectedFullAddr.city || "",
        state: selectedFullAddr.state || "",
        placeId: selectedFullAddr.placeId || "N/A",
      };

      const result = await updateAddress(addressData).unwrap();
      if (result.success) {
        showNotification("Address details synced", "success");
        setIsEditingMode(false);
        refetchAddresses();
      }
    } catch (err) {
      console.error("Failed to sync precise details:", err);
      showNotification("Failed to update details", "error");
    }
  };

  useEffect(() => {
    const hasToken = !!localStorage.getItem('authToken');
    const isLoggedIn = isAuthenticated || hasToken;

    if (!isLoggedIn) {
      if (!wasGuestRef.current) {
        wasGuestRef.current = true;
        showNotificationRef.current("Please login to complete your order", "info");
        openLoginModalRef.current();
        navigate("/");
      }
      return;
    }

    // User just logged in
    if (wasGuestRef.current) {
      wasGuestRef.current = false;
    }

    if (cartItems.length > 0) {
      cartLoadedRef.current = true;
    }

    if (cartItems.length === 0 && cartLoadedRef.current && !paymentCompletedRef.current && !profileLoading && userProfileData) {
      navigate("/products");
      return;
    }

    if (userProfileData?.data) {
      setUserProfile(userProfileData.data?.data);
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
  ]);

  const cartItemsLength = cartItems?.length;
  useEffect(() => {
    const fetchInitialPricing = async () => {
      if (cartItemsLength > 0) {
        try {
          const result = await applyCouponMutation(
            appliedCoupon || null,
          ).unwrap();
          if (result.success && result.data?.summary) {
            setPricingDetails({
              subtotal: result.data.summary.subtotal || 0,
              shipping: result.data.summary.shipping || 50,
              discount: result.data.summary.discount || 0,
            });
          }
        } catch (error) {
          if (error?.data?.statusCode === 400 && appliedCoupon) {
            setAppliedCoupon(null);
            try {
              const result = await applyCouponMutation(null).unwrap();
              if (result.success && result.data?.summary) {
                setPricingDetails({
                  subtotal: result.data.summary.subtotal || 0,
                  shipping: result.data.summary.shipping || 50,
                  discount: result.data.summary.discount || 0,
                });
              }
            } catch (retryError) {
              console.error("Failed to recalculate pricing:", retryError);
              showNotification("Failed to recalculate pricing:", "error");
            }
          } else {
            console.error("Failed to fetch initial pricing:", error);
            showNotification(
              "Failed to load pricing. Please refresh the page.",
              "error",
            );
          }
        }
      }
    };
    fetchInitialPricing();
  }, [cartItemsLength, applyCouponMutation, appliedCoupon]);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.userAddress && !address) {
        setAddress(userProfile.userAddress);
      }
      if (userProfile.userPinCode && !pincode) {
        setPincode(userProfile.userPinCode);
      }
      if ((userProfile?.mobileNumber || userProfile?.mobile) && !senderMobile) {
        const mobile = String(userProfile.mobileNumber || userProfile.mobile);
        setSenderMobile(mobile);
      }
    }
  }, [userProfile]);

  const handleCouponApplied = async (couponData) => {
    try {
      const result = await applyCouponMutation(couponData.code).unwrap();
      if (result.success && result.data?.summary) {
        setAppliedCoupon(couponData.code);
        setPricingDetails({
          subtotal: result.data.summary.subtotal || 0,
          shipping: result.data.summary.shipping || 50,
          discount: result.data.summary.discount || 0,
        });
        const successMessage = result.message || "Coupon applied successfully!";
        showNotification(successMessage, "success");
        setShowCouponModal(false);
      }
    } catch (error) {
      const errorMessage =
        error?.data?.message || error?.message || "Failed to apply coupon";
      showNotification(errorMessage, "error");
    }
  };

  const handleCouponRemoved = async () => {
    try {
      const result = await applyCouponMutation(null).unwrap();
      if (result.success && result.data?.summary) {
        setAppliedCoupon(null);
        setPricingDetails({
          subtotal: result.data.summary.subtotal || 0,
          shipping: result.data.summary.shipping || 50,
          discount: result.data.summary.discount || 0,
        });
        const successMessage = result.message || "Coupon removed";
        showNotification(successMessage, "success");
      }
    } catch (error) {
      const errorMessage =
        error?.data?.message ||
        error?.message ||
        "Failed to remove coupon. Please refresh the page.";
      showNotification(errorMessage, "error");
    }
  };

  const handleRemoveItem = async (productId) => {
    try {
      const item = cartItems.find((item) => item.id === productId);
      const mongoId = item?.mongoId || productId;
      const selectedColor = item?.selectedColor || "N/A";

      await updateCart({
        productId: mongoId,
        quantity: 1,
        action: "remove",
        color: selectedColor,
      }).unwrap();

      showNotification("Item removed from cart", "success");

      if (cartItems.length === 1) {
        navigate("/products");
      }
    } catch (error) {
      console.error("Failed to remove item:", error);
      const errorMessage = error?.data?.message || "Failed to remove item";
      showNotification(errorMessage, "error");
    }
  };

  const finalTotal = pricingDetails.grandTotal;

  const handleSaveAdress = () => {
    if (savedAddressData?.success) {
      const addresses =
        savedAddressData.data?.extractingAddressFromAddressIds || [];
      const ids = savedAddressData.data?.addressId || [];

      const merged = addresses.map((addr, index) => ({
        ...addr,
        addressId: ids[index], 
        displayIndex: index, 
      }));
      setSavedAddress(merged);
    }
  };

  const validateMobileNumber = (mobile) => {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile.trim());
  };

  const stripCountryCode = (mobile) => {
    const trimmed = mobile?.trim();
    if (trimmed.startsWith("+91")) {
      return trimmed.substring(3);
    } else if (trimmed.startsWith("91") && trimmed.length === 12) {
      return trimmed.substring(2);
    }
    return trimmed;
  };

  const handleSaveMobileNumber = async (mobileNumber) => {
    const strippedValue = stripCountryCode(mobileNumber);

    if (!strippedValue.trim()) {
      throw "Please enter a mobile number";
    }

    if (!validateMobileNumber(strippedValue)) {
      throw "Mobile number must be exactly 10 digits";
    }

    setIsSavingMobile(true);
    try {
      const result = await updateUserProfile({
        mobileNumber: strippedValue,
      }).unwrap();

      if (result.success) {
        setSenderMobile(strippedValue);
        setMobileErrors("");
        showNotification("Mobile number saved successfully!", "success");
        refetchProfile();
      } else {
        throw result.message || "Failed to save mobile number";
      }
    } catch (error) {
      console.error("Failed to save mobile number:", error);
      const errorMessage = error?.data?.message || error?.message || error || "Failed to save mobile number. Please try again.";
      throw errorMessage;
    } finally {
      setIsSavingMobile(false);
    }
  };
      setIsSavingMobile(false);
    }
  

  const validateDeliveryMobile = (mobile) => {
    const strippedValue = stripCountryCode(mobile);
    if (strippedValue.trim() && !validateMobileNumber(strippedValue)) {
      setDeliveryMobileErrors("Mobile number must be exactly 10 digits");
      return false;
    } else {
      setDeliveryMobileErrors("");
      return true;
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!addressId) {
      showNotification("Invalid address ID", "error");
      return;
    }

    try {
      const result = await deleteAddress(addressId).unwrap();

      setSavedAddress((prev) =>
        prev.filter((addr) => addr?.addressId !== addressId),
      );

      if (currentAddressId === addressId) {
        handleResetAddress();
      }

      showNotification("Address deleted successfully", "success");
      refetchAddresses();
    } catch (err) {
      console.error("Delete API Error:", err);
      const errorMessage =
        err.data?.message || err.message || "Failed to delete address";
      showNotification(errorMessage, "error");
    }
  };

  const selectSavedAddress = (addr) => {
    setAddress(addr.formattedAddress);
    setPincode(addr.pinCode.toString());
    setCurrentAddressId(addr.addressId);
    setPreciseDetails({
      landmark: addr.landmark || "",
      flatNo: addr.flatOrFloorNumber || "",
    });
    setIsEditingMode(false);
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
    const senderMobileStr = String(senderMobile || "").trim();
    
    if (!senderMobileStr || senderMobileStr === "N/A") {
      showNotification(
        "Please enter your contact number to proceed with checkout",
        "error",
      );
      // Open mobile modal instead of scrolling
      setShowMobileModal(true);
      return;
    }

    if (!validateMobileNumber(senderMobileStr)) {
      showNotification(
        "Please enter a valid 10-digit mobile number",
        "error",
      );
      return;
    }

    const deliveryMobileStr = String(deliveryMobile || "").trim();
    if (useDifferentDeliveryContact && deliveryMobileStr) {
      if (!validateMobileNumber(deliveryMobileStr)) {
        showNotification(
          "Please enter a valid 10-digit delivery contact number",
          "error",
        );
        return;
      }
    }

    if (!address.trim()) {
      showNotification("Please select a delivery address.", "error");
      return;
    }
    
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      showNotification("Your session has expired. Please login again.", "error");
      dispatch(logout());
      openLoginModal();
      navigate("/");
      return;
    }
    
    setPaymentError(null);
    const selectedFullAddr = savedAddress.find(a => a.addressId === currentAddressId);
    
    try {
      const razorpayKey = razorpayKeyData?.data;      
      const orderData = {
        items: cartItems.map((i) => ({
          productId: i.mongoId || i.id.split(':')[0], // Extract raw productId
          quantity: i.quantity,
          color: (i.selectedColor && i.selectedColor !== 'N/A') ? i.selectedColor : 
                 (cartSelections[i.id]?.color || cartSelections[i.mongoId]?.color || "") 
        })),
        senderMobile: senderMobileStr,
        userEmail: userProfile?.email,
        receiverMobile: useDifferentDeliveryContact && deliveryMobileStr ? deliveryMobileStr : senderMobileStr,
        addressId: currentAddressId,
        deliveryAddress: {
          addressId: currentAddressId,
          fullName: userProfile?.userName || userProfile?.name || "",
          mobileNumber: useDifferentDeliveryContact && deliveryMobileStr ? deliveryMobileStr : senderMobileStr,
          formattedAddress: address,
          pinCode: pincode ? parseInt(pincode, 10) : null,
          landmark: preciseDetails.landmark,
          flatOrFloorNumber: preciseDetails.flatNo,
          lat: selectedFullAddr?.location?.coordinates?.[1] || selectedFullAddr?.lat || 0,
          long: selectedFullAddr?.location?.coordinates?.[0] || selectedFullAddr?.long || 0,
        }
      };
      console.log(orderData?.items);
      
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
            navigate(`/payment-processing/${orderId}`)
          } catch (verifyError) {
            console.error("Payment handler error:", verifyError);
            setPaymentError(
              "Payment verification failed. Please contact support if amount was debited.",
            );
            setShowRetry(false);
          }
        },
        prefill: {
          name: userProfile?.userName || userProfile?.name || "",
          email: userProfile?.userEmail || userProfile?.email || "",
          contact: senderMobileStr,
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
        <div className="w-12 h-12 border-2 border-[#a89068] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#2e443c] min-h-screen font-sans text-gray-800 selection:bg-[#a89068] selection:text-white pb-24 lg:pb-0">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(168, 144, 104, 0.3); border-radius: 4px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(168, 144, 104, 0.6); }
      `}</style>

      {/* Background Gradient Overlay */}
      <div className="fixed top-0 left-0 w-full h-[400px] bg-gradient-to-b from-[#1a2822] to-transparent pointer-events-none opacity-60 z-0"></div>

      <main className="max-w-[1200px] mx-auto pt-24 lg:pt-36 px-4 lg:px-8 relative z-10">
        {/* Header Section */}
        <div className="mb-8 lg:mb-12 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#a89068]/20 border border-[#a89068]/30 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#a89068] animate-pulse"></span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#a89068] font-bold">
              Secure Checkout
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-white">
            Complete your order.
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Items, Coupon, Payment Summary */}
          <div className="lg:col-span-5 lg:sticky lg:top-32 order-1 lg:order-2 flex flex-col gap-6">
            {/* Items Card (Box Color: #f5f7f8) */}
            <div className="bg-[#f5f7f8] rounded-[2rem] p-6 border border-white/10 shadow-lg">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a89068]">
                  Your Items
                </h3>
                <span className="text-xs bg-[#2e443c] text-white px-2.5 py-1 rounded-md font-medium">
                  {cartItems.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="relative flex gap-4 items-center bg-white p-3 rounded-xl border border-gray-200 hover:border-[#a89068]/40 transition-colors group"
                  >
                    {/* Remove button - top right corner */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveItem(item.id);
                      }}
                      className="absolute top-2 right-2 w-4 h-4 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 flex items-center justify-center transition-all opacity-100"
                      title="Remove item"
                    >
                      <i className="fa-solid fa-xmark text-red-500 text-xs"></i>
                    </button>

                    <div className="w-14 h-14 bg-gray-100 rounded-lg rounded-s flex items-center justify-center  shrink-0">
                      <img
                        src={item.image || "/placeholder.jpg"}
                        alt={item.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-[#2e443c] truncate mb-1">
                        {item.name}
                      </h3>
                      
                      {/* --- NAYA: COLOR DISPLAY --- */}
                      {(() => {
                        const itemColor = item.selectedColor !== 'N/A' ? item.selectedColor : 
                                          (cartSelections[item.id]?.color || cartSelections[item.mongoId]?.color);
                                          
                        if (!itemColor || itemColor === 'N/A') return null;
                        
                        return (
                          <div className="flex items-center gap-1.5 mb-1.5 mt-1">
                            <span className="text-[9px] text-gray-400 uppercase tracking-widest">Color:</span>
                            <div 
                              className="w-3 h-3 rounded-full border border-gray-300 shadow-sm"
                              style={{
                                background: itemColor.toLowerCase() === 'rainbow' 
                                  ? 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)' 
                                  : itemColor.replace(/\s+/g, '').toLowerCase()
                              }}
                              title={itemColor}
                            ></div>
                            <span className="text-[10px] font-medium text-[#a89068]">{itemColor}</span>
                          </div>
                        );
                      })()}
                      {/* ------------------------- */}

                      <div className="flex justify-between items-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                          Qty: {item.quantity}
                        </p>
                        <p className="font-mono text-sm text-[#a89068] font-bold">
                          ₹{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon Card (Box Color: #f5f7f8) */}
            <div className="relative group">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-[#a89068]/40 to-[#a89068]/10 rounded-[2rem] blur-[2px] opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative bg-[#f5f7f8] border border-white/50 rounded-[2rem] p-6 md:p-7 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-4 ">
                  <div className="w-12 h-12 rounded-full bg-[#a89068]/10 border border-[#a89068]/20 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-ticket text-[#a89068] text-xl"></i>
                  </div>
                  <div>
                    <h3 className="font-serif text-[#2e443c] text-xl tracking-wide leading-tight">
                      Apply Promo Code
                    </h3>
                    <p className="text-[10px] text-[#a89068] uppercase tracking-widest mt-1 font-bold">
                      Unlock exclusive discounts
                    </p>
                  </div>
                </div>

                <div className="relative z-10 ">
                  <CouponInput
                    key={appliedCoupon || "no-coupon"}
                    appliedCoupon={appliedCoupon}
                    discount={pricingDetails.discount}
                    onCouponApplied={handleCouponApplied}
                    onCouponRemoved={handleCouponRemoved}
                  />
                </div>

                {!appliedCoupon && (
                  <div className="mt-2 pt-3  relative z-10">
                    <button
                      onClick={() => setShowCouponModal(true)}
                      className="w-full py-3 px-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-[#a89068] font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:border-[#a89068]/30"
                    >
                      <i className="fa-solid fa-tags"></i>
                      View All Available Coupons
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Summary (Box Color: #f5f7f8) */}
            <div className="bg-[#f5f7f8] rounded-[2rem] p-6 md:p-8 md:mb-4 shadow-xl border border-white/10 relative z-10">
              <h3 className="font-serif text-[#2e443c] text-xl mb-5">
                Payment Summary
              </h3>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span className="text-gray-800 font-medium">
                    ₹{pricingDetails.subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span>
                  <span className="text-gray-800 font-medium">
                    ₹{pricingDetails.shipping.toLocaleString()}
                  </span>
                </div>

                <div className="text-[10px] text-gray-500 bg-gray-50 p-2 rounded-lg">
                  <i className="fa-solid fa-info-circle mr-1"></i>
                  GST (18%) included in product prices
                </div>

                {appliedCoupon && pricingDetails.discount > 0 && (
                  <div className="flex justify-between text-[#2e443c] font-medium bg-[#a89068]/20 p-3 rounded-xl border border-[#a89068]/30 animate-in fade-in slide-in-from-top-2 duration-300">
                    <span className="flex items-center gap-2">
                      <i className="fa-solid fa-circle-check text-xs text-[#a89068]"></i>
                      Discount ({appliedCoupon})
                    </span>
                    <span>-₹{pricingDetails.discount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between items-end pt-5 border-t border-gray-200 mt-2">
                  <span className="text-xs uppercase tracking-widest text-[#a89068] font-bold">
                    Total To Pay
                  </span>
                  <span className="text-3xl font-serif text-[#2e443c]">
                    ₹
                    {(
                      pricingDetails.subtotal +
                      pricingDetails.shipping -
                      pricingDetails.discount
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={isOrdering || !address}
                className="hidden lg:flex w-full mt-8 py-4 bg-[#a89068] text-white rounded-xl font-bold uppercase tracking-widest text-[11px] hover:bg-[#2e443c] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg items-center justify-center gap-3"
              >
                {isOrdering ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{" "}
                    Processing...
                  </>
                ) : (
                  <>
                    Proceed to Pay <i className="fa-solid fa-lock"></i>
                  </>
                )}
              </button>

              <div className="mt-3 flex justify-center gap-4 opacity-40 text-[#2e443c]">
                <i className="fa-brands fa-cc-visa text-lg"></i>
                <i className="fa-brands fa-cc-mastercard text-lg"></i>
                <i className="fa-brands fa-google-pay text-lg"></i>
                <i className="fa-solid fa-building-columns text-lg"></i>
              </div>
            </div>
          </div>

          {/* Right Column: Contact & Delivery */}
          <div className="lg:col-span-7 space-y-6 order-2 lg:order-1 mb-4">
            {/* Contact Info (Box Color: #f5f7f8) */}
            <div
              className="bg-[#f5f7f8] rounded-[2rem] p-6 md:p-8 border border-white/10 shadow-lg"
              style={{ marginBottom: "1rem" }}
            >
              <h2 className="text-lg font-serif text-[#2e443c] mb-6 border-b border-gray-200 pb-4 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#a89068] text-white flex items-center justify-center text-xs font-bold">
                  1
                </span>
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-[#a89068] font-bold ml-1">
                    Full Name
                  </label>
                  <div className="w-full bg-white border border-gray-200 rounded-xl p-4 text-[#2e443c] text-sm font-medium">
                    {userProfile?.userName || userProfile?.name || "N/A"}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-widest text-[#a89068] font-bold ml-1">
                    Email Address
                  </label>
                  <div className="w-full bg-white border border-gray-200 rounded-xl p-4 text-[#2e443c] text-sm font-medium">
                    {userProfile?.userEmail || userProfile?.email || "N/A"}
                  </div>
                </div>
                
                {/* Mobile Number Field - Display Only with Edit */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[9px] uppercase tracking-widest text-[#a89068] font-bold ml-1">
                    Mobile NO. (Required for payment)
                  </label>
                  
                  {/* Display with Edit button */}
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 text-sm text-[#2e443c] font-medium">
                        {senderMobile && senderMobile !== "N/A" ? senderMobile : "Not added"}
                      </div>
                      <button
                        onClick={() => setShowMobileModal(true)}
                        className="px-4 py-2 bg-[#a89068] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#2e443c] transition-all"
                      >
                        <i className="fa-solid fa-pen mr-1"></i>
                        Edit
                      </button>
                    </div>
                    {(!senderMobile || senderMobile === "N/A") && (
                      <p className="text-[10px] text-[#a89068] ml-1 flex items-center gap-1">
                        <i className="fa-solid fa-info-circle text-[8px]"></i>
                        You'll be prompted to add it at checkout
                      </p>
                    )}
                  </div>
                </div>

                {/* Optional: Different Delivery Contact */}
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDifferentDeliveryContact}
                      onChange={(e) => {
                        setUseDifferentDeliveryContact(e.target.checked);
                        if (!e.target.checked) {
                          setDeliveryMobile("");
                          setDeliveryMobileErrors("");
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-[#a89068] focus:ring-[#a89068] cursor-pointer"
                    />
                    <span className="text-[10px] uppercase tracking-widest text-[#a89068] font-bold">
                     Ordering For Someone Else
                    </span>
                  </label>
                  
                  {useDifferentDeliveryContact && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <input
                        type="tel"
                        value={deliveryMobile}
                        onChange={(e) =>
                          setDeliveryMobile(
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        onBlur={() => validateDeliveryMobile(deliveryMobile)}
                        className={`w-full bg-white border rounded-xl p-4 text-sm text-[#2e443c] 
                          focus:outline-none transition-all placeholder:text-gray-400
                          ${deliveryMobileErrors ? "border-red-500" : "border-gray-200 focus:border-[#a89068]"}`}
                        placeholder="Enter 10-digit delivery contact number"
                      />
                      <p className="text-[10px] text-gray-500 ml-1">
                        This number will be used for delivery coordination 
                      </p>
                      {deliveryMobileErrors && (
                        <p className="text-[10px] text-red-500 ml-1">
                          {deliveryMobileErrors}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Details (Box Color: #f5f7f8) */}
            <div
              data-section="delivery-details"
              className={`bg-[#f5f7f8] rounded-[2rem] p-6 md:p-8 border transition-all duration-500 shadow-lg ${!address ? "border-[#a89068]/40" : "border-white/10"}`}
            >
              <h2 className="text-lg font-serif text-[#2e443c] mb-6 border-b border-gray-200 pb-4 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-[#a89068] text-white flex items-center justify-center text-xs font-bold">
                  2
                </span>
                Delivery Details
              </h2>

              {!address ? (
                <div className="space-y-8">
                  <button
                    onClick={handleOpenMap}
                    className="w-full py-16 border-2 border-dashed border-[#a89068]/30 rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-[#a89068]/5 hover:border-[#a89068]/60 transition-all group bg-white"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#a89068]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <i className="fa-solid fa-map-location-dot text-2xl text-[#a89068]" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#a89068]">
                      Pinpoint Delivery Location
                    </span>
                  </button>

                  {savedAddress.length > 0 && (
                    <div className="space-y-4 animate-in fade-in duration-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a89068] flex items-center gap-2">
                          <i className="fa-solid fa-bookmark text-[8px]"></i>{" "}
                          Saved Addresses ({savedAddress.length})
                        </h3>
                        {savedAddress.length > 2 && (
                          <button
                            onClick={() => {
                              setShowAllAddresses(!showAllAddresses);
                            }}
                            className="text-[9px] text-[#a89068] hover:underline font-bold uppercase tracking-wider flex items-center gap-1"
                          >
                            {showAllAddresses ? (
                              <>
                                <i className="fa-solid fa-chevron-up text-[8px]"></i>
                                Show Less
                              </>
                            ) : (
                              <>
                                <i className="fa-solid fa-chevron-down text-[8px]"></i>
                                View All
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(showAllAddresses
                          ? savedAddress
                          : savedAddress.slice(0, 2)
                        ).map((addr, index) => (
                          <div
                            key={addr.addressId || index}
                            onClick={() => selectSavedAddress(addr)}
                            className="w-full text-left bg-white border border-gray-200 hover:border-[#a89068]/40 hover:shadow-md p-4 rounded-2xl transition-all group cursor-pointer"
                          >
                            {/* Top Section */}
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[8px] bg-[#a89068]/10 text-[#a89068] px-2 py-0.5 rounded-md border border-[#a89068]/20 font-bold uppercase tracking-tighter">
                                {addr.addressType}
                              </span>
                              <i className="fa-solid fa-chevron-right text-[10px] text-gray-400 group-hover:text-[#a89068] transition-colors"></i>
                            </div>
                            <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed h-8">
                              {addr.formattedAddress}
                            </p>
                            <div className="mt-3 pt-3 border-t border-gray-100 text-[9px] text-gray-400 flex items-center justify-between">
                              <span>
                                {addr.city}, {addr.state}
                              </span>
                              <span className="font-mono text-gray-600">
                                {addr.pinCode}
                              </span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log(
                                  "Deleting address with ID:",
                                  addr.addressId,
                                ); // Debug log
                                handleDeleteAddress(addr.addressId);
                              }}
                              className="mt-3 w-full flex items-center justify-center gap-2 text-[10px] font-semibold tracking-wide uppercase bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 py-2 rounded-xl transition-all duration-300"
                            >
                              <i className="fa-solid fa-trash text-[9px]"></i>
                              Delete Address
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 flex justify-between items-start gap-4 shadow-sm">
                    <div className="flex-1">
                      <h3 className="font-bold text-[#a89068] text-xs uppercase tracking-widest mb-1">
                        Delivering To:
                      </h3>
                      <p className="text-sm text-[#2e443c] leading-relaxed">
                        {address}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 shrink-0">
                      <button
                        onClick={handleOpenMap}
                        className="text-[10px] text-white uppercase font-bold tracking-widest hover:bg-[#a89068]/90 transition-colors bg-[#a89068] px-3 py-1.5 rounded-lg"
                      >
                        Change
                      </button>
                      <button
                        onClick={handleResetAddress}
                        className="text-[10px] text-red-500 uppercase font-bold tracking-widest hover:text-red-600 transition-colors px-3 py-1.5"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase tracking-widest text-[#a89068] font-bold ml-1">
                        Flat / Floor No. (Optional)
                      </label>
                      <input
                        value={preciseDetails.flatNo}
                        placeholder="e.g. Apt 4B, 2nd Floor"
                        className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm text-[#2e443c] focus:outline-none focus:border-[#a89068] transition-all placeholder:text-gray-400"
                        onChange={(e) =>
                          setPreciseDetails((p) => ({
                            ...p,
                            flatNo: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase tracking-widest text-[#a89068] font-bold ml-1">
                        Landmark (Optional)
                      </label>
                      <input
                        value={preciseDetails.landmark}
                        placeholder="e.g. Near Metro Station"
                        className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm text-[#2e443c] focus:outline-none focus:border-[#a89068] transition-all placeholder:text-gray-400"
                        onChange={(e) =>
                          setPreciseDetails((p) => ({
                            ...p,
                            landmark: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <button
                    onClick={
                      isEditingMode ||
                      (!preciseDetails.landmark && !preciseDetails.flatNo)
                        ? handleUpdateAddressDetails
                        : () => setIsEditingMode(true)
                    }
                    className="w-full py-3 bg-[#F5DEB3]/10 hover:bg-[#F5DEB3]/20 border border-[#F5DEB3]/30 rounded-xl text-[#a89068] font-bold text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
                  >
                    <i
                      className={`fa-solid ${isEditingMode || (!preciseDetails.landmark && !preciseDetails.flatNo) ? "fa-save" : "fa-pen-to-square"}`}
                    ></i>
                    {isEditingMode ||
                    (!preciseDetails.landmark && !preciseDetails.flatNo)
                      ? "Save Address Details"
                      : "Edit Address Details"}
                  </button>
                </div>
              )}

              {/* Map Modal */}
              <Suspense
                fallback={
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
                    <div className="w-12 h-12 border-2 border-[#a89068] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }
              >
                <MapModal
                  showMapModal={showMapModal}
                  setShowMapModal={setShowMapModal}
                  preciseDetails={preciseDetails}
                  setPreciseDetails={setPreciseDetails}
                  onAddressConfirm={handleAddressConfirm}
                  showNotification={showNotification}
                />
              </Suspense>

              {/* Mobile Number Modal */}
              <Suspense
                fallback={
                  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
                    <div className="w-12 h-12 border-2 border-[#a89068] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }
              >
                <MobileNumberModal
                  showMobileModal={showMobileModal}
                  setShowMobileModal={setShowMobileModal}
                  userProfile={userProfile}
                  onSaveMobileNumber={handleSaveMobileNumber}
                  showNotification={showNotification}
                  isSaving={isSavingMobile}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </main>

      {/* Coupon Modal */}
      {showCouponModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowCouponModal(false)}
        >
          <div
            className="bg-[#f5f7f8] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#2e443c] p-6 flex items-center justify-between border-b border-white/10">
              <h2 className="text-xl font-serif text-white">
                Available Coupons
              </h2>
              <button
                onClick={() => setShowCouponModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <i className="fa-solid fa-xmark text-white"></i>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-88px)] custom-scrollbar">
              <Suspense fallback={<ComponentLoader />}>
                <CouponList onCouponApplied={handleCouponApplied} userId={userProfile?.userId} />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Footer */}
      <div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-[#2e443c] border-t border-white/10 p-4 px-6 z-50 lg:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.4)]"
      >
        <div className="flex items-center justify-around gap-5 max-w-[1200px] mx-auto">
          <div className="flex flex-col">
            <span className="text-[9px] text-[#a89068] uppercase tracking-widest font-bold">
              Total Payable
            </span>
            <span className="text-2xl font-serif text-white">
              ₹
              {(
                pricingDetails.subtotal +
                pricingDetails.shipping -
                pricingDetails.discount
              ).toLocaleString()}
            </span>
          </div>
          <button
            onClick={!address ? handleScrollToAddress : handlePayment}
            disabled={isOrdering || showMobileModal}
            className={`flex-1 h-10 max-w-[150px] rounded-xl font-bold uppercase tracking-widest text-[11px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 ${
              showMobileModal
                ? "bg-gray-400 text-white cursor-not-allowed opacity-60"
                : !address
                ? "bg-[#a89068] text-white border border-[#a89068] hover:bg-[#a89068]/90"
                : "bg-[#a89068] text-white hover:bg-[#2e443c]"
            }`}
          >
            {isOrdering ? (
              <>
                <div className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{" "}
                Proc...
              </>
            ) : !address ? (
              <>
                <i className="fa-solid fa-map-pin text-[12px]"></i>
                Set Address
              </>
            ) : (
              <>
                Pay Now <i className="fa-solid fa-lock text-[10px]"></i>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

export default CheckoutPage;