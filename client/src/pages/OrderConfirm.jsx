import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useUI } from "../hooks/useRedux";
import { getApiUrl } from "../config/appUrls";
import { setShowLoginModal, setLoginCallback, setLoginPrefillEmail } from "../store/slices/uiSlice";

const OrderConfirm = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification } = useUI();

  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);

  console.log("[OrderConfirm] ✅ NEW VERSION - component mounted, orderId:", orderId);

  useEffect(() => {
    if (!orderId) {
      console.log("[OrderConfirm] ⚠️ No orderId, returning early");
      return;
    }

    console.log("[OrderConfirm] 📡 Fetching order data for:", orderId);

    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(
          `${getApiUrl()}/user/order/status/${orderId}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
          }
        );

        const data = await res.json();
        console.log("[OrderConfirm] 📦 Order data received:", data?.data);

        if (data?.data) {
          setOrderData(data.data);
          console.log("[OrderConfirm] 🔑 isGuestOrder:", data.data.isGuestOrder, "| isNewGuestAccount:", data.data.isNewGuestAccount, "| guestEmail:", data.data.guestEmail);
        }
      } catch (err) {
        console.error("[OrderConfirm] 💥 Order fetch error:", err);
        showNotification("Could not load order details.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white shadow-xl rounded-2xl p-10 flex flex-col items-center w-full max-w-md">
          <div className="w-16 h-16 border-4 border-[#A89068]/30 border-t-[#2E443C] rounded-full animate-spin"></div>
          <p className="mt-6 text-[#A89068] text-center">Loading your order...</p>
        </div>
      </div>
    );
  }

  const isGuestOrder = orderData?.isGuestOrder ?? false;
  const guestEmail = orderData?.guestEmail ?? null;
  const isNewGuestAccount = orderData?.isNewGuestAccount ?? true;

  // Authenticated user flow
  if (!isGuestOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#f5f7f5]">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden w-full max-w-md text-center">
          <div className="bg-[#2E443C] px-8 pt-10 pb-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mb-4">
              <i className="fa-solid fa-circle-check text-3xl text-white"></i>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-1">Order Confirmed!</h2>
            <p className="text-[#a89068] text-sm">Thank you for shopping with Urban Nook.</p>
          </div>

          <div className="px-8 py-6 space-y-4">
            <p className="text-sm text-gray-600">
              Your order has been placed successfully. You can track it from your orders page.
            </p>

            <button
              onClick={() => navigate("/orders")}
              className="w-full py-3 bg-[#2E443C] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#1a2822] transition-all"
            >
              <i className="fa-solid fa-box mr-2 opacity-70" />
              Go to My Orders
            </button>

            <button
              onClick={() => navigate("/products")}
              className="w-full py-3 border border-gray-200 text-gray-500 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-50 transition-all"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Guest user flow
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#f5f7f5]">
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden w-full max-w-md text-center">
        <div className="bg-[#2E443C] px-8 pt-10 pb-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mb-4">
            <i className="fa-solid fa-circle-check text-3xl text-white"></i>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-1">Order Confirmed!</h2>
          <p className="text-[#a89068] text-sm">Thank you for shopping with Urban Nook.</p>
        </div>

        <div className="px-8 py-6 space-y-4">
          {isNewGuestAccount ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left flex gap-3">
              <i className="fa-solid fa-envelope text-amber-500 mt-0.5 shrink-0"></i>
              <div>
                <p className="text-sm font-semibold text-amber-900">Account created — check your inbox</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  We&apos;ve emailed your order receipt <strong>and</strong> a temporary password for your new Urban Nook account. Check spam if you don&apos;t see it.
                </p>
                {guestEmail && (
                  <p className="text-xs text-amber-800 mt-1.5 font-semibold">
                    Login email:{" "}
                    <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded">{guestEmail}</span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left flex gap-3">
              <i className="fa-solid fa-circle-info text-blue-500 mt-0.5 shrink-0"></i>
              <div>
                <p className="text-sm font-semibold text-blue-900">You&apos;re already our customer!</p>
                <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                  This email is already registered with Urban Nook. Log in with your existing password to track this order.
                </p>
                {guestEmail && (
                  <p className="text-xs text-blue-800 mt-1.5 font-semibold">
                    Your email:{" "}
                    <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded">{guestEmail}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="text-left space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">To track your order</p>
            <ol className="space-y-1.5 text-xs text-gray-600">
              {isNewGuestAccount ? (
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#2e443c] text-white text-[9px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  Find the credentials email we sent you
                </li>
              ) : (
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#2e443c] text-white text-[9px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  Use your existing Urban Nook password to log in
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[#2e443c] text-white text-[9px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                Click <strong>&quot;Login to Track Order&quot;</strong> below and sign in
              </li>
              {isNewGuestAccount && (
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#a89068] text-white text-[9px] flex items-center justify-center shrink-0 mt-0.5">?</span>
                  Didn&apos;t receive it? Use <strong>&quot;Forgot Password&quot;</strong> in the login form
                </li>
              )}
            </ol>
          </div>

          <button
            onClick={() => {
              if (guestEmail) dispatch(setLoginPrefillEmail(guestEmail));
              dispatch(setLoginCallback("navigate:/orders"));
              dispatch(setShowLoginModal(true));
            }}
            className="w-full py-3 bg-[#2E443C] text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#1a2822] transition-all"
          >
            <i className="fa-solid fa-arrow-right-to-bracket mr-2 opacity-70" />
            Login to Track Order
          </button>

          <button
            onClick={() => navigate("/products")}
            className="w-full py-3 border border-gray-200 text-gray-500 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-50 transition-all"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirm;
