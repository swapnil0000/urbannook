import {
  applyCouponCodeService,
  getAllCouponCodeService,
} from "../services/coupon.code.service.js";
import { ApiError, ApiRes } from "../utlis/index.js";

const applyCouponCodeController = async (req, res) => {
  try {
    const { userId } = req.user;
    const { couponCodeName } = req.body;

    const applyCouponCodeServiceValidation = await applyCouponCodeService({
      userId,
      couponCodeName,
    });

    if (!applyCouponCodeServiceValidation.success) {
      return res
        .status(applyCouponCodeServiceValidation.statusCode)
        .json(
          new ApiError(
            applyCouponCodeServiceValidation.statusCode,
            applyCouponCodeServiceValidation.message,
            applyCouponCodeServiceValidation.data,
            applyCouponCodeServiceValidation.success,
          ),
        );
    }

    return res
      .status(applyCouponCodeServiceValidation.statusCode)
      .json(
        new ApiRes(
          applyCouponCodeServiceValidation.statusCode,
          applyCouponCodeServiceValidation.message,
          applyCouponCodeServiceValidation.data,
          applyCouponCodeServiceValidation.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const getAllCouponCodeController = async (_, res) => {
  try {
    const getAllCouponCodeServiceValidation = await getAllCouponCodeService();

    return !getAllCouponCodeServiceValidation.success
      ? res
          .status(Number(getAllCouponCodeServiceValidation?.statusCode))
          .json(
            new ApiError(
              getAllCouponCodeServiceValidation?.statusCode,
              getAllCouponCodeServiceValidation?.message,
              getAllCouponCodeServiceValidation?.data,
              getAllCouponCodeServiceValidation?.success,
            ),
          )
      : res
          .status(Number(getAllCouponCodeServiceValidation?.statusCode))
          .json(
            new ApiRes(
              getAllCouponCodeServiceValidation?.statusCode,
              getAllCouponCodeServiceValidation?.message,
              getAllCouponCodeServiceValidation?.data,
              getAllCouponCodeServiceValidation?.success,
            ),
          );
  } catch (error) {
    return res
      .status(500)
      .json(
        new ApiError(
          500,
          `Internal Server Error from get all coupon code controller`,
          [],
          false,
        ),
      );
  }
};

const removeCouponController = async (req, res) => {
  const { userId } = req.user;

  await Cart.updateOne(
    { userId },
    {
      $unset: { coupon: "" },
    },
  );

  return res.json(new ApiRes(200, "Coupon removed", null, true));
};

export {
  applyCouponCodeController,
  getAllCouponCodeController,
  removeCouponController,
};
