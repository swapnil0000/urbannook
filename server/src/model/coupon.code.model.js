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
  },
  { timestamps: true },
);

const CouponCode = mongoose.model("CouponCode", couponCodeSchema);

export default CouponCode;
