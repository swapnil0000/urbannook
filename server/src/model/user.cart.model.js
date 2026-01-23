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
});
cartSchema.index({ userId: 1 }, { unique: true });

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
