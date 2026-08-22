import mongoose from "mongoose";

// Mirror of the admin Referral model — same collection. Storefront writes the
// PENDING doc at signup (referee used a referral code) and sets
// qualifyingOrderId when the referee places their first order. The admin-side
// delivery cron flips PENDING/QUALIFIED -> CREDITED once that order is
// DELIVERED + earnDelayHours old.
const referralSchema = new mongoose.Schema(
  {
    referralId: { type: String, required: true, unique: true },
    referrerUserId: { type: String, required: true },
    referrerCode: { type: String, required: true },
    refereeUserId: { type: String, required: true },
    qualifyingOrderId: { type: String, default: null },
    status: {
      type: String,
      enum: ["PENDING", "QUALIFIED", "CREDITED"],
      default: "PENDING",
    },
    creditedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

referralSchema.index({ referrerUserId: 1 });
referralSchema.index({ refereeUserId: 1 }, { unique: true });

export default mongoose.model("Referral", referralSchema, "referrals");
