import {
  applyCouponCodeService,
  getAllCouponCodeService,
} from "../services/coupon.code.service.js";
import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

const applyCouponCodeController = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { couponCodeName, email, mobile } = req.body;

  const result = await applyCouponCodeService({
    userId,
    couponCodeName,
    email,
    mobile,
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
  const { userId, code, items } = req.body;
  // Only used for guests (no userId) — a logged-in user's cart is read
  // server-side instead (see getAllCouponCodeService), so this is never
  // trusted as the source of truth when userId is present.
  const cartProductIds = Array.isArray(items) ? items.map((i) => i.productId).filter(Boolean) : [];
  const result = await getAllCouponCodeService({ userId, code, cartProductIds });
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
