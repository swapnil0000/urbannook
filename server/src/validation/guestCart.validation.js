import Joi from "joi";

// Mirrors the CheckoutPage Contact-step fields exactly — anonymousId is the
// stable per-browser id from analytics.js (getAnonymousId/localStorage
// "un_anon_id"), reused as the cart's userId ("guest_<anonymousId>") so the
// SAME id ties this cart to the eventual order if the guest completes payment
// (see rp.payment.controller.js) — otherwise a converted guest would still
// show up as "abandoned" forever.
const cartItemSchema = Joi.object({
  productId: Joi.string().trim().required(),
  quantity: Joi.number().integer().min(1).default(1),
  selectedVariant: Joi.string().trim().allow("", null).default("N/A"),
  image: Joi.string().trim().allow("", null).default(null),
});

const guestCartSyncSchema = Joi.object({
  anonymousId: Joi.string().trim().min(8).max(100).required(),

  // All optional individually — the client only calls this once at least one
  // of email/mobile looks valid, but we don't re-enforce that shape here
  // since a partially-typed value (still being corrected) is fine to store.
  guestName: Joi.string().trim().max(120).allow("", null),
  guestEmail: Joi.string().trim().max(200).allow("", null),
  guestMobile: Joi.string().trim().max(20).allow("", null),

  items: Joi.array().items(cartItemSchema).max(100).default([]),
});

export { guestCartSyncSchema };
