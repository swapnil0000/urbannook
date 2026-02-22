import { ApiRes } from "../utils/index.js";
import { sendBulkEmailWaitlistService } from "../services/email.service.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

const userBulkEmailWaitlistController = asyncHandler(async (_, res) => {
  const sendBulkEmailWaitlistServiceValidation =
    await sendBulkEmailWaitlistService();
  
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
});

export default userBulkEmailWaitlistController;
