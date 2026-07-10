import mongoose from "mongoose";

const couponCodeSchema = mongoose.Schema(
  {
    name: { type: String, uppercase: true, trim: true },
    couponCodeId: { type: String },   // no unique:true — new model uses couponId instead
    discountType: { type: String, enum: ["PERCENTAGE", "FLAT"] },
    discountValue: { type: Number },
    maxDiscount: { type: Number, default: null },
    minCartValue: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    desc: { type: String, trim: true },
  },
  { timestamps: true, autoIndex: false },  // autoIndex:false stops Mongoose recreating old indexes
);

const CouponCode = mongoose.model("CouponCode", couponCodeSchema, "couponcodes");

export default CouponCode;
