import mongoose from "mongoose";

// Mirrors UN-ADMIN-panel's server/models/freeShippingOffer.model.js — same
// schema shape so both apps read/write the same "freeshippingoffers"
// collection. Storefront only ever reads this; admin owns writes.
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

const freeShippingOfferSchema = new mongoose.Schema(
  {
    thresholdAmount: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: false },
    banners: [bannerSchema],
  },
  { timestamps: true },
);

export default mongoose.model("FreeShippingOffer", freeShippingOfferSchema);
