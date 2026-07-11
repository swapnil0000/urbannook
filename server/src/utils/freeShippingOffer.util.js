import FreeShippingOffer from "../model/freeShippingOffer.model.js";

/**
 * Free shipping is a simple cart-value threshold, admin-configurable —
 * "subtotal > thresholdAmount" unlocks it, no specific products required.
 * Returns { isActive, thresholdAmount } — callers compare subtotal
 * themselves so this stays a pure data fetch, no business logic baked in.
 */
export const getFreeShippingConfig = async () => {
  const offer = await FreeShippingOffer.findOne().select("isActive thresholdAmount").lean();
  return {
    isActive: offer?.isActive ?? false,
    thresholdAmount: offer?.thresholdAmount ?? 0,
  };
};

export const isFreeShippingEligible = async (subtotal) => {
  const { isActive, thresholdAmount } = await getFreeShippingConfig();
  const eligible = isActive && Number(subtotal) > thresholdAmount;
  console.log(
    `[FreeShipping] subtotal=₹${subtotal} threshold=₹${thresholdAmount} isActive=${isActive} → eligible=${eligible}`,
  );
  return eligible;
};
