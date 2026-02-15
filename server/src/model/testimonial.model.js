import mongoose from "mongoose";

const testimonialSchema = mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, "userName is required"],
      trim: true,
      minlength: [1, "userName must be at least 1 character"],
      maxlength: [100, "userName cannot exceed 100 characters"],
    },
    userRole: {
      type: String,
      trim: true,
      maxlength: [100, "userRole cannot exceed 100 characters"],
    },
    userLocation: {
      type: String,
      trim: true,
      maxlength: [150, "userLocation cannot exceed 150 characters"],
    },
    content: {
      type: String,
      required: [true, "content is required"],
      trim: true,
      minlength: [10, "content must be at least 10 characters"],
      maxlength: [500, "content cannot exceed 500 characters"],
    },
    rating: {
      type: Number,
      required: [true, "rating is required"],
      min: [0, "rating must be at least 0"],
      max: [4, "rating cannot exceed 4"],
      validate: {
        validator: Number.isInteger,
        message: "rating must be an integer",
      },
    },
    colorTheme: {
      type: String,
      default: "bg-emerald-100 text-emerald-700",
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    productId: {
      type: String,
    },
    userEmail: {
      type: String,
      validate: {
        validator: function (v) {
          // Only validate if email is provided
          if (!v) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Invalid email format",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance optimization
testimonialSchema.index({ isApproved: 1, createdAt: -1 }); // Compound index for approved testimonials query
testimonialSchema.index({ createdAt: -1 }); // For chronological sorting
testimonialSchema.index({ productId: 1 }); // For product-specific testimonials

const Testimonial = mongoose.model("Testimonial", testimonialSchema);
export default Testimonial;
