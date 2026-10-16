import mongoose from "mongoose";

// Read-only view of the admin-owned `seo_pages` collection (Admin → SEO Pages,
// urbannook-admin/server/models/seoPage.model.js owns the schema and writes).
const seoPageSchema = new mongoose.Schema(
  {
    urlPath: String,
    pageType: String,
    metaTitle: String,
    metaDescription: String,
    canonicalUrl: String,
    robots: String,
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    introContent: String,
    faqs: [{ _id: false, question: String, answer: String }],
    customJsonLd: String,
    isActive: Boolean,
  },
  { strict: false, timestamps: true, collection: "seo_pages" },
);

const SeoPage = mongoose.model("SeoPage", seoPageSchema);
export default SeoPage;
