import { ApiError, ApiRes } from "../utlis/index.js";
import { sendOtpViaEmail ,verifyOtpEmail} from "../services/common.auth.service.js";
const sendOtpViaEmailController = async (req, res) => {
  try {
    const { userEmail } = req.body;
    const result = await sendOtpViaEmail(userEmail);
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
    const result = await verifyOtpEmail(userEmail, userEmailOtp);
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
export { sendOtpViaEmailController, verifyEmailOtpController };
