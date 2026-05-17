import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { clearCart } from "../store/slices/cartSlice";
import { useClearCartMutation } from "../store/api/userApi";
import { useUI } from "../hooks/useRedux";
import { getApiUrl } from "../config/appUrls";

const PaymentProcessing = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification } = useUI();
  const [message, setMessage] = useState("Processing your payment...");
  const [clearCartApi] = useClearCartMutation();

  console.log("[PaymentProcessing] ✅ NEW VERSION - component mounted, orderId:", orderId);

  useEffect(() => {
    if (!orderId) {
      console.log("[PaymentProcessing] ⚠️ No orderId, returning early");
      return;
    }

    console.log("[PaymentProcessing] 🔄 Starting status polling for:", orderId);
    let interval;

    const checkStatus = async () => {
      try {
        const token = localStorage.getItem("authToken");
        console.log("[PaymentProcessing] 📡 Calling status API, hasToken:", !!token);

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
        const status = data?.data?.status;
        const isGuestOrder = data?.data?.isGuestOrder ?? false;

        console.log("[PaymentProcessing] 📦 API response:", { status, isGuestOrder, fullData: data?.data });
        setMessage("Verifying with bank...");

        if (status === "PAID") {
          console.log("[PaymentProcessing] ✅ PAID - clearing cart, isGuestOrder:", isGuestOrder);
          clearInterval(interval);
          dispatch(clearCart());
          localStorage.removeItem("guestCart");
          localStorage.removeItem("guestId");

          if (!isGuestOrder) {
            try {
              await clearCartApi().unwrap();
              console.log("[PaymentProcessing] 🛒 Backend cart cleared for auth user");
            } catch (_) {
              console.warn("[PaymentProcessing] ⚠️ Backend cart clear failed (non-critical)");
            }
          }

          console.log("[PaymentProcessing] ➡️ Navigating to /order-confirm/", orderId);
          navigate(`/order-confirm/${orderId}`, { replace: true });
        }

        if (status === "FAILED") {
          console.log("[PaymentProcessing] ❌ FAILED - navigating to /payment-failed");
          clearInterval(interval);
          showNotification("Payment failed. Please try again or contact support.", "error");
          setTimeout(() => navigate("/payment-failed"), 2000);
        }
      } catch (err) {
        console.error("[PaymentProcessing] 💥 Status check error:", err);
      }
    };

    checkStatus();
    interval = setInterval(checkStatus, 2000);

    return () => {
      console.log("[PaymentProcessing] 🧹 Cleanup - clearing interval");
      if (interval) clearInterval(interval);
    };
  }, [orderId, dispatch, clearCartApi, navigate, showNotification]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl p-10 flex flex-col items-center w-full max-w-md">
        <div className="w-16 h-16 border-4 border-[#A89068]/30 border-t-[#2E443C] rounded-full animate-spin"></div>
        <h2 className="mt-6 text-2xl font-semibold text-[#2E443C] text-center">
          Processing Payment
        </h2>
        <p className="mt-3 text-[#A89068] text-center">{message}</p>
        <p className="mt-2 text-sm text-gray-500 text-center">
          Please do not refresh or close this page.
        </p>
      </div>
    </div>
  );
};

export default PaymentProcessing;
