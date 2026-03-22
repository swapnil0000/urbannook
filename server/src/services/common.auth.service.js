import { ApiError, ApiRes, ValidationError, NotFoundError, AuthenticationError, InternalServerError } from "../utils/index.js";
import Admin from "../model/admin.model.js";
import User from "../model/user.model.js";
import jwt from "jsonwebtoken";
import cookieOptions, { refreshCookieOptions } from "../config/config.js";
import crypto from "crypto";
import { sendEmail } from "./email.service.js";
import bcrypt from "bcrypt";
import env from "../config/envConfigSetup.js";
const authGuardService = (role) => {
  /* The return is placed outside the try–catch because jwt.verify() runs
     during request execution, while a try–catch outside the middleware
     would only apply at function creation time, not at runtime.
 */
  return async (req, res, next) => {
    try {
      let token =
        role === "Admin"
          ? req.cookies?.adminAccessToken
          : req.cookies?.userAccessToken;
      if (!token && req.headers.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
      }
      if (!token) {
        return res
          .status(401)
          .json(new ApiError(401, "Authentication token missing", null, false));
      }
      const secret =
        role === "Admin"
          ? env.ADMIN_ACCESS_TOKEN_SECRET
          : env.USER_ACCESS_TOKEN_SECRET;
      if (!secret) {
        throw new Error("JWT secret missing in env");
      }
      const decodedToken = jwt.verify(token, secret);

      /* The verified user data is attached to the request object here,
       so that all subsequent middlewares and controllers can identify
       the authenticated user without re-verifying the token again on any controller or route. */

      // For USER role, check suspension on every request
      if (role === "USER") {
        const user = await User.findOne({ userId: decodedToken.userId }).select("isSuspended").lean();
        if (user?.isSuspended) {
          return res.status(403).json(new ApiError(403, "Your account has been suspended. Please contact support at support@urbannook.in", null, false));
        }
      }

      req.user = decodedToken;
      req.authRole = role;
      next();
    } catch (error) {
      console.error(`[ERROR] JWT Error - Role: ${role}:`, error.message);
      return res
        .status(401)
        .json(
          new ApiError(401, "Access Token Expired or Malformed", null, false),
        );
    }
  };
};

const logoutService = async (req, res) => {
  const { userId } = req.user || {};
  const Model = req.authRole == "USER" ? User : Admin;
  const roleDetails = await Model.findOne({ userId });
  if (!roleDetails) {
    return res
      .status(400)
      .json(new ApiError(400, `UserId not avaialable`, [], false));
  }

  await Model.findByIdAndUpdate(
    roleDetails?._id,
    {
      $unset: {
        userRefreshToken: 1,
      },
    },
    {
      new: true,
    },
  );

  return res
    .clearCookie("userAccessToken", cookieOptions)
    .clearCookie("userRefreshToken", { ...refreshCookieOptions, maxAge: 0 })
    .status(200)
    .json(new ApiRes(200, `User Logout Successfully`, null, true));
};

const profileFetchService = async ({ userId, role }) => {
  if (!userId) {
    throw new ValidationError("userId not available");
  }
  
  const Model = role === "Admin" ? Admin : User;
  const profile = await Model.findOne({ userId }).select(
    "-_id -password -createdAt -updatedAt -__v -userRefreshToken",
  );
  
  if (!profile) {
    throw new NotFoundError("Profile not found");
  }
  
  return {
    statusCode: 200,
    message: `Profile details for userId - ${profile?.name} and role ${role}`,
    data: profile,
    success: true,
  };
};

const regenerateTokenService = async ({ refreshToken }) => {
  if (!refreshToken) {
    return {
      statusCode: 401,
      message: `Refresh token missing`,
      data: null,
      success: false,
    };
  }

  // Verify the refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    return {
      statusCode: 401,
      message: `Refresh token expired or invalid`,
      data: null,
      success: false,
    };
  }

  // Find user by _id (refresh token payload contains _id)
  const userDetails = await User.findById(decoded._id);
  if (!userDetails) {
    return {
      statusCode: 404,
      message: `User not found`,
      data: null,
      success: false,
    };
  }

  // Verify the refresh token matches what's stored in DB (prevents reuse of old tokens)
  if (userDetails.userRefreshToken !== refreshToken) {
    return {
      statusCode: 401,
      message: `Refresh token has been revoked`,
      data: null,
      success: false,
    };
  }

  // Generate new access token
  const userAccessToken = userDetails.genAccessToken();
  if (!userAccessToken) {
    return {
      statusCode: 500,
      message: `Failed to generate access token`,
      data: null,
      success: false,
    };
  }

  // Rotate refresh token (generate new one, invalidate old)
  const newRefreshToken = userDetails.genRefreshToken();
  userDetails.userRefreshToken = newRefreshToken;
  await userDetails.save({ validateBeforeSave: false });

  return {
    statusCode: 200,
    message: `Tokens refreshed successfully`,
    data: { userAccessToken, newRefreshToken },
    success: true,
  };
};

const generateOtpResponseService = async () => {
  try {
    const otpValue = crypto.randomInt(100000, 1000000);

    if (otpValue)
      return {
        statusCode: 200,
        message: `Generated OTP successfully`,
        data: `${otpValue}`,
        success: true,
      };
  } catch (error) {
    return {
      statusCode: 500,
      message: `Not able to generate OTP - ${error} try after some time`,
      data: null,
      success: false,
    };
  }
};

