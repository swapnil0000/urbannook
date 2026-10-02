import mongoose from "mongoose";

// Mirror of the admin CouponUsage model — storefront reads for per-user cap checks
// and writes to this collection when payment is confirmed.
const couponUsageSchema = new mongoose.Schema(
  {
    couponId:                { type: String, index: true },
    couponCode:              { type: String },
    orderId:                 { type: String },
    orderType:               { type: String, default: "WEBSITE" },
    userId:                  { type: String },
    email:                   { type: String, lowercase: true, trim: true },
    mobile:                  { type: String, trim: true },
    discountAmount:          { type: Number, default: 0 },
    cartValueBeforeDiscount: { type: Number },
    usedAt:                  { type: Date, default: Date.now },

    // Cancellation/refund flags this true (never deletes — same permanent
    // audit-trail invariant promotionUsage.model.js documents) and releases
    // the coupon's usageCount slot. Every per-user-limit check
    // (maxUsesPerUser) below must filter `reversed: { $ne: true }`.
    reversed:                { type: Boolean, default: false },
    reversedAt:              { type: Date, default: null },
  },
  { timestamps: false },
);

couponUsageSchema.index({ couponId: 1, email: 1 });
couponUsageSchema.index({ couponId: 1, mobile: 1 });

export default mongoose.model("CouponUsage", couponUsageSchema, "couponusages");
