import { ApiError, ApiRes } from "../utlis/index.js";
import {
  sendOtpViaEmailService,
  verifyOtpEmailService,
  verifyOtpEmailForgotPasswordService,
  regenerateTokenService,
} from "../services/common.auth.service.js";
const sendOtpViaEmailServiceController = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(404)
        .json(new ApiError(404, `Email is not available`, null, false));
    }
    const result = await sendOtpViaEmailService(email);
    if (!result?.success) {
      return res
        .status(Number(result?.statusCode))
        .json(
          new ApiError(
            Number(result?.statusCode),
            result?.message,
            result?.data,
            result?.success,
          ),
        );
    }
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
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

// to verify new users
const verifyEmailOtpController = async (req, res) => {
  try {
    const { email, emailOtp } = req.body;
    const result = await verifyOtpEmailService(email, emailOtp);
    if (!result?.success) {
      return res
        .status(Number(result?.statusCode))
        .json(
          new ApiError(
            Number(result?.statusCode),
            result?.message,
            result?.data,
            result?.success,
          ),
        );
    }
    return res
      .status(200)
      .json(
        new ApiRes(
          200,
          `${result?.message} for ${result?.data}`,
          `${result?.message} for ${result?.data}`,
          true,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};
// to verify exisitng user for forgot password
const verifyOtpEmailForgotPasswordController = async (req, res) => {
  try {
    const { email, userEmailOtp } = req.body;
    const result = await verifyOtpEmailForgotPasswordService(
      email,
      userEmailOtp,
    );
    if (!result?.success) {
      return res
        .status(Number(result?.statusCode))
        .json(
          new ApiError(
            Number(result?.statusCode),
            result?.message,
            result?.data,
            result?.success,
          ),
        );
    }
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
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const regenrateRefreshToken = async (req, res) => {
  try {
    const { userId, userRole } = req.user;
    const refreshTokenValidation = await regenerateTokenService({
      userId,
      userRole,
    });
    if (!refreshTokenValidation?.success) {
      return res
        .status(Number(refreshTokenValidation?.statusCode))
        .json(
          new ApiError(
            Number(refreshTokenValidation?.statusCode),
            refreshTokenValidation?.message,
            refreshTokenValidation?.data,
            refreshTokenValidation?.success,
          ),
        );
    }
    return res
      .status(Number(refreshTokenValidation?.statusCode))
      .json(
        new ApiRes(
          Number(refreshTokenValidation?.statusCode),
          refreshTokenValidation?.message,
          refreshTokenValidation?.data,
          refreshTokenValidation?.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};
export {
  sendOtpViaEmailServiceController,
  verifyEmailOtpController,
  verifyOtpEmailForgotPasswordController,
  regenrateRefreshToken,
};
