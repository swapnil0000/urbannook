import User from "../model/user.model.js";
import { fieldMissing } from "../utils/ValidateRes.js";
import { v7 as uuid7 } from "uuid";
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  InternalServerError,
} from "../utils/errors.js";

const loginService = async (email, password) => {
  //fieldMissing
  let missing = fieldMissing({
    email,
    password,
    action: "login",
  });

  if (!missing?.success) {
    throw new ValidationError(missing?.message, missing?.data);
  }
  const res = await User.findOne({ email: email.toLowerCase() });

  if (!res) {
    throw new NotFoundError(`User - ${email} doesn't exist`);
  }

  //pass check
  const passCheck = (await res.passCheck(password)) ? true : false;
  if (!passCheck) {
    throw new AuthenticationError("Current Password is wrong");
  }

  // CRITICAL: Check if user has verified their email
  if (!res.isVerified) {
    // User exists but hasn't verified email - resend OTP
    const { generateOtpResponseService } =
      await import("./common.auth.service.js");
    const otpResponse = await generateOtpResponseService();

    if (otpResponse.success) {
      const OTP_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
      res.verificationOtp = Number(otpResponse.data);
      res.verificationOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_TIME);
      await res.save({ validateBeforeSave: false });

      // Send OTP email
      const { sendOTP } = await import("./email.service.js");
      sendOTP(res.email, Number(otpResponse.data), res.name).catch((err) => {
        console.error(
          `[ERROR] Failed to resend OTP email - Email: ${res.email}:`,
          err.message,
        );
      });
    }

    throw new AuthorizationError(
      "Please verify your email first. We've sent you a new OTP.",
      { email: res.email, requiresVerification: true },
    );
  }

  const userRefreshToken = await res?.genRefreshToken();
  const userAccessToken = await res?.genAccessToken();

  res.userRefreshToken = userRefreshToken;
  res.save();

  return {
    statusCode: 200,
    message: "user details",
    data: {
      name: res?.name,
      email: res?.email,
      mobileNumber: res?.mobileNumber,
      userAddress: res?.userAddress,
      userPinCode: res?.userPinCode,
      addedToCart: res?.addedToCart,
      role: res?.role,
      userRefreshToken,
      userAccessToken,
    },
    success: true,
  };
};

const registerService = async (name, email, password, mobileNumber) => {
  let missing = fieldMissing({
    name,
    email,
    password,
    mobileNumber,
    action: "register",
  });

  if (!missing?.success) {
    throw new ValidationError(missing?.message, missing?.data);
  }

  const reservedNames = [
    "admin",
    "root",
    "support",
    "system",
    "owner",
    "urbannook",
    "superuser",
  ];

  if (reservedNames.includes(name.toLowerCase())) {
    throw new AuthorizationError(
      `Oops 😅 ${name} is a VIP name reserved for the system. Please pick something uniquely *you* — we promise we won't steal it 😉`,
      { email, name },
    );
  }

  const fullNameRegex = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/;
  const mobileRegex = /^[6-9]\d{9}$/;

  if (!fullNameRegex.test(name.trim())) {
    throw new ValidationError(
      "Full name must contain only alphabets and single spaces",
    );
  }

  if (!emailRegex.test(email.trim())) {
    throw new ValidationError("Invalid email format");
  }

  if (!passwordRegex.test(password)) {
    throw new ValidationError(
      "Password must be at least 8 characters with uppercase, lowercase, number & special character",
    );
  }

  if (!mobileRegex.test(Number(mobileNumber))) {
    throw new ValidationError(
      "Invalid mobile number (must be 10 digits, start with 6–9)",
    );
  }

  const res = await User.findOne({
    $or: [{ mobileNumber }, { email: email.toLowerCase() }],
  });

  if (res) {
    // Check if user exists but is not verified
    if (!res.isVerified) {
      // User exists but hasn't verified - resend OTP
      const { generateOtpResponseService } =
        await import("./common.auth.service.js");
      const otpResponse = await generateOtpResponseService();

      if (otpResponse.success) {
        const OTP_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
        res.verificationOtp = Number(otpResponse.data);
        res.verificationOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_TIME);
        await res.save({ validateBeforeSave: false });

        // Send OTP email
        const { sendOTP } = await import("./email.service.js");
        sendOTP(res.email, Number(otpResponse.data), res.name).catch((err) => {
          console.error(
            `[ERROR] Failed to resend OTP email - Email: ${res.email}:`,
            err.message,
          );
        });
      }

      return {
        statusCode: 200,
        message: `Account exists but not verified. We've sent you a new OTP to ${email}`,
        data: { email: res.email, requiresVerification: true },
        success: true,
      };
    }

    // User exists and is verified - this is a conflict
    let matchedValue;
    if (res?.email == email) matchedValue = email;
    else if (res?.mobileNumber == mobileNumber) matchedValue = mobileNumber;

    throw new ConflictError(
      `User Already exist with - ${matchedValue}`,
      matchedValue,
    );
  }

  const userId = uuid7();

  // Generate OTP for email verification
  const { generateOtpResponseService } =
    await import("./common.auth.service.js");
  const otpResponse = await generateOtpResponseService();

  if (!otpResponse.success) {
    throw new InternalServerError("Failed to generate OTP. Please try again.");
  }

  const OTP_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

  const newRegisteringUser = await User.create({
    name: name.toLowerCase(),
    email: email.toLowerCase(),
    password,
    mobileNumber,
    userId,
    isVerified: false, // CRITICAL: User is not verified yet
    verificationOtp: Number(otpResponse.data),
    verificationOtpExpiresAt: new Date(Date.now() + OTP_EXPIRY_TIME),
  });

  if (!newRegisteringUser) {
    throw new InternalServerError(`Failed to create user with ${email}`, email);
  }

  await newRegisteringUser.save({ validateBeforeSave: false }).catch((err) => {
    console.error(`[ERROR] User save failed:`, err.message, err.stack);
  });

  // Send OTP email
  const { sendOTP } = await import("./email.service.js");
  sendOTP(email.toLowerCase(), Number(otpResponse.data), name).catch((err) => {
    console.error(
      `[ERROR] Failed to send OTP email - Email: ${email}:`,
      err.message,
    );
  });

  // CRITICAL: Do NOT return token - user must verify email first
  return {
    statusCode: 201,
    message: `Account created! Please check your email for the verification code.`,
    data: {
      email: newRegisteringUser.email,
      requiresVerification: true,
    },
    success: true,
  };
};

export { loginService, registerService };
