import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearCart } from "../store/slices/cartSlice";
import { useClearCartMutation } from "../store/api/userApi";
import { useUI } from "../hooks/useRedux";
import { getApiUrl } from "../config/appUrls";

const PaymentProcessing = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification } = useUI();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const fallbackRoute = isAuthenticated ? "/orders" : "/products";
  const [message, setMessage] = useState("Processing your payment...");
  const [clearCartApi] = useClearCartMutation();

  const clearCartApiRef = useRef(clearCartApi);
  const showNotificationRef = useRef(showNotification);
  useEffect(() => { clearCartApiRef.current = clearCartApi; }, [clearCartApi]);
  useEffect(() => { showNotificationRef.current = showNotification; }, [showNotification]);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 30; // 60 seconds max (30 × 2s)

    const checkStatus = async () => {
      if (cancelled) return;
      attempts++;

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
        if (cancelled) return;

        const status = data?.data?.status;
        const isGuestOrder = data?.data?.isGuestOrder ?? false;

        setMessage("Verifying with bank...");

        if (status === "PAID") {
          cancelled = true;
          clearInterval(interval);
          dispatch(clearCart());
          localStorage.removeItem("guestCart");
          localStorage.removeItem("guestId");

          if (!isGuestOrder) {
            try {
              await clearCartApiRef.current().unwrap();
            } catch (_) {
              console.warn("[PaymentProcessing] ⚠️ Backend cart clear failed (non-critical)");
            }
          }

          navigate(`/order-confirm/${orderId}`, { replace: true });
          return;
        }

        if (status === "FAILED") {
          cancelled = true;
          clearInterval(interval);
          showNotificationRef.current("Payment failed. Please try again or contact support.", "error");
          setTimeout(() => navigate("/payment-failed"), 2000);
          return;
        }

        if (attempts >= MAX_ATTEMPTS) {
          cancelled = true;
          clearInterval(interval);
          setMessage("Payment is taking longer than expected. Check your orders page.");
          showNotificationRef.current("Payment verification timed out. Check your orders for status.", "error");
          setTimeout(() => navigate(fallbackRoute), 4000);
        }
      } catch (err) {
        console.error("[PaymentProcessing] 💥 Status check error:", err);
        if (attempts >= MAX_ATTEMPTS) {
          cancelled = true;
          clearInterval(interval);
          setTimeout(() => navigate(fallbackRoute), 4000);
        }
      }
    };

    // Assign interval BEFORE calling checkStatus so clearInterval(interval)
    // works correctly even if the first fetch resolves with PAID/FAILED.
    const interval = setInterval(checkStatus, 2000);
    checkStatus();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

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
