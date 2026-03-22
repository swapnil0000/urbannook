import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import config from "../config/env.js";

const API_BASE_URL = config.apiBaseUrl;

const IgCheckout = () => {
  const { igOrderId } = useParams();
  const [order, setOrder] = useState(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ instaHandle: "", address: "" });
  const rzpRef = useRef(null);

  useEffect(() => {
    const loadRazorpay = () => {
      if (document.getElementById("rzp-script")) return;
      const script = document.createElement("script");
      script.id = "rzp-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);
    };
    loadRazorpay();

    axios
      .get(`${API_BASE_URL}/ig-orders/${igOrderId}`)
      .then((res) => setOrder(res.data.data))
      .catch((err) => {
        if (err.response?.status === 410) setExpired(true);
        else setError("Could not load order. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [igOrderId]);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!form.instaHandle.trim()) return setError("Instagram handle is required");
    if (!form.address.trim()) return setError("Shipping address is required");
    setError("");
    setPaying(true);

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/ig-orders/init-payment`,
        {
          igOrderId,
          customerInstaId: form.instaHandle.trim(),
          shippingAddress: form.address.trim(),
        }
      );

      const { razorpayOrderId, amount, currency } = data.data;

      const rpKeyRes = await axios.get(`${API_BASE_URL}/ig-orders/rp-key`);
      const key = rpKeyRes.data.data;

      const options = {
        key,
        amount,
        currency,
        order_id: razorpayOrderId,
        name: "Urban Nook",
        description: order.productName,
        image: "/assets/logo.webp",
        handler: () => setSuccess(true),
        prefill: { contact: "" },
        theme: { color: "#2e443c" },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };

      rzpRef.current = new window.Razorpay(options);
      rzpRef.current.open();
    } catch (err) {
      const msg = err.response?.data?.message || "Payment initiation failed.";
      if (err.response?.status === 410) setExpired(true);
      else setError(msg);
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f5ef]">
        <div className="w-8 h-8 border-4 border-[#2e443c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f9f5ef] px-6 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-[#1c3026] mb-2">Link Expired</h1>
        <p className="text-[#a89068] text-sm">
          This payment link has already been used. DM us on Instagram if you need help.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f9f5ef] px-6 text-center">
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h1 className="text-2xl font-bold text-[#1c3026] mb-2">Order Confirmed!</h1>
        <p className="text-gray-600 text-sm mb-1">
          Thank you for your purchase.
        </p>
        <p className="text-[#a89068] text-sm">
          We'll DM you on Instagram with your tracking details.
        </p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f5ef] px-6 text-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f5ef] flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-6">
          <img src="/assets/logo_with_text.webp" alt="Urban Nook" className="h-10 mx-auto" />
        </div>

        {/* Product Card — locked */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-4 mb-5">
          <img
            src={order.productImg || "/assets/logo_only.webp"}
            alt={order.productName}
            className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
          />
          <div className="flex flex-col justify-center">
            <p className="text-xs text-[#a89068] uppercase tracking-wide mb-1">Your Order</p>
            <p className="font-semibold text-[#1c3026] text-sm leading-snug">{order.productName}</p>
            <p className="text-[#2e443c] font-bold text-lg mt-1">₹{order.amount}</p>
          </div>
          <div className="ml-auto flex items-start pt-1">
            <span className="text-xs bg-[#f0ebe3] text-[#a89068] px-2 py-1 rounded-full">🔒 Fixed</span>
          </div>
        </div>

        {/* Delivery info */}
        <div className="flex gap-3 mb-5 text-xs text-gray-500">
          <span className="flex items-center gap-1">🚚 Delivers in 5–7 days</span>
          <span className="flex items-center gap-1">📍 Pan India</span>
          <span className="flex items-center gap-1">₹50 Shipping</span>
        </div>

        {/* Form */}
        <form onSubmit={handlePay} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#1c3026]">Complete Your Details</h2>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Instagram Handle</label>
            <input
              type="text"
              placeholder="@yourusername"
              value={form.instaHandle}
              onChange={(e) => setForm((f) => ({ ...f, instaHandle: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#2e443c]"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Delivery Address</label>
            <textarea
              rows={3}
              placeholder="Full address with pincode"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#2e443c] resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={paying}
            className="w-full bg-[#2e443c] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#1c3026] transition disabled:opacity-60"
          >
            {paying ? "Opening Payment..." : `Pay ₹${order.amount}`}
          </button>

          <p className="text-center text-xs text-gray-400">
            Secured by Razorpay · Urban Nook
          </p>
        </form>
      </div>
    </div>
  );
};

export default IgCheckout;
