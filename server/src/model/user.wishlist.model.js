import mongoose from "mongoose";
const wishListSchema = mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  products: { type: [String], required: true },
});
wishListSchema.index({ userId: 1, products: 1 }, { unique: true });
const WishList = mongoose.model("WishList", wishListSchema);
export default WishList;
