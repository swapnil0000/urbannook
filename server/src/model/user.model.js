import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, "Name is required"],
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
    userVerificationOtp: {
      type: Number,
    },
    userVerificationOtpExpiresAt: {
      type: Date,
    },
    isUserVerified: {
      type: Boolean,
      default: false,
    },
    userPreviousOrder: [
      {
        _id: false,
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    addedToCart: [
      {
        _id: false,
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
      },
    ],
    addedToWishList: [
      {
        _id: false,
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
      },
    ],
    userRefreshToken: String,
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
