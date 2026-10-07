import { useState } from "react";
import { getApiUrl } from "../config/appUrls";
import { track } from "../utils/analytics";
import { isInAppBrowser } from "../utils/browserEnv";

// Keys must match PAYMENT_FEEDBACK_REASONS in server/src/model/paymentFeedback.model.js.
const REASONS = [
  { key: "PRICE_TOO_HIGH", label: "Price felt too high" },
  { key: "SHIPPING_COST", label: "Shipping charges" },
  { key: "PAYMENT_ISSUE", label: "Payment didn't go through" },
  { key: "PAYMENT_METHOD_MISSING", label: "My payment option wasn't there" },
  { key: "DELIVERY_TIME", label: "Delivery takes too long" },
  { key: "WILL_BUY_LATER", label: "I'll buy later" },
  { key: "JUST_BROWSING", label: "Just checking prices" },
  { key: "OTHER", label: "Something else" },
];

/**
 * Shown after the shopper closes the Razorpay modal without paying.
 * Saves to /payment-feedback (admin → Failed orders) and fires a
 * payment_cancel_feedback event. Skippable — it must never block a retry.
 */
export default function PaymentCancelFeedbackModal({ razorpayOrderId, value, onClose }) {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const skip = () => {
    track("payment_cancel_feedback_skipped", { order_id: razorpayOrderId, value });
    onClose();
  };

  const submit = async () => {
    if (!reason) { setError("Please pick a reason"); return; }
    setError("");
    setSubmitting(true);
    track("payment_cancel_feedback", { order_id: razorpayOrderId, value, reason, has_comment: !!comment.trim() });
    try {
      const res = await fetch(`${getApiUrl()}/payment-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ razorpayOrderId, reason, comment: comment.trim(), isInAppBrowser: isInAppBrowser() }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
    } catch (e) {
      // The analytics event already went out; a failed save shouldn't hold the shopper here.
      console.warn("[PaymentCancelFeedback] save failed:", e);
    }
    setSubmitting(false);
    setDone(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center bg-black/50 sm:p-4"
      onClick={skip}
      role="dialog" aria-modal="true" aria-labelledby="pcf-title"
    >
      <style>{`
        @keyframes pcf-sheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pcf-pop { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
        .pcf-panel { animation: pcf-sheet .28s cubic-bezier(.2,.8,.2,1); }
        @media (min-width: 640px) { .pcf-panel { animation: pcf-pop .18s ease-out; } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        className="pcf-panel w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-0"
      >
        {/* drag handle — mobile sheet only */}
        <div className="sm:hidden flex justify-center pt-2.5">
          <span className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <i className="fa-solid fa-heart text-[#E63329] text-2xl" />
            <p className="mt-3 text-sm font-bold text-gray-800">Thanks for telling us!</p>
            <p className="mt-1 text-xs text-gray-500">Your cart is saved whenever you're ready.</p>
          </div>
        ) : (
          <div className="px-5 pt-3 pb-1 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="pcf-title" className="text-base sm:text-lg font-bold text-gray-900">What stopped you?</h2>
                <p className="text-xs text-gray-500 mt-0.5">Takes 5 seconds and helps us fix it.</p>
              </div>
              <button onClick={skip} aria-label="Close" className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 shrink-0">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {REASONS.map((r) => {
                const active = reason === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => { setReason(r.key); setError(""); }}
                    className={`px-3.5 py-2 rounded-full border text-[13px] font-medium transition-colors ${active ? "border-[#E63329] bg-[#E63329] text-white" : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"}`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            {reason && (
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                placeholder={reason === "OTHER" ? "Tell us what happened" : "Anything else? (optional)"}
                rows={2}
                className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#E63329]"
              />
            )}

            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

            <div className="mt-4 flex gap-2 sm:justify-end">
              <button onClick={skip} className="flex-1 sm:flex-none sm:px-6 h-11 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
                Skip
              </button>
              <button onClick={submit} disabled={submitting || !reason} className="flex-1 sm:flex-none sm:px-8 h-11 rounded-xl bg-[#E63329] text-white text-sm font-bold disabled:opacity-50">
                {submitting ? "Sending…" : "Submit"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
