import mongoose from "mongoose";
const wishListSchema = mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    required: true,
  },
  products: { type: [String], unique: true, required: true },
});
const WishList = mongoose.model("WishList", wishListSchema);
export default WishList;
