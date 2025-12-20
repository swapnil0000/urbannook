import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

const adminSchema = mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: [true, "userEmail is required"],
      unique: true,
    },
    userPassword: {
      type: String,
      required: [true, "userPassword is required"],
    },
    userRefreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

adminSchema.methods.passCheck = async function (userPassword) {
  return await bcrypt.compare(userPassword, this.userPassword);
};

adminSchema.methods.genAccessToken = function () {
  if (!process.env.ADMIN_ACCESS_TOKEN_SECRET) {
    throw new Error("ADMIN_ACCESS_TOKEN_SECRET is missing in .env file");
  }
  return jwt.sign(
    {
      _id: this._id,
      userEmail: this.userEmail,
      username: this.username,
    },
    process.env.ADMIN_ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

adminSchema.methods.genRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "10d",
    }
  );
};

// here we didn't use arrow fun because it doesn't have ref to this
// means it doesn't know the context to which we are ref directly
const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
