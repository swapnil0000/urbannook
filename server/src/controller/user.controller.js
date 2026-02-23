import { validateUserInput } from "../utils/ValidateRes.js";
import { ApiRes } from "../utils/index.js";
import User from "../model/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  loginService,
  registerService,
} from "../services/user.auth.service.js";
import cookieOptions from "../config/config.js";
import {
  profileFetchService,
  resetPasswordService,
} from "../services/common.auth.service.js";
import otpService from "../services/otp.service.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { 
  NotFoundError, 
  AuthenticationError, 
  ValidationError
} from "../utils/errors.js";
import env from "../config/envConfigSetup.js";
const userLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;    
  
  // field Missing , existing User and pass check
  const result = await loginService(email, password);
      
  return res
    .status(result.statusCode)
    .cookie("userAccessToken", result.data.userAccessToken, cookieOptions)
    .json(
      new ApiRes(result.statusCode, result.message, {
        role: result.data.role,
        name: result.data.name,
        email: result.data.email,
        userMobileNumber: result.data.mobileNumber,
        userAccessToken: result.data.userAccessToken,
      }, true)
    );
});

const userRegister = asyncHandler(async (req, res) => {
  const { name, email, password, mobileNumber } = req.body || {};
  
  console.log(`[INFO] User registration attempt - Email: ${email}, Name: ${name}`);
  
  //fieldMissing and existing User check
  let result = await registerService(name, email, password, mobileNumber);

  console.log(`[INFO] User registration successful - Email: ${email}, UserId: ${result?.data?.user?.id}`);

  // Return complete user data with token for auto-login
  return res
    .status(201)
    .cookie("userAccessToken", result?.data?.userAccessToken, cookieOptions)
    .json(
      new ApiRes(
        201,
        `User created and logged in`,
        {
          email: result?.data?.user?.email,
          name: name,
          userId: result?.data?.user?.id,
          role: 'USER',
          userAccessToken: result?.data?.userAccessToken,
        },
        true,
      ),
    );
});

const userProfile = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const userDetails = await profileFetchService({ userId, role: "USER" });
  
  if (!userDetails) {
    throw new NotFoundError("User not found");
  }
  
  return res
    .status(200)
    .json(new ApiRes(200, `User Details`, userDetails, true));
});

// DEPRECATED: Old forgot password without OTP - kept for backward compatibility
const userForgetpassword = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!password) {
    throw new ValidationError("Password can't be empty");
  }
  
  const userDetails = await User.findOne({ email });
  
  if (!userDetails?._id) {
    throw new NotFoundError("Unable to reset password - user not found");
  }
  
  const passCheck = (await userDetails.passCheck(password)) ? true : false;
  const oldPassAndNewPassCompare = await bcrypt.compare(
    password,
    userDetails?.password,
  );
  
  if (passCheck) {
    if (oldPassAndNewPassCompare) {
      throw new ValidationError(
        `Current password and New password is same for user - ${email}`,
        email
      );
    }
  }

  userDetails.password = password;
  await userDetails.save(); // using this because while using findOne it doesn't trigger pre middleware and hence plain text saved
  
  return res
    .status(Number(200))
    .json(
      new ApiRes(
        200,
        `password updated successfully for user ${email}`,
        email,
        true,
      ),
    );
});

const userResetPassword = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { currentPassword, newPassword } = req.body || {};
  
  const result = await resetPasswordService(userId, currentPassword, newPassword);
  
  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success
      )
    );
});

