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
