import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { AuthenticationError } from "../utils/errors.js";
import { ApiRes } from "../utils/index.js";
import Cart from "../model/user.cart.model.js";
import { 
  checkPincodeServiceability, 
  calculateShippingRate 
} from "../services/shipping.service.js";

const pinCodeDeliverableOrNotCheck = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { deliveryPinCode, userPincode } = req.body;
  const pincode = deliveryPinCode || userPincode;
  
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

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
  const { userId } = req.user;
  const { deliveryPinCode, userPincode, cartItems } = req.body;
  const pincode = deliveryPinCode || userPincode;

  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  const selectedService = await calculateShippingRate({ pincode, cartItems });

  const cart = await Cart.findOne({ userId });
  if (cart && cart.appliedCoupon && cart.appliedCoupon.summary) {
    const oldSubtotal = cart.appliedCoupon.summary.subtotal || 0;
    const oldDiscount = cart.appliedCoupon.summary.discount || 0;
    const newShipping = selectedService.total_charges;
    
    cart.appliedCoupon.summary.shipping = newShipping;
    cart.appliedCoupon.summary.shippingName = selectedService.name;
    cart.appliedCoupon.summary.shippingType = selectedService.shippingType;
    cart.appliedCoupon.summary.grandTotal = oldSubtotal + newShipping - oldDiscount;
    
    await cart.save();
  }

  return res.status(200).json(
    new ApiRes(
      200, 
      "Shipping rate calculated successfully", 
      { 
        total_charges: selectedService.total_charges,
        shippingType: selectedService.shippingType,
        shippingName: selectedService.name
      }, 
      true
    )
  );
});

export { pinCodeDeliverableOrNotCheck, dynamicShippingCal };
