import { ApiError, ApiRes } from "../utlis/index.js";
import Admin from "../model/admin.model.js";
import User from "../model/user.model.js";
import jwt from "jsonwebtoken";
import cookieOptions from "../config/config.js";
import crypto from "crypto";
import sendEmail from "./email.service.js";
const authGuardService = (role) => {
  /* The return is placed outside the try–catch because jwt.verify() runs
     during request execution, while a try–catch outside the middleware
     would only apply at function creation time, not at runtime.
 */
  return (req, res, next) => {
    try {
      let token = req.cookies?.userAccessToken;

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
          new ApiError(401, "Access Token Expired or Malformed", null, false)
        );
    }
  };
};

const logoutService = async (req, res) => {
  const { userEmail } = req.user || {};
  const Model = req.authRole == "User" ? User : Admin;
  const roleDetails = await Model.findOne({ userEmail });
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
    }
  );

  return res
    .clearCookie("userAccessToken", cookieOptions)
    .status(200)
    .json(
      new ApiRes(200, `User - ${userEmail} Logout Successfully`, null, true)
    );
};

const profileFetchService = async (data) => {
  if (!data?.userEmail)
    return res
      .status(400)
      .json(new ApiError(400, `userEmail not avaialable`, [], false));
  const Model = data?.role === "Admin" ? Admin : User;
  const profile = await Model.findOne({ userEmail: data?.userEmail }).select(
    "-_id -userPassword -createdAt -updatedAt -__v"
  );
  return profile;
};

const regenerateTokenService = async (req, res) => {
  const { userEmail } = req.user;
  if (!userEmail) {
    return {
      statusCode: 401,
      message: `Unauthorized User - can't find userEmail`,
      data: null,
      success: false,
    };
  }

  const Model = req.authRole == "User" ? User : Admin;
  const tokenName =
    req.authRole == "User" ? `userRefreshToken` : `adminRefreshToken`;
  const accessToken = await Model.userRefreshToken();

  Model.userRefreshToken = accessToken;
  await res.save();
  const roleDetails = await Model.findOneAndUpdate(
    { userEmail },
    {
      $set: {
        tokenName,
      },
    },
    {
      new: true,
    }
  );
  if (!roleDetails) {
    return res
      .status(404)
      .json(new ApiError(401, ` User - can't find userEmail`, null, false));
  }
  return res
    .status(200)
    .json(
      new ApiRes(
        200,
        ` ${tokenName} generated for ${roleDetails?.role}  `,
        null,
        false
      )
    );
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

const sendOtpViaEmailService = async (userEmail) => {
  try {
    if (!userEmail) {
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
      { userEmail },
      {
        $set: {
          userVerificationOtp: Number(otpResponse?.data),
          userVerificationOtpExpiresAt: new Date(Date.now() + OTP_EXPIRY_TIME),
        },
      },
      { new: true }
    );
    if (!userDetails) {
      return {
        statusCode: 404,
        message: `User doesn't exist with email - ${userEmail}`,
        data: null,
        success: false,
      };
    }

    const emailResult = sendEmail(
      String(userEmail),
      `OTP Verification`,
      `
            <div style="font-family: Arial, sans-serif;">
              <h2>OTP Verification</h2>
              <p>Your OTP is:</p>
              <h1 style="letter-spacing: 3px;">${String(
                userDetails?.userVerificationOtp
              )}</h1>
              <p>This OTP is valid for 5 minutes.</p>
            </div>
          `
    );

    if (!emailResult?.success) {
      return {
        statusCode: 500,
        message: `Not able to send OTP - ${error} try after some time`,
        data: userEmail,
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

const verifyOtpEmailService = async (userEmail, userEmailOtp) => {
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
        isUserVerified: false,
        userVerificationOtp: Number(userEmailOtp), // 👈 OTP MATCH FIRST
        userVerificationOtpExpiresAt: { $gt: now }, // 👈 NOT EXPIRED
      },
      {
        $set: { isUserVerified: true },
        $unset: {
          userVerificationOtp: "",
          userVerificationOtpExpiresAt: "",
        },
      },
      { new: true }
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
      { new: true }
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

export {
  authGuardService,
  logoutService,
  profileFetchService,
  regenerateTokenService,
  sendOtpViaEmailService,
  verifyOtpEmailService,
  verifyOtpEmailForgotPasswordService,
  generateOtpResponseService,
};
