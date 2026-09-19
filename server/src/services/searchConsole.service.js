import { JWT } from "google-auth-library";
import env from "../config/envConfigSetup.js";

/**
 * Google Search Console — the outside view of your organic Google traffic.
 *
 * WHY THIS EXISTS
 * Our own `google_organic` channel is measured in the browser from
 * document.referrer, and a real slice of Google traffic arrives with the
 * referrer stripped (some iOS/in-app browsers, strict privacy settings), so it
 * silently lands in `direct`. That makes our organic number a FLOOR, not a
 * count. Search Console reports clicks from Google's own side, so comparing the
 * two tells you how much organic traffic our client-side tracking is missing.
 *
 * SETUP (all three env vars required, otherwise this degrades to "not configured"):
 *   GSC_SITE_URL               e.g. "sc-domain:urbannook.in" (Domain property)
 *                              or "https://urbannook.in/" (URL-prefix property)
 *   GSC_SERVICE_ACCOUNT_EMAIL  the service account's email
 *   GSC_PRIVATE_KEY            its PEM private key ("\n" escapes are handled)
 *
 * The service account must be added as a user on the property in Search
 * Console (Settings → Users and permissions), and the Search Console API must
 * be enabled in the Google Cloud project. Read-only scope is enough.
 */

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const API = "https://searchconsole.googleapis.com/webmasters/v3";

// Search Console data lags ~2 days and the API is quota-limited, so results are
// cached briefly rather than re-fetched on every admin page load.
const CACHE_TTL_MS = 30 * 60 * 1000;
const _cache = new Map();

export function isSearchConsoleConfigured() {
  return !!(env.GSC_SITE_URL && env.GSC_SERVICE_ACCOUNT_EMAIL && env.GSC_PRIVATE_KEY);
}

function getClient() {
  return new JWT({
    email: env.GSC_SERVICE_ACCOUNT_EMAIL,
    // Private keys pasted into .env keep their newlines as literal "\n".
    key: String(env.GSC_PRIVATE_KEY).replace(/\\n/g, "\n"),
    scopes: [SCOPE],
  });
}

const isoDay = (d) => d.toISOString().slice(0, 10);

/**
 * Query Search Console search analytics.
 *
 * @param {object}   opts
 * @param {number}   opts.days        lookback window
 * @param {string[]} opts.dimensions  e.g. ["date"], ["query"], ["page"]
 * @param {number}   opts.rowLimit
 * @returns {Promise<{rows: Array, totals: object}>}
 */
export async function querySearchAnalytics({ days = 28, dimensions = ["date"], rowLimit = 100 } = {}) {
  if (!isSearchConsoleConfigured()) {
    const err = new Error("Search Console is not configured");
    err.code = "GSC_NOT_CONFIGURED";
    throw err;
  }

  const cacheKey = `${days}:${dimensions.join(",")}:${rowLimit}`;
  const hit = _cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  // Search Console finalises data with a ~2 day lag; asking for today returns
  // partial rows that would read as a traffic collapse.
  const end = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

  const client = getClient();
  const url = `${API}/sites/${encodeURIComponent(env.GSC_SITE_URL)}/searchAnalytics/query`;

  const res = await client.request({
    url,
    method: "POST",
    data: {
      startDate: isoDay(start),
      endDate: isoDay(end),
      dimensions,
      rowLimit,
      // Web search only — excludes Discover/News, so this lines up with what
      // our `google_organic` channel actually represents.
      type: "web",
    },
  });

  const rows = res.data?.rows || [];
  const totals = rows.reduce(
    (acc, r) => ({
      clicks: acc.clicks + (r.clicks || 0),
      impressions: acc.impressions + (r.impressions || 0),
    }),
    { clicks: 0, impressions: 0 },
  );
  totals.ctr = totals.impressions ? +(totals.clicks / totals.impressions * 100).toFixed(2) : 0;

  const value = {
    range: { startDate: isoDay(start), endDate: isoDay(end) },
    rows: rows.map((r) => ({
      key: r.keys?.[0] ?? null,
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: +((r.ctr || 0) * 100).toFixed(2),
      position: +(r.position || 0).toFixed(1),
    })),
    totals,
  };

  _cache.set(cacheKey, { at: Date.now(), value });
  return value;
}

export default { querySearchAnalytics, isSearchConsoleConfigured };
