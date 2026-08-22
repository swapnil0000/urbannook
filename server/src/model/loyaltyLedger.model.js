import mongoose from "mongoose";

// Mirror of the admin LoyaltyLedger model — same collection. Storefront writes
// REDEEM_ORDER entries at checkout; the admin-side delivery cron writes
// EARN_ORDER / EARN_REFERRAL_* entries. See admin repo's model comment for the
// append-only / signed-points / dedupeKey design rationale.
const loyaltyLedgerSchema = new mongoose.Schema(
  {
    ledgerId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    orderId: { type: String, default: null },
    orderType: { type: String, enum: ["WEBSITE", "INSTAGRAM"], default: "WEBSITE" },
    type: {
      type: String,
      required: true,
      enum: [
        "EARN_ORDER",
        "REDEEM_ORDER",
        "EARN_REFERRAL_REFERRER",
        "EARN_REFERRAL_REFEREE",
        "REVERSAL",
        "ADMIN_ADJUST",
      ],
    },
    points: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reversesLedgerId: { type: String, default: null },
    reason: { type: String, default: "" },
    createdBy: { type: String, default: "system" },
    dedupeKey: { type: String, default: null },
  },
  { timestamps: true },
);

loyaltyLedgerSchema.index({ userId: 1, createdAt: -1 });
loyaltyLedgerSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

export const CREDIT_TYPES = ["EARN_ORDER", "REDEEM_ORDER", "EARN_REFERRAL_REFERRER", "EARN_REFERRAL_REFEREE"];

export default mongoose.model("LoyaltyLedger", loyaltyLedgerSchema, "loyaltyledger");
