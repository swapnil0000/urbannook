import mongoose from "mongoose";
const userCommunitySchema = mongoose.Schema({
  userEmail: {
    type: String,
    required: [true, "userEmail is required"],
    unique: true,
  },
});

const UserCommunityList = new mongoose.model(
  "UserCommunityList",
  userCommunitySchema
);
export default UserCommunityList;
