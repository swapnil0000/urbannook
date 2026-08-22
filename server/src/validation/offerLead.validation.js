import Joi from "joi";

// Only the attribution keys captureAttribution() actually writes — stripUnknown
// drops anything else, so a crafted payload can't stuff arbitrary fields into the DB.
const attributionSchema = Joi.object({
  utm_source: Joi.string().trim().max(200).allow("", null),
  utm_medium: Joi.string().trim().max(200).allow("", null),
  utm_campaign: Joi.string().trim().max(200).allow("", null),
  utm_content: Joi.string().trim().max(200).allow("", null),
  utm_term: Joi.string().trim().max(200).allow("", null),
  fbclid: Joi.string().trim().max(400).allow("", null),
  gclid: Joi.string().trim().max(400).allow("", null),
  landing_referrer: Joi.string().trim().max(400).allow("", null),
  landing_page: Joi.string().trim().max(300).allow("", null),
})
  .optional()
  .default({});

const offerClaimSchema = Joi.object({
  // Mobile only — the popup asks for nothing else. It doubles as the dedupe key
  // and as the identifier the coupon engine matches on when enforcing
  // one-use-per-customer (see coupon.code.service.js normalizeMobile).
  mobile: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.empty": "Mobile number is required",
      "string.pattern.base": "Please enter a valid 10-digit Indian mobile number",
      "any.required": "Mobile number is required",
    }),

  // Optional so a second campaign can reuse this endpoint; defaults to the
  // Independence Day campaign server-side when omitted.
  campaign: Joi.string().trim().uppercase().max(60).optional().allow("", null),

  source: Joi.string().trim().max(40).optional().allow("", null),
  pagePath: Joi.string().trim().max(300).optional().allow("", null),
  isInAppBrowser: Joi.boolean().optional().default(false),
  attribution: attributionSchema,
});

export { offerClaimSchema };
