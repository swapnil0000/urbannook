import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import config from "../config/env.js";

const API_BASE_URL = config.apiBaseUrl;
const OLA_KEY = import.meta.env.VITE_OLA_MAP_API_KEY;
const OLA_AUTOCOMPLETE = "https://api.olamaps.io/places/v1/autocomplete";
const OLA_REVERSE = "https://api.olamaps.io/places/v1/reverse-geocode";

const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.message || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

const INITIAL_FORM = {
  customerName: "",
  customerMobile: "",
  customerEmail: "",
  customerInstaId: "",
  shippingAddress: "",
  shippingCity: "",
  shippingState: "",
  shippingPinCode: "",
};

const IgCheckout = () => {
  const { igOrderId } = useParams();
  const [order, setOrder] = useState(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);

  // OlaMaps autocomplete state
  const [addressQuery, setAddressQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const suggestionsRef = useRef(null);
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

    apiFetch(`${API_BASE_URL}/ig-orders/${igOrderId}`)
      .then((res) => setOrder(res.data))
      .catch((err) => {
        if (err.status === 410) setExpired(true);
        else setError("Could not load order. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [igOrderId]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // OlaMaps autocomplete search
  const handleAddressInput = useCallback((val) => {
    setAddressQuery(val);
    setForm((f) => ({ ...f, shippingAddress: val, shippingCity: "", shippingState: "", shippingPinCode: "" }));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsFetchingSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${OLA_AUTOCOMPLETE}?input=${encodeURIComponent(val)}&api_key=${OLA_KEY}`,
          { headers: { "X-Request-Id": "urbannook-ig", Accept: "application/json" } }
        );
        const data = await res.json();
        const preds = data?.predictions || [];
        setSuggestions(preds);
        setShowSuggestions(preds.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 500);
  }, []);

  // When user picks a suggestion — reverse geocode to get city/state/pincode
  const handleSelectSuggestion = useCallback(async (item) => {
    const mainText = item.structured_formatting?.main_text || item.description || "";
    const fullText = item.description || mainText;
    setAddressQuery(fullText);
    setForm((f) => ({ ...f, shippingAddress: fullText }));
    setSuggestions([]);
    setShowSuggestions(false);

    // Try to get city/state/pincode via reverse geocode using place geometry
    const lat = item.geometry?.location?.lat;
    const lng = item.geometry?.location?.lng;
    if (lat && lng) {
      try {
        const res = await fetch(
          `${OLA_REVERSE}?latlng=${lat},${lng}&api_key=${OLA_KEY}`,
          { headers: { "X-Request-Id": "urbannook-ig", Accept: "application/json" } }
        );
        const data = await res.json();
        const result = data?.results?.[0];
        if (result) {
          let city = "", state = "", pinCode = "";
          (result.address_components || []).forEach((comp) => {
            if (comp.types.includes("administrative_area_level_1")) state = comp.long_name || comp.short_name;
            if (comp.types.includes("locality") || comp.types.includes("administrative_area_level_2")) city = comp.long_name || comp.short_name;
            if (comp.types.includes("postal_code")) pinCode = comp.long_name || comp.short_name;
          });
          setForm((f) => ({ ...f, shippingCity: city, shippingState: state, shippingPinCode: pinCode }));
        }
      } catch {
        // silently fail — user can fill manually
      }
    }
  }, []);

  const validate = () => {
    if (!form.customerName.trim()) return "Full name is required";
    if (!form.customerMobile.trim()) return "Mobile number is required";
    if (!/^[0-9]{10}$/.test(form.customerMobile.trim())) return "Enter a valid 10-digit mobile number";
    if (!form.shippingAddress.trim()) return "Shipping address is required";
    if (!form.shippingPinCode.trim()) return "Pincode is required";
    return null;
  };

  const handlePay = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) return setError(validationError);
    setError("");
    setPaying(true);

    try {
      const data = await apiFetch(`${API_BASE_URL}/ig-orders/init-payment`, {
        method: "POST",
        body: JSON.stringify({
          igOrderId,
          customerName: form.customerName.trim(),
          customerEmail: form.customerEmail.trim() || undefined,
          customerMobile: form.customerMobile.trim(),
          customerInstaId: form.customerInstaId.trim() || undefined,
          shippingAddress: form.shippingAddress.trim(),
          shippingCity: form.shippingCity.trim() || undefined,
          shippingState: form.shippingState.trim() || undefined,
          shippingPinCode: form.shippingPinCode.trim(),
        }),
      });

      const { razorpayOrderId, amount, currency } = data.data;
      const rpKeyRes = await apiFetch(`${API_BASE_URL}/ig-orders/rp-key`);
      const key = rpKeyRes.data;

      const options = {
        key,
        amount,
        currency,
        order_id: razorpayOrderId,
        name: "Urban Nook",
        description: order.productName,
        image: "/assets/logo.webp",
        handler: () => setSuccess(true),
        prefill: {
          name: form.customerName.trim(),
          email: form.customerEmail.trim() || "",
          contact: form.customerMobile.trim(),
        },
        theme: { color: "#2e443c" },
        modal: { ondismiss: () => setPaying(false) },
      };

      rzpRef.current = new window.Razorpay(options);
      rzpRef.current.open();
    } catch (err) {
      const msg = err.data?.message || err.message || "Payment initiation failed.";
      if (err.status === 410) setExpired(true);
      else setError(msg);
      setPaying(false);
    }
  };

  // ── Screens ──────────────────────────────────────────────────────────────

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
        <p className="text-gray-600 text-sm mb-1">Thank you for your purchase.</p>
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

        {/* Logo */}
        <div className="text-center mb-6">
          <img src="/assets/logo_with_text.webp" alt="Urban Nook" className="h-10 mx-auto" />
        </div>

        {/* Order card */}
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

          {/* Full Name */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Your full name"
              value={form.customerName}
              onChange={setField("customerName")}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#2e443c]"
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Mobile Number <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              placeholder="10-digit mobile number"
              maxLength={10}
              value={form.customerMobile}
              onChange={setField("customerMobile")}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#2e443c]"
            />
          </div>

          {/* Email (optional) */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email (optional)</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={form.customerEmail}
              onChange={setField("customerEmail")}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#2e443c]"
            />
          </div>

          {/* Instagram Handle (optional) */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Instagram Handle (optional)</label>
            <input
              type="text"
              placeholder="@yourusername"
              value={form.customerInstaId}
              onChange={setField("customerInstaId")}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#2e443c]"
            />
          </div>

          {/* Address with OlaMaps autocomplete */}
          <div ref={suggestionsRef} className="relative">
            <label className="text-xs text-gray-500 mb-1 block">
              Delivery Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search your address..."
                value={addressQuery}
                onChange={(e) => handleAddressInput(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-[#2e443c]"
              />
              {isFetchingSuggestions && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-[#2e443c] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                {suggestions.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-4 py-3 hover:bg-[#f9f5ef] border-b border-gray-50 last:border-0 flex items-start gap-3"
                  >
                    <i className="fa-solid fa-location-dot text-[#a89068] text-xs mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-[#1c3026] font-medium leading-snug">
                        {item.structured_formatting?.main_text || item.description}
                      </p>
                      {item.structured_formatting?.secondary_text && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {item.structured_formatting.secondary_text}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* City / State / Pincode row */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">City</label>
              <input
                type="text"
                placeholder="City"
                value={form.shippingCity}
                onChange={setField("shippingCity")}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2e443c]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">State</label>
              <input
                type="text"
                placeholder="State"
                value={form.shippingState}
                onChange={setField("shippingState")}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2e443c]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Pincode <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Pincode"
                maxLength={6}
                value={form.shippingPinCode}
                onChange={setField("shippingPinCode")}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#2e443c]"
              />
            </div>
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
