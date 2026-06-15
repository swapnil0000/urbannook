import mongoose from "mongoose";
import slugify from "../utils/slugify.js";

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
    variantDetails: [
      {
        variantName: String,
        variantImage: [String],
        variantPrice: Number,
      },
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

    // ─── Category fields ─────────────────────────────────────────────────────
    productCategory:    { type: String, required: [true, "productCategory is required"] },
    productSubCategory: { type: String, default: null },

    // Slug keys — derived from names, used for URL routing + filtering
    categorySlug:    { type: String, lowercase: true, trim: true },
    subCategorySlug: { type: String, lowercase: true, trim: true, default: null },

    // Stable reference IDs — auto-assigned from Category collection
    // These never change even if a category is renamed or its slug changes
    categoryId:    { type: String, default: null },   // e.g. "CAT-001"
    subCategoryId: { type: String, default: null },   // e.g. "SUBCAT-001"
    // ─────────────────────────────────────────────────────────────────────────

    productQuantity: { type: Number },
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
    warranty:      { type: String, default: null },
    isPublished:   { type: Boolean, require: true },
  },
  { timestamps: true }
);

// ─── Pre-save hook ────────────────────────────────────────────────────────────
// 1. Auto-derive slugs from display names
// 2. Auto-assign categoryId + subCategoryId by looking up the Category collection
productSchema.pre("save", async function (next) {
  // Step 1: derive slugs
  if (this.isModified("productCategory") || !this.categorySlug) {
    this.categorySlug = slugify(this.productCategory);
  }
  if ((this.isModified("productSubCategory") || !this.subCategorySlug) && this.productSubCategory) {
    this.subCategorySlug = slugify(this.productSubCategory);
  }

  // Step 2: assign IDs from Category collection
  const needsCategoryId    = this.isModified("categorySlug")    || !this.categoryId;
  const needsSubCategoryId = this.isModified("subCategorySlug") || (!this.subCategoryId && this.subCategorySlug);

  if (needsCategoryId || needsSubCategoryId) {
    try {
      const Category = mongoose.model("Category");
      const cat = await Category.findOne({ slug: this.categorySlug }).lean();
      if (cat) {
        this.categoryId = cat.categoryId;

        if (this.subCategorySlug) {
          const sub = cat.subcategories?.find((s) => s.slug === this.subCategorySlug);
          this.subCategoryId = sub?.subCategoryId || null;
        }
      }
    } catch {
      // Category collection may not exist yet during initial seed — continue silently
    }
  }

  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Stable ID-based filtering (fastest — exact match)
productSchema.index({ categoryId: 1, isPublished: 1 });
productSchema.index({ categoryId: 1, subCategoryId: 1, isPublished: 1 });

// Slug-based filtering (URL routing)
productSchema.index({ categorySlug: 1, isPublished: 1 });
productSchema.index({ categorySlug: 1, subCategorySlug: 1, isPublished: 1 });

// Legacy name index (kept during migration window)
productSchema.index({ productCategory: 1 });
productSchema.index({ productCategory: 1, productStatus: 1 });

productSchema.index({ productStatus: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ isPublished: 1 });
productSchema.index({ productName: "text", productDes: "text" });

const Product = mongoose.model("Product", productSchema);
export default Product;
