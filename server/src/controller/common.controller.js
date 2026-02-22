import { ApiRes } from "../utils/index.js";
import cookieOptions from "../config/config.js";
import {
  sendOtpViaEmailService,
  verifyOtpEmailService,
  verifyOtpEmailForgotPasswordService,
  regenerateTokenService,
} from "../services/common.auth.service.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ValidationError } from "../utils/errors.js";

const sendOtpViaEmailServiceController = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    throw new ValidationError("Email is not available");
  }
  
  const result = await sendOtpViaEmailService(email);
  
  return res
    .status(200)
    .json(
      new ApiRes(
        200,
        `${result?.message} on ${result?.data}`,
        `${result?.message} on ${result?.data}`,
        true,
      ),
    );
});

// to verify new users
const verifyEmailOtpController = asyncHandler(async (req, res) => {
  const { email, emailOtp } = req.body;
  const result = await verifyOtpEmailService(email, emailOtp);

  // CRITICAL: Return token and user data after successful verification
  return res
    .status(200)
    .cookie("userAccessToken", result?.data?.userAccessToken, cookieOptions)
    .json(
      new ApiRes(
        200,
        result?.message,
        {
          email: result?.data?.email,
          userAccessToken: result?.data?.userAccessToken,
          user: result?.data?.user,
        },
        true,
      ),
    );
});

// to verify exisitng user for forgot password
const verifyOtpEmailForgotPasswordController = asyncHandler(async (req, res) => {
  const { email, emailOtp } = req.body;
  const result = await verifyOtpEmailForgotPasswordService(email, emailOtp);
  
  return res
    .status(200)
    .json(
      new ApiRes(
        200,
        `${result?.message}`,
        `${result?.message} for ${result?.data}`,
        true,
      ),
    );
});

const regenrateRefreshToken = asyncHandler(async (req, res) => {
  const { userId, userRole } = req.user;
  const result = await regenerateTokenService({
    userId,
    userRole,
  });
  
  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success,
      ),
    );
});

export {
  sendOtpViaEmailServiceController,
  verifyEmailOtpController,
  verifyOtpEmailForgotPasswordController,
  regenrateRefreshToken,
};
