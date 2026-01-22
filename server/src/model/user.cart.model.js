import mongoose from "mongoose";

const cartSchema = mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  products: {
    type: Map,
    of: Number,
    default: {},
  },
});

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
