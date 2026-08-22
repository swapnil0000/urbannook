import mongoose from "mongoose";

// Mirror of the admin LoyaltyConfig model — admin panel owns writes (editable
// settings form); storefront only reads it to compute earn/redeem at runtime.
const loyaltyConfigSchema = new mongoose.Schema(
  {
    isEnabled: { type: Boolean, default: false },
    earnPercent: { type: Number, default: 2 },
    earnDelayHours: { type: Number, default: 24 },
    maxRedeemPercentOfCart: { type: Number, default: 20 },
    pointToRupeeRatio: { type: Number, default: 1 },
    pointsExpiryDays: { type: Number, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("LoyaltyConfig", loyaltyConfigSchema, "loyaltyconfig");
