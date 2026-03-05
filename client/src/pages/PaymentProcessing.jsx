import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { clearCart } from "../store/slices/cartSlice";

const PaymentProcessing = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [message, setMessage] = useState("Processing your payment...");

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
          dispatch(clearCart());
          navigate("/orders");
        }

        if (status === "FAILED") {
          clearInterval(interval);
          navigate("/payment-failed");
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
  }, [orderId]);

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