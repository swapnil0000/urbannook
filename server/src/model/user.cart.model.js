import mongoose from "mongoose";

const cartSchema = mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  products: {
    type: Map,
    of: Number,
    default: {},
  },

  appliedCoupon: {
    couponCodeId: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      default: null,
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    isApplied: {
      type: Boolean,
      default: false,
    },
  },
});

cartSchema.index({ userId: 1 }, { unique: true });

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
