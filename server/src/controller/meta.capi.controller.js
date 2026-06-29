import { sendMetaCapiEvent } from "../services/meta.capi.service.js";

const ALLOWED_EVENTS = new Set(["AddToCart", "InitiateCheckout", "ViewContent", "AddToWishlist", "CustomizeProduct"]);
const clamp = (val, len) => (val == null ? null : String(val).slice(0, len));

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

/**
 * Relay a browser-side pixel event to Meta CAPI from the server.
 * Client fires the pixel event (browser) + calls this endpoint with the same
 * event_id so Meta can deduplicate and still count the event even if the
 * browser was blocked.
 *
 * POST /api/v1/meta/capi-event
 * Body: { eventName, eventId, eventSourceUrl, userData, customData }
 */
async function relayCapiEvent(req, res) {
  // Always 204 immediately — CAPI relay must never block the UI
  res.status(204).end();

  try {
    const { eventName, eventId, eventSourceUrl, userData = {}, customData = {} } = req.body || {};

    if (!eventName || !ALLOWED_EVENTS.has(eventName)) return;
    if (!eventId) return;

    await sendMetaCapiEvent({
      eventName,
      eventId,
      eventSourceUrl: clamp(eventSourceUrl, 500),
      userData: {
        email: userData.email,
        phone: userData.phone,
        firstName: userData.firstName,
        lastName: userData.lastName,
        externalId: userData.externalId,
        fbp: userData.fbp,
        fbc: userData.fbc,
        clientIp: getClientIp(req),
        clientUserAgent: clamp(req.headers["user-agent"], 500),
      },
      customData,
    });
  } catch (err) {
    console.warn("[Meta CAPI relay] error:", err.message);
  }
}

export default { relayCapiEvent };
