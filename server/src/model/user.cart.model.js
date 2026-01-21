import mongoose from "mongoose";

const cartSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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
