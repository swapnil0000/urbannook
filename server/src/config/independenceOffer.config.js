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

  // Points at an existing, admin-managed coupon. Nothing here creates or edits
  // it — these are fallback display terms used only if the coupon document
  // cannot be read; the live document is always the authority.
  couponCode: (env.INDEPENDENCE_COUPON_CODE || "UNFLAT100").toUpperCase(),
  discountType: env.INDEPENDENCE_DISCOUNT_TYPE || "FLAT", // "FLAT" | "PERCENTAGE"
  discountValue: num(env.INDEPENDENCE_DISCOUNT_VALUE, 100),
  maxDiscountCap: env.INDEPENDENCE_MAX_DISCOUNT ? num(env.INDEPENDENCE_MAX_DISCOUNT, null) : null,
  minCartValue: num(env.INDEPENDENCE_MIN_CART, 1499),
  // IST offsets are explicit so the window does not shift with server timezone.
  validFrom: env.INDEPENDENCE_VALID_FROM || "2026-08-14T00:00:00+05:30",
  // End of 15 Aug, IST — the coupon stops validating at checkout at the same
  // instant the popup stops appearing.
  validUntil: env.INDEPENDENCE_VALID_UNTIL || "2026-08-15T23:59:59+05:30",
};

export default independenceOffer;
