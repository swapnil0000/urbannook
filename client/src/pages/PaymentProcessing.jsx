import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { clearCart } from "../store/slices/cartSlice";
import { useClearCartMutation } from "../store/api/userApi";
import { useUI } from "../hooks/useRedux";

const PaymentProcessing = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { showNotification } = useUI();

  const [message, setMessage] = useState("Confirming your order...");
  const [clearCartApi] = useClearCartMutation();
  
  // Check if we came from successful payment (optimistic)
  const isOptimistic = location.state?.optimistic;

  useEffect(() => {
    if (!orderId) return;

    let interval;
    let attempts = 0;
    const maxAttempts = 15; // 30 seconds max

    const checkStatus = async () => {
      attempts++;
      
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

        if (status === "PAID") {
          clearInterval(interval);
          
          // Clear cart from backend
          try {
            await clearCartApi().unwrap();
          } catch (error) {
            console.error("Failed to clear cart:", error);
          }
          
          // Navigate immediately (notification already shown in handler)
          navigate("/orders", { replace: true });
        }

        if (status === "FAILED") {
          clearInterval(interval);
          showNotification("Payment failed. Please try again.", "error");
          setTimeout(() => {
            navigate("/payment-failed", { replace: true });
          }, 1500);
        }
        
        // Timeout after max attempts
        if (attempts >= maxAttempts && status !== "PAID") {
          clearInterval(interval);
          showNotification("Payment verification taking longer than expected. Check My Orders.", "warning");
          navigate("/orders", { replace: true });
        }
        
      } catch (err) {
        console.error("Status error:", err);
      }
    };

    // First check immediately
    checkStatus();
    
    // Then poll every 2 seconds
    interval = setInterval(checkStatus, 2000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [orderId, dispatch, clearCartApi, navigate, showNotification]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-emerald-50 to-white">
      <div className="bg-white shadow-xl rounded-2xl p-10 flex flex-col items-center w-full max-w-md">
        
        {/* Success Icon Animation (if optimistic) or Spinner */}
        {isOptimistic ? (
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center animate-in zoom-in duration-500">
            <i className="fa-solid fa-check text-emerald-600 text-2xl"></i>
          </div>
        ) : (
          <div className="w-16 h-16 border-4 border-[#A89068]/30 border-t-[#2E443C] rounded-full animate-spin"></div>
        )}

        {/* Heading */}
        <h2 className="mt-6 text-2xl font-semibold text-[#2E443C] text-center">
          {isOptimistic ? "Payment Successful!" : "Processing Payment"}
        </h2>

        {/* Dynamic Message */}
        <p className="mt-3 text-[#A89068] text-center">
          {message}
        </p>

        <p className="mt-2 text-sm text-gray-500 text-center">
          Please wait while we confirm your order...
        </p>
      </div>
    </div>
  );
};

export default PaymentProcessing;