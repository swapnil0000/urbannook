/**
 * Independence Day lead-capture campaign.
 *
 * Single source of truth for the campaign, shared by:
 *   - controller/offerLead.controller.js  (validates + echoes the terms to the storefront)
 *   - scripts/seed-independence-coupon.js (creates the actual coupon document)
 *
 * Everything is env-overridable so marketing can move the dates or swap the code
 * without a code change. The client has a mirror of the display values in
 * client/src/config/independenceOffer.js — keep the code + percentage in sync.
 */
import env from "./envConfigSetup.js";

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const independenceOffer = {
  campaign: (env.INDEPENDENCE_CAMPAIGN_ID || "INDEPENDENCE_DAY_2026").toUpperCase(),

  // Identified by couponId, NOT by code. The code is renameable in the admin
  // panel and was in fact renamed mid-campaign (UNFLAT100 -> UNFREEDOM80),
  // which silently broke a code-keyed lookup. couponId never changes, so admin
  // edits to the code, the amount or the minimum now flow through on their own.
  couponId: env.INDEPENDENCE_COUPON_ID || "019f4ae8-ff35-7215-a80d-b56ae44096ec",

  // Fallback lookup only, for the case where couponId finds nothing.
  couponCode: (env.INDEPENDENCE_COUPON_CODE || "UNFREEDOM80").toUpperCase(),

  // Last-resort display values, used only if the coupon cannot be read at all.
  // The live document is always the authority.
  discountType: env.INDEPENDENCE_DISCOUNT_TYPE || "FLAT", // "FLAT" | "PERCENTAGE"
  discountValue: num(env.INDEPENDENCE_DISCOUNT_VALUE, 80),
  maxDiscountCap: env.INDEPENDENCE_MAX_DISCOUNT ? num(env.INDEPENDENCE_MAX_DISCOUNT, null) : null,
  minCartValue: num(env.INDEPENDENCE_MIN_CART, 499),
  // IST offsets are explicit so the window does not shift with server timezone.
  validFrom: env.INDEPENDENCE_VALID_FROM || "2026-08-14T00:00:00+05:30",
  // End of 15 Aug, IST — the coupon stops validating at checkout at the same
  // instant the popup stops appearing.
  validUntil: env.INDEPENDENCE_VALID_UNTIL || "2026-08-15T23:59:59+05:30",
};

export default independenceOffer;
