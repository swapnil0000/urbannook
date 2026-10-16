import mongoose from "mongoose";

// Read-only view of the admin panel's `categories` collection. The admin repo
// (urbannook-admin/server/models/category.model.js) owns the full schema and
// all writes; the storefront only reads name/slug/image/order for
// /category/:slug pages. strict:false so admin-side fields we don't list here
// are never stripped if a document is ever loaded through this model.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String },
    slug: { type: String },
    categoryId: { type: String },
    image: { type: String, default: "" },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { strict: false, timestamps: true },
);

const Category = mongoose.model("Category", categorySchema);
export default Category;
