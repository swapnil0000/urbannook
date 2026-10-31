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
    // Mirrors admin's coupon.model.js — empty = no product restriction
    // (today's behavior, unchanged). Reading this field is a later phase;
    // schema parity only for now so a document admin writes with it set
    // isn't silently dropped by this read-only mirror's schema.
    eligibleProductIds: { type: [String], default: [] },
    scope:          { type: String, enum: ["PUBLIC", "TARGETED"], default: "PUBLIC" },
    audience:       { type: String, enum: ["EVERYONE", "MEMBERS_ONLY"], default: "EVERYONE" },
    maxTotalUses:   { type: Number },
    maxUsesPerUser: { type: Number, default: 1 },
    usageCount:     { type: Number, default: 0 },
    validFrom:      { type: Date },
    validUntil:     { type: Date },
    isActive:       { type: Boolean, default: true },
    isArchived:     { type: Boolean, default: false },
    isTest:         { type: Boolean, default: false },
    isInternal:     { type: Boolean, default: false },
    // Hidden from lists (cart, pay page, Magic sheet) but valid when typed — written by the admin panel, declared here so it is never stripped.
    isHidden:       { type: Boolean, default: false },

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
