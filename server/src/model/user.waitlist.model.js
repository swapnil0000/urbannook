import mongoose from "mongoose";
const userWaitListSchema = mongoose.Schema({
  userName: {
    type: String,
    required: [true, "userName is required"],
    unique: true,
  },
  userEmail: {
    type: String,
    required: [true, "userEmail is required"],
    unique: true,
  },
});

const UserWaistList = new mongoose.model("UserWaistList", userWaitListSchema);
export default UserWaistList;
