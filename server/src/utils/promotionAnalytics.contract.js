/**
 * Promotion Engine V2 — Analytics event contract (Phase 10).
 *
 * Standardized payload SHAPES only. Nothing here sends anything anywhere —
 * there is no analytics client call, no route, no UI wiring. This exists so
 * that whenever analytics tracking IS wired up (frontend or backend), every
 * caller uses the same field names instead of each inventing its own ad-hoc
 * shape per page. Mirrors the same "contract, not implementation" posture as
 * promotionPresentation.service.js's DISPLAY_TYPES.
 *
 * Every event shares a common envelope; `payload` varies by event type.
 */

export const PROMOTION_EVENT_TYPES = {
  VIEW: "promotion_view", // a promotion card/banner was rendered to the user
  CLICK: "promotion_click", // user clicked/tapped a promotion card (e.g. "View offer")
  APPLY: "promotion_apply", // promotion's conditions became met in-session (cart changed to qualify)
  CONVERT: "promotion_convert", // promotion was part of a completed (paid) order
  GIFT_ACCEPT: "promotion_gift_accept", // user picked a specific option on a gift_choice reward
  BUNDLE_ACCEPT: "promotion_bundle_accept", // user accepted a bundle_price offer
};

/**
 * @typedef {object} PromotionEventEnvelope
 * @property {string} eventType - one of PROMOTION_EVENT_TYPES
 * @property {string} promotionId
 * @property {string} promotionName
 * @property {string} displayType - from promotionPresentation.service.js's DISPLAY_TYPES, never the raw reward.type
 * @property {string} placement - one of the 8 placement values (see promotion.model.js)
 * @property {string|null} sessionId - guest or authed session identifier, whatever the caller already tracks
 * @property {string|null} userId - null for guest
 * @property {string} occurredAt - ISO timestamp
 */

/** @returns {PromotionEventEnvelope} */
export function buildEventEnvelope({ eventType, promotionId, promotionName, displayType, placement, sessionId = null, userId = null }) {
  if (!Object.values(PROMOTION_EVENT_TYPES).includes(eventType)) {
    throw new Error(`Unknown promotion analytics eventType: ${eventType}`);
  }
  return {
    eventType,
    promotionId: String(promotionId),
    promotionName,
    displayType,
    placement,
    sessionId,
    userId,
    occurredAt: new Date().toISOString(),
  };
}

/**
 * Per-eventType extra payload fields (beyond the envelope above):
 *
 * VIEW         — {} (envelope alone is enough: what was shown, where, to whom)
 * CLICK        — { ctaText }                         (which CTA was clicked, from the display model)
 * APPLY        — { cartValueAtApply }                 (subtotal at the moment conditions became met)
 * CONVERT      — { orderId, discountAmount }           (ties to the real PromotionUsage record — see promotionUsage.model.js)
 * GIFT_ACCEPT  — { chosenProductId, chosenVariantSku }  (which gift_choice option was picked)
 * BUNDLE_ACCEPT— { bundlePrice }
 *
 * Kept as a comment (not an enforced schema) deliberately — once a real
 * analytics sink is chosen, the extra fields per type can be validated
 * there without this contract file needing to know about that sink.
 */
