import { useState, useEffect, lazy, Suspense, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import {
  useGetUserProfileQuery,
  useGetRazorpayKeyQuery,
  useCreateOrderMutation,
  useCreateGuestOrderMutation,
  useApplyCouponMutation,
  useGetSavedAddressesQuery,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useUpdateCartMutation,
  useUpdateUserProfileMutation,
} from "../store/api/userApi";
import { setShowLoginModal } from "../store/slices/uiSlice";
import { useUI } from "../hooks/useRedux";
import { clearCart, removeItem } from "../store/slices/cartSlice";
import { fetchCsrfToken } from "../store/api/apiSlice";
import CouponInput from "../component/CouponInput";
import { ComponentLoader } from "../component/layout/LoadingSpinner";
import { trackBeginCheckout, trackPurchase } from "../utils/analytics";

const CouponList = lazy(() => import("../component/CouponList"));
const MobileNumberModal = lazy(() => import("../component/MobileNumberModal"));
const GoogleAddressFormModal = lazy(() => import("../component/GoogleAddressFormModal"));

const STEPS = [
  { number: 1, label: "Contact" },
  { number: 2, label: "Address" },
  { number: 3, label: "Review & Pay" },
];

const Field = ({ label, required, error, children }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
      {label} {required && <span className="text-red-400 normal-case font-normal text-xs">*</span>}
    </label>
    {children}
    {error && (
      <p className="flex items-center gap-1.5 text-[11px] text-red-500 font-medium">
        <i className="fa-solid fa-circle-exclamation text-[9px]" /> {error}
      </p>
    )}
  </div>
);

const inputCls = (err) =>
  `w-full h-12 bg-white border rounded-xl px-4 text-sm text-gray-800 placeholder:text-gray-300 outline-none transition-all ${
    err
      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
      : "border-gray-200 focus:border-[#2e443c] focus:ring-2 focus:ring-[#2e443c]/8"
  }`;

const iconInput = (icon, children) => (
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-300">
      <i className={`fa-solid ${icon} text-sm`} />
    </div>
    {children}
  </div>
);

const PriceRows = ({ subtotal, shipping, discount, appliedCoupon, totalToPay, itemCount }) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">Subtotal <span className="text-gray-400">({itemCount} item{itemCount !== 1 ? "s" : ""})</span></span>
      <span className="font-medium text-gray-800">₹{subtotal.toLocaleString()}</span>
    </div>
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">Delivery</span>
      <span className="font-medium text-gray-800">₹{shipping.toLocaleString()}</span>
    </div>
    {appliedCoupon && discount > 0 && (
      <div className="flex justify-between items-center text-sm font-semibold text-emerald-600 bg-emerald-50 rounded-xl px-3.5 py-2.5 -mx-1">
        <span className="flex items-center gap-2">
          <i className="fa-solid fa-tag text-xs" /> {appliedCoupon}
        </span>
        <span>−₹{discount.toLocaleString()}</span>
      </div>
    )}
    <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
      <span className="font-bold text-gray-900">Total</span>
      <div className="text-right">
        <span className="text-2xl font-bold text-[#2e443c]">₹{totalToPay.toLocaleString()}</span>
        <p className="text-[10px] text-gray-400 mt-0.5">Incl. GST</p>
      </div>
    </div>
  </div>
);

const CheckoutPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification } = useUI();
  const showNotificationRef = useRef(showNotification);
  useEffect(() => { showNotificationRef.current = showNotification; }, [showNotification]);

  const { items: cartItems, selections: cartSelections } = useSelector((s) => s.cart);
  const { isAuthenticated } = useSelector((s) => s.auth);
  const isGuest = !isAuthenticated && !localStorage.getItem("authToken");
  const paymentCompletedRef = useRef(false);
  const cartLoadedRef = useRef(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [preciseDetails, setPreciseDetails] = useState({ landmark: "", flatNo: "" });
  const [savedAddress, setSavedAddress] = useState([]);
  const [currentAddressId, setCurrentAddressId] = useState(null);
  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const [senderMobile, setSenderMobile] = useState("");
  const [isSavingMobile, setIsSavingMobile] = useState(false);
  const [useDifferentDeliveryContact, setUseDifferentDeliveryContact] = useState(false);
  const [deliveryMobile, setDeliveryMobile] = useState("");
  const [deliveryMobileErrors, setDeliveryMobileErrors] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [pricingDetails, setPricingDetails] = useState({ subtotal: 0, shipping: 149, discount: 0 });
  const [paymentError, setPaymentError] = useState(null);
  const [showRetry, setShowRetry] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestMobile, setGuestMobile] = useState("");
  const [guestErrors, setGuestErrors] = useState({});

  const { data: userProfileData, isLoading: profileLoading, refetch: refetchProfile } =
    useGetUserProfileQuery(undefined, { skip: isGuest });
  const { data: razorpayKeyData } = useGetRazorpayKeyQuery();
  const [createOrder, { isLoading: isOrderingAuth }] = useCreateOrderMutation();
  const [createGuestOrder, { isLoading: isOrderingGuest }] = useCreateGuestOrderMutation();
  const isOrdering = isGuest ? isOrderingGuest : isOrderingAuth;
  const [applyCouponMutation] = useApplyCouponMutation();
  const [updateAddressMutation] = useUpdateAddressMutation();
  const [deleteAddressMutation] = useDeleteAddressMutation();
  const [updateCart] = useUpdateCartMutation();
  const [updateUserProfile] = useUpdateUserProfileMutation();
  const { data: savedAddressData, refetch: refetchAddresses } =
    useGetSavedAddressesQuery(undefined, { skip: isGuest });

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchCsrfToken().catch((e) => console.warn("[Checkout] CSRF fetch failed:", e));
  }, []);

  useEffect(() => {
    if (savedAddressData?.success) {
      const addresses = savedAddressData.data?.extractingAddressFromAddressIds || [];
      const ids = savedAddressData.data?.addressId || [];
      setSavedAddress(addresses.map((addr, i) => ({ ...addr, addressId: ids[i], displayIndex: i })));
    }
  }, [savedAddressData]);

  useEffect(() => {
    if (cartItems.length > 0) cartLoadedRef.current = true;
    if (isGuest) {
      if (cartItems.length === 0 && cartLoadedRef.current && !paymentCompletedRef.current) navigate("/products");
      setIsLoading(false);
      return;
    }
    if (cartItems.length === 0 && cartLoadedRef.current && !paymentCompletedRef.current && !profileLoading && userProfileData) {
      navigate("/products"); return;
    }
    if (userProfileData?.data) {
      setUserProfile(userProfileData.data?.data);
      setIsLoading(false);
    } else if (!profileLoading) {
      refetchProfile();
    }
  }, [isGuest, isAuthenticated, cartItems.length, navigate, userProfileData, profileLoading, refetchProfile]);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.userAddress && !address) setAddress(userProfile.userAddress);
      if (userProfile.userPinCode && !pincode) setPincode(userProfile.userPinCode);
      if ((userProfile?.mobileNumber || userProfile?.mobile) && !senderMobile)
        setSenderMobile(String(userProfile.mobileNumber || userProfile.mobile));
    }
  }, [userProfile]);

  const cartItemsLength = cartItems?.length;
  const userEmail = userProfile?.email;

  useEffect(() => {
    if (isGuest) {
      const subtotal = cartItems.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 0), 0);
      setPricingDetails({ subtotal, shipping: 149, discount: 0 });
      return;
    }
    const fetchPricing = async () => {
      if (!cartItemsLength) return;
      try {
        const r = await applyCouponMutation({ couponCode: appliedCoupon || null, email: userEmail }).unwrap();
        if (r.success && r.data?.summary)
          setPricingDetails({ subtotal: r.data.summary.subtotal || 0, shipping: r.data.summary.shipping || 149, discount: r.data.summary.discount || 0 });
      } catch (err) {
        if (err?.data?.statusCode === 400 && appliedCoupon) {
          setAppliedCoupon(null);
          try {
            const r2 = await applyCouponMutation({ couponCode: null, email: userEmail }).unwrap();
            if (r2.success && r2.data?.summary)
              setPricingDetails({ subtotal: r2.data.summary.subtotal || 0, shipping: r2.data.summary.shipping || 149, discount: r2.data.summary.discount || 0 });
          } catch (_) {}
        }
      }
    };
    fetchPricing();
  }, [cartItemsLength, applyCouponMutation, appliedCoupon, userEmail, isGuest]);

  useEffect(() => {
    if (cartItems.length > 0)
      trackBeginCheckout({
        items: cartItems.map((i) => ({ itemId: i.mongoId || i.id, itemName: i.name, itemVariant: i.selectedVariant || "N/A", price: i.price, quantity: i.quantity })),
        value: pricingDetails.subtotal,
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const validateMobile = (m) => /^[0-9]{10}$/.test(String(m).trim());
  const stripCC = (m) => {
    const t = String(m || "").trim();
    if (t.startsWith("+91")) return t.substring(3);
    if (t.startsWith("91") && t.length === 12) return t.substring(2);
    return t;
  };
  const goToStep = (n) => { setCurrentStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const loadRazorpay = () =>
    new Promise((res) => {
      if (window.Razorpay) return res(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => res(true); s.onerror = () => res(false);
      document.body.appendChild(s);
    });

  const handleAddressConfirm = (suggestion, addressId, deliveryAddressFull) => {
    setAddress(deliveryAddressFull || suggestion.formattedAddress);
    setPincode(String(suggestion.pinCode || ""));
    setCurrentAddressId(addressId);
    refetchAddresses();
  };

  const handleResetAddress = () => {
    setAddress(""); setPincode(""); setPreciseDetails({ landmark: "", flatNo: "" });
    setCurrentAddressId(null);
    showNotification("Address cleared", "info");
  };

  const selectSavedAddress = (addr) => {
    setAddress(addr.deliveryAddressFull || addr.formattedAddress);
    setPincode(String(addr.pinCode || ""));
    setCurrentAddressId(addr.addressId);
    setPreciseDetails({ landmark: addr.landmark || "", flatNo: addr.flatOrFloorNumber || "" });
    showNotification("Address selected", "success");
  };

  const handleUpdateAddressDetails = async () => {
    if (!currentAddressId || !address) return;
    try {
      const a = savedAddress.find((x) => x.addressId === currentAddressId) || {};
      const r = await updateAddressMutation({
        addressId: currentAddressId, landmark: preciseDetails.landmark,
        flatOrFloorNumber: preciseDetails.flatNo, formattedAddress: address, pinCode: pincode,
        lat: a.location?.coordinates[1] || 0, long: a.location?.coordinates[0] || 0,
        city: a.city || "", state: a.state || "", placeId: a.placeId || "N/A",
      }).unwrap();
      if (r.success) { showNotification("Address saved", "success"); refetchAddresses(); }
    } catch (_) { showNotification("Failed to update address", "error"); }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!addressId) return;
    try {
      await deleteAddressMutation(addressId).unwrap();
      setSavedAddress((p) => p.filter((a) => a?.addressId !== addressId));
      if (currentAddressId === addressId) handleResetAddress();
      showNotification("Address deleted", "success");
      refetchAddresses();
    } catch (e) { showNotification(e.data?.message || "Failed to delete", "error"); }
  };

  const handleRemoveItem = async (productId, selectedVariant) => {
    const v = selectedVariant || "N/A";
    if (isGuest) { dispatch(removeItem({ id: productId, selectedVariant: v })); return; }
    try {
      const item = cartItems.find((i) => i.id === productId && (i.selectedVariant || "N/A") === v);
      await updateCart({ productId: item?.mongoId || productId, quantity: 1, action: "remove", variant: v, image: item?.image || "" }).unwrap();
      if (cartItems.length === 1) navigate("/products");
    } catch (e) { showNotification(e?.data?.message || "Failed to remove item", "error"); }
  };

  const handleSaveMobileNumber = async (mobileNumber) => {
    const m = stripCC(mobileNumber);
    if (!m) throw "Please enter a mobile number";
    if (!validateMobile(m)) throw "Mobile number must be exactly 10 digits";
    setIsSavingMobile(true);
    try {
      const r = await updateUserProfile({ mobileNumber: m }).unwrap();
      if (r.success) { setSenderMobile(m); showNotification("Mobile saved!", "success"); refetchProfile(); }
      else throw r.message || "Failed to save";
    } catch (e) { throw e?.data?.message || e?.message || e || "Failed to save."; }
    finally { setIsSavingMobile(false); }
  };

  const handleCouponApplied = async (couponData) => {
    try {
      const r = await applyCouponMutation({ couponCode: couponData.code, email: userEmail }).unwrap();
      if (r.success && r.data?.summary) {
        setAppliedCoupon(couponData.code);
        setPricingDetails({ subtotal: r.data.summary.subtotal || 0, shipping: r.data.summary.shipping || 149, discount: r.data.summary.discount || 0 });
        showNotification(r.message || "Coupon applied!", "success");
        setShowCouponModal(false);
      }
    } catch (e) { showNotification(e?.data?.message || "Failed to apply coupon", "error"); }
  };

  const handleCouponRemoved = async () => {
    try {
      const r = await applyCouponMutation({ couponCode: null, email: userEmail }).unwrap();
      if (r.success && r.data?.summary) {
        setAppliedCoupon(null);
        setPricingDetails({ subtotal: r.data.summary.subtotal || 0, shipping: r.data.summary.shipping || 149, discount: r.data.summary.discount || 0 });
        showNotification("Coupon removed", "success");
      }
    } catch (e) { showNotification(e?.data?.message || "Failed to remove coupon", "error"); }
  };

  const handleStep1Next = () => {
    if (isGuest) {
      const errors = {};
      if (!guestName.trim()) errors.name = "Full name is required";
      if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) errors.email = "Valid email is required";
      if (!/^[0-9]{10}$/.test(guestMobile.trim())) errors.mobile = "Valid 10-digit number required";
      if (Object.keys(errors).length) { setGuestErrors(errors); return; }
      setGuestErrors({});
    } else {
      const m = stripCC(String(senderMobile || ""));
      if (!m || !validateMobile(m)) { setShowMobileModal(true); return; }
    }
    goToStep(2);
  };

  const handleStep2Next = () => {
    if (!address.trim()) { showNotification("Please enter a delivery address", "error"); return; }
    if (!pincode.trim()) { showNotification("Please enter your pincode", "error"); return; }
    goToStep(3);
  };

  const handlePayment = async () => {
    setPaymentError(null);

    if (isGuest) {
      try {
        const orderResult = await createGuestOrder({
          items: cartItems.map((i) => ({
            productId: i.mongoId || i.id.split(":")[0], quantity: i.quantity,
            variant: (i.selectedVariant && i.selectedVariant !== "N/A") ? i.selectedVariant : (cartSelections[i.id]?.variant || "N/A"),
          })),
          guestInfo: { name: guestName.trim(), email: guestEmail.trim().toLowerCase(), mobile: guestMobile.trim() },
          deliveryAddress: {
            formattedAddress: address, deliveryAddressFull: address,
            pinCode: pincode ? parseInt(pincode, 10) : null,
            landmark: preciseDetails.landmark, flatOrFloorNumber: preciseDetails.flatNo, lat: 0, long: 0,
          },
        }).unwrap();
        if (!await loadRazorpay()) { showNotification("Could not load payment.", "error"); return; }
        const rp = new window.Razorpay({
          key: razorpayKeyData?.data,
          amount: orderResult.data?.amount || orderResult.amount,
          currency: "INR", name: "Urban Nook", description: "Purchase from Urban Nook", image: "/assets/logo.webp",
          order_id: orderResult.data?.razorpayOrderId || orderResult.razorpayOrderId,
          handler: (response) => {
            paymentCompletedRef.current = true;
            dispatch(clearCart());
            localStorage.removeItem("guestCart"); localStorage.removeItem("guestId");
            navigate(`/payment-processing/${response.razorpay_order_id}`);
          },
          prefill: { name: guestName.trim(), email: guestEmail.trim(), contact: guestMobile.trim() },
          notes: { address, pincode }, theme: { color: "#2E443C" },
          modal: { ondismiss: () => { setPaymentError("Payment cancelled. Your cart is safe."); setShowRetry(true); }, escape: false, confirm_close: true },
        });
        rp.on("payment.failed", (r) => {
          setPaymentError(r.error.description || "Payment failed. Please try again.");
          setShowRetry(true);
        });
        rp.open();
      } catch (e) {
        const msg = e?.data?.message || e?.message || "Failed to initialize payment.";
        showNotification(msg, "error"); setPaymentError(msg); setShowRetry(true);
      }
      return;
    }

    const senderMobileStr = stripCC(String(senderMobile || ""));
    if (!senderMobileStr || !validateMobile(senderMobileStr)) { setShowMobileModal(true); return; }
    const deliveryMobileStr = stripCC(String(deliveryMobile || ""));
    if (useDifferentDeliveryContact && deliveryMobileStr && !validateMobile(deliveryMobileStr)) {
      showNotification("Please enter a valid delivery contact", "error"); return;
    }
    if (!address.trim()) { showNotification("Please select a delivery address", "error"); return; }
    try {
      const selectedFullAddr = savedAddress.find((a) => a.addressId === currentAddressId);
      const orderResult = await createOrder({
        items: cartItems.map((i) => ({
          productId: i.mongoId || i.id.split(":")[0], quantity: i.quantity,
          variant: (i.selectedVariant && i.selectedVariant !== "N/A") ? i.selectedVariant : (cartSelections[i.id]?.variant || "N/A"),
        })),
        senderMobile: senderMobileStr, userEmail: userProfile?.email,
        receiverMobile: useDifferentDeliveryContact && deliveryMobileStr ? deliveryMobileStr : senderMobileStr,
        addressId: currentAddressId,
        deliveryAddress: {
          addressId: currentAddressId, fullName: userProfile?.userName || userProfile?.name || "",
          mobileNumber: useDifferentDeliveryContact && deliveryMobileStr ? deliveryMobileStr : senderMobileStr,
          formattedAddress: address, deliveryAddressFull: address,
          pinCode: pincode ? parseInt(pincode, 10) : null,
          landmark: preciseDetails.landmark, flatOrFloorNumber: preciseDetails.flatNo,
          lat: selectedFullAddr?.location?.coordinates?.[1] || 0,
          long: selectedFullAddr?.location?.coordinates?.[0] || 0,
        },
      }).unwrap();
      if (!await loadRazorpay()) { showNotification("Could not load payment.", "error"); return; }
      const rp = new window.Razorpay({
        key: razorpayKeyData?.data,
        amount: orderResult.data?.amount || orderResult.amount,
        currency: "INR", name: "Urban Nook", description: "Purchase from Urban Nook", image: "/assets/logo.webp",
        order_id: orderResult.data?.razorpayOrderId || orderResult.razorpayOrderId || orderResult.id,
        handler: async (response) => {
          try {
            trackPurchase({
              transactionId: response.razorpay_order_id,
              value: totalToPay, shipping: pricingDetails.shipping, tax: 0,
              items: cartItems.map((i) => ({ itemId: i.mongoId || i.id, itemName: i.name, itemVariant: i.selectedVariant || "N/A", price: i.price, quantity: i.quantity })),
            });
            navigate(`/payment-processing/${response.razorpay_order_id}`);
          } catch (_) { setPaymentError("Payment verification failed. Contact support if amount was debited."); }
        },
        prefill: { name: userProfile?.userName || userProfile?.name || "", email: userProfile?.email || "", contact: senderMobileStr },
        notes: { address, pincode }, theme: { color: "#2E443C" },
        modal: { ondismiss: () => { setPaymentError("Payment cancelled. Your cart is safe."); setShowRetry(true); }, escape: false, confirm_close: true },
      });
      rp.on("payment.failed", (r) => {
        setPaymentError(r.error.description || "Payment failed. Please try again.");
        setShowRetry(true);
      });
      rp.open();
    } catch (e) {
      const msg = e?.data?.message || e?.message || "Failed to initialize payment.";
      showNotification(msg, "error"); setPaymentError(msg); setShowRetry(true);
    }
  };

  const totalToPay = pricingDetails.subtotal + pricingDetails.shipping - pricingDetails.discount;
  const userName = isGuest ? guestName : (userProfile?.userName || userProfile?.name || "");
  const userInitials = userName ? userName.split(" ").filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 2) : "?";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white pt-32">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#a89068] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">Loading checkout</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#f5f7f5]">

      {/* ── Step wizard ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 pt-28 lg:pt-36">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-6">
          {/* breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mb-6">
            <button onClick={() => navigate(-1)} className="hover:text-[#2e443c] transition-colors flex items-center gap-1.5">
              <i className="fa-solid fa-chevron-left text-[10px]" /> Cart
            </button>
            <span>/</span>
            <span className="text-[#2e443c] font-semibold">{STEPS[currentStep - 1].label}</span>
          </div>

          {/* Step circles */}
          <div className="flex items-start max-w-sm">
            {STEPS.map((step, idx) => (
              <Fragment key={step.number}>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => currentStep > step.number && goToStep(step.number)}
                    disabled={currentStep <= step.number}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                      currentStep > step.number
                        ? "bg-[#2e443c] text-white cursor-pointer hover:bg-[#1a2822] shadow-md"
                        : currentStep === step.number
                        ? "bg-[#a89068] text-white ring-[5px] ring-[#a89068]/20 shadow-lg shadow-[#a89068]/25"
                        : "bg-gray-100 text-gray-300 cursor-default"
                    }`}
                  >
                    {currentStep > step.number
                      ? <i className="fa-solid fa-check text-xs" />
                      : step.number}
                  </button>
                  <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider whitespace-nowrap leading-none transition-colors duration-300 ${
                    currentStep === step.number ? "text-[#2e443c]"
                      : currentStep > step.number ? "text-gray-400"
                      : "text-gray-300"
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mt-5 mx-3 sm:mx-4 rounded-full transition-all duration-500 ${
                    currentStep > step.number ? "bg-[#2e443c]" : "bg-gray-150 bg-gray-200"
                  }`} />
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 lg:py-10 pb-28 lg:pb-14 lg:grid lg:grid-cols-[1fr_360px] lg:gap-10 lg:items-start">

        {/* ── Left: form ───────────────────────────────────────────────── */}
        <div className="min-w-0">

          {/* ══════════ STEP 1 — CONTACT ════════════════════════════════ */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-serif text-gray-900 leading-tight">
                    {isGuest ? "How can we reach you?" : "Your contact details"}
                  </h1>
                  <p className="text-sm text-gray-400 mt-1.5">
                    {isGuest ? "We'll send your order confirmation here." : "Review or update your contact info."}
                  </p>
                </div>
                {isGuest && (
                  <button
                    onClick={() => dispatch(setShowLoginModal(true))}
                    className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#2e443c]/20 text-[#2e443c] text-xs font-bold hover:bg-[#2e443c]/5 transition-all whitespace-nowrap"
                  >
                    <i className="fa-solid fa-arrow-right-to-bracket text-[10px]" />
                    Sign in
                  </button>
                )}
              </div>

              {/* Guest notice */}
              {isGuest && (
                <div className="rounded-2xl overflow-hidden border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/40">
                  <div className="flex items-start gap-4 p-5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <i className="fa-solid fa-user-astronaut text-amber-500 text-base" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-amber-900">Continuing as Guest</p>
                      <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
                        No account needed! After payment, we'll auto-create a free account and email you the login details so you can track your order anytime.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Auth: logged-in card */}
              {!isGuest && userProfile && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2e443c] to-[#4b7060] flex items-center justify-center text-white font-bold text-base shrink-0">
                    {userInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{userProfile?.userName || userProfile?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{userProfile?.email}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Signed in</span>
                  </div>
                </div>
              )}

              {/* Contact form card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                  <div className="w-8 h-8 rounded-xl bg-[#2e443c]/8 flex items-center justify-center">
                    <i className="fa-solid fa-address-card text-[#2e443c] text-sm" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Contact Information</p>
                    <p className="text-xs text-gray-400">Used for delivery updates</p>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Full Name */}
                  <Field label="Full Name" required={isGuest} error={guestErrors.name}>
                    {isGuest
                      ? iconInput("fa-user", <input type="text" value={guestName} onChange={(e) => { setGuestName(e.target.value); setGuestErrors((p) => ({ ...p, name: "" })); }} placeholder="e.g. Priya Sharma" className={`${inputCls(guestErrors.name)} pl-10`} />)
                      : iconInput("fa-user", <div className={`${inputCls(false)} pl-10 flex items-center bg-gray-50 cursor-default text-gray-500`}>{userProfile?.userName || userProfile?.name || "—"}</div>)
                    }
                  </Field>

                  {/* Email */}
                  <Field label="Email Address" required={isGuest} error={guestErrors.email}>
                    {isGuest
                      ? iconInput("fa-envelope", <input type="email" value={guestEmail} onChange={(e) => { setGuestEmail(e.target.value); setGuestErrors((p) => ({ ...p, email: "" })); }} placeholder="you@example.com" className={`${inputCls(guestErrors.email)} pl-10`} />)
                      : iconInput("fa-envelope", <div className={`${inputCls(false)} pl-10 flex items-center bg-gray-50 cursor-default text-gray-500`}>{userProfile?.email || "—"}</div>)
                    }
                  </Field>

                  {/* Mobile */}
                  <Field label="Mobile Number" required error={guestErrors.mobile}>
                    {isGuest
                      ? iconInput("fa-mobile-screen-button",
                          <input type="tel" value={guestMobile} onChange={(e) => { setGuestMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); setGuestErrors((p) => ({ ...p, mobile: "" })); }} placeholder="10-digit number" className={`${inputCls(guestErrors.mobile)} pl-10`} />
                        )
                      : (
                        <div className="flex gap-2">
                          {iconInput("fa-mobile-screen-button",
                            <div className={`${inputCls(false)} pl-10 flex items-center ${senderMobile && senderMobile !== "N/A" ? "bg-gray-50 text-gray-700" : "bg-gray-50 text-gray-300"} cursor-default flex-1`}>
                              {senderMobile && senderMobile !== "N/A" ? senderMobile : "Not added yet"}
                            </div>
                          )}
                          <button onClick={() => setShowMobileModal(true)} className="shrink-0 h-12 px-4 bg-[#2e443c] text-white text-xs font-bold rounded-xl hover:bg-[#1a2822] transition-colors whitespace-nowrap">
                            {senderMobile && senderMobile !== "N/A" ? "Change" : "+ Add"}
                          </button>
                        </div>
                      )
                    }
                  </Field>

                  {/* Different delivery contact */}
                  {!isGuest && (
                    <div className="pt-1 border-t border-gray-50 space-y-3">
                      <button
                        onClick={() => { setUseDifferentDeliveryContact((p) => !p); if (useDifferentDeliveryContact) { setDeliveryMobile(""); setDeliveryMobileErrors(""); } }}
                        className="flex items-center gap-3 w-full text-left group"
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${useDifferentDeliveryContact ? "bg-[#2e443c] border-[#2e443c]" : "border-gray-200 group-hover:border-[#a89068]/60"}`}>
                          {useDifferentDeliveryContact && <i className="fa-solid fa-check text-white text-[9px]" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Deliver to a different person</p>
                          <p className="text-xs text-gray-400">Gift for someone else?</p>
                        </div>
                      </button>
                      {useDifferentDeliveryContact && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200 pl-8">
                          <Field label="Recipient's Mobile" required error={deliveryMobileErrors}>
                            {iconInput("fa-mobile-screen-button",
                              <input type="tel" value={deliveryMobile}
                                onChange={(e) => setDeliveryMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                onBlur={() => { if (deliveryMobile && !validateMobile(deliveryMobile)) setDeliveryMobileErrors("Must be exactly 10 digits"); else setDeliveryMobileErrors(""); }}
                                placeholder="Recipient's mobile"
                                className={`${inputCls(deliveryMobileErrors)} pl-10`}
                              />
                            )}
                          </Field>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleStep1Next}
                className="w-full h-14 bg-[#2e443c] text-white rounded-2xl font-bold text-sm hover:bg-[#1a2822] active:scale-[0.99] transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#2e443c]/20"
              >
                Continue to Address
                <i className="fa-solid fa-arrow-right text-xs" />
              </button>

              <div className="flex items-center justify-center gap-5 text-gray-300">
                <i className="fa-brands fa-cc-visa text-xl" />
                <i className="fa-brands fa-cc-mastercard text-xl" />
                <i className="fa-brands fa-google-pay text-xl" />
                <i className="fa-solid fa-shield-halved text-base" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-300">100% Secure</span>
              </div>
            </div>
          )}

          {/* ══════════ STEP 2 — ADDRESS ═════════════════════════════════ */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

              <div>
                <h1 className="text-2xl sm:text-3xl font-serif text-gray-900 leading-tight">Delivery Address</h1>
                <p className="text-sm text-gray-400 mt-1.5">Where should we send your order?</p>
              </div>

              {isGuest ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                    <div className="w-8 h-8 rounded-xl bg-[#2e443c]/8 flex items-center justify-center">
                      <i className="fa-solid fa-map-location-dot text-[#2e443c] text-sm" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Enter Delivery Address</p>
                      <p className="text-xs text-gray-400">We deliver across India</p>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <Field label="Full Address" required>
                      <textarea
                        value={address} rows={3}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House no., Street, Area, City, State"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-300 outline-none focus:border-[#2e443c] focus:ring-2 focus:ring-[#2e443c]/8 transition-all resize-none leading-relaxed"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Pincode" required>
                        {iconInput("fa-location-pin",
                          <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" className={`${inputCls(false)} pl-10`} />
                        )}
                      </Field>
                      <Field label="Flat / Floor">
                        {iconInput("fa-building",
                          <input type="text" value={preciseDetails.flatNo} onChange={(e) => setPreciseDetails((p) => ({ ...p, flatNo: e.target.value }))} placeholder="e.g. A-401" className={`${inputCls(false)} pl-10`} />
                        )}
                      </Field>
                    </div>
                    <Field label="Landmark (optional)">
                      {iconInput("fa-location-crosshairs",
                        <input type="text" value={preciseDetails.landmark} onChange={(e) => setPreciseDetails((p) => ({ ...p, landmark: e.target.value }))} placeholder="e.g. Near Metro Station" className={`${inputCls(false)} pl-10`} />
                      )}
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {address ? (
                    <div className="bg-white rounded-2xl border-2 border-[#2e443c]/15 shadow-sm overflow-hidden">
                      <div className="bg-[#2e443c]/4 px-5 py-3.5 border-b border-[#2e443c]/8 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-full bg-[#2e443c] flex items-center justify-center">
                            <i className="fa-solid fa-check text-white text-[9px]" />
                          </div>
                          <span className="text-xs font-bold text-[#2e443c] uppercase tracking-wider">Delivering to this address</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setShowMapModal(true)} className="text-xs font-bold text-[#a89068] hover:text-[#2e443c] transition-colors">Change</button>
                          <span className="text-gray-200 text-xs">|</span>
                          <button onClick={handleResetAddress} className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors">Reset</button>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div>
                          <p className="text-sm text-gray-700 leading-relaxed">{address}</p>
                          {pincode && <p className="text-xs text-gray-400 mt-1.5 font-mono font-medium">PIN — {pincode}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-50">
                          <Field label="Flat / Floor">
                            <input value={preciseDetails.flatNo} placeholder="e.g. A-401" onChange={(e) => setPreciseDetails((p) => ({ ...p, flatNo: e.target.value }))} className={inputCls(false)} />
                          </Field>
                          <Field label="Landmark">
                            <input value={preciseDetails.landmark} placeholder="e.g. Near Metro" onChange={(e) => setPreciseDetails((p) => ({ ...p, landmark: e.target.value }))} className={inputCls(false)} />
                          </Field>
                        </div>
                        {currentAddressId && (
                          <button onClick={handleUpdateAddressDetails} className="w-full py-2.5 border border-[#2e443c]/15 rounded-xl text-[#2e443c] text-xs font-bold hover:bg-[#2e443c]/5 transition-colors flex items-center justify-center gap-2">
                            <i className="fa-regular fa-floppy-disk" /> Save address details
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowMapModal(true)}
                      className="w-full py-12 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-4 hover:border-[#a89068]/50 hover:bg-[#a89068]/3 transition-all group bg-white"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-[#a89068]/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#a89068]/20 transition-all">
                        <i className="fa-solid fa-map-location-dot text-2xl text-[#a89068]" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-700 group-hover:text-[#2e443c] transition-colors">Add Delivery Address</p>
                        <p className="text-xs text-gray-400 mt-1">Use your current location or search by address</p>
                      </div>
                    </button>
                  )}

                  {savedAddress.length > 0 && !address && (
                    <div className="space-y-3">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-1 flex items-center gap-2">
                        <i className="fa-solid fa-clock-rotate-left text-[9px]" /> Saved Addresses
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(showAllAddresses ? savedAddress : savedAddress.slice(0, 4)).map((addr, i) => (
                          <div
                            key={addr.addressId || i} onClick={() => selectSavedAddress(addr)}
                            className="bg-white border border-gray-100 hover:border-[#2e443c]/25 rounded-xl p-4 cursor-pointer transition-all group relative hover:shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-lg bg-gray-50 group-hover:bg-[#2e443c]/8 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                                <i className="fa-solid fa-location-dot text-gray-300 text-xs group-hover:text-[#2e443c] transition-colors" />
                              </div>
                              <div className="flex-1 min-w-0 pr-5">
                                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed group-hover:text-gray-800 transition-colors">{addr.formattedAddress}</p>
                                <p className="text-[10px] text-gray-400 font-mono mt-1">{addr.pinCode}</p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteAddress(addr.addressId); }}
                              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-gray-200 hover:text-red-400 hover:bg-red-50 transition-all"
                            >
                              <i className="fa-solid fa-xmark text-xs" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {savedAddress.length > 4 && (
                        <button onClick={() => setShowAllAddresses((p) => !p)} className="text-xs font-semibold text-[#a89068] hover:text-[#2e443c] transition-colors flex items-center gap-1.5 px-1">
                          <i className={`fa-solid fa-chevron-${showAllAddresses ? "up" : "down"} text-[10px]`} />
                          {showAllAddresses ? "Show less" : `View all ${savedAddress.length} addresses`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleStep2Next}
                disabled={!address.trim()}
                className="w-full h-14 bg-[#2e443c] text-white rounded-2xl font-bold text-sm hover:bg-[#1a2822] active:scale-[0.99] transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#2e443c]/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                Continue to Review
                <i className="fa-solid fa-arrow-right text-xs" />
              </button>
            </div>
          )}

          {/* ══════════ STEP 3 — REVIEW & PAY ═══════════════════════════ */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

              <div>
                <h1 className="text-2xl sm:text-3xl font-serif text-gray-900 leading-tight">Review Your Order</h1>
                <p className="text-sm text-gray-400 mt-1.5">Almost there — confirm everything looks right</p>
              </div>

              {/* Contact + Address summary row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contact */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#a89068]/10 flex items-center justify-center">
                        <i className="fa-solid fa-user text-[#a89068] text-xs" />
                      </div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</span>
                    </div>
                    <button onClick={() => goToStep(1)} className="flex items-center gap-1 text-xs font-bold text-[#a89068] hover:text-[#2e443c] transition-colors">
                      <i className="fa-solid fa-pen text-[9px]" /> Edit
                    </button>
                  </div>
                  <p className="text-sm font-bold text-gray-800">{isGuest ? guestName : (userProfile?.userName || userProfile?.name)}</p>
                  <p className="text-xs text-gray-400 mt-1 truncate">{isGuest ? guestEmail : userProfile?.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">{isGuest ? guestMobile : senderMobile}</p>
                </div>

                {/* Address */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#a89068]/10 flex items-center justify-center">
                        <i className="fa-solid fa-location-dot text-[#a89068] text-xs" />
                      </div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery</span>
                    </div>
                    <button onClick={() => goToStep(2)} className="flex items-center gap-1 text-xs font-bold text-[#a89068] hover:text-[#2e443c] transition-colors">
                      <i className="fa-solid fa-pen text-[9px]" /> Edit
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{address}</p>
                  <p className="text-[11px] text-gray-400 mt-1.5 font-mono font-medium">PIN {pincode}</p>
                  {(preciseDetails.flatNo || preciseDetails.landmark) && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {[preciseDetails.flatNo, preciseDetails.landmark].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>

              {/* Mobile order summary accordion */}
              <div className="lg:hidden bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => setSummaryOpen((p) => !p)} className="w-full flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#2e443c]/8 flex items-center justify-center">
                      <i className="fa-solid fa-bag-shopping text-[#2e443c] text-xs" />
                    </div>
                    <span className="text-sm font-bold text-gray-800">Order Summary</span>
                    <span className="text-[10px] bg-[#2e443c] text-white px-2 py-0.5 rounded-md font-bold">{cartItems.length}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-[#2e443c]">₹{totalToPay.toLocaleString()}</span>
                    <i className={`fa-solid fa-chevron-${summaryOpen ? "up" : "down"} text-gray-400 text-xs`} />
                  </div>
                </button>
                {summaryOpen && (
                  <div className="border-t border-gray-50">
                    <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                      {cartItems.map((item) => (
                        <div key={`${item.id}-${item.selectedVariant || "default"}`} className="flex items-center gap-3 px-5 py-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                            <img src={item.image || "/placeholder.jpg"} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                            {item.selectedVariant && item.selectedVariant !== "N/A" && <p className="text-[10px] text-gray-400">{item.selectedVariant}</p>}
                            <p className="text-[10px] text-gray-400">Qty {item.quantity}</p>
                          </div>
                          <p className="text-sm font-bold text-gray-800 shrink-0">₹{(Number(item.price) * Number(item.quantity)).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                    <div className="px-5 py-4 border-t border-gray-50"><PriceRows subtotal={pricingDetails.subtotal} shipping={pricingDetails.shipping} discount={pricingDetails.discount} appliedCoupon={appliedCoupon} totalToPay={totalToPay} itemCount={cartItems.length} /></div>
                  </div>
                )}
              </div>

              {/* Coupon — auth only */}
              {!isGuest && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                    <div className="w-8 h-8 rounded-xl bg-[#a89068]/10 flex items-center justify-center">
                      <i className="fa-solid fa-percent text-[#a89068] text-sm" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Promo Code</p>
                      <p className="text-xs text-gray-400">Apply a discount coupon</p>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <CouponInput key={appliedCoupon || "none"} appliedCoupon={appliedCoupon} discount={pricingDetails.discount} onCouponApplied={handleCouponApplied} onCouponRemoved={handleCouponRemoved} />
                    {!appliedCoupon && (
                      <button onClick={() => setShowCouponModal(true)} className="w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:border-[#a89068]/50 hover:text-[#a89068] transition-all flex items-center justify-center gap-2">
                        <i className="fa-solid fa-tags" /> Browse available coupons
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile-only price breakdown */}
              <div className="lg:hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Price Summary</p>
                <PriceRows subtotal={pricingDetails.subtotal} shipping={pricingDetails.shipping} discount={pricingDetails.discount} appliedCoupon={appliedCoupon} totalToPay={totalToPay} itemCount={cartItems.length} />
              </div>

              {/* Payment error */}
              {paymentError && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-triangle-exclamation text-red-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-800">Payment Failed</p>
                    <p className="text-xs text-red-600 mt-1 leading-relaxed">{paymentError}</p>
                    {showRetry && (
                      <button onClick={() => { setPaymentError(null); setShowRetry(false); }} className="mt-3 text-xs font-bold text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                        Dismiss &amp; Retry
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Desktop pay button (also in sidebar, shown here as fallback on md) */}
              <button
                onClick={handlePayment}
                disabled={isOrdering}
                className="lg:hidden w-full h-14 bg-[#2e443c] text-white rounded-2xl font-bold text-sm hover:bg-[#1a2822] active:scale-[0.99] transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#2e443c]/20 disabled:opacity-50"
              >
                {isOrdering
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
                  : <><i className="fa-solid fa-lock text-xs opacity-70" /> Place Order · ₹{totalToPay.toLocaleString()}</>
                }
              </button>

              <p className="text-center text-[11px] text-gray-300 flex items-center justify-center gap-2">
                <i className="fa-solid fa-shield-halved text-[#a89068]" />
                256-bit SSL encrypted · Razorpay secured
              </p>
            </div>
          )}
        </div>

        {/* ── Right: sticky sidebar ─────────────────────────────────────── */}
        <div className="hidden lg:block sticky top-40 self-start">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#2e443c]/8 flex items-center justify-center">
                  <i className="fa-solid fa-bag-shopping text-[#2e443c] text-xs" />
                </div>
                <span className="text-sm font-bold text-gray-800">Your Order</span>
              </div>
              <span className="text-[10px] font-bold bg-[#2e443c] text-white px-2.5 py-1 rounded-lg">
                {cartItems.length} item{cartItems.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Items */}
            <div className="divide-y divide-gray-50 max-h-[260px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#e5e7eb transparent" }}>
              {cartItems.map((item) => (
                <div key={`${item.id}-${item.selectedVariant || "default"}`} className="flex items-center gap-3 px-5 py-3.5 group hover:bg-gray-50/60 transition-colors">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                      <img src={item.image || "/placeholder.jpg"} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#2e443c] rounded-full flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white">{item.quantity}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{item.name}</p>
                    {item.selectedVariant && item.selectedVariant !== "N/A" && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.selectedVariant}</p>
                    )}
                  </div>
                  <p className="text-xs font-bold text-gray-800 shrink-0">
                    ₹{(Number(item.price) * Number(item.quantity)).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Price */}
            <div className="px-5 py-5 border-t border-gray-100">
              <PriceRows subtotal={pricingDetails.subtotal} shipping={pricingDetails.shipping} discount={pricingDetails.discount} appliedCoupon={appliedCoupon} totalToPay={totalToPay} itemCount={cartItems.length} />
            </div>

            {/* Pay button (step 3 only) */}
            {currentStep === 3 && (
              <div className="px-5 pb-5 space-y-3">
                <button
                  onClick={handlePayment}
                  disabled={isOrdering}
                  className="w-full h-14 bg-[#2e443c] text-white rounded-xl font-bold text-sm hover:bg-[#1a2822] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-[#2e443c]/25 disabled:opacity-50"
                >
                  {isOrdering
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
                    : <><i className="fa-solid fa-lock text-xs opacity-70" /> Pay ₹{totalToPay.toLocaleString()}</>
                  }
                </button>
                <div className="flex items-center justify-center gap-3">
                  <i className="fa-brands fa-cc-visa text-gray-300 text-lg" />
                  <i className="fa-brands fa-cc-mastercard text-gray-300 text-lg" />
                  <i className="fa-brands fa-google-pay text-gray-300 text-lg" />
                  <i className="fa-solid fa-building-columns text-gray-300 text-base" />
                </div>
              </div>
            )}
          </div>

          {currentStep < 3 && (
            <p className="text-center text-[11px] text-gray-400 mt-4 flex items-center justify-center gap-1.5">
              <i className="fa-solid fa-shield-halved text-[#a89068]" />
              Secured by Razorpay · 256-bit SSL
            </p>
          )}
        </div>
      </div>

      {/* ── Mobile sticky footer (step 3) ────────────────────────────────── */}
      {currentStep === 3 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
          <div className="bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3 pb-5 shadow-[0_-12px_40px_rgba(0,0,0,0.1)]">
            <div className="max-w-sm mx-auto flex items-center gap-3">
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Total</p>
                <p className="text-lg font-bold text-[#2e443c]">₹{totalToPay.toLocaleString()}</p>
              </div>
              <button
                onClick={handlePayment}
                disabled={isOrdering}
                className="flex-1 h-12 bg-[#2e443c] text-white rounded-xl font-bold text-sm hover:bg-[#1a2822] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 shadow-lg disabled:opacity-50"
              >
                {isOrdering
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
                  : <><i className="fa-solid fa-lock text-[10px] opacity-70" /> Pay Now</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <Suspense fallback={
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-10 h-10 border-2 border-[#a89068] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <GoogleAddressFormModal
          isOpen={showMapModal} onClose={() => setShowMapModal(false)}
          onAddressConfirm={handleAddressConfirm} showNotification={showNotification}
          prefillName={isGuest ? guestName : (userProfile?.userName || userProfile?.name || "")}
          prefillPhone={isGuest ? guestMobile : (String(userProfile?.mobileNumber || "") || senderMobile || "")}
        />
      </Suspense>

      <Suspense fallback={null}>
        <MobileNumberModal
          showMobileModal={showMobileModal} setShowMobileModal={setShowMobileModal}
          userProfile={userProfile} onSaveMobileNumber={handleSaveMobileNumber}
          showNotification={showNotification} isSaving={isSavingMobile}
        />
      </Suspense>

      {showCouponModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={() => setShowCouponModal(false)}>
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[88vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#a89068]/10 flex items-center justify-center">
                  <i className="fa-solid fa-percent text-[#a89068]" />
                </div>
                <p className="font-bold text-gray-800">Available Coupons</p>
              </div>
              <button onClick={() => setShowCouponModal(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <i className="fa-solid fa-xmark text-gray-500 text-sm" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(88vh-72px)]">
              <Suspense fallback={<ComponentLoader />}>
                <CouponList onCouponApplied={handleCouponApplied} userId={userProfile?.userId} />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
