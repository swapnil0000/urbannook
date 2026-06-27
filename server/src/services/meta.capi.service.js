/**
 * Meta Conversions API (CAPI) service.
 *
 * Sends server-side events to Meta's Graph API. The server-side event shares the
 * same `event_id` (the app orderId) and `event_name` as the browser Pixel event,
 * so Meta DEDUPLICATES them (counts once) while keeping data even if the browser
 * event is blocked (iOS/ITP/ad-blockers).
 *
 * Security:
 * - PII (email, phone) is SHA-256 hashed here, on the server only. Raw PII never leaves.
 * - The CAPI token comes from env and is never logged.
 */

import crypto from "crypto";
import axios from "axios";
import env from "../config/envConfigSetup.js";

const GRAPH_VERSION = "v21.0";

// SHA-256 of a normalized string (lowercased + trimmed). Returns undefined for empty.
const hashNormalized = (value) => {
  if (!value) return undefined;
  return crypto
    .createHash("sha256")
    .update(String(value).trim().toLowerCase())
    .digest("hex");
};

// Phone must be digits-only with country code before hashing (e.g. 91XXXXXXXXXX).
const hashPhone = (phone) => {
  if (!phone) return undefined;
  let digits = String(phone).replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.length === 10) digits = `91${digits}`; // assume India if bare 10-digit
  return crypto.createHash("sha256").update(digits).digest("hex");
};

/**
 * Send one event to Meta CAPI.
 * @param {object} p
 * @param {string} p.eventName        e.g. "Purchase"
 * @param {string} p.eventId          dedup key — MUST equal the browser eventID (orderId)
 * @param {string} [p.eventSourceUrl] page URL where the user acted
 * @param {object} p.userData         { email, phone, fbp, fbc, clientIp, clientUserAgent }
 * @param {object} p.customData       { currency, value, content_ids, contents, num_items, order_id }
 */
export async function sendMetaCapiEvent({
  eventName,
  eventId,
  eventSourceUrl,
  userData = {},
  customData = {},
}) {
  const datasetId = env.META_DATASET_ID;
  const token = env.META_CAPI_TOKEN;

  if (!datasetId || !token) {
    console.warn(
      `[Meta CAPI] META_DATASET_ID / META_CAPI_TOKEN not set — skipping ${eventName} (event_id=${eventId})`,
    );
    return { success: false, skipped: true };
  }

  // Build user_data: hashed PII + non-hashed match signals (fbp/fbc/ip/ua).
  const user_data = {};
  const em = hashNormalized(userData.email);
  if (em) user_data.em = [em];
  const ph = hashPhone(userData.phone);
  if (ph) user_data.ph = [ph];
  const fn = hashNormalized(userData.firstName);
  if (fn) user_data.fn = [fn];
  const ln = hashNormalized(userData.lastName);
  if (ln) user_data.ln = [ln];
  // external_id = stable app user id (hashed). One of the strongest EMQ signals.
  const externalId = hashNormalized(userData.externalId);
  if (externalId) user_data.external_id = [externalId];
  if (userData.fbp) user_data.fbp = userData.fbp;
  if (userData.fbc) user_data.fbc = userData.fbc;
  if (userData.clientIp) user_data.client_ip_address = userData.clientIp;
  if (userData.clientUserAgent) user_data.client_user_agent = userData.clientUserAgent;

  const eventPayload = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    ...(eventSourceUrl ? { event_source_url: eventSourceUrl } : {}),
    user_data,
    custom_data: customData,
  };

  const body = {
    data: [eventPayload],
    ...(env.META_TEST_EVENT_CODE
      ? { test_event_code: env.META_TEST_EVENT_CODE }
      : {}),
  };

  try {
    // Token kept in the query string — never logged below.
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${datasetId}/events?access_token=${token}`;
    const res = await axios.post(url, body, { timeout: 8000 });
    console.log(
      `[Meta CAPI] ${eventName} sent (event_id=${eventId}) — events_received=${res.data?.events_received ?? "?"}`,
    );
    return { success: true, data: res.data };
  } catch (err) {
    // Log only Meta's error message — no token, no PII.
    const metaErr = err?.response?.data?.error?.message || err.message;
    console.error(
      `[Meta CAPI] ${eventName} failed (event_id=${eventId}): ${metaErr}`,
    );
    return { success: false, error: metaErr };
  }
}

export default sendMetaCapiEvent;
