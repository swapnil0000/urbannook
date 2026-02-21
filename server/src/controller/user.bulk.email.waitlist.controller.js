import { ApiError, ApiRes } from "../utlis/index.js";
import { sendBulkEmailWaitlistService } from "../services/email.service.js";

const userBulkEmailWaitlistController = async (_, res) => {
  try {
    const sendBulkEmailWaitlistServiceValidation =
      await sendBulkEmailWaitlistService();
    if (!sendBulkEmailWaitlistServiceValidation.success) {
      return res
        .status(Number(sendBulkEmailWaitlistServiceValidation.statusCode))
        .json(
          new ApiError(
            sendBulkEmailWaitlistServiceValidation.statusCode,
            sendBulkEmailWaitlistServiceValidation.message,
            sendBulkEmailWaitlistServiceValidation.data,
            sendBulkEmailWaitlistServiceValidation.success,
          ),
        );
    }

    return res
      .status(Number(sendBulkEmailWaitlistServiceValidation.statusCode))
      .json(
        new ApiRes(
          sendBulkEmailWaitlistServiceValidation.statusCode,
          sendBulkEmailWaitlistServiceValidation.data,
          sendBulkEmailWaitlistServiceValidation.message ||
            "Bulk waitlist emails sent successfully",
          sendBulkEmailWaitlistServiceValidation.success,
        ),
      );
  } catch (error) {
    console.error("Controller Error from bulk email:", error);
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          "Internal Server Error processing bulk emails",
          error.message,
        ),
      );
  }
};

export default userBulkEmailWaitlistController;
