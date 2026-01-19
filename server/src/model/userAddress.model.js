import mongoose from "mongoose";

const userAddress = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  addresses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
    },
  ],
});
const UserAddress = mongoose.model("UserAddress", userAddress);
export default UserAddress;
