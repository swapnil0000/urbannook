import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ApiRes } from "../utils/index.js";
import {
  calculateShippingRate
} from "../services/shipping.service.js";

const dynamicShippingCal = asyncHandler(async (req, res) => {
  // console.log("\n" + "*".repeat(80));
  // console.log("[CONTROLLER] 📦 Dynamic Shipping Calculation Request Received");
  // console.log("[CONTROLLER] Request Body:", JSON.stringify(req.body, null, 2));
  // console.log("[CONTROLLER] Request Headers:", JSON.stringify(req.headers, null, 2));
  // console.log("*".repeat(80) + "\n");
  
  const { deliveryPinCode, userPincode, cartItems, paymentType } = req.body;
  const pincode = deliveryPinCode || userPincode;

  console.log("[CONTROLLER] Extracted Parameters:");
  console.log("  - Pincode:", pincode);
  console.log("  - Payment Type:", paymentType || "PREPAID");
  console.log("  - Cart Items:", cartItems?.length, "items");

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

  console.log("[CONTROLLER] ✓ Validation passed, calling calculateShippingRate service...\n");

  const selectedService = await calculateShippingRate({ 
    pincode, 
    cartItems,
    paymentType: paymentType || "PREPAID"
  });

  console.log("\n[CONTROLLER] Service returned result:", JSON.stringify(selectedService, null, 2));
  console.log("[CONTROLLER] Sending response to client");
  console.log("*".repeat(80) + "\n");

  return res.status(200).json(
    new ApiRes(200, "Shipping rate calculated successfully", selectedService, true)
  );
});

export { dynamicShippingCal };
