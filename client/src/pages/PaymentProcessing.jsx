import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearCart } from "../store/slices/cartSlice";
import { useClearCartMutation } from "../store/api/userApi";
import { useUI } from "../hooks/useRedux";
import { getApiUrl } from "../config/appUrls";
import { setShowLoginModal, setLoginCallback } from "../store/slices/uiSlice";

const PaymentProcessing = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification } = useUI();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const isGuest = !isAuthenticated && !localStorage.getItem('authToken');

  const [message, setMessage] = useState("Processing your payment...");
  const [guestSuccess, setGuestSuccess] = useState(false);
  const [clearCartApi] = useClearCartMutation();

  useEffect(() => {
    if (!orderId) return;

    let interval;

    const checkStatus = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(
          `${getApiUrl()}/user/order/status/${orderId}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              ...(token && { "Authorization": `Bearer ${token}` }),
            },
          }
        );

        const data = await res.json();
        const status = data?.data?.status;
        setMessage("Verifying with bank...");

        if (status === "PAID") {
          clearInterval(interval);

          // Clear Redux cart + localStorage guest cart
          dispatch(clearCart());
          localStorage.removeItem('guestCart');
          localStorage.removeItem('guestId');

          if (isGuest) {
            // Guest: show success screen, don't redirect to /orders (protected)
            setGuestSuccess(true);
          } else {
            try {
              await clearCartApi().unwrap();
            } catch (error) {
              console.error("Failed to clear cart from backend:", error);
            }
            showNotification("Order placed successfully! Thank you for your purchase.", "success");
            setTimeout(() => {
              navigate("/orders");
            }, 1000);
          }
        }

        if (status === "FAILED") {
          clearInterval(interval);
          showNotification("Payment failed. Please try again or contact support.", "error");
          setTimeout(() => {
            navigate("/payment-failed");
          }, 2000);
        }
      } catch (err) {
        console.error("Status error:", err);
      }
    };

    checkStatus();
    interval = setInterval(checkStatus, 2000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [orderId, dispatch, clearCartApi, navigate, showNotification, isGuest]);

  if (guestSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#f5f7f5]">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden w-full max-w-md text-center">

          {/* Green header band */}
          <div className="bg-[#2E443C] px-8 pt-10 pb-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mb-4">
              <i className="fa-solid fa-circle-check text-3xl text-white"></i>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-1">Order Confirmed!</h2>
            <p className="text-[#a89068] text-sm">Thank you for shopping with Urban Nook.</p>
          </div>

          <div className="px-8 py-6 space-y-4">

            {/* Credentials email notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left flex gap-3">
              <i className="fa-solid fa-envelope text-amber-500 mt-0.5 shrink-0"></i>
              <div>
                <p className="text-sm font-semibold text-amber-900">Check your inbox</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  We've emailed your order receipt <strong>and</strong> a temporary password for your new Urban Nook account. Check spam if you don't see it.
                </p>
              </div>
            </div>

            {/* Step guide */}
            <div className="text-left space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">To track your order</p>
              <ol className="space-y-1.5 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#2e443c] text-white text-[9px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  Find the credentials email we sent you
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#2e443c] text-white text-[9px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  Click <strong>"Login to Track Order"</strong> below and sign in
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-[#a89068] text-white text-[9px] flex items-center justify-center shrink-0 mt-0.5">?</span>
                  Didn't receive it? Use <strong>"Forgot Password"</strong> in the login form
                </li>
              </ol>
            </div>

            <button
              onClick={() => {
                dispatch(setLoginCallback('navigate:/orders'));
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
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl p-10 flex flex-col items-center w-full max-w-md">
        <div className="w-16 h-16 border-4 border-[#A89068]/30 border-t-[#2E443C] rounded-full animate-spin"></div>
        <h2 className="mt-6 text-2xl font-semibold text-[#2E443C] text-center">
          Processing Payment
        </h2>
        <p className="mt-3 text-[#A89068] text-center">
          {message}
        </p>
        <p className="mt-2 text-sm text-gray-500 text-center">
          Please do not refresh or close this page.
        </p>
      </div>
    </div>
  );
};

export default PaymentProcessing;
