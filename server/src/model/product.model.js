import mongoose from "mongoose";
const productSchema = mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, "name is required"],
      unique: true,
    },
    productId: {
      type: String,
      required: [true, "productId is required"],
      unique: true,
    },
    color: {
      type: [String],
    },
    // New Generic Variant Structure
    variantDetails: [
      {
        variantName: String,
        variantImage: [String], // Specific images for this variant
        variantPrice: Number,
        // ── Per-variant stock (managed from the admin panel) ─────────────────
        // `variantQuantity: null` = not stock-tracked (never auto-OOS by qty).
        // A number decrements on each paid order and derives out-of-stock at <= 0.
        variantQuantity: { type: Number, default: null },
        // Manual admin override — force this variant out of stock.
        // Effective OOS = variantOutOfStock || (variantQuantity != null && variantQuantity <= 0).
        variantOutOfStock: { type: Boolean, default: false },
      }
    ],
    uiProductId: {
      type: String,
      required: [true, "uiProductId is required"],
      unique: true,
    },
    productDes: {
      type: String,
      required: [true, "productDes is required"],
    },
    productCategory: {
      type: String,
      required: [true, "productCategory is required"],
    },
    productQuantity: {
      type: Number,
    },
    dimensions: {
      length: Number,
      breadth: Number,
      height: Number,
    },
    weight: String,
    productStatus: {
      type: String,
      enum: ["in_stock", "out_of_stock", "discontinued"],
    },
    tags: {
      type: [String],
      enum: ["featured", "new_arrival", "best_seller", "trending"],
    },
    productSubDes: String,
    productSubCategory: String,
    warranty: {
      type: String,
      default: null,
    },
    isPublished: {
      type: Boolean,
      require: true,
    },
    // Real, cart-addable product that should never appear in the browsable
    // "All Products" grid (e.g. Gift Wrap) — excluded there, still fetchable
    // directly by productId for add-on flows like GiftWrapOffer.
    isAddon: { type: Boolean, default: false },
    // Opt-in: whether the seasonal Gift Wrap add-on (see GiftWrapOffer) can be
    // applied to this product. Default false — most products need explicit
    // admin sign-off (e.g. no gift wrap on a fragile/oversized item). The
    // widget only counts/charges for products where this is true.
    giftWrapEligible: { type: Boolean, default: false },
    // Manual sort weight for the listing — higher shows first (default 0).
    // Set from the admin panel; read by the products listing sort.
    priority: { type: Number, default: 0 },
    // Admin-curated related product IDs suggested on the PDP. Written by the
    // admin panel; the storefront reads these to render "you may also like".
    recommendedProducts: { type: [String], default: [] },
    // Companion productIds offered as a "buy together" combo right after this
    // product is added to the cart. The customer can drop any of them in the
    // popup; this product itself is always kept. Separate from
    // recommendedProducts (display-only); empty = no combo popup.
    comboProductIds: { type: [String], default: [] },
    // Copy for that popup. Each blank falls back to a sensible default in the
    // storefront modal, so an admin only overrides what they want to reword.
    comboEyebrow: { type: String, default: "" },
    comboHeading: { type: String, default: "" },
    comboCtaLabel: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);
// Indexes for performance optimization
// Note: productId, productName, uiProductId already have unique indexes from schema
productSchema.index({ productCategory: 1 });
productSchema.index({ productStatus: 1 });
productSchema.index({ productCategory: 1, productStatus: 1 }); // Compound index for filtering
productSchema.index({ productName: "text", productDes: "text" }); // Text search
productSchema.index({ tags: 1 }); // For filtering by tags
productSchema.index({ isPublished: 1 });

const Product = new mongoose.model("Product", productSchema);
export default Product;
