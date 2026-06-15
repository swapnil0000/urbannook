/**
 * Atomic sequential ID generator.
 * Uses a dedicated `counters` collection to safely increment IDs
 * even under concurrent admin operations.
 *
 * Output examples:
 *   generateCategoryId()    → "CAT-001", "CAT-002", ...
 *   generateSubCategoryId() → "SUBCAT-001", "SUBCAT-002", ...
 */

import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String },        // counter name e.g. "category"
  seq: { type: Number, default: 0 },
});

// Re-use model if already compiled (hot-reload safe)
const Counter =
  mongoose.models.Counter || mongoose.model("Counter", counterSchema);

const next = async (name, prefix, pad = 3) => {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${String(doc.seq).padStart(pad, "0")}`;
};

export const generateCategoryId    = () => next("category",    "CAT");
export const generateSubCategoryId = () => next("subcategory", "SUBCAT");
