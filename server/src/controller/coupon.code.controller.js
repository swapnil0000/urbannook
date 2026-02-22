import {
  applyCouponCodeService,
  getAllCouponCodeService,
} from "../services/coupon.code.service.js";
import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

const applyCouponCodeController = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { couponCodeName } = req.body;

  const result = await applyCouponCodeService({
    userId,
    couponCodeName,
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

const getAllCouponCodeController = asyncHandler(async (_, res) => {
  const result = await getAllCouponCodeService();

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

export { applyCouponCodeController, getAllCouponCodeController };
