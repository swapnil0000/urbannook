import { useState, useEffect, useMemo, lazy, Suspense, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";

import {
  useGetUserProfileQuery,
  useGetRazorpayKeyQuery,
  useCreateOrderMutation,
  useCreateGuestOrderMutation,
  useApplyCouponMutation,
  useGetSavedAddressesQuery,
  useDeleteAddressMutation,
  useUpdateCartMutation,
  useUpdateUserProfileMutation,
  useCalculateShippingMutation,
  useGetFreeShippingOfferQuery,
  useGetAllFreeShippingBannersQuery,
} from "../store/api/userApi";
import { setShowLoginModal, setLoginCallback } from "../store/slices/uiSlice";
import { useUI } from "../hooks/useRedux";
import { clearCart, removeItem } from "../store/slices/cartSlice";
import { fetchCsrfToken } from "../store/api/apiSlice";
import CouponInput from "../component/CouponInput";
import FreeShippingBanner from "../component/FreeShippingBanner";
import { ComponentLoader } from "../component/layout/LoadingSpinner";
import { trackBeginCheckout, trackPurchase, trackAddShippingInfo, trackAddPaymentInfo, trackPaymentFailed, trackPaymentModalDismissed, trackCheckoutStep, trackOrderCreated, trackSelectPaymentMethod, trackDeliveryCheck, getFbCookies, getAnonymousId, cacheAddressForCapi, setMetaAdvancedMatching } from "../utils/analytics";

const CouponList = lazy(() => import("../component/CouponList"));
const MobileNumberModal = lazy(() => import("../component/MobileNumberModal"));
const GoogleAddressFormModal = lazy(() => import("../component/GoogleAddressFormModal"));

const GUEST_STEPS = [
  { number: 1, label: "Account" },
  { number: 2, label: "Contact" },
  { number: 3, label: "Address" },
  { number: 4, label: "Review & Pay" },
];

const AUTH_STEPS = [
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

// Green "You're saving ₹X" banner. Savings = (subtotal + real shipping) −
// what they're actually paying — i.e. every rupee shaved off, whether from
// a coupon or from the free-shipping offer, in one honest number.
const SavingsBanner = ({ amount, freeShipping = false }) => (
  <div
    style={{
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: 14,
      width: "100%",
      minHeight: 64,
      boxSizing: "border-box",
      padding: "14px 16px",
      borderRadius: 16,
      background:
        "linear-gradient(135deg, oklch(0.93 0.09 152) 0%, oklch(0.90 0.11 150) 60%, oklch(0.92 0.10 148) 100%)",
      overflow: "hidden",
      textAlign: "center",
    }}
  >
    {/* diagonal shine streaks */}
    <div
      style={{
        position: "absolute",
        top: "-40%",
        left: "55%",
        width: 60,
        height: "220%",
        background: "linear-gradient(120deg, transparent 0%, oklch(1 0 0 / 0.35) 45%, transparent 100%)",
        transform: "rotate(18deg)",
        pointerEvents: "none",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: "-40%",
        left: "78%",
        width: 24,
        height: "220%",
        background: "linear-gradient(120deg, transparent 0%, oklch(1 0 0 / 0.22) 45%, transparent 100%)",
        transform: "rotate(18deg)",
        pointerEvents: "none",
      }}
    />

    {/* seal badge */}
    <div
      style={{
        position: "relative",
        flex: "0 0 auto",
        width: 38,
        height: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -6,
          borderRadius: "50%",
          background: "oklch(0.62 0.14 155 / 0.35)",
          filter: "blur(6px)",
        }}
      />
      <div
        style={{
          position: "relative",
          width: 36,
          height: 36,
          background: "oklch(0.47 0.10 165)",
          clipPath:
            "polygon(50% 0%, 61% 7%, 73% 2%, 79% 13%, 91% 15%, 92% 27%, 100% 35%, 95% 46%, 100% 57%, 91% 65%, 89% 77%, 77% 78%, 70% 89%, 58% 84%, 47% 92%, 38% 83%, 26% 87%, 21% 76%, 9% 73%, 11% 61%, 2% 52%, 9% 42%, 5% 30%, 16% 25%, 19% 13%, 31% 14%, 39% 4%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ color: "oklch(0.99 0 0)", fontSize: 16, fontWeight: 700, lineHeight: 1 }}>%</span>
      </div>
    </div>

    {/* text */}
    <div
      style={{
        position: "relative",
        zIndex: 1,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
      }}
    >
      {/* Big prominent free-shipping line — only when the offer combo has
          actually zeroed the shipping charge. */}
      {freeShipping && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            lineHeight: 1.1,
            color: "oklch(0.30 0.05 155)",
          }}
        >
          <i className="fa-solid fa-truck-fast" style={{ color: "oklch(0.47 0.10 165)" }} />
          Free Shipping Unlocked
        </span>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 5,
          fontSize: freeShipping ? 13 : 17,
          fontWeight: 500,
          color: "oklch(0.30 0.05 155)",
        }}
      >
        <span>You're saving</span>
        <span style={{ position: "relative", fontWeight: 800, color: "oklch(0.16 0.01 155)", display: "inline-block" }}>
          ₹{amount.toLocaleString()}
          <svg
            viewBox="0 0 100 14"
            preserveAspectRatio="none"
            style={{ position: "absolute", left: -2, right: -2, bottom: -7, width: "calc(100% + 4px)", height: 10 }}
          >
            <path d="M2,7 Q50,2 98,8" fill="none" stroke="oklch(0.55 0.14 155)" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        </span>
        <span>on this order</span>
      </div>
    </div>
  </div>
);

const PriceRows = ({ subtotal, shipping, discount, appliedCoupon, totalToPay, itemCount, isLoadingShipping, paymentMethod }) => {
  const shippingAmount = typeof shipping === "object" ? shipping?.amount : shipping;
  // COD advance must be based on the REAL carrier rate, not the (possibly
  // free-shipping-zeroed) charged amount — same real/charged split as the
  // server. realAmount is only present on the object form; the plain-number
  // form of `shipping` is legacy/display-only and never feeds COD math.
  const realShippingAmount = typeof shipping === "object" ? (shipping?.realAmount ?? shipping?.amount) : shipping;
  const isCOD = paymentMethod === "COD";
  const codPartialAmount = isCOD && realShippingAmount ? Math.min(Math.ceil(realShippingAmount) * 2, totalToPay) : 0;
  const codRemainingAmount = isCOD ? Math.max(0, totalToPay - codPartialAmount) : 0;

  const isShippingFree = shippingAmount === 0 && realShippingAmount > 0;
  const hasDiscount = appliedCoupon && discount > 0;
  // (lamp + stand + ... + real shipping) − what they're actually paying = savings.
  const totalSavings = Math.max(0, subtotal + (realShippingAmount || 0) - totalToPay);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500">
          Cart value{" "}
          <span className="text-gray-400">
            ({itemCount} item{itemCount !== 1 ? "s" : ""})
          </span>
        </span>
        <span className="font-bold text-gray-900">
          ₹{subtotal.toLocaleString()}
        </span>
      </div>

      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500">Shipping</span>
        <span className="font-bold text-gray-900">
          {isLoadingShipping ? (
            <span className="inline-block w-16 h-3.5 bg-gray-200 rounded animate-pulse" />
          ) : shippingAmount === null || shippingAmount === undefined ? (
            <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">
              Enter address
            </span>
          ) : isShippingFree ? (
            // Free shipping applied — show the real carrier amount struck
            // through with a green FREE beside it, instead of a separate
            // "shipping discount" line.
            <span className="flex items-center gap-2">
              <span className="text-gray-400 font-normal line-through">
                ₹{Math.ceil(realShippingAmount).toLocaleString()}
              </span>
              <span className="text-emerald-600 font-bold uppercase tracking-wider text-xs">Free</span>
            </span>
          ) : realShippingAmount ? (
            `₹${Math.ceil(realShippingAmount).toLocaleString()}`
          ) : (
            <span className="text-emerald-600 font-bold uppercase tracking-wider text-xs">Free</span>
          )}
        </span>
      </div>

      {hasDiscount && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-rose-700">Discount applied</span>
          <span className="font-bold text-rose-700">−₹{discount.toLocaleString()}</span>
        </div>
      )}

      <div className="border-t border-gray-100 pt-3">
        <div className="flex justify-between items-center">
          <span className="font-bold text-gray-900">Total</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-[#2e443c]">
              ₹{totalToPay.toLocaleString()}
            </span>
            <p className="text-[10px] text-gray-400 mt-0.5">Incl. GST</p>
          </div>
        </div>
      </div>

      {totalSavings > 0 && <SavingsBanner amount={totalSavings} freeShipping={isShippingFree} />}

      {isCOD && realShippingAmount > 0 && (
        <div className="border-t border-dashed border-amber-200 pt-3 space-y-0 rounded-xl bg-amber-50/60 -mx-1 px-3 pb-3 mt-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-600 mb-2.5 flex items-center gap-1.5">
            <i className="fa-solid fa-receipt text-[8px]" /> COD Breakdown
          </p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#2e443c] flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-bolt text-white text-[7px]" />
                </span>
                Pay Now
              </span>
              <span className="text-sm font-bold text-[#2e443c]">
                ₹{codPartialAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-door-open text-white text-[7px]" />
                </span>
                Rest Pay at delivery
              </span>
              <span className="text-sm font-bold text-amber-700">
                ₹{codRemainingAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification } = useUI();
  const showNotificationRef = useRef(showNotification);
  useEffect(() => { showNotificationRef.current = showNotification; }, [showNotification]);

  const { items: cartItems, selections: cartSelections } = useSelector((s) => s.cart);
  const { isAuthenticated } = useSelector((s) => s.auth);
  const isGuest = !isAuthenticated && !localStorage.getItem("authToken");
  const STEPS = isGuest ? GUEST_STEPS : AUTH_STEPS;
  const paymentCompletedRef = useRef(false);
  const cartLoadedRef = useRef(false);
  const addressManuallyResetRef = useRef(false);

  // Helper: get current step label for content rendering
  const getStepLabel = (step) => STEPS[step - 1]?.label || "";
  const contactStep = STEPS.findIndex(s => s.label === "Contact") + 1;
  const addressStep = STEPS.findIndex(s => s.label === "Address") + 1;
  const reviewStep = STEPS.findIndex(s => s.label === "Review & Pay") + 1;

  // Restore checkout state from sessionStorage on mount
  const savedCheckout = useRef((() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("checkoutState")) || {};
      // Migration: robustly handle pincode key variations
      const rawPin = saved.pinCode || saved.pincode || saved.userPinCode || "";
      saved.pinCode = String(rawPin).trim();
      return saved;
    } catch { return {}; }
  })());

  const [currentStep, setCurrentStep] = useState(() => {
    const saved = savedCheckout.current.currentStep || 1;
    const steps = !isAuthenticated && !localStorage.getItem("authToken") ? GUEST_STEPS : AUTH_STEPS;
    return saved > steps.length ? 1 : saved;
  });
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [address, setAddress] = useState(savedCheckout.current.address || "");
  const [pinCode, setPinCode] = useState(savedCheckout.current.pinCode || "");
  const [preciseDetails, setPreciseDetails] = useState(savedCheckout.current.preciseDetails || { landmark: "", flatNo: "" });
  const [addressForm, setAddressForm] = useState(savedCheckout.current.addressForm || null);
  const [savedAddress, setSavedAddress] = useState([]);
  const [currentAddressId, setCurrentAddressId] = useState(savedCheckout.current.currentAddressId || null);
  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const [senderMobile, setSenderMobile] = useState(savedCheckout.current.senderMobile || "");
  const [isSavingMobile, setIsSavingMobile] = useState(false);
  const [useDifferentDeliveryContact, setUseDifferentDeliveryContact] = useState(false);
  const [deliveryMobile, setDeliveryMobile] = useState("");
  const [deliveryMobileErrors, setDeliveryMobileErrors] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(savedCheckout.current.appliedCoupon || null);
  const [pricingDetails, setPricingDetails] = useState({
    subtotal: cartItems.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 0), 0),
    shipping: null, // this will now store the full shippingInfo object
    discount: 0,
  });
  const [shippingError, setShippingError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PREPAID"); // "PREPAID" | "COD"
  const [paymentError, setPaymentError] = useState(null);
  const [showRetry, setShowRetry] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);

  const [guestName, setGuestName] = useState(savedCheckout.current.guestName || "");
  const [guestEmail, setGuestEmail] = useState(savedCheckout.current.guestEmail || "");
  const [guestMobile, setGuestMobile] = useState(savedCheckout.current.guestMobile || "");
  const [guestErrors, setGuestErrors] = useState({});

  const { data: userProfileData, isLoading: profileLoading, refetch: refetchProfile } =
    useGetUserProfileQuery(undefined, { skip: isGuest });
  const { data: razorpayKeyData } = useGetRazorpayKeyQuery();
  const [createOrder, { isLoading: isOrderingAuth }] = useCreateOrderMutation();
  const [createGuestOrder, { isLoading: isOrderingGuest }] = useCreateGuestOrderMutation();
  const isOrdering = isGuest ? isOrderingGuest : isOrderingAuth;
  const [applyCouponMutation] = useApplyCouponMutation();
  const [deleteAddressMutation] = useDeleteAddressMutation();
  const [updateCart] = useUpdateCartMutation();
  const [updateUserProfile] = useUpdateUserProfileMutation();
  const { data: savedAddressData, refetch: refetchAddresses } =
    useGetSavedAddressesQuery(undefined, { skip: isGuest });
  const [calculateShipping, { isLoading: isCalculatingShipping }] = useCalculateShippingMutation();
  const { data: freeShippingOfferData } = useGetFreeShippingOfferQuery();
  const { data: allFreeShippingBannersData } = useGetAllFreeShippingBannersQuery();

  // Checkout-only nudge: if the cart hasn't crossed the free-shipping
  // threshold yet, show a banner for the first cart item that has one
  // configured, so a customer who missed it on the PDP gets one more chance
  // before paying. Free shipping is a product-COMBO rule (source + recommended
  // both in cart), so we show the banner for a combo whose source product IS
  // in the cart but whose recommended add-on ISN'T yet — that's the only case
  // with something left to upsell. If both are already in the cart the combo
  // is complete (nothing to nudge), and if the source isn't in the cart the
  // offer doesn't apply to this cart at all.
  // TODO: only supports a single banner (first match) even if multiple cart
  // items each have one configured — fine for now (single active offer),
  // revisit if multiple simultaneous offers are ever needed.
  const checkoutBannerProductId = useMemo(() => {
    const offerConfig = freeShippingOfferData?.data;
    if (!offerConfig?.isActive) return null;

    const banners = allFreeShippingBannersData?.data || [];
    if (banners.length === 0) return null;

    const cartProductIds = new Set(cartItems.map((i) => i.mongoId || i.id?.split(":")[0]));
    const match = banners.find(
      (b) => cartProductIds.has(b.sourceProductId) && !cartProductIds.has(b.recommendedProductId),
    );
    return match?.sourceProductId || null;
  }, [freeShippingOfferData, allFreeShippingBannersData, cartItems]);

  // The moment adding the recommended item pushes the cart over the
  // threshold, `checkoutBannerProductId` above flips to null in the SAME
  // render as the cart update — which used to unmount FreeShippingBanner
  // outright, killing its own bar-fill/confetti/"Unlocked" celebration
  // sequence mid-flight. Hold the last non-null id visible for a beat after
  // it goes null so that sequence gets to finish before we actually remove
  // the banner from the page.
  const [visibleBannerProductId, setVisibleBannerProductId] = useState(null);
  useEffect(() => {
    if (checkoutBannerProductId) {
      setVisibleBannerProductId(checkoutBannerProductId);
      return;
    }
    if (!visibleBannerProductId) return;
    const timer = setTimeout(() => setVisibleBannerProductId(null), 1900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omits visibleBannerProductId so the timer isn't re-armed by its own update
  }, [checkoutBannerProductId]);

  // When user logs in mid-checkout (guest → auth), AUTH_STEPS has fewer steps.
  // Clamp currentStep so STEPS[currentStep-1] is never undefined.
  useEffect(() => {
    if (currentStep > STEPS.length) setCurrentStep(1);
  }, [isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isGuest) {
      fetchCsrfToken().catch((e) => console.warn("[Checkout] CSRF fetch failed:", e));
    }
  }, [isGuest]);

  // Persist checkout progress to sessionStorage on every relevant state change
  useEffect(() => {
    if (paymentCompletedRef.current) return;
    try {
      sessionStorage.setItem("checkoutState", JSON.stringify({
        currentStep,
        address,
        pinCode,
        preciseDetails,
        addressForm,
        currentAddressId,
        senderMobile,
        appliedCoupon,
        guestName,
        guestEmail,
        guestMobile,
      }));
    } catch (err) {
      console.error("[Checkout] Failed to save state to session storage:", err);
    }
  }, [currentStep, address, pinCode, preciseDetails, addressForm, currentAddressId, senderMobile, appliedCoupon, guestName, guestEmail, guestMobile]);

  // Dynamic Shipping Calculation - triggered by payment method change on Review page
  const calculateShippingRef = useRef(calculateShipping);
  useEffect(() => { calculateShippingRef.current = calculateShipping; }, [calculateShipping]);

  // Clear old shipping value immediately when payment method changes on review page,
  // so the pay button blocks until the fresh API response arrives
  useEffect(() => {
    if (currentStep === reviewStep && pinCode && pinCode.toString().length === 6) {
      setPricingDetails(prev => ({ ...prev, shipping: null }));
      setShippingError("");
    }
  }, [paymentMethod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear old shipping immediately when cart changes on review page (item added/removed/quantity changed).
  // Without this, Pay stays enabled briefly with stale shipping calculated for the old cart.
  // The shipping recalculation effect already reruns on cart changes — this just ensures
  // the Pay button is blocked during that async window.
  useEffect(() => {
    if (currentStep === reviewStep && pinCode && pinCode.toString().length === 6) {
      setPricingDetails(prev => ({ ...prev, shipping: null }));
      setShippingError("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems.length, cartItems.reduce((s, i) => s + Number(i.quantity || 0), 0)]);

  useEffect(() => {
    // Run shipping calculation on Review page when address/pincode is available.
    // Also wait for the free-shipping config to finish loading first — without
    // this, the calc can run while freeShippingOfferData is still undefined,
    // compute eligibility as false, and never re-run once the config arrives
    // (it wasn't a dependency), leaving the wrong shipping amount stuck in the
    // UI even though the backend — which recomputes fresh at order-submission
    // time — applies free shipping correctly. Symptom: frontend shows a
    // charge, Razorpay/backend charges the correct (free) amount.
    if (
      currentStep !== reviewStep ||
      !pinCode ||
      pinCode.toString().length !== 6 ||
      cartItems.length === 0 ||
      freeShippingOfferData === undefined
    ) {
      return;
    }

    let cancelled = false;

    const fetchShippingRate = async () => {
      if (cancelled) return;

      try {
        const formattedCartItems = cartItems.map(item => ({
          productId: item.mongoId || item.id.split(':')[0],
          quant: item.quantity,
          price: item?.price,
          selectedVariant: item?.selectedVariant,
        }));

        const result = await calculateShippingRef.current({
          deliveryPinCode: parseInt(pinCode, 10),
          cartItems: formattedCartItems,
          paymentType: paymentMethod,
        }).unwrap();

        if (cancelled) return;

        if (result.success && result.data) {
          // Free shipping: product-COMBO rule. Still call the rate API above to
          // confirm the pincode is serviceable, but zero the charged amount
          // only when the cart contains a full offer combo (source +
          // recommended product). Mirrors the server's isFreeShippingEligible.
          const offerConfig = freeShippingOfferData?.data;
          const banners = allFreeShippingBannersData?.data || [];
          const cartProductIds = new Set(cartItems.map((i) => i.mongoId || i.id?.split(":")[0]));
          const isFreeShippingEligible =
            !!offerConfig?.isActive &&
            banners.some(
              (b) => cartProductIds.has(b.sourceProductId) && cartProductIds.has(b.recommendedProductId),
            );
          console.log(
            `[FreeShipping][Client] cartIds=[${[...cartProductIds].join(",")}] isActive=${offerConfig?.isActive} → eligible=${isFreeShippingEligible}`,
          );
          // realAmount = actual carrier rate, always — this is what the COD
          // 2x-advance must be based on (matches the server's realShippingAmount).
          // amount = what the customer's total/display reflects — 0 when free
          // shipping applies. Keeping both on the object prevents the COD math
          // from silently inheriting the free-shipping zero.
          const realAmount = parseFloat(result.data.total_charges);
          const shippingAmount = isFreeShippingEligible ? 0 : realAmount;
          setPricingDetails(prev => ({
            ...prev,
            shipping: { ...result.data, amount: shippingAmount, realAmount }
          }));
          setShippingError("");
          trackDeliveryCheck({ pincode: pinCode, serviceable: true, shippingAmount, paymentMethod });
        } else {
          showNotificationRef.current?.("Unable to calculate shipping. Please try again.", "error");
        }
      } catch (error) {
        if (cancelled) return;
        console.error('[Shipping Calculation Failed]:', error);
        
        const errorMsg = error?.data?.message || error?.message || "";
        setShippingError(errorMsg);
        setPricingDetails(prev => ({ ...prev, shipping: null }));
        showNotificationRef.current?.(errorMsg || "Failed to calculate shipping charges.", "error");
      }
    };

    fetchShippingRate();
    return () => { cancelled = true; };
  }, [currentStep, reviewStep, pinCode, cartItems.length, cartItems.reduce((s, i) => s + Number(i.quantity || 0), 0), paymentMethod, freeShippingOfferData, allFreeShippingBannersData]);

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
      // For guests, cart is loaded from localStorage synchronously — if empty, redirect
      if (cartItems.length === 0 && cartLoadedRef.current && !paymentCompletedRef.current) navigate("/products");
      setIsLoading(false);
      return;
    }
    // For authenticated users, wait for both profile AND cart data to load before redirecting
    if (profileLoading) return; // Still loading profile/cart data
    if (!userProfileData) { refetchProfile(); return; }
    if (cartItems.length === 0 && cartLoadedRef.current && !paymentCompletedRef.current) {
      navigate("/products"); return;
    }
    if (userProfileData?.data) {
      setUserProfile(userProfileData.data?.data);
      setIsLoading(false);
    }
  }, [isGuest, isAuthenticated, cartItems.length, navigate, userProfileData, profileLoading, refetchProfile]);

  useEffect(() => {
    if (userProfile) {
      const profileAddress = userProfile.userAddress || userProfile.address || "";
      const profilePin     = userProfile.pinCode || userProfile.userPinCode || userProfile.pincode || "";
      const profileMobile  = userProfile.mobileNumber || userProfile.mobile || "";

      if (profileAddress && !address) setAddress(profileAddress);
      // Aggressively fill pincode if missing, even if address was partially restored
      if (profilePin && (!pinCode || pinCode.length < 6) && !addressManuallyResetRef.current) setPinCode(String(profilePin));
      if (profileMobile && !senderMobile) setSenderMobile(stripCC(String(profileMobile)));
    }
  }, [userProfile, address, pinCode, senderMobile]);

  const cartItemsLength = cartItems?.length;
  const cartTotalAmount = cartItems.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 0), 0);
  const userEmail = userProfile?.email;

  useEffect(() => {
    if (isGuest) {
      // Only sync subtotal — discount is managed by handleGuestCouponApplied/Removed
      // Do NOT reset discount here: this effect re-runs when appliedCoupon changes,
      // which would wipe the discount set by handleGuestCouponApplied.
      setPricingDetails(prev => ({ ...prev, subtotal: cartTotalAmount }));
      return;
    }
    const fetchPricing = async () => {
      if (!cartItemsLength) return;
      try {
        const r = await applyCouponMutation({ couponCode: appliedCoupon || null, email: userEmail }).unwrap();
        if (r.success && r.data?.summary)
          setPricingDetails(prev => ({ ...prev, subtotal: r.data.summary.subtotal || 0, discount: r.data.summary.discount || 0 }));
      } catch (err) {
        if (err?.data?.statusCode === 400 && appliedCoupon) {
          setAppliedCoupon(null);
          try {
            const r2 = await applyCouponMutation({ couponCode: null, email: userEmail }).unwrap();
            if (r2.success && r2.data?.summary)
              setPricingDetails(prev => ({ ...prev, subtotal: r2.data.summary.subtotal || 0, discount: r2.data.summary.discount || 0 }));
          } catch (_) {}
        }
      }
    };
    fetchPricing();
  }, [cartItemsLength, cartTotalAmount, applyCouponMutation, appliedCoupon, userEmail, isGuest]);

  // Fire begin_checkout ONCE per checkout. React Router remounts this page on
  // navigate-away-and-back, and the Redux cart hydrates asynchronously AFTER mount,
  // so a []-deps effect either double-fires or misses on refresh/deep-link. Gate on
  // a ref (per-mount) + a sessionStorage flag (survives remounts) and depend on the
  // cart so it fires the moment items hydrate. The flag is cleared on purchase.
  const beginCheckoutFiredRef = useRef(false);
  useEffect(() => {
    if (
      cartItems.length > 0 &&
      !beginCheckoutFiredRef.current &&
      !sessionStorage.getItem("un_begin_checkout_fired")
    ) {
      beginCheckoutFiredRef.current = true;
      trackBeginCheckout({
        items: cartItems.map((i) => ({ itemId: i.mongoId || i.id, itemName: i.name, itemVariant: i.selectedVariant || "N/A", price: i.price, quantity: i.quantity })),
        value: pricingDetails.subtotal,
      });
      sessionStorage.setItem("un_begin_checkout_fired", "1");
    }
  }, [cartItems.length, pricingDetails.subtotal]); // eslint-disable-line react-hooks/exhaustive-deps -- length-based trigger is intentional

  const validateMobile = (m) => /^[6-9][0-9]{9}$/.test(String(m).trim());
  const stripCC = (m) => {
    const t = String(m || "").trim();
    if (t.startsWith("+91")) return t.substring(3);
    if (t.startsWith("91") && t.length === 12) return t.substring(2);
    return t;
  };
  const goToStep = (n) => { setCurrentStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const buildTrackItems = () =>
    cartItems.map((i) => ({ itemId: i.mongoId || i.id, itemName: i.name, itemVariant: i.selectedVariant || "N/A", price: i.price, quantity: i.quantity }));

  const loadRazorpay = () =>
    new Promise((res) => {
      if (window.Razorpay) return res(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => res(true); s.onerror = () => res(false);
      document.body.appendChild(s);
    });

  const handleAddressConfirm = (suggestion, addressId, deliveryAddressFull) => {
    addressManuallyResetRef.current = false;
    setAddress(deliveryAddressFull || suggestion.formattedAddress);
    setPinCode(String(suggestion.pinCode || ""));
    setCurrentAddressId(addressId);
    setPreciseDetails({ landmark: suggestion.landmark || "", flatNo: suggestion.flatNo || "" });
    setAddressForm({
      ...(suggestion.form || {}),
      lat: suggestion.lat,
      long: suggestion.long,
      placeId: suggestion.placeId,
      formattedAddress: suggestion.formattedAddress,
      city: suggestion.city,
      state: suggestion.state,
      pinCode: suggestion.pinCode,
    });
    cacheAddressForCapi({ zip: suggestion.pinCode, city: suggestion.city, state: suggestion.state });
    if (!isGuest) refetchAddresses();
    goToStep(reviewStep);
  };

  const handleResetAddress = () => {
    addressManuallyResetRef.current = true;
    setAddress("");
    setPinCode("");
    setPreciseDetails({ landmark: "", flatNo: "" });
    setCurrentAddressId(null);
    setAddressForm(null);
    setPricingDetails(prev => ({ ...prev, shipping: null }));
    showNotification("Address cleared", "info");
    if (currentStep !== addressStep) goToStep(addressStep);
    setShowMapModal(true);
  };

  const selectSavedAddress = (addr) => {
    addressManuallyResetRef.current = false;
    setAddress(addr.deliveryAddressFull || addr.formattedAddress);
    setPinCode(String(addr.pinCode || ""));
    setCurrentAddressId(addr.addressId);
    setPreciseDetails({ landmark: addr.landmark || "", flatNo: addr.flatOrFloorNumber || "" });
    setAddressForm({
      buildingName: addr.buildingName || "",
      street: addr.street || "",
      floor: addr.floor || "",
      tower: addr.tower || "",
      landmark: addr.landmark || "",
      city: addr.city || "",
      state: addr.state || "",
      pinCode: addr.pinCode || "",
      fullName: addr.fullName || "",
      mobileNumber: addr.mobileNumber || "",
      lat: addr.location?.coordinates?.[1] || addr.lat || 0,
      long: addr.location?.coordinates?.[0] || addr.long || 0,
      placeId: addr.placeId || "N/A",
      formattedAddress: addr.formattedAddress || addr.deliveryAddressFull
    });
    cacheAddressForCapi({ zip: addr.pinCode, city: addr.city, state: addr.state });
    showNotification("Address selected", "success");
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
        setPricingDetails(prev => ({ ...prev, subtotal: r.data.summary.subtotal || 0, discount: r.data.summary.discount || 0 }));
        showNotification(r.message || "Coupon applied!", "success");
        setShowCouponModal(false);
      }
    } catch (e) { showNotification(e?.data?.message || "Failed to apply coupon", "error"); }
  };

  const handleGuestCouponApplied = (couponData) => {
    setAppliedCoupon(couponData.code);
    setPricingDetails(prev => ({ ...prev, discount: couponData.discount || 0 }));
    setShowCouponModal(false);
  };

  const handleCouponRemoved = async () => {
    try {
      const r = await applyCouponMutation({ couponCode: null, email: userEmail }).unwrap();
      if (r.success && r.data?.summary) {
        setAppliedCoupon(null);
        setPricingDetails(prev => ({ ...prev, subtotal: r.data.summary.subtotal || 0, discount: r.data.summary.discount || 0 }));
        showNotification("Coupon removed", "success");
      }
    } catch (e) { showNotification(e?.data?.message || "Failed to remove coupon", "error"); }
  };

  const handleGuestCouponRemoved = () => {
    setAppliedCoupon(null);
    setPricingDetails(prev => ({ ...prev, discount: 0 }));
    showNotification("Coupon removed", "success");
  };

  const handleStep1Next = () => {
    if (isGuest) {
      const errors = {};
      if (!guestName.trim()) errors.name = "Full name is required";
      if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) errors.email = "Valid email is required";
      if (!/^[6-9][0-9]{9}$/.test(guestMobile.trim())) errors.mobile = "Enter a valid 10-digit mobile number (must start with 6–9)";
      if (Object.keys(errors).length) { setGuestErrors(errors); return; }
      setGuestErrors({});
    } else {
      const m = stripCC(String(senderMobile || ""));
      if (!m || !validateMobile(m)) { showNotification("Please enter a valid 10-digit Indian mobile number", "error"); return; }
      // Save mobile to profile if it changed
      const existingMobile = String(userProfile?.mobileNumber || userProfile?.mobile || "");
      if (m !== existingMobile) {
        updateUserProfile({ mobileNumber: m }).unwrap().then(() => refetchProfile()).catch(() => {});
      }
    }
    trackCheckoutStep({ step: 1, stepLabel: "contact", isGuest });
    goToStep(addressStep);
  };

  const handleStep2Next = async () => {
    const addr = String(address || "").trim();
    const pin = String(pinCode || "").trim();

    if (!addr) {
      showNotification("Please enter a delivery address", "error");
      return;
    }

    if (!pin || pin.length < 6) {
      showNotification(pin ? "Pincode must be at least 6 digits" : "Please enter your pincode", "error");
      if (addr) setShowMapModal(true);
      return;
    }

    trackAddShippingInfo({
      items: buildTrackItems(),
      value: pricingDetails.subtotal,
      shipping: shippingAmount,
      pincode: pin,
      step: "address",
      isGuest,
    });
    trackCheckoutStep({ step: 2, stepLabel: "address", isGuest });
    goToStep(reviewStep);
  };

  const handlePayment = async () => {
    setPaymentError(null);
    {
      const buyerName = (isGuest ? guestName : (userProfile?.userName || userProfile?.name || "")).trim();
      setMetaAdvancedMatching({
        email: isGuest ? guestEmail.trim() : userProfile?.email,
        phone: isGuest ? guestMobile.trim() : stripCC(String(senderMobile || "")),
        firstName: buyerName.split(" ")[0],
        lastName: buyerName.split(" ").slice(1).join(" "),
        userId: isGuest ? getAnonymousId() : (userProfile?.userId || userProfile?._id || getAnonymousId()),
      });
    }

    trackCheckoutStep({ step: currentStep, stepLabel: "payment", isGuest });
    trackAddPaymentInfo({ items: buildTrackItems(), value: totalToPay, paymentMethod, isGuest });

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
            pinCode: pinCode ? parseInt(pinCode, 10) : null,
            landmark: preciseDetails.landmark, flatOrFloorNumber: preciseDetails.flatNo,
            lat: addressForm?.lat || 0,
            long: addressForm?.long || 0,
          },
          paymentMethod,
          ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
          ...getFbCookies(), // _fbp / _fbc → stored on order for CAPI match quality
          anonymousId: getAnonymousId(), // fallback externalId for guest CAPI
        }).unwrap();

        trackOrderCreated({
          orderId: orderResult.data?.razorpayOrderId || orderResult.razorpayOrderId,
          userType: "guest",
          paymentMethod: orderResult.data?.paymentMethod || paymentMethod,
        });

        if (!await loadRazorpay()) { showNotification("Could not load payment.", "error"); return; }
        const isCODOrder = orderResult.data?.paymentMethod === "COD";
        const rp = new window.Razorpay({
          key: razorpayKeyData?.data,
          amount: orderResult.data?.amount || orderResult.amount,
          currency: "INR", name: "Urban Nook",
          description: isCODOrder ? "COD Advance - Urban Nook" : "Purchase from Urban Nook",
          image: "/assets/logo.webp",
          order_id: orderResult.data?.razorpayOrderId || orderResult.razorpayOrderId,
          handler: (response) => {
            paymentCompletedRef.current = true;
            trackPurchase({
              transactionId: response.razorpay_order_id,
              eventId: orderResult.data?.orderId, // dedup key — matches server CAPI event_id
              value: totalToPay, shipping: pricingDetails.shipping, tax: 0,
              paymentMethod,
              // Feed buyer PII to the browser Purchase pixel (guest = no prior login → boosts web EMQ)
              email: guestEmail.trim(), phone: guestMobile.trim(), name: guestName.trim(), externalId: getAnonymousId(),
              items: cartItems.map((i) => ({ itemId: i.mongoId || i.id, itemName: i.name, itemVariant: i.selectedVariant || "N/A", price: i.price, quantity: i.quantity })),
            });
            dispatch(clearCart());
            localStorage.removeItem("guestCart"); localStorage.removeItem("guestId");
            sessionStorage.removeItem("checkoutState");
            sessionStorage.removeItem("un_begin_checkout_fired"); // allow begin_checkout again for the next order
            navigate(`/payment-processing/${response.razorpay_order_id}`);
          },
          prefill: { name: guestName.trim(), email: guestEmail.trim(), contact: guestMobile.trim() },
          notes: { address, pinCode }, theme: { color: "#2E443C" },
          modal: { ondismiss: () => { trackPaymentModalDismissed({ orderId: orderResult.data?.razorpayOrderId || orderResult.razorpayOrderId, value: totalToPay }); setPaymentError("Payment cancelled. Your cart is safe."); setShowRetry(true); }, escape: false, confirm_close: true },
        });
        rp.on("payment.failed", (r) => {
          trackPaymentFailed({ errorCode: r.error?.code, errorDescription: r.error?.description, paymentMethod, value: totalToPay, orderId: orderResult.data?.razorpayOrderId || orderResult.razorpayOrderId });
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
    if (!senderMobileStr || !validateMobile(senderMobileStr)) { showNotification("Please enter a valid mobile number", "error"); goToStep(contactStep); return; }
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
          pinCode: pinCode ? parseInt(pinCode, 10) : null,
          landmark: preciseDetails.landmark, flatOrFloorNumber: preciseDetails.flatNo,
          lat: selectedFullAddr?.location?.coordinates?.[1] || selectedFullAddr?.lat || 0,
          long: selectedFullAddr?.location?.coordinates?.[0] || selectedFullAddr?.long || 0,
        },
        paymentMethod,
        ...getFbCookies(), // _fbp / _fbc → stored on order for CAPI match quality
      }).unwrap();

      trackOrderCreated({
        orderId: orderResult.data?.razorpayOrderId || orderResult.razorpayOrderId || orderResult.id,
        userType: "user",
        paymentMethod: orderResult.data?.paymentMethod || paymentMethod,
      });

      if (!await loadRazorpay()) { showNotification("Could not load payment.", "error"); return; }
      const isCODOrder = orderResult.data?.paymentMethod === "COD";
      const rp = new window.Razorpay({
        key: razorpayKeyData?.data,
        amount: orderResult.data?.amount || orderResult.amount,
        currency: "INR", name: "Urban Nook",
        description: isCODOrder ? "COD Advance - Urban Nook" : "Purchase from Urban Nook",
        image: "/assets/logo.webp",
        order_id: orderResult.data?.razorpayOrderId || orderResult.razorpayOrderId || orderResult.id,
        handler: async (response) => {
          try {
            trackPurchase({
              transactionId: response.razorpay_order_id,
              eventId: orderResult.data?.orderId, // dedup key — matches server CAPI event_id
              value: totalToPay, shipping: pricingDetails.shipping, tax: 0,
              paymentMethod,
              // Feed buyer PII to the browser Purchase pixel → boosts web EMQ (phone esp.)
              email: userProfile?.email, phone: senderMobileStr, name: userProfile?.userName || userProfile?.name, externalId: userProfile?.userId || userProfile?._id || getAnonymousId(),
              items: cartItems.map((i) => ({ itemId: i.mongoId || i.id, itemName: i.name, itemVariant: i.selectedVariant || "N/A", price: i.price, quantity: i.quantity })),
            });
            sessionStorage.removeItem("checkoutState");
            sessionStorage.removeItem("un_begin_checkout_fired"); // allow begin_checkout again for the next order
            navigate(`/payment-processing/${response.razorpay_order_id}`);
          } catch (_) { setPaymentError("Payment verification failed. Contact support if amount was debited."); }
        },
        prefill: { name: userProfile?.userName || userProfile?.name || "", email: userProfile?.email || "", contact: senderMobileStr },
        notes: { address, pinCode }, theme: { color: "#2E443C" },
        modal: { ondismiss: () => { trackPaymentModalDismissed({ orderId: orderResult.data?.razorpayOrderId || orderResult.razorpayOrderId || orderResult.id, value: totalToPay }); setPaymentError("Payment cancelled. Your cart is safe."); setShowRetry(true); }, escape: false, confirm_close: true },
      });
      rp.on("payment.failed", (r) => {
        trackPaymentFailed({ errorCode: r.error?.code, errorDescription: r.error?.description, paymentMethod, value: totalToPay, orderId: orderResult.data?.razorpayOrderId || orderResult.razorpayOrderId || orderResult.id });
        setPaymentError(r.error.description || "Payment failed. Please try again.");
        setShowRetry(true);
      });
      rp.open();
    } catch (e) {
      const msg = e?.data?.message || e?.message || "Failed to initialize payment.";
      showNotification(msg, "error"); setPaymentError(msg); setShowRetry(true);
    }
  };

  const shippingAmount = typeof pricingDetails.shipping === "number"
    ? pricingDetails.shipping
    : (pricingDetails.shipping?.amount ?? 0);
  // Real carrier rate — COD's 2x advance must be based on this, never on
  // `shippingAmount` above (which is 0 when free shipping applies).
  const realShippingAmount = typeof pricingDetails.shipping === "number"
    ? pricingDetails.shipping
    : (pricingDetails.shipping?.realAmount ?? pricingDetails.shipping?.amount ?? 0);
  const totalToPay = pricingDetails.subtotal + shippingAmount - pricingDetails.discount;
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
    <div className="bg-[#f5f7f5]">
      {/* ── Step wizard ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 pt-28 lg:pt-36">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-6">
          {/* breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mb-6">
            <button onClick={() => currentStep > 1 ? goToStep(currentStep - 1) : navigate(-1)} className="hover:text-[#2e443c] transition-colors flex items-center gap-1.5">
              <i className="fa-solid fa-chevron-left text-[10px]" /> {currentStep > 1 ? STEPS[currentStep - 2]?.label : "Cart"}
            </button>
            <span>/</span>
            <span className="text-[#2e443c] font-semibold">{STEPS[currentStep - 1]?.label}</span>
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
      <div className={`max-w-5xl mx-auto px-4 sm:px-6 pt-8 lg:pb-14 lg:grid lg:grid-cols-[1fr_360px] lg:gap-10 lg:items-start ${currentStep === reviewStep ? "pb-28" : "pb-8"}`}>

        {/* ── Left: form ───────────────────────────────────────────────── */}
        <div className="min-w-0">

          {/* ══════════ STEP — ACCOUNT (Guest only) ═══════════════════ */}
          {isGuest && currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-serif text-gray-900 leading-tight">How would you like to continue?</h1>
                {/* <p className="text-sm text-gray-400 mt-2">Sign in for a faster checkout or continue as a guest</p> */}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-0">
                {/* Guest option */}
                <button
                  onClick={() => goToStep(contactStep)}
                  className="group flex-1 bg-white rounded-2xl border-2 border-gray-100 hover:border-[#a89068]/40 p-6 sm:p-8 text-left transition-all hover:shadow-lg"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#a89068]/8 flex items-center justify-center mb-4 group-hover:bg-[#a89068]/15 transition-colors">
                    <i className="fa-solid fa-bolt text-[#a89068] text-lg" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Continue as Guest</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">We'll send your login details to your email.</p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#a89068] uppercase tracking-wider">
                    No account needed <i className="fa-solid fa-arrow-right text-[9px]" />
                  </div>
                </button>

                {/* OR divider — horizontal on mobile, vertical on desktop */}
                <div className="flex sm:flex-col items-center justify-center px-4 py-3 sm:py-6 shrink-0">
                  <div className="flex-1 h-px sm:h-full sm:w-px bg-gray-200" />
                  <span className="px-3 sm:px-0 sm:py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest shrink-0">or</span>
                  <div className="flex-1 h-px sm:h-full sm:w-px bg-gray-200" />
                </div>

                {/* Sign In option */}
                <button
                  onClick={() => { dispatch(setLoginCallback('navigate:/checkout')); dispatch(setShowLoginModal(true)); }}
                  className="group flex-1 bg-white rounded-2xl border-2 border-[#2e443c]/15 hover:border-[#2e443c]/40 p-6 sm:p-8 text-left transition-all hover:shadow-lg"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#2e443c]/8 flex items-center justify-center mb-4 group-hover:bg-[#2e443c]/15 transition-colors">
                    <i className="fa-solid fa-user text-[#2e443c] text-lg" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Sign In / Sign Up</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">Track orders, save addresses, and get exclusive offers</p>
                </button>
              </div>

              <div className="flex items-center justify-center gap-5 text-gray-300 pt-2">
                <i className="fa-brands fa-cc-visa text-xl" />
                <i className="fa-brands fa-cc-mastercard text-xl" />
                <i className="fa-brands fa-google-pay text-xl" />
                <i className="fa-solid fa-shield-halved text-base" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-300">100% Secure</span>
              </div>
            </div>
          )}

          {/* ══════════ STEP — CONTACT ════════════════════════════════ */}
          {currentStep === contactStep && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                  <Field label="Mobile Number" required error={isGuest ? guestErrors.mobile : ""}>
                    {isGuest
                      ? (
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <span className="text-sm text-gray-400 font-medium">+91</span>
                          </div>
                          <input type="tel" maxLength={10} value={guestMobile} onChange={(e) => { setGuestMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); setGuestErrors((p) => ({ ...p, mobile: "" })); }} placeholder="Enter mobile number" className={`${inputCls(guestErrors.mobile)} pl-12`} />
                        </div>
                      )
                      : (
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <span className="text-sm text-gray-400 font-medium">+91</span>
                          </div>
                          <input
                            type="tel"
                            maxLength={10}
                            value={senderMobile && senderMobile !== "N/A" ? senderMobile : ""}
                            onChange={(e) => setSenderMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            placeholder="Enter mobile number"
                            className={`${inputCls(false)} pl-12`}
                          />
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
                              <input type="tel" maxLength={10} value={deliveryMobile}
                                onChange={(e) => setDeliveryMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                onBlur={() => { if (deliveryMobile && !validateMobile(deliveryMobile)) setDeliveryMobileErrors("Enter a valid 10-digit mobile number (must start with 6–9)"); else setDeliveryMobileErrors(""); }}
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

          {/* ══════════ STEP — ADDRESS ═════════════════════════════════ */}
          {currentStep === addressStep && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

              <div>
                <h1 className="text-2xl sm:text-3xl font-serif text-gray-900 leading-tight">Delivery Address</h1>
                <p className="text-sm text-gray-400 mt-1.5">Where should we send your order?</p>
              </div>

              {isGuest ? (
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
                          <button onClick={() => setShowMapModal(true)} className="text-xs font-bold text-[#a89068] hover:text-[#2e443c] transition-colors">Edit</button>
                          <span className="text-gray-200 text-xs">|</span>
                          <button onClick={handleResetAddress} className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors">Reset</button>
                        </div>
                      </div>
                      <div className="p-5">
                        <p className="text-sm text-gray-700 leading-relaxed">{address}</p>
                        {pinCode && <p className="text-xs text-gray-400 mt-1.5 font-mono font-medium">PIN — {pinCode}</p>}
                        {preciseDetails.flatNo && <p className="text-xs text-gray-500 mt-1">{preciseDetails.flatNo}</p>}
                        {preciseDetails.landmark && <p className="text-xs text-gray-500 mt-0.5">Near {preciseDetails.landmark}</p>}
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
                          <button onClick={() => setShowMapModal(true)} className="text-xs font-bold text-[#a89068] hover:text-[#2e443c] transition-colors">Edit</button>
                          <span className="text-gray-200 text-xs">|</span>
                          <button onClick={handleResetAddress} className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors">Reset</button>
                        </div>
                      </div>
                      <div className="p-5">
                        <p className="text-sm text-gray-700 leading-relaxed">{address}</p>
                        {pinCode && <p className="text-xs text-gray-400 mt-1.5 font-mono font-medium">PIN — {pinCode}</p>}
                        {preciseDetails.flatNo && <p className="text-xs text-gray-500 mt-1">{preciseDetails.flatNo}</p>}
                        {preciseDetails.landmark && <p className="text-xs text-gray-500 mt-0.5">Near {preciseDetails.landmark}</p>}
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

              <div className="flex gap-3">
                <button
                  onClick={() => goToStep(contactStep)}
                  className="h-14 px-5 border border-gray-200 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-50 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-arrow-left text-xs" />
                  Back
                </button>
                <button
                  onClick={handleStep2Next}
                  disabled={!address.trim()}
                  className="flex-1 h-14 bg-[#2e443c] text-white rounded-2xl font-bold text-sm hover:bg-[#1a2822] active:scale-[0.99] transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#2e443c]/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <>
                    Continue to Review
                    <i className="fa-solid fa-arrow-right text-xs" />
                  </>
                </button>
              </div>
            </div>
          )}

          {/* ══════════ STEP — REVIEW & PAY ═══════════════════════════ */}
          {currentStep === reviewStep && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

              <div>
                <h1 className="text-2xl sm:text-3xl font-serif text-gray-900 leading-tight">Review Your Order</h1>
                <p className="text-sm text-gray-400 mt-1.5">Almost there — confirm everything looks right</p>
              </div>

              {/* Shipping error banner */}
              {shippingError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-triangle-exclamation text-red-500 text-lg" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-800 mb-1">Shipping Not Available</p>
                    <p className="text-xs text-red-600 leading-relaxed">Shipping is not available for this pincode. Please change your pincode and try again.</p>
                    <button
                      onClick={() => { goToStep(addressStep); setShowMapModal(true); setShippingError(""); }}
                      className="mt-3 text-xs font-bold text-red-600 border-2 border-red-300 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                    >
                      <i className="fa-solid fa-location-dot text-xs" /> Change Address
                    </button>
                  </div>
                </div>
              )}

              {/* Contact + Address combined card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Contact row */}
                <div className="flex items-start gap-3.5 px-5 py-4">
                  <div className="w-8 h-8 rounded-xl bg-[#a89068]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <i className="fa-solid fa-user text-[#a89068] text-xs" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{isGuest ? guestName : (userProfile?.userName || userProfile?.name)}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{isGuest ? guestEmail : userProfile?.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">{isGuest ? guestMobile : senderMobile}</p>
                  </div>
                  <button onClick={() => goToStep(contactStep)} className="flex items-center gap-1 text-xs font-bold text-[#a89068] hover:text-[#2e443c] transition-colors shrink-0">
                    <i className="fa-solid fa-pen text-[9px]" /> Edit
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 mx-5" />

                {/* Address row */}
                <div className="flex items-start gap-3.5 px-5 py-4">
                  <div className="w-8 h-8 rounded-xl bg-[#a89068]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <i className="fa-solid fa-location-dot text-[#a89068] text-xs" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{address}</p>
                    <p className="text-[11px] text-gray-400 mt-1 font-mono font-medium">PIN {pinCode}</p>
                    {(preciseDetails.flatNo || preciseDetails.landmark) && (
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {[preciseDetails.flatNo, preciseDetails.landmark].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <button onClick={() => { goToStep(addressStep); setShowMapModal(true); }} className="flex items-center gap-1 text-xs font-bold text-[#a89068] hover:text-[#2e443c] transition-colors shrink-0">
                    <i className="fa-solid fa-pen text-[9px]" /> Edit
                  </button>
                </div>
              </div>

              {/* Mobile order summary accordion */}
              <div className="lg:hidden bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#2e443c]/8 flex items-center justify-center">
                      <i className="fa-solid fa-bag-shopping text-[#2e443c] text-xs" />
                    </div>
                    <span className="text-sm font-bold text-gray-800">Order Summary</span>
                    <span className="text-[10px] bg-[#2e443c] text-white px-2 py-0.5 rounded-md font-bold">{cartItems.length}</span>
                  </div>
                  <span className="text-sm font-bold text-[#2e443c]">₹{totalToPay.toLocaleString()}</span>
                </div>
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
                  <div className="px-5 py-4 border-t border-gray-50"><PriceRows subtotal={pricingDetails.subtotal} shipping={pricingDetails.shipping} discount={pricingDetails.discount} appliedCoupon={appliedCoupon} totalToPay={totalToPay} itemCount={cartItems.length} isLoadingShipping={isCalculatingShipping} paymentMethod={paymentMethod} /></div>
                </div>
                {visibleBannerProductId && (
                  <div className="px-5 pb-5">
                    <FreeShippingBanner productId={visibleBannerProductId} variant="light" showQuantityStepper />
                  </div>
                )}
              </div>

              {/* Payment Method Selection */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                  <div className="w-8 h-8 rounded-xl bg-[#2e443c]/8 flex items-center justify-center">
                    <i className="fa-solid fa-wallet text-[#2e443c] text-sm" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Payment Method</p>
                    <p className="text-xs text-gray-400">Choose how you'd like to pay</p>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {/* Online Payment */}
                  <button
                    onClick={() => { setPaymentMethod("PREPAID"); trackSelectPaymentMethod({ paymentMethod: "PREPAID" }); }}
                    className={`w-full rounded-xl border-2 text-left transition-all duration-200 overflow-hidden ${
                      paymentMethod === "PREPAID" ? "border-[#2e443c]" : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className={`p-4 flex items-center gap-3.5 transition-colors duration-200 ${paymentMethod === "PREPAID" ? "bg-[#2e443c]/5" : "bg-white"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                        paymentMethod === "PREPAID" ? "bg-[#2e443c] text-white shadow-md shadow-[#2e443c]/20" : "bg-gray-100 text-gray-400"
                      }`}>
                        <i className="fa-solid fa-credit-card text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-bold transition-colors ${paymentMethod === "PREPAID" ? "text-[#2e443c]" : "text-gray-800"}`}>
                            Pay Online
                          </p>
                          {/* <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Recommended
                          </span> */}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Card · UPI · Net Banking · Wallets</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                        paymentMethod === "PREPAID" ? "bg-[#2e443c]" : "border-2 border-gray-200"
                      }`}>
                        {paymentMethod === "PREPAID" && <i className="fa-solid fa-check text-white text-[9px]" />}
                      </div>
                    </div>
                  </button>

                  {/* Cash on Delivery */}
                  <button
                    onClick={() => { setPaymentMethod("COD"); trackSelectPaymentMethod({ paymentMethod: "COD" }); }}
                    disabled={pricingDetails.shipping === null || isCalculatingShipping}
                    className={`w-full rounded-xl border-2 text-left transition-all duration-200 overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed ${
                      paymentMethod === "COD" ? "border-[#a89068]" : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className={`p-4 flex items-center gap-3.5 transition-colors duration-200 ${paymentMethod === "COD" ? "bg-[#a89068]/6" : "bg-white"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                        paymentMethod === "COD" ? "bg-[#a89068] text-white shadow-md shadow-[#a89068]/20" : "bg-gray-100 text-gray-400"
                      }`}>
                        <i className="fa-solid fa-hand-holding-dollar text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold transition-colors ${paymentMethod === "COD" ? "text-[#a89068]" : "text-gray-800"}`}>
                          Cash on Delivery
                        </p>
                        {paymentMethod === "COD" && realShippingAmount > 0 ? (
                          <p className="text-xs text-[#a89068]/80 font-medium mt-0.5">
                            ₹{Math.min(Math.ceil(realShippingAmount) * 2, totalToPay).toLocaleString()} now · ₹{Math.max(0, totalToPay - Math.min(Math.ceil(realShippingAmount) * 2, totalToPay)).toLocaleString()} at delivery
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-0.5">Small advance online · rest at your door</p>
                        )}
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                        paymentMethod === "COD" ? "bg-[#a89068]" : "border-2 border-gray-200"
                      }`}>
                        {paymentMethod === "COD" && <i className="fa-solid fa-check text-white text-[9px]" />}
                      </div>
                    </div>
                  </button>
                </div>
               
              </div>

              {/* COD notice — compact, shown only when COD is selected */}
          

              {/* Coupon — available to all (guests + members) */}
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
                  <CouponInput
                    key={appliedCoupon || "none"}
                    appliedCoupon={appliedCoupon}
                    discount={pricingDetails.discount}
                    isGuest={isGuest}
                    cartTotal={cartTotalAmount}
                    onCouponApplied={isGuest ? handleGuestCouponApplied : handleCouponApplied}
                    onCouponRemoved={isGuest ? handleGuestCouponRemoved : handleCouponRemoved}
                  />
                  {!appliedCoupon && (
                    <button onClick={() => setShowCouponModal(true)} className="w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:border-[#a89068]/50 hover:text-[#a89068] transition-all flex items-center justify-center gap-2">
                      <i className="fa-solid fa-tags" /> Browse available coupons
                    </button>
                  )}
                </div>
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
              <div className="lg:hidden flex gap-3">
                <button
                  onClick={() => goToStep(addressStep)}
                  className="h-14 px-5 border border-gray-200 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-50 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-arrow-left text-xs" />
                  Back
                </button>
              </div>

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
              <PriceRows subtotal={pricingDetails.subtotal} shipping={pricingDetails.shipping} discount={pricingDetails.discount} appliedCoupon={appliedCoupon} totalToPay={totalToPay} itemCount={cartItems.length} isLoadingShipping={isCalculatingShipping} paymentMethod={paymentMethod} />
            </div>

            {visibleBannerProductId && (
              <div className="px-5 pb-5">
                <FreeShippingBanner productId={visibleBannerProductId} variant="light" showQuantityStepper />
              </div>
            )}

            {/* Pay button (review step only) */}
            {currentStep === reviewStep && (
              <div className="px-5 pb-5 space-y-3">
                <button
                  onClick={handlePayment}
                  disabled={isOrdering || isCalculatingShipping || pricingDetails.shipping === null || shippingError}
                  className="w-full h-14 bg-[#2e443c] text-white rounded-xl font-bold text-sm hover:bg-[#1a2822] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-[#2e443c]/25 disabled:opacity-50"
                >
                  {isOrdering
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
                    : isCalculatingShipping
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Calculating…</>
                    : paymentMethod === "COD" && realShippingAmount > 0
                    ? <><i className="fa-solid fa-hand-holding-dollar text-xs opacity-70" /> Pay ₹{Math.min(Math.ceil(realShippingAmount) * 2, totalToPay).toLocaleString()} Advance</>
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
        </div>
      </div>

      {/* ── Mobile sticky footer (review step) ────────────────────────────────── */}
      {currentStep === reviewStep && (
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
          <div className="bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-3 pb-5 shadow-[0_-12px_40px_rgba(0,0,0,0.1)]">
            <div className="max-w-sm mx-auto flex items-center gap-3">
              <div>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                  {paymentMethod === "COD" ? "Pay Now" : "Total"}
                </p>
                <p className="text-lg font-bold text-[#2e443c]">
                  ₹{(paymentMethod === "COD" && realShippingAmount > 0
                    ? Math.min(Math.ceil(realShippingAmount) * 2, totalToPay)
                    : totalToPay
                  ).toLocaleString()}
                </p>
              </div>
              <button
                onClick={handlePayment}
                disabled={isOrdering || isCalculatingShipping || pricingDetails.shipping === null || shippingError}
                className="flex-1 h-12 bg-[#2e443c] text-white rounded-xl font-bold text-sm hover:bg-[#1a2822] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 shadow-lg disabled:opacity-50"
              >
                {isOrdering
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
                  : isCalculatingShipping
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Calculating…</>
                  : paymentMethod === "COD" && realShippingAmount > 0
                  ? <> Pay Advance</>
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
          isGuest={isGuest}
          initialData={addressForm}
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
                <CouponList
                  onCouponApplied={isGuest ? handleGuestCouponApplied : handleCouponApplied}
                  userId={userProfile?.userId}
                  isGuest={isGuest}
                  cartTotal={cartTotalAmount}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
