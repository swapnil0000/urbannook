import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { clearCart } from "../store/slices/cartSlice";
import { useClearCartMutation } from "../store/api/userApi";
import { useUI } from "../hooks/useRedux";

const PaymentProcessing = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification } = useUI();

  const [message, setMessage] = useState("Processing your payment...");
  const [clearCartApi] = useClearCartMutation();

  const isGuest = !localStorage.getItem("authToken");

  useEffect(() => {
    if (!orderId) return;

    let interval;

    const checkStatus = async () => {
      try {
        const url = isGuest
          ? `${import.meta.env.VITE_API_BASE_URL}/guest/order/${orderId}/status`
          : `${import.meta.env.VITE_API_BASE_URL}/user/order/status/${orderId}`;

        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();
        const status = data?.data?.status;
        setMessage("Verifying with bank...");

        if (status === "PAID") {
          clearInterval(interval);
          dispatch(clearCart());

          if (!isGuest) {
            try {
              await clearCartApi().unwrap();
            } catch (error) {
              console.error("Failed to clear cart from backend:", error);
            }
          }

          showNotification("Order placed successfully! Thank you for your purchase.", "success");

          setTimeout(() => {
            if (isGuest) {
              navigate(`/order-confirmation/${data?.data?.orderId || orderId}`);
            } else {
              navigate("/orders");
            }
          }, 1000);
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl p-10 flex flex-col items-center w-full max-w-md">
        <div className="w-16 h-16 border-4 border-[#A89068]/30 border-t-[#2E443C] rounded-full animate-spin"></div>
        <h2 className="mt-6 text-2xl font-semibold text-[#2E443C] text-center">Processing Payment</h2>
        <p className="mt-3 text-[#A89068] text-center">{message}</p>
        <p className="mt-2 text-sm text-gray-500 text-center">Please do not refresh or close this page.</p>
      </div>
    </div>
  );
};

export default PaymentProcessing;
