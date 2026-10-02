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
        // Written by the admin panel (server/models/product.model.js) as an
        // uppercase/trimmed identifier — undeclared here meant any non-.lean()
        // query (e.g. rp.payment.controller.js's order creation) silently
        // stripped it via Mongoose hydration, even though .lean() reads
        // (cartRule.controller.js's eligibility check) saw it fine. That
        // mismatch made variant-scoped free-shipping/cart-rule offers show as
        // eligible on the checkout page but never actually apply at payment time.
        sku: { type: String, default: "", uppercase: true, trim: true },
        variantImage: [String], // Specific images for this variant
        variantPrice: Number,
        // Short optional line shown on the PDP under the product title when
        // this variant is selected (e.g. "BMW Inspired, 104cm"). Set from
        // the admin panel; blank shows nothing.
        variantSubTag: { type: String, default: "" },
        // ── Per-variant stock (managed from the admin panel) ─────────────────
        // `variantQuantity: null` = not stock-tracked (never auto-OOS by qty).
        // A number decrements on each paid order and derives out-of-stock at <= 0.
        variantQuantity: { type: Number, default: null },
        // Manual admin override — force this variant out of stock.
        // Effective OOS = variantOutOfStock || (variantQuantity != null && variantQuantity <= 0).
        variantOutOfStock: { type: Boolean, default: false },
        // Optional per-variant overrides of the product-level dimensions/
        // specifications. Blank/absent means "use the product-level value".
        // Kept in sync with server/models/product.model.js in the admin repo —
        // both must declare the same variantDetails fields or non-.lean()
        // reads here will silently strip whatever this schema omits.
        dimensions: {
          length: Number,
          breadth: Number,
          height: Number,
        },
        specifications: [
          {
            key: String,
            value: String,
          },
        ],
        // Cross-product versions (e.g. Wooden ↔ LED katana), set from the admin
        // panel. Variants sharing a variantGroup are versions of one design;
        // variantType names this one. Both blank = no version toggle on the PDP.
        variantType: { type: String, default: "" },
        variantGroup: { type: String, default: "" },
      }
    ],
    // Category linkage — auto-populated by the admin repo from its Category
    // collection when productCategory is saved (admin's product.model.js has
    // the full comment). Declared here too so the Promotion Engine V2's
    // category_promotion type can target by stable ID instead of a free-text
    // string, and so a future non-.lean() read here doesn't silently strip
    // them (today's reads are all .lean(), which already pass these through
    // regardless of this declaration — this is a documentation/safety
    // addition, not a fix for an active bug).
    categoryId:      { type: String, default: "" },
    categorySlug:    { type: String, default: "" },
    subCategoryId:   { type: String, default: "" },
    subCategorySlug: { type: String, default: "" },
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
    // Opt-in: whether the PDP's "Want it customised?" CTA is shown for this
    // product. Default false — most products are stock designs; a handful
    // (admin-flagged) can take a colour/name/livery request via /customize.
    isCustomizable: { type: Boolean, default: false },
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
