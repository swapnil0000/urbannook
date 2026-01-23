import mongoose from "mongoose";

const userAddressSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    addresses: {
      type: [String],
      default: [],
      validate: [(arr) => arr.length <= 5, "Maximum 5 addresses allowed"],
    },
  },
  { timestamps: true },
);
userAddressSchema.index({ userId: 1 }, { unique: true });
const UserAddress = mongoose.model("UserAddress", userAddressSchema);

export default UserAddress;