const userUpdateProfile = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  const { email, name, mobileNumber } = req.body || {};
  
  if (
    name === undefined &&
    mobileNumber == undefined &&
    email === undefined
  ) {
    throw new ValidationError("No fields provided for update");
  }

  const validate = validateUserInput({
    name,
    mobileNumber,
  });

  if (!validate.success) {
    throw new ValidationError(validate.message, validate.data);
  }

  const updateFields = {};
  if (email !== undefined) updateFields.email = email;
  if (name !== undefined) updateFields.name = name;
  if (mobileNumber !== undefined) updateFields.mobileNumber = mobileNumber;
  
  const updatedUser = await User.findOneAndUpdate(
    {
      userId,
      $or: [
        email !== undefined ? { email: { $ne: email } } : null,
        name != undefined ? { name: { $ne: name } } : null,
        mobileNumber != undefined
          ? { mobileNumber: { $ne: mobileNumber } }
          : null,
      ],
    },
    {
      $set: updateFields,
    },
    {
      new: true,
    },
  );

  if (!updatedUser) {
    return res
      .status(200)
      .json(
        new ApiRes(
          200,
          "No changes done. Same values already saved.",
          null,
          true,
        ),
      );
  }
  
  return res.status(200).json(
    new ApiRes(
      200,
      "Profile updated successfully",
      {
        email: updatedUser.email,
        name: updatedUser.name,
        mobileNumber: updatedUser.mobileNumber,
      },
      true,
    ),
  );
});

const userAccountDeletePreview = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  
  if (!userId) {
    throw new ValidationError("Unauthorized");
  }

  const userDetails = await User.findOne({ userId });
  
  if (!userDetails) {
    throw new NotFoundError("User not found");
  }

  // Updated to jwt from Base64
  const confirmToken = jwt.sign(
    { email: userDetails.email, purpose: "account_deletion", timestamp: Date.now() },
    env.DELETION_TOKEN_SECRET,
    { expiresIn: "15m" },
  );

  return res.status(200).json(
    new ApiRes(
      200,
      "Are you sure you want to delete your account?",
      {
        email: userDetails.email,
        confirmToken,
        confirmDelete: true,
        note: "Send this token with confirmDelete=true to delete account",
      },
      true,
    ),
  );
});

const userAccountDeleteConfirm = asyncHandler(async (req, res) => {
  const { confirmToken, confirmDelete } = req.body;

  if (!confirmToken || confirmDelete !== true) {
    throw new ValidationError(
      "confirmToken and confirmDelete=true are required for deleting"
    );
  }

  // Decode token to get email
  const email = Buffer.from(confirmToken, "base64").toString("utf-8");

  // Find user
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Delete user
  await User.deleteOne({ email });

  return res
    .status(200)
    .json(new ApiRes(200, "User account deleted successfully", null, true));
});

/**
 * Request OTP for password reset
 * POST /user/forgot-password/request
 */
const userForgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ValidationError("Email is required");
  }

  // Check if user exists
  const user = await User.findOne({ email });
  
  if (!user) {
    // Don't reveal if user exists or not for security
    return res
      .status(200)
      .json(
        new ApiRes(
          200,
          "If the email exists, an OTP has been sent",
          null,
          true
        )
      );
  }

  // Generate and send OTP
  const result = await otpService.generateOTP(email);

  return res.status(result.statusCode).json(
    new ApiRes(result.statusCode, result.message, result.data, true)
  );
});

/**
 * Reset password with OTP verification
 * POST /user/forgot-password/reset
 */
const userForgotPasswordReset = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // Validate input
  if (!email || !otp || !newPassword) {
    throw new ValidationError("Email, OTP, and new password are required");
  }

  // Validate password length
  if (newPassword.length < 8) {
    throw new ValidationError("Password must be at least 8 characters long");
  }

  // Verify OTP
  const otpResult = await otpService.verifyOTP(email, otp);

  if (!otpResult.success) {
    throw new ValidationError(otpResult.message, otpResult.data);
  }

  // Find user
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Check if new password is same as old password
  const isSamePassword = await user.passCheck(newPassword);
  
  if (isSamePassword) {
    throw new ValidationError("New password cannot be the same as the old password");
  }

  // Update password
  user.password = newPassword;
  await user.save(); // This triggers the pre-save hook to hash the password

  return res
    .status(200)
    .json(
      new ApiRes(
        200,
        "Password reset successfully. You can now login with your new password.",
        { email },
        true
      )
    );
});

export {
  userLogin,
  userRegister,
  userProfile,
  userAccountDeletePreview,
  userAccountDeleteConfirm,
  userResetPassword,
  userUpdateProfile,
  userForgetpassword,
  userForgotPasswordRequest,
  userForgotPasswordReset,
};
