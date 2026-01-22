import { ApiError, ApiRes } from "../utlis/index.js";
import Admin from "../model/admin.model.js";
import User from "../model/user.model.js";
import jwt from "jsonwebtoken";
import cookieOptions from "../config/config.js";
import crypto from "crypto";
import sendEmail from "./email.service.js";
import bcrypt from "bcrypt";
const authGuardService = (role) => {
  /* The return is placed outside the try–catch because jwt.verify() runs
     during request execution, while a try–catch outside the middleware
     would only apply at function creation time, not at runtime.
 */
  return (req, res, next) => {
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
          ? process.env.ADMIN_ACCESS_TOKEN_SECRET
          : process.env.USER_ACCESS_TOKEN_SECRET;
      if (!secret) {
        throw new Error("JWT secret missing in env");
      }
      const decodedToken = jwt.verify(token, secret);

      /* The verified user data is attached to the request object here,
       so that all subsequent middlewares and controllers can identify
       the authenticated user without re-verifying the token again on any controller or route. */
      req.user = decodedToken;
      req.authRole = role;
      next();
    } catch (error) {
      console.error("JWT Error:", error.message);
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
    .status(200)
    .json(new ApiRes(200, `User Logout Successfully`, null, true));
};

const profileFetchService = async ({ userId, role }) => {
  if (!userId)
    return {
      statusCode: 400,
      message: `userId not avaialable`,
      data: null,
      success: false,
    };
  const Model = role === "Admin" ? Admin : User;
  const profile = await Model.findOne({ userId }).select(
    "-_id -password -createdAt -updatedAt -__v -userRefreshToken",
  );
  return profile;
};

const regenerateTokenService = async ({ userId, userRole }) => {
  if (!userId) {
    return {
      statusCode: 401,
      message: `Unauthorized User`,
      data: null,
      success: false,
    };
  }

  const Model = userRole == "USER" ? User : Admin;
  if (!Model) {
    return {
      statusCode: 404,
      message: `Can't find the model of the userId`,
      data: null,
      success: false,
    };
  }
  const tokenName =
    Model.modelName == "USER" ? `userRefreshToken` : `adminRefreshToken`;
  const userDetails = await Model.findOne({ userId });
  if (!userDetails) {
    return {
      statusCode: 404,
      message: `Can't find the user`,
      data: null,
      success: false,
    };
  }
  const refreshToken = await userDetails.genRefreshToken();
  if (!refreshToken) {
    return {
      statusCode: 404,
      message: `Can't generate the refresh token please try after some time! for ${userDetails?.email}`,
      data: null,
      success: false,
    };
  }
  userDetails[tokenName] = refreshToken;
  await userDetails.save();
  return {
    statusCode: 200,
    message: `Successfully generated refresh token for ${userDetails?.email}`,
    data: null,
    success: false,
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
      data: userEmail,
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

    return {
      statusCode: 200,
      message: "OTP verified successfully",
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

const verifyOtpEmailForgotPasswordService = async (userEmail, userEmailOtp) => {
  try {
    if (!userEmail || !userEmailOtp) {
      return {
        statusCode: 400,
        message: "Email and OTP is required",
        success: false,
      };
    }
    const now = new Date();

    const verifiedUser = await User.findOneAndUpdate(
      {
        userEmail,
        userVerificationOtp: Number(userEmailOtp), // 👈 OTP MATCH FIRST
        userVerificationOtpExpiresAt: { $gt: now }, // 👈 NOT EXPIRED
      },
      {
        $unset: {
          userVerificationOtp: "",
          userVerificationOtpExpiresAt: "",
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
      data: userEmail,
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
  if (!userId)
    return {
      statusCode: 401,
      message: "Unauthorized",
      success: false,
    };
  if (!newPassword || !currentPassword) {
    return {
      statusCode: 400,
      message: `Both current password and new password is required`,
      data: null,
      success: false,
    };
  }
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/;
  if (!passwordRegex.test(newPassword)) {
    return {
      statusCode: 400,
      message:
        "New Password must be at least 8 characters with uppercase, lowercase, number & special character",
      data: null,
      success: false,
    };
  }
  const userDetails = await User.findOne({ userId });
  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    userDetails.password,
  );

  if (!isPasswordValid) {
    return {
      statusCode: 401,
      message: "Current password is incorrect",
      success: false,
    };
  }
  //new pass and curr pass comparison
  const oldPassAndNewPassCompare = await bcrypt.compare(
    newPassword,
    userDetails?.password,
  );

  if (oldPassAndNewPassCompare)
    return {
      statusCode: 400,
      message: `Current password and New password is same for user - ${userDetails?.name}`,
      data: null,
      success: false,
    };
  if (!userDetails?._id) {
    return {
      statusCode: 400,
      message: `Unable to reset password for - ${userDetails?.name}`,
      data: null,
      success: false,
    };
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
