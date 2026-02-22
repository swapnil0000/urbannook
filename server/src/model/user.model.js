import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, "userId is required"],
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "userEmail is required"],
    },
    password: {
      type: String,
      required: [true, "userPassword is required"],
    },
    mobileNumber: {
      type: Number,
      required: [true, "userMobileNumber is required"],
    },
    verificationOtp: {
      type: Number,
    },
    verificationOtpExpiresAt: {
      type: Date,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    userRefreshToken: String,
    role: {
      type: String,
      enum: ["USER", "WAITLIST_USER"],
      default: "USER",
    },
  },
  {
    timestamps: true,
  },
);
userSchema.index({ userId: 1 });
userSchema.index({ email: 1 });
userSchema.index({ mobileNumber: 1 });
userSchema.index({ verificationOtp: 1 });
userSchema.index(
  { verificationOtpExpiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { verificationOtpExpiresAt: { $exists: true } },
  },
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
      userId: this.userId,
      userEmail: this.email,
      userName: this.name,
      userRole: this.role,
    },
    process.env.USER_ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1d",
    },
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
    },
  );
};

// here we didn't use arrow fun because it doesn't have ref to this
// means it doesn't know the context to which we are ref directly
const User = mongoose.model("User", userSchema);
export default User;
