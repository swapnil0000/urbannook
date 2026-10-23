import Promotion from "../model/promotion.model.js";

/**
 * Returns { isActive, thresholdAmount } — the raw free-shipping-threshold
 * config. Used both for client-side display (progress bar / "how far to
 * unlock" copy, via FreeShippingStrip.jsx) AND, since rp.payment.controller.js
 * compares subtotal >= thresholdAmount directly at order-total time, as one
 * of the two real eligibility signals (the other being any active Promotion
 * whose reward is free_shipping — see promotionEngine.util.js's
 * evaluatePromotions, read directly in rp.payment.controller.js).
 *
 * Reads the Promotion Engine V2 `promotions` collection — the cart-value-
 * threshold free_shipping Promotion (conditionTree { field: "cartSubtotal",
 * operator: "gte", value }, reward free_shipping). Picks whichever such
 * Promotion exists (there should be exactly one, singleton expectation); if
 * none exists, defaults to off.
 *
 * The old combo-banner system (isFreeShippingEligible/getBannerForProduct/
 * getAllActiveBanners/getCartRuleDerivedBanners, and everything reading the
 * legacy `offers` collection or the cart-rule adapter) was deleted entirely
 * 2026-10-09 — it was fully redundant with Promotion V2's own
 * evaluatePromotions/promotionResult.freeShipping, and its removal from the
 * money path was verified not to change real checkout behavior (see
 * rp.payment.controller.js's matching comment).
 */
export const getFreeShippingConfig = async () => {
  const promo = await Promotion.findOne({
    "rewards.type": "free_shipping",
    "conditionTree.field": "cartSubtotal",
  }).select("isActive conditionTree").lean();
  const result = {
    isActive: promo?.isActive ?? false,
    thresholdAmount: promo?.conditionTree?.value ?? 0,
  };
  console.log(`[FreeShipping:config] promo found=${!!promo} name="${promo?.name || "none"}" → ${JSON.stringify(result)}`);
  return result;
};
