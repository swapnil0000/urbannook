import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

const userSchema = mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    mobileNumber: {
      type: Number,
      required: [true, "mobileNumber is required"],
      unique: true,
    },
    previousOrder: {
      type: [
        {
          orderId: String,
          datePurchased: String,
          productId: String,
        },
      ],
      default: [],
    },
    addedToCart: {
      type: Map,
      of: Number,
      default: {},
    },
    userRefreshToken: {
      type: String,
    },
    role: {
      type: String,
      default: "User",
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.passCheck = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.genAccessToken = function () {
  if (!process.env.USER_ACCESS_TOKEN_SECRET) {
    throw new Error("USER_ACCESS_TOKEN_SECRET is missing in .env file");
  }
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    process.env.USER_ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1d",
    }
  );
};

userSchema.methods.genRefreshToken = function () {
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
const User = mongoose.model("User", userSchema);
export default User;
