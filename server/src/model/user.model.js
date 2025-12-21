import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

const userSchema = mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, "Name is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    userEmail: {
      type: String,
      required: [true, "userEmail is required"],
      unique: true,
    },
    userPassword: {
      type: String,
      required: [true, "userPassword is required"],
    },
    userMobileNumber: {
      type: Number,
      required: [true, "userMobileNumber is required"],
      unique: true,
    },
    userAddress: {
      type: String,
      required: [true, "userAddress is required"],
    },
    userPinCode: {
      type: Number,
      required: [true, "userPinCode is required"],
    },
    userPreviousOrder: {
      type: [
        {
          orderId: String,
          datePurchased: {
            type: Date,
            default: Date.now,
          },
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },
          quantity: Number,
        },
      ],
      default: [],
    },
    addedToCart: {
      type: Map,
      of: Number,
      default: {},
    },
    addedToWishList: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        default: [],
      },
    ],
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
  if (!this.isModified("userPassword")) return next();
  this.userPassword = await bcrypt.hash(this.userPassword, 12);
  next();
});

userSchema.methods.passCheck = async function (userPassword) {
  return await bcrypt.compare(userPassword, this.userPassword);
};

userSchema.methods.genAccessToken = function () {
  if (!process.env.USER_ACCESS_TOKEN_SECRET) {
    throw new Error("USER_ACCESS_TOKEN_SECRET is missing in .env file");
  }
  return jwt.sign(
    {
      _id: this._id,
      userEmail: this.userEmail,
      userName: this.userName,
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
