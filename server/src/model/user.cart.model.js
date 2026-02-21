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
    summary: {
      subtotal: { type: Number, default: 0 },
      gst: { type: Number, default: 0 },
      shipping: { type: Number, default: 199 },
      preTotal: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      grandTotal: { type: Number, default: 0 },
      note: { type: String, default: "" }
    }
  },
}, { timestamps: true });

cartSchema.index({ userId: 1 }, { unique: true });

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
