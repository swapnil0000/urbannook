import { useEffect } from "react";
import { track } from "../../utils/analytics";
import {
  SUPPORT_HOURS,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_TEL_URL,
  getSupportWhatsAppUrl,
  isSupportCallOpen,
  onSupportWhatsAppClick,
} from "../../utils/contactHelper";

/**
 * "Stuck on payment? Talk to us" — shown at checkout only after a payment was
 * cancelled or failed, so the number reaches people who already tried to pay,
 * not everyone who opens the page (the help widget stays hidden on checkout).
 * Call only in SUPPORT_HOURS; WhatsApp always, with the order already typed.
 *
 * @param {string} reason   payment_cancelled | payment_failed | payment_error | verify_failed
 * @param {string} [orderId] Razorpay order id of the attempt, for the support team
 * @param {number} [value]   amount the shopper was paying
 * @param {boolean} [compact] one-line form, for the cancel feedback sheet
 * @param {string}  [placement] where it is shown, for tracking (error_box | cancel_feedback)
 */
export default function CheckoutHelpLine({ reason, orderId, value, compact = false, placement = "error_box", className = "" }) {
  const callOpen = isSupportCallOpen();
  const amount = Number(value) > 0 ? ` of ₹${Math.round(Number(value)).toLocaleString("en-IN")}` : "";
  const message = `Hi Urban Nook, I couldn't complete my payment${amount}.${orderId ? ` Order ref: ${orderId}.` : ""} Can you help?`;
  const meta = { reason, placement, order_id: orderId || undefined, value: Number(value) || undefined };

  useEffect(() => {
    track("checkout_help_shown", { ...meta, call_open: callOpen });
    // once per failed attempt shown, not on every re-render
  }, [reason, orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCall = () => track("checkout_help_click", { ...meta, channel: "call" });
  const onWhatsApp = (e) => {
    track("checkout_help_click", { ...meta, channel: "whatsapp" });
    onSupportWhatsAppClick(message)(e);
  };

  const buttons = (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-2.5"}`}>
      {callOpen && (
        <a
          href={SUPPORT_TEL_URL}
          onClick={onCall}
          className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-bold text-white hover:bg-ink/90"
        >
          <i className="fa-solid fa-phone text-[10px]" aria-hidden="true" /> Call {SUPPORT_PHONE_DISPLAY}
        </a>
      )}
      <a
        href={getSupportWhatsAppUrl(message)}
        onClick={onWhatsApp}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
      >
        <i className="fa-brands fa-whatsapp text-[12px]" aria-hidden="true" /> WhatsApp us
      </a>
    </div>
  );

  return (
    <div className={className}>
      <p className={`text-xs ${compact ? "mb-2 text-gray-600" : "font-semibold text-gray-800"}`}>
        Stuck on payment? Talk to us{compact ? "" : " - we'll help you finish the order."}
      </p>
      {buttons}
      <p className="mt-1.5 text-[11px] text-gray-400">
        {callOpen ? `Calls ${SUPPORT_HOURS}` : `Calls ${SUPPORT_HOURS} - WhatsApp us now and we'll reply.`}
      </p>
    </div>
  );
}
