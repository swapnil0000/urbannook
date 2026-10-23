import mongoose from "mongoose";

// Mirror of couponUsage.model.js's pattern exactly: permanent, append-only
// audit trail — never deleted. Cancellation/refund (finance.controller.js,
// admin repo) sets `reversed: true` instead of deleting, same invariant
// CouponUsage already documents/relies on.
const promotionUsageSchema = new mongoose.Schema(
  {
    promotionId:             { type: String, index: true },
    promotionName:           { type: String },
    orderId:                 { type: String },
    orderType:               { type: String, default: "WEBSITE" },
    userId:                  { type: String },
    email:                   { type: String, lowercase: true, trim: true },
    mobile:                  { type: String, trim: true },
    // Snapshot of what this promotion actually did on this order — lets
    // OrderDetailPanel / support show exactly what applied without
    // recomputing the engine against historical (possibly since-changed)
    // promotion config.
    rewardsSnapshot:         { type: mongoose.Schema.Types.Mixed, default: {} },
    discountAmount:          { type: Number, default: 0 },
    cartValueBeforeDiscount: { type: Number },
    // Which products this promotion actually discounted/gifted on THIS
    // order — additive field (2026-10-10) so admin's usage view can answer
    // "on what products was this applied", not just "how much". Empty for
    // an order-level-only reward (percent_off_order/flat_off_order), since
    // those apply to the whole order rather than named products.
    discountedProducts:      { type: [{ productId: String, productName: String, quantity: Number, _id: false }], default: [] },
    usedAt:                  { type: Date, default: Date.now },
    reversed:                { type: Boolean, default: false },
    reversedAt:              { type: Date, default: null },
  },
  { timestamps: false },
);

promotionUsageSchema.index({ promotionId: 1, email: 1 });
promotionUsageSchema.index({ promotionId: 1, mobile: 1 });
promotionUsageSchema.index({ orderId: 1 });

export default mongoose.model("PromotionUsage", promotionUsageSchema, "promotionusages");
