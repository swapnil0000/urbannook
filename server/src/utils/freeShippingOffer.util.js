import Offer from "../model/offer.model.js";

/**
 * Fetches the free-shipping singleton doc from the unified `offers`
 * collection (type: "free_shipping", written by the admin panel's Offers
 * page). Legacy `freeshippingoffers` collection is retired — see
 * UN-ADMIN-panel .../server/scripts/seedOffersFromLegacy.js for the one-time
 * backfill that must be run on any environment before this.
 *
 * Internal — all reads of the free-shipping config/banners go through this
 * one function.
 *
 * @param {string} projection mongoose .select() string
 */
const getFreeShippingDoc = async (projection) => {
  return Offer.findOne({ type: "free_shipping" }).select(projection).lean();
};

/**
 * Returns { isActive, thresholdAmount } — the raw offer config. Used both for
 * client-side display (progress bar / "how far to unlock" copy) AND, since
 * rp.payment.controller.js compares subtotal >= thresholdAmount directly at
 * order-total time, as one of the real eligibility signals — free shipping
 * unlocks if EITHER the combo-pair rule (isFreeShippingEligible below), a
 * generic cart rule, OR the plain cart-value threshold is met.
 */
export const getFreeShippingConfig = async () => {
  const offer = await getFreeShippingDoc("isActive thresholdAmount");
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
  const offer = await getFreeShippingDoc("isActive banners");
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

/**
 * Active banner (if any) for a given product page — used by
 * getBannerForProductController. A product can have at most one active
 * banner in practice, but that's not enforced at the schema level; first
 * match wins.
 *
 * @param {string} productId
 */
export const getBannerForProduct = async (productId) => {
  const offer = await getFreeShippingDoc("isActive banners");
  if (!offer?.isActive) return null;
  const banner = (offer.banners || []).find(
    (b) => b.isActive && String(b.sourceProductId) === String(productId),
  );
  return banner || null;
};

/**
 * All active banners across every product — used by
 * getAllActiveBannersController (checkout, which isn't tied to one product).
 */
export const getAllActiveBanners = async () => {
  const offer = await getFreeShippingDoc("isActive banners");
  if (!offer?.isActive) return [];
  return (offer.banners || []).filter((b) => b.isActive);
};
