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

/**
 * Free shipping is unlocked ONLY when the cart contains a configured offer
 * combo — i.e. both the `sourceProductId` and its `recommendedProductId`
 * from an active banner are present in the cart. This is NOT a cart-value
 * rule: adding some unrelated product that happens to be expensive must not
 * unlock free shipping. Each active banner is one combo; the cart qualifies
 * if it satisfies ANY of them.
 *
 * @param {string[]} cartProductIds product IDs currently in the cart/order
 */
export const isFreeShippingEligible = async (cartProductIds = []) => {
  const offer = await FreeShippingOffer.findOne().select("isActive banners").lean();
  if (!offer?.isActive) return false;

  const ids = new Set((cartProductIds || []).map((id) => String(id)));
  const eligible = (offer.banners || []).some(
    (b) =>
      b.isActive &&
      ids.has(String(b.sourceProductId)) &&
      ids.has(String(b.recommendedProductId)),
  );
  console.log(
    `[FreeShipping] cartIds=[${[...ids].join(",")}] → eligible=${eligible}`,
  );
  return eligible;
};
