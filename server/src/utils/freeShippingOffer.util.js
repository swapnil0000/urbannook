import FreeShippingOffer from "../model/freeShippingOffer.model.js";

/**
 * Returns { isActive, thresholdAmount } — the raw offer config. Used both for
 * client-side display (progress bar / "how far to unlock" copy) AND, since
 * rp.payment.controller.js compares subtotal >= thresholdAmount directly at
 * order-total time, as one of the real eligibility signals — free shipping
 * unlocks if EITHER the combo-pair rule (isFreeShippingEligible below), a
 * generic cart rule, OR the plain cart-value threshold is met.
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
