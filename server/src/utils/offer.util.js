import Promotion from "../model/promotion.model.js";

// gift_wrap config now lives as a Promotion{promotionType:"gift_wrap_config"}
// singleton doc, migrated off the legacy `offers` collection 2026-10-08 (see
// promotion.model.js's giftWrap field) — this codebase no longer reads the
// `offers` collection anywhere. Kept as a generic PUBLIC_FIELDS_BY_TYPE map
// (same shape as before) purely so GET /offers/:type and every existing
// internal caller (getPublicOfferConfig("gift_wrap")) need zero changes.
const DEFAULTS_BY_TYPE = {
  gift_wrap: {
    isActive: false,
    price: 0,
    title: "Make it a gift",
    note: "Add our Rakhi-exclusive gift wrap to your Comets, packed in our easy-to-carry gift box.",
    ctaLabel: "Add Gift Wrap",
  },
};

/**
 * Fetches a simple singleton offer's public-safe config, merged over its
 * defaults so a missing doc (offer never configured) still returns a valid,
 * inactive shape instead of nulls. Returns null for any type not registered
 * above — free_shipping/cart_rule keep their own dedicated
 * util/controller/routes since they need more than a flat field projection
 * (banner lookups, rule evaluation).
 *
 * Used both by the public GET /offers/:type route AND internally wherever
 * server code needs the live, authoritative value of one of these offers
 * (e.g. checkout pricing) — one function, one source of truth.
 */
export const getPublicOfferConfig = async (type) => {
  if (type !== "gift_wrap") return null;
  const promo = await Promotion.findOne({ promotionType: "gift_wrap_config" }).select("isActive giftWrap").lean();
  const gw = promo?.giftWrap || {};
  return {
    ...DEFAULTS_BY_TYPE.gift_wrap,
    isActive: promo?.isActive ?? DEFAULTS_BY_TYPE.gift_wrap.isActive,
    price: gw.price ?? DEFAULTS_BY_TYPE.gift_wrap.price,
    title: gw.title ?? DEFAULTS_BY_TYPE.gift_wrap.title,
    note: gw.note ?? DEFAULTS_BY_TYPE.gift_wrap.note,
    ctaLabel: gw.ctaLabel ?? DEFAULTS_BY_TYPE.gift_wrap.ctaLabel,
  };
};
