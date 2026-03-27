import mongoose from "mongoose";

const productSpecificTestimonialSchema = mongoose.Schema(
  {
    productId: { type: String, required: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    desc: { type: String, required: true, minlength: 10, maxlength: 500 },
    imageUrl: { type: String, default: null }, // S3 URL (legacy single image)
    imageUrls: { type: [String], default: [] }, // up to 3 images
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSpecificTestimonialSchema.index({ productId: 1, isApproved: 1 });
productSpecificTestimonialSchema.index({ userId: 1 });

const ProductReview = mongoose.model("ProductReview", productSpecificTestimonialSchema);
export default ProductReview;
