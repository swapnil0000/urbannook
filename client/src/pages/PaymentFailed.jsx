import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

// Where PaymentProcessing / OrderConfirm send anyone whose order is not a paid one.
// `state.reason`: "failed" (default) · "cancelled" · "notfound".
const COPY = {
  failed: {
    title: "Payment Failed",
    body: "Your payment didn't go through, so no order has been placed. If any amount was debited, your bank reverses it automatically — contact us if it doesn't show up in 5–7 working days.",
  },
  cancelled: {
    title: "Order Cancelled",
    body: "This order was cancelled, so it will not be delivered. If any amount was debited, it will be returned to you — contact us if you have any doubt.",
  },
  notfound: {
    title: "We couldn't confirm this order",
    body: "We could not find a paid order for this link. Check My Orders; if money was debited and no order appears, contact us and we will sort it out.",
  },
};

const PaymentFailed = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const copy = COPY[state?.reason] || COPY.failed;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface">
      <div className="bg-white shadow-xl rounded-2xl overflow-hidden w-full max-w-md text-center">
        <div className="bg-ink px-8 pt-10 pb-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center mb-4">
            <i className="fa-solid fa-circle-xmark text-3xl text-white"></i>
          </div>
          <h2 className="text-2xl font-semibold text-white mb-1">{copy.title}</h2>
        </div>

        <div className="px-8 py-6 space-y-4">
          <p className="text-sm text-gray-600">{copy.body}</p>

          <button
            onClick={() => navigate("/checkout")}
            className="w-full py-3 bg-ink text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-ink/90 transition-all"
          >
            <i className="fa-solid fa-rotate-right mr-2 opacity-70" />
            Try Again
          </button>

          {isAuthenticated && (
            <button
              onClick={() => navigate("/orders")}
              className="w-full py-3 border border-gray-200 text-gray-500 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-50 transition-all"
            >
              My Orders
            </button>
          )}

          <button
            onClick={() => navigate("/contact-us")}
            className="w-full py-3 border border-gray-200 text-gray-500 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-gray-50 transition-all"
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
