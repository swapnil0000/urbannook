import mongoose from "mongoose";

// Mirror of the admin coupon model — same collection, read-only from storefront.
// Admin server owns writes; storefront only reads to validate at checkout.
const couponSchema = new mongoose.Schema(
  {
    couponId:       { type: String },
    code:           { type: String, uppercase: true, trim: true },
    title:          { type: String },
    discountType:   { type: String, enum: ["PERCENTAGE", "FLAT", "INTERNAL_TEST"] },
    discountValue:  { type: Number },
    maxDiscountCap: { type: Number },
    minCartValue:   { type: Number, default: 0 },
    scope:          { type: String, enum: ["PUBLIC", "TARGETED"], default: "PUBLIC" },
    maxTotalUses:   { type: Number },
    maxUsesPerUser: { type: Number, default: 1 },
    usageCount:     { type: Number, default: 0 },
    validFrom:      { type: Date },
    validUntil:     { type: Date },
    isActive:       { type: Boolean, default: true },
    isArchived:     { type: Boolean, default: false },
    isTest:         { type: Boolean, default: false },
    isInternal:     { type: Boolean, default: false },

    // Embedded assignments — same structure as admin model (replaces CouponAssignment collection).
    assignedTo: [
      {
        identifierType: { type: String, enum: ["EMAIL", "MOBILE"] },
        identifier:     { type: String, lowercase: true, trim: true },
        assignedBy:     { type: String },
        addedAt:        { type: Date },
        usedAt:         { type: Date, default: null },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Coupon", couponSchema, "couponcodes");
