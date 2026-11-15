import { calculateShippingRate, staticShippingCharge, isPincodeNotServiceable } from "./shipping.service.js";

// Genuinely unserviceable pincode must still block checkout — we cannot accept an
// order we cannot ship. Any OTHER failure (API down, network timeout after all
// retries, transient error) falls back to the flat rate instead, so a shipping-API
// outage doesn't take checkout down with it. The courier API only confirms the
// pincode; the charge is the static rule either way.
//
// Shared by order create (rp.payment.controller) and the checkout's shipping
// quote (dynamic.shipping.controller), so the page and the order agree. Kept out
// of shipping.service.js so tests that mock that module still run this code.
export const getShippingRateOrFallback = async (params) => {
  try {
    return await calculateShippingRate(params);
  } catch (error) {
    if (isPincodeNotServiceable(error)) throw error;
    const flat = staticShippingCharge(params.cartValue);
    console.error(`[SHIPPING] pin ${params.pincode} | rate calc failed, using static ₹${flat}: ${error.message}`);
    return {
      total_charges: flat,
      type: "standard", // order schema enum is standard|dynamic
      totalWeight: 0,
      expectedNoOfBoxes: params.cartItems?.length || 0,
      serviceName: null,
      courierName: null,
      estimatedDays: "24-48 hours",
      paymentType: params.paymentType || "PREPAID",
    };
  }
};
