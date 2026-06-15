import mongoose from "mongoose";

const subcategorySchema = new mongoose.Schema(
  {
    subCategoryId: { type: String, required: true },   // e.g. "SUBCAT-001"
    name:          { type: String, required: true, trim: true },
    slug:          { type: String, required: true, trim: true, lowercase: true },
  },
  { _id: true }
);

const categorySchema = new mongoose.Schema(
  {
    categoryId:   { type: String, required: true, unique: true }, // e.g. "CAT-001"
    name:         { type: String, required: true, trim: true },
    slug:         { type: String, required: true, trim: true, lowercase: true, unique: true },
    image:        { type: String, default: "" },
    subcategories: [subcategorySchema],
    displayOrder: { type: Number, default: 0 },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.index({ slug: 1 },        { unique: true });
categorySchema.index({ categoryId: 1 },  { unique: true });
categorySchema.index({ isActive: 1, displayOrder: 1 });

export default mongoose.model("Category", categorySchema);
