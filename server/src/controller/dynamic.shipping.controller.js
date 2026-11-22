import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ApiRes } from "../utils/index.js";
import { getShippingRateOrFallback } from "../services/shippingRateFallback.service.js";
import { COD_FEE } from "../utils/orderAmount.util.js";

const dynamicShippingCal = asyncHandler(async (req, res) => {
  // console.log("\n" + "*".repeat(80));
  // console.log("[CONTROLLER] 📦 Dynamic Shipping Calculation Request Received");
  // console.log("[CONTROLLER] Request Body:", JSON.stringify(req.body, null, 2));
  // console.log("[CONTROLLER] Request Headers:", JSON.stringify(req.headers, null, 2));
  // console.log("*".repeat(80) + "\n");
  
  const { deliveryPinCode, userPincode, cartItems, paymentType } = req.body;
  const pincode = deliveryPinCode || userPincode;

  // console.log("[CONTROLLER] Extracted Parameters:");
  // console.log("  - Pincode:", pincode);
  // console.log("  - Payment Type:", paymentType || "PREPAID");
  // console.log("  - Cart Items:", cartItems?.length, "items");

  if (!pincode) {
    console.error("[CONTROLLER] ❌ Validation Error: Pincode is missing");
    console.log("*".repeat(80) + "\n");
    return res.status(400).json(
      new ApiRes(400, "Pincode is required", null, false)
    );
  }

  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    console.error("[CONTROLLER] ❌ Validation Error: Cart items missing or invalid");
    console.log("*".repeat(80) + "\n");
    return res.status(400).json(
      new ApiRes(400, "Cart items are required", null, false)
    );
  }

  // console.log("[CONTROLLER] ✓ Validation passed, calling calculateShippingRate service...\n");

  // Same fallback as order create: the courier API being down quotes the static
  // rate instead of a 500; only an unserviceable pincode stops checkout (400).
  const selectedService = await getShippingRateOrFallback({
    pincode, 
    cartItems,
    // display value from the checkout page (after offers); the order itself re-derives it server-side
    cartValue: req.body.cartValue,
    paymentType: paymentType || "PREPAID"
  });

  console.log("\n[CONTROLLER] Service returned result:", JSON.stringify(selectedService, null, 2));
  // console.log("[CONTROLLER] Sending response to client");
  // console.log("*".repeat(80) + "\n");

  // The COD fee rides on the COD quote, so the checkout shows what the order
  // will actually charge without keeping its own copy of the number.
  const codFee = paymentType === "COD" ? COD_FEE : 0;

  return res.status(200).json(
    new ApiRes(200, "Shipping rate calculated successfully", { ...selectedService, codFee }, true)
  );
});

export { dynamicShippingCal };
