import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ApiRes } from "../utils/index.js";
import {
  checkPincodeServiceability,
  calculateShippingRate
} from "../services/shipping.service.js";

const pinCodeDeliverableOrNotCheck = asyncHandler(async (req, res) => {
  const { deliveryPinCode, userPincode } = req.body;
  const pincode = deliveryPinCode || userPincode;

  const result = await checkPincodeServiceability(pincode);

  return res.status(200).json(
    new ApiRes(
      200,
      "Pincode serviceability checked",
      result,
      true
    )
  );
});

const dynamicShippingCal = asyncHandler(async (req, res) => {
  const { deliveryPinCode, userPincode, cartItems } = req.body;
  const pincode = deliveryPinCode || userPincode;

  const selectedService = await calculateShippingRate({ pincode, cartItems });

  if (!selectedService) {
    return res.status(200).json(
      new ApiRes(200, "No preferred shipping services available", null, false)
    );
  }

  return res.status(200).json(
    new ApiRes(200, "Shipping rate calculated successfully", { total_charges: selectedService.total_charges }, true)
  );
});

export { pinCodeDeliverableOrNotCheck, dynamicShippingCal };
