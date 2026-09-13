import { syncGuestCartService } from "../services/user.cart.service.js";
import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

const syncGuestCartController = asyncHandler(async (req, res) => {
  const { anonymousId, guestName, guestEmail, guestMobile, items } = req.body;

  const result = await syncGuestCartService({
    anonymousId,
    guestName,
    guestEmail,
    guestMobile,
    items,
  });

  return res
    .status(result.statusCode)
    .json(new ApiRes(result.statusCode, result.message, null, result.success));
});

export { syncGuestCartController };
