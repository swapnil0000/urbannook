import Offer from "../model/offer.model.js";

// Generic reader for simple "singleton config" offer types (one doc per
// type, no sub-lists like free_shipping's banners or cart_rule's
// conditions/effects — just flat fields an admin toggles/edits). Add a new
// type here and it's instantly readable via GET /offers/:type — no new
// controller/route needed.
const PUBLIC_FIELDS_BY_TYPE = {
  gift_wrap: "isActive price title note ctaLabel",
};

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
  const projection = PUBLIC_FIELDS_BY_TYPE[type];
  if (!projection) return null;
  const offer = await Offer.findOne({ type }).select(projection).lean();
  return { ...(DEFAULTS_BY_TYPE[type] || {}), ...(offer || {}) };
};
