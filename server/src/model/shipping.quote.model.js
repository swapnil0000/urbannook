import mongoose from "mongoose";

// Short-lived cache of computed shipping rates so the amount CHARGED at order creation
// equals the amount DISPLAYED at checkout. Keyed by a price-independent signature
// (pincode + per-product total quantity) — see buildQuoteSignature in shipping.service.js.
const shippingQuoteSchema = mongoose.Schema(
  {
    signature: {
      type: String,
      required: true,
      unique: true,
    },
    // Full result object returned by calculateShippingRate:
    // { total_charges, type, totalWeight, expectedNoOfBoxes, serviceName }
    quote: {
      type: Object,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index — MongoDB auto-deletes quotes once expiresAt passes.
shippingQuoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ShippingQuote = mongoose.model("ShippingQuote", shippingQuoteSchema);
export default ShippingQuote;
