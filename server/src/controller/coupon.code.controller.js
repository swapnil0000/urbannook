import {
  applyCouponCodeService,
  getAllCouponCodeService,
} from "../services/coupon.code.service.js";
import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

const applyCouponCodeController = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { couponCodeName, email } = req.body;

  const result = await applyCouponCodeService({
    userId,
    couponCodeName,
    email
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

const getAllCouponCodeController = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const result = await getAllCouponCodeService({ userId });
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
