import { ApiError, ApiRes } from "../utlis/index.js";
import {
  sendOtpViaEmailService,
  verifyOtpEmailService,
} from "../services/common.auth.service.js";
const sendOtpViaEmailServiceController = async (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) {
      return res
        .status(404)
        .json(new ApiError(404, `Email is not available`, null, false));
    }
    const result = await sendOtpViaEmailService(userEmail);
    if (!result?.success) {
      return res
        .status(Number(result?.statusCode))
        .json(
          new ApiError(
            Number(result?.statusCode),
            result?.message,
            result?.data,
            result?.success
          )
        );
    }
    return res
      .status(200)
      .json(
        new ApiRes(
          200,
          `${result?.message} on ${result?.data}`,
          `${result?.message} on ${result?.data}`,
          true
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const verifyEmailOtpController = async (req, res) => {
  try {
    const { userEmail, userEmailOtp } = req.body;
    const result = await verifyOtpEmailService(userEmail, userEmailOtp);
    if (!result?.success) {
      return res
        .status(Number(result?.statusCode))
        .json(
          new ApiError(
            Number(result?.statusCode),
            result?.message,
            result?.data,
            result?.success
          )
        );
    }
    return res
      .status(200)
      .json(
        new ApiRes(
          200,
          `${result?.message} for ${result?.data}`,
          `${result?.message} for ${result?.data}`,
          true
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};
export { sendOtpViaEmailServiceController, verifyEmailOtpController };
