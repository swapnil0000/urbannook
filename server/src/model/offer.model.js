import mongoose from "mongoose";

// Mirrors UN-ADMIN-panel's server/models/offer.model.js — same schema shape,
// same "offers" collection. Admin owns all writes (CRUD via its Offers page);
// the storefront only ever READS this collection (see
// utils/freeShippingOffer.util.js and utils/cartRule.util.js), so this file
// has no exported controller/routes of its own.
//
// One collection, three document "types" (discriminated by `type`):
//   - type: "free_shipping" — a singleton doc: { thresholdAmount, banners[] }
//   - type: "cart_rule"     — one doc per rule: { name, conditions[], effects[] }
//   - type: "gift_wrap"     — a singleton doc: { price, title, note, ctaLabel }
//     Not tied to any product — a seasonal, admin-toggled cart add-on (e.g.
//     Rakhi/Diwali gift wrap). isActive is the on/off switch; when off, the
//     storefront widget for it simply doesn't render. price is always read
//     server-side at checkout, never trusted from the client — see
//     rp.payment.controller.js.
// This replaces the legacy freeShippingOffer.model.js / cartRule.model.js
// collections, which are left untouched as a fallback until every environment
// is confirmed migrated (see the dual-read fallback in the utils above).

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
    targetProductId: { type: String, trim: true },
    value: { type: Number, min: 0 },
  },
  { _id: false },
);

const bannerSchema = new mongoose.Schema(
  {
    sourceProductId: { type: String, required: true, trim: true },
    recommendedProductId: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    ctaLabel: { type: String, default: "Add to Cart", trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const offerSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: ["free_shipping", "cart_rule", "gift_wrap"], index: true },
    isActive: { type: Boolean, default: true },
    // cart_rule only:
    name: { type: String, trim: true },
    conditions: { type: [conditionSchema], default: undefined },
    effects: { type: [effectSchema], default: undefined },
    // free_shipping only:
    thresholdAmount: { type: Number },
    banners: { type: [bannerSchema], default: undefined },
    // gift_wrap only:
    price: { type: Number, min: 0 },
    title: { type: String, trim: true },
    note: { type: String, trim: true },
    ctaLabel: { type: String, default: "Add Gift Wrap", trim: true },
  },
  { timestamps: true },
);

export default mongoose.model("Offer", offerSchema, "offers");