const sendOtpViaEmailService = async (email) => {
  try {
    if (!email) {
      return {
        statusCode: 404,
        message: `Email is required to send otp`,
        data: null,
        success: false,
      };
    }

    const otpResponse = await generateOtpResponseService();
    const OTP_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
    if (!otpResponse?.success) {
      return {
        statusCode: otpResponse?.statusCode,
        message: otpResponse?.message,
        data: otpResponse?.data,
        success: otpResponse?.success,
      };
    }

    const userDetails = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          verificationOtp: Number(otpResponse?.data),
          verificationOtpExpiresAt: new Date(Date.now() + OTP_EXPIRY_TIME),
        },
      },
      { new: true },
    );
    if (!userDetails) {
      return {
        statusCode: 404,
        message: `User doesn't exist with email - ${email}`,
        data: null,
        success: false,
      };
    }

    const emailResult = sendEmail(
      String(email),
      `OTP Verification`,
      `
            <div style="font-family: Arial, sans-serif;">
              <h2>OTP Verification</h2>
              <p>Your OTP is:</p>
              <h1 style="letter-spacing: 3px;">${String(
                userDetails?.verificationOtp,
              )}</h1>
              <p>This OTP is valid for 5 minutes.</p>
            </div>
          `,
    );

    if (!emailResult?.success) {
      return {
        statusCode: 500,
        message: `Not able to send OTP - ${error} try after some time`,
        data: email,
        success: false,
      };
    }

    return {
      statusCode: 200,
      message: `OTP sent successfully`,
      data: `${emailResult?.data}`,
      success: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      message: `Internal Server Error - ${error} try after some time`,
      data: null,
      success: false,
    };
  }
};

const verifyOtpEmailService = async (email, emailOtp) => {
  try {
    if (!email || !emailOtp) {
      return {
        statusCode: 400,
        message: "Email and OTP is required",
        data: null,
        success: false,
      };
    }

    const now = new Date();
    const verifiedUser = await User.findOneAndUpdate(
      {
        email,
        isVerified: false,
        verificationOtp: Number(emailOtp), // 👈 OTP MATCH FIRST
        verificationOtpExpiresAt: { $gt: now }, // 👈 NOT EXPIRED
      },
      {
        $set: { isVerified: true },
        $unset: {
          verificationOtp: "",
          verificationOtpExpiresAt: "",
        },
      },
      { new: true },
    );
    if (!verifiedUser) {
      return {
        statusCode: 403,
        message: "Invalid or expired OTP",
        success: false,
      };
    }

    // CRITICAL: After successful verification, generate tokens for authentication
    const userAccessToken = await verifiedUser.genAccessToken();
    const userRefreshToken = await verifiedUser.genRefreshToken();
    
    verifiedUser.userRefreshToken = userRefreshToken;
    await verifiedUser.save({ validateBeforeSave: false });

    return {
      statusCode: 200,
      message: "Email verified successfully! You can now login.",
      data: {
        email: verifiedUser.email,
        userAccessToken,
        userRefreshToken,
        user: {
          id: verifiedUser.userId,
          email: verifiedUser.email,
          name: verifiedUser.name,
          role: verifiedUser.role,
        },
      },
      success: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      message: `Internal Server Error - ${error}`,
      success: false,
    };
  }
};

const verifyOtpEmailForgotPasswordService = async (email, emailOtp) => {
  try {
    if (!email || !emailOtp) {
      return {
        statusCode: 400,
        message: "Email and OTP is required",
        success: false,
      };
    }
    const now = new Date();

    const verifiedUser = await User.findOneAndUpdate(
      {
        email,
        verificationOtp: Number(emailOtp),
        verificationOtpExpiresAt: { $gt: now },
      },
      {
        $unset: {
          verificationOtp: "",
          verificationOtpExpiresAt: "",
        },
      },
      { new: true },
    );
    if (!verifiedUser) {
      return {
        statusCode: 403,
        message: "Invalid or expired OTP",
        success: false,
      };
    }

    return {
      statusCode: 200,
      message: "Forgot Password OTP verified successfully",
      data: email,
      success: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      message: `Internal Server Error - ${error}`,
      success: false,
    };
  }
};

const resetPasswordService = async (userId, currentPassword, newPassword) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }
  
  if (!newPassword || !currentPassword) {
    throw new ValidationError("Both current password and new password is required");
  }
  
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/;
    
  if (!passwordRegex.test(newPassword)) {
    throw new ValidationError(
      "New Password must be at least 8 characters with uppercase, lowercase, number & special character"
    );
  }
  
  const userDetails = await User.findOne({ userId });
  
  if (!userDetails) {
    throw new NotFoundError("User not found");
  }
  
  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    userDetails.password,
  );

  if (!isPasswordValid) {
    throw new AuthenticationError("Current password is incorrect");
  }
  
  //new pass and curr pass comparison
  const oldPassAndNewPassCompare = await bcrypt.compare(
    newPassword,
    userDetails?.password,
  );

  if (oldPassAndNewPassCompare) {
    throw new ValidationError(
      `Current password and New password is same for user - ${userDetails?.name}`
    );
  }
  
  userDetails.password = newPassword;
  await userDetails.save(); // using this because while using findOne it doesn't trigger pre middleware and hence plain text saved
  
  return {
    statusCode: 200,
    message: `password updated successfully for user ${userDetails?.name}`,
    data: `${userDetails?.name}`,
    success: true,
  };
};
export {
  authGuardService,
  logoutService,
  profileFetchService,
  regenerateTokenService,
  sendOtpViaEmailService,
  verifyOtpEmailService,
  verifyOtpEmailForgotPasswordService,
  generateOtpResponseService,
  resetPasswordService,
};
