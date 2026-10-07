import mongoose from "mongoose";

/**
 * Why a shopper closed the Razorpay modal without paying.
 *
 * Collected by the checkout's "what stopped you?" form right after ondismiss.
 * One row per Razorpay order — re-submitting (the shopper retries, cancels
 * again and answers again) overwrites the earlier answer.
 *
 * Contact details and amount are copied from the Order on the server, never
 * taken from the client, so the admin "Failed orders" tab can trust them.
 */
export const PAYMENT_FEEDBACK_REASONS = [
  "PRICE_TOO_HIGH",
  "SHIPPING_COST",
  "PAYMENT_ISSUE",
  "PAYMENT_METHOD_MISSING",
  "DELIVERY_TIME",
  "JUST_BROWSING",
  "WILL_BUY_LATER",
  "OTHER",
];

const paymentFeedbackSchema = new mongoose.Schema(
  {
    razorpayOrderId: { type: String, required: true, trim: true },
    // Our own Order.orderId — null when the Razorpay id matched no order.
    orderId: { type: String, default: null },
    userId: { type: String, default: null },
    name: { type: String, default: null },
    email: { type: String, default: null },
    mobile: { type: String, default: null },
    amount: { type: Number, default: null },
    isGuestOrder: { type: Boolean, default: false },

    reason: { type: String, enum: PAYMENT_FEEDBACK_REASONS, required: true },
    comment: { type: String, trim: true, maxlength: 500, default: "" },

    isInAppBrowser: { type: Boolean, default: false },
    userAgent: { type: String, trim: true, maxlength: 400, default: null },
  },
  { timestamps: true },
);

paymentFeedbackSchema.index({ razorpayOrderId: 1 }, { unique: true });
paymentFeedbackSchema.index({ createdAt: -1 });
paymentFeedbackSchema.index({ reason: 1, createdAt: -1 });

const PaymentFeedback = mongoose.model("PaymentFeedback", paymentFeedbackSchema);

export default PaymentFeedback;
