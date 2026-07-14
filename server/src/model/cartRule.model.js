import mongoose from "mongoose";

// Generic cart-promotion rules — e.g. "2+ Lamps in cart => free shipping" or
// "2+ Lamps => 50% off Pen Stand". A rule's `conditions` are AND'd together
// (all must be met); independent rule documents give OR behaviour across
// rules (any one matching rule fires — no nested OR needed inside a rule).
// `effects` are applied server-side at order-total time
// (server/src/utils/cartRule.util.js) — this is the source of truth for
// both the shipping fee and product discounts, never a UI-only decoration.
// Deliberately no slug/priority/index — nothing here is queried by
// anything but `isActive`, and Mongo's default _id index already exists;
// adding more would be premature for the current usage.
const conditionSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, trim: true },
    minQuantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const effectSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: ["free_shipping", "percent_off", "flat_off"] },
    // Required for percent_off/flat_off, ignored (and unused) for free_shipping.
    targetProductId: { type: String, trim: true },
    // percent_off: 0-100 percentage. flat_off: a rupee amount.
    value: { type: Number, min: 0 },
    // How many UNITS of targetProductId the discount applies to. Defaults to 1
    // — "2+ Lamps => 50% off Pen Stand" means one discounted Pen Stand, not an
    // unlimited supply of them: a second Pen Stand is charged full price. Raise
    // this per-rule if an offer should ever discount more than one unit.
    maxDiscountedQuantity: { type: Number, min: 1, default: 1 },
  },
  { _id: false },
);

const cartRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    conditions: { type: [conditionSchema], required: true },
    effects: { type: [effectSchema], required: true },
  },
  { timestamps: true },
);

export default mongoose.model("CartRule", cartRuleSchema);
