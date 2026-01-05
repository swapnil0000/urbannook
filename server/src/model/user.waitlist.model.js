import mongoose from "mongoose";
const userWaitListSchema = mongoose.Schema({
  userEmail: {
    type: String,
    required: [true, "userEmail is required"],
    unique: true,
  },
});

const UserWaistList = new mongoose.model("UserWaistList", userWaitListSchema);
export default UserWaistList;
