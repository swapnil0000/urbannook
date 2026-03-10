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

  useEffect(() => {
    if (!orderId) return;

    let interval;

    const checkStatus = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/user/order/status/${orderId}`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await res.json();
        const status = data?.data?.status;
        setMessage("Verifying with bank...");

        if (status === "PAID") {
          clearInterval(interval);
          
          // Update message to show success
          setMessage("Payment successful! Redirecting...");
          
          // Clear cart from Redux and backend
          dispatch(clearCart());
          try {
            await clearCartApi().unwrap();
          } catch (error) {
            console.error("Failed to clear cart from backend:", error);
          }
          
          // Show success notification
          showNotification("Order placed successfully! Thank you for your purchase.", "success");
          
          // Wait 2 seconds to let user see the notification before redirecting
          setTimeout(() => {
            navigate("/orders");
          }, 2000);
        }

        if (status === "FAILED") {
          clearInterval(interval);
          
          // Show error notification
          showNotification("Payment failed. Please try again or contact support.", "error");
          
          // Wait 2 seconds before redirecting to payment failed page
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
  }, [orderId, dispatch, clearCartApi, navigate, showNotification]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl p-10 flex flex-col items-center w-full max-w-md">
        
        {/* Spinner */}
        <div className="w-16 h-16 border-4 border-[#A89068]/30 border-t-[#2E443C] rounded-full animate-spin"></div>

        {/* Heading */}
        <h2 className="mt-6 text-2xl font-semibold text-[#2E443C] text-center">
          Processing Payment
        </h2>

        {/* Dynamic Message */}
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