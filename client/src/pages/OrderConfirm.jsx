import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useUI } from "../hooks/useRedux";
import { getApiUrl } from "../config/appUrls";
import { setShowLoginModal, setLoginCallback, setLoginPrefillEmail } from "../store/slices/uiSlice";
import GoogleLoginButton from "../component/layout/auth/GoogleLoginButton";

const OrderConfirm = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification } = useUI();

  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    if (!orderId) return;

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

        if (data?.data) {
          setOrderData(data.data);
          if (data.data.isGuestOrder) {
            dispatch(setLoginCallback("navigate:/orders"));
          }
        }
      } catch (err) {
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
                <p className="text-sm font-semibold text-amber-900">Check your inbox</p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  We&apos;ve sent your order receipt and a temporary password to{" "}
                  {guestEmail ? (
                    <span className="font-semibold text-amber-900">{guestEmail}</span>
                  ) : "your email"}
                  . Check spam if you don&apos;t see it.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#f5f7f5] rounded-xl p-4 text-center">
              <p className="text-sm text-gray-700 font-medium">Sign in to track your order</p>
              {guestEmail && (
                <p className="text-xs text-gray-500 mt-1">{guestEmail}</p>
              )}
            </div>
          )}

          {/* Google login */}
          <div className="flex flex-col items-center gap-1">
            <GoogleLoginButton
              useOneTap={false}
              size="large"
              text="continue_with"
              shape="rectangular"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] text-gray-400 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-gray-200" />
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
            {isNewGuestAccount ? "Login with Password" : "Login to Track Order"}
          </button>

          {isNewGuestAccount && (
            <p className="text-[11px] text-gray-400 text-center">
              Didn&apos;t receive the email?{" "}
              <button
                onClick={() => {
                  if (guestEmail) dispatch(setLoginPrefillEmail(guestEmail));
                  dispatch(setLoginCallback("navigate:/orders"));
                  dispatch(setShowLoginModal(true));
                }}
                className="text-[#2E443C] font-semibold underline underline-offset-2"
              >
                Use Forgot Password
              </button>
            </p>
          )}

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
