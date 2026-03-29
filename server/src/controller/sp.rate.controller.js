import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { calculateShippingRate } from "../services/shipping.service.js";
import { ApiRes } from "../utils/index.js";
const spRateCal = asyncHandler(async (req, res) => {
  const { cartItems, userPincode, orderAmount } = req.body;

  if (!cartItems || !userPincode) {
    return res.status(400).json(
      new ApiRes(400, "cartItems and userPincode are required", null, false)
    );
  }

  const result = await calculateShippingRate(cartItems, userPincode, orderAmount);

  return res.status(200).json(result);
});

export default spRateCal;
