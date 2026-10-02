import mongoose from "mongoose";

// Read-only view of the admin panel's `categories` collection. The admin repo
// (urbannook-admin/server/models/category.model.js) owns the full schema and
// all writes; the storefront only reads name/slug/image and the SEO block for
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
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      introContent: { type: String, default: "" },
      faqs: [{ _id: false, question: String, answer: String }],
    },
  },
  { strict: false, timestamps: true },
);

const Category = mongoose.model("Category", categorySchema);
export default Category;
