/**
 * Site-wide offer popup campaign (currently "₹100 off above ₹1,500").
 *
 * Single source of truth for the campaign, shared by
 * controller/offerLead.controller.js, which validates claims and echoes the
 * terms to the storefront.
 *
 * The coupon document is the authority on the actual terms: code, amount,
 * minimum, validity and caps are all read from it live, so changing them in the
 * admin panel reaches the popup and checkout without a deploy. The values below
 * are fallbacks, used only if that coupon cannot be read.
 *
 * Everything is env-overridable via OFFER_* variables. The old INDEPENDENCE_*
 * variables are deliberately NOT read: they point at the ended ₹80 coupon.
 */
import env from "./envConfigSetup.js";

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const pick = (...values) => values.find((v) => v !== undefined && v !== null && v !== "");

const siteOffer = {
  campaign: String(pick(env.OFFER_CAMPAIGN_ID, "SITE_OFFER_100")).toUpperCase(),

  // Identified by couponId first, NOT by code: the code is renameable in the
  // admin panel, couponId never changes. Leave unset to look up by code only.
  couponId: pick(env.OFFER_COUPON_ID) || null,

  // Lookup by code when couponId is unset or finds nothing.
  couponCode: String(pick(env.OFFER_COUPON_CODE, "UNSAVE100")).toUpperCase(),

  // Last-resort display values, used only if the coupon cannot be read at all.
  discountType: pick(env.OFFER_DISCOUNT_TYPE, "FLAT"), // "FLAT" | "PERCENTAGE"
  discountValue: num(env.OFFER_DISCOUNT_VALUE, 100),
  maxDiscountCap: env.OFFER_MAX_DISCOUNT ? num(env.OFFER_MAX_DISCOUNT, null) : null,
  minCartValue: num(env.OFFER_MIN_CART, 1500),

  // Optional hard end for claims (ISO with offset, e.g. 2026-12-31T23:59:59+05:30).
  // Unset = always on; the coupon's own validity still applies at checkout.
  validUntil: pick(env.OFFER_VALID_UNTIL) || null,
};

export default siteOffer;
