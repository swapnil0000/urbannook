import mongoose from "mongoose";
const userCommunitySchema = mongoose.Schema({
  email: {
    type: String,
    required: [true, "email is required"],
    unique: true,
  },
});

const UserCommunityList = new mongoose.model(
  "UserCommunityList",
  userCommunitySchema,
);
export default UserCommunityList;
