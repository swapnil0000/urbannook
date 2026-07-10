import { storeEvents } from "../services/event.service.js";

/**
 * First-party event ingestion.
 *
 * Design rules:
 * - PUBLIC + fire-and-forget: respond 204 immediately, persist in the background.
 *   Analytics must NEVER block or break the user experience.
 * - Defensive: cap batch size, validate event names, clamp string lengths so a
 *   bad/abusive client can't bloat the collection.
 * - Identity (userId/anonymousId/sessionId) comes from the client payload (same
 *   trust model as Segment/Amplitude). IP + User-Agent are enriched server-side.
 */

const MAX_BATCH = 50;
const EVENT_NAME_RE = /^[a-zA-Z0-9_.\-]{1,64}$/;

const clamp = (val, len) =>
  val == null ? null : String(val).slice(0, len);

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

function normalizeEvent(e, ctx) {
  if (!e || typeof e.eventName !== "string" || !EVENT_NAME_RE.test(e.eventName)) {
    return null;
  }
  return {
    eventName: e.eventName,
    userId: e.userId ? clamp(e.userId, 64) : null,
    anonymousId: e.anonymousId ? clamp(e.anonymousId, 64) : "unknown",
    sessionId: e.sessionId ? clamp(e.sessionId, 64) : null,
    properties:
      e.properties && typeof e.properties === "object" ? e.properties : {},
    url: clamp(e.url, 500),
    path: clamp(e.path, 300),
    referrer: clamp(e.referrer, 500),
    attribution:
      e.attribution && typeof e.attribution === "object" ? e.attribution : {},
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    eventTime: e.timestamp ? new Date(e.timestamp) : new Date(),
  };
}

async function track(req, res) {
  try {
    const body = req.body || {};
    const raw = Array.isArray(body.events)
      ? body.events
      : body.eventName
      ? [body]
      : [];

    const ctx = {
      ip: getClientIp(req),
      userAgent: clamp(req.headers["user-agent"], 500),
    };

    const docs = raw
      .slice(0, MAX_BATCH)
      .map((e) => normalizeEvent(e, ctx))
      .filter(Boolean);

    // Acknowledge first — never make the client wait on a DB write.
    res.status(204).end();

    if (docs.length) {
      storeEvents(docs).catch((err) =>
        console.warn("[Events] store failed:", err.message)
      );
    }
  } catch (err) {
    if (!res.headersSent) res.status(204).end();
    console.warn("[Events] track error:", err.message);
  }
}

export default { track };
