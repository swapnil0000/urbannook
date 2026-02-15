import mongoose from "mongoose";

const couponCodeSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    couponCodeId: {
      type: String,
      required: true,
      unique: true,
    },

    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FLAT"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
    },

    maxDiscount: {
      type: Number,
      default: null,
    },

    minCartValue: {
      type: Number,
      default: 0,
    },

    isPublished: {
      type: Boolean,
      default: true,
    },
    desc: {
      type: String,
      required: false,
      trim: true,
    },
  },
  { timestamps: true },
);

// Indexes for performance optimization
couponCodeSchema.index({ name: 1 }, { unique: true });
couponCodeSchema.index({ isPublished: 1 });

const CouponCode = mongoose.model("CouponCode", couponCodeSchema);

export default CouponCode;
