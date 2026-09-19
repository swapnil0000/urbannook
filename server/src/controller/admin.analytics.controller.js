import Event from "../model/event.model.js";
import {
  querySearchAnalytics,
  isSearchConsoleConfigured,
} from "../services/searchConsole.service.js";

// GA4-style names — these are what analytics.js stores via pushEcommerce/recordEvent
const FUNNEL_STEPS = [
  { key: "ViewContent",        dbName: "view_item"      },
  { key: "AddToCart",          dbName: "add_to_cart"    },
  { key: "InitiateCheckout",   dbName: "begin_checkout" },
  { key: "Purchase",           dbName: "purchase"       },
];

function sinceDate(days) {
  return new Date(Date.now() - Math.min(parseInt(days) || 7, 90) * 24 * 60 * 60 * 1000);
}

// Optional ?channel=google_organic slice. The value is written client-side by
// classifyChannel() in client/src/utils/analytics.js — google_organic,
// google_ads, google_shopping_free, meta_ads, meta_organic, other_search,
// whatsapp, email, referral, direct, or any utm_source we tagged ourselves.
function channelFilter(req) {
  return req.query.channel ? { "attribution.channel": req.query.channel } : {};
}

// GET /api/v1/admin/analytics/funnel?days=7
async function getFunnel(req, res) {
  const since = sinceDate(req.query.days);

  const channel = channelFilter(req);

  const counts = await Promise.all(
    FUNNEL_STEPS.map(({ dbName }) =>
      Event.countDocuments({ eventName: dbName, createdAt: { $gte: since }, ...channel })
    )
  );

  const steps = FUNNEL_STEPS.map(({ key }, i) => {
    const count = counts[i];
    const top = counts[0] || 1;
    const prev = i === 0 ? count : counts[i - 1] || 1;
    return {
      step: key,
      count,
      dropOffPct: parseFloat((((prev - count) / prev) * 100).toFixed(1)),
      conversionPct: parseFloat(((count / top) * 100).toFixed(1)),
    };
  });

  res.json({ days: parseInt(req.query.days) || 7, since, channel: req.query.channel || "all", steps });
}

// GET /api/v1/admin/analytics/summary?days=7
async function getSummary(req, res) {
  const since = sinceDate(req.query.days);

  const channel = channelFilter(req);

  const [totalEvents, purchases] = await Promise.all([
    Event.countDocuments({ createdAt: { $gte: since }, ...channel }),
    Event.find(
      { eventName: "purchase", createdAt: { $gte: since }, ...channel },
      "properties userId"
    ).lean(),
  ]);

  const revenue = purchases.reduce((s, e) => s + (Number(e.properties?.value) || 0), 0);

  res.json({
    days: parseInt(req.query.days) || 7,
    channel: req.query.channel || "all",
    totalEvents,
    purchases: purchases.length,
    revenue: Math.round(revenue),
    avgOrder: purchases.length ? Math.round(revenue / purchases.length) : 0,
    uniqueBuyers: new Set(purchases.map((e) => e.userId).filter(Boolean)).size,
    guestPurchases: purchases.filter((e) => !e.userId).length,
  });
}

// GET /api/v1/admin/analytics/events?page=1&limit=50&eventName=AddToCart&userId=xxx
async function getEvents(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const filter = {};
  if (req.query.eventName) filter.eventName = req.query.eventName;
  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.anonymousId) filter.anonymousId = req.query.anonymousId;
  if (req.query.sessionId) filter.sessionId = req.query.sessionId;
  if (req.query.channel) filter["attribution.channel"] = req.query.channel;

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("eventName userId anonymousId sessionId properties path attribution createdAt")
      .lean(),
    Event.countDocuments(filter),
  ]);

  res.json({ total, page, limit, pages: Math.ceil(total / limit), events });
}

// GET /api/v1/admin/analytics/top-products?days=7
async function getTopProducts(req, res) {
  const since = sinceDate(req.query.days);

  const rows = await Event.aggregate([
    {
      $match: {
        eventName: { $in: ["view_item", "add_to_cart", "purchase"] },
        createdAt: { $gte: since },
        "properties.item_id": { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: { eventName: "$eventName", itemId: "$properties.item_id" },
        count: { $sum: 1 },
        itemName: { $first: "$properties.item_name" },
      },
    },
    {
      $group: {
        _id: "$_id.itemId",
        itemName: { $first: "$itemName" },
        events: { $push: { k: "$_id.eventName", v: "$count" } },
        // k values will be "view_item", "add_to_cart", "purchase"
      },
    },
    { $addFields: { eventsMap: { $arrayToObject: "$events" } } },
    {
      $project: {
        _id: 0,
        itemId: "$_id",
        itemName: 1,
        views: { $ifNull: ["$eventsMap.view_item", 0] },
        addToCarts: { $ifNull: ["$eventsMap.add_to_cart", 0] },
        purchases: { $ifNull: ["$eventsMap.purchase", 0] },
      },
    },
    { $sort: { views: -1 } },
    { $limit: 20 },
  ]);

  res.json({ days: parseInt(req.query.days) || 7, products: rows });
}

// GET /api/v1/admin/analytics/channels?days=7
//
// Where traffic actually came from, one row per channel. `visitors` counts
// DISTINCT devices (anonymousId), not events, so a single visitor browsing 20
// pages counts once — that is the number to compare against purchases.
//
// Google organic search is the `google_organic` row: a google.<tld> referrer
// (or the Google app / Google News) with no gclid and no paid utm_medium.
// Paid Google sits in `google_ads` and Meta in `meta_ads`/`meta_organic`, so
// the three never mix.
async function getChannels(req, res) {
  const since = sinceDate(req.query.days);

  const rows = await Event.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $ifNull: ["$attribution.channel", "unknown"] },
        visitors: { $addToSet: "$anonymousId" },
        events: { $sum: 1 },
        purchases: { $sum: { $cond: [{ $eq: ["$eventName", "purchase"] }, 1, 0] } },
        revenue: {
          $sum: {
            $cond: [
              { $eq: ["$eventName", "purchase"] },
              { $ifNull: [{ $toDouble: "$properties.value" }, 0] },
              0,
            ],
          },
        },
        addToCarts: { $sum: { $cond: [{ $eq: ["$eventName", "add_to_cart"] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        channel: "$_id",
        visitors: { $size: "$visitors" },
        events: 1,
        addToCarts: 1,
        purchases: 1,
        revenue: { $round: ["$revenue", 0] },
      },
    },
    { $sort: { visitors: -1 } },
  ]);

  // Visitor → buyer rate per channel, so Google organic can be compared
  // like-for-like against paid without dividing by raw event counts.
  const channels = rows.map((r) => ({
    ...r,
    conversionPct: r.visitors ? parseFloat(((r.purchases / r.visitors) * 100).toFixed(2)) : 0,
  }));

  res.json({ days: parseInt(req.query.days) || 7, since, channels });
}

// GET /api/v1/admin/analytics/search-console?days=28&dimensions=query
//
// Cross-checks OUR measured Google-organic traffic against what Google itself
// reports. Our `google_organic` channel is read from document.referrer in the
// browser, and some Google traffic arrives with no referrer at all (certain
// iOS/in-app browsers, strict privacy modes) and silently falls into `direct`.
// So our number is a FLOOR. Search Console counts the click on Google's side,
// which is the only way to see the size of that blind spot.
//
// `coverage.measuredPct` = our google_organic visitors ÷ Search Console clicks.
// Read it as an approximation, not an identity: a Search Console "click" is one
// click from a results page, while `visitors` counts distinct devices over the
// window, so a returning visitor who clicks twice counts twice for Google and
// once for us. Well under 100% means real organic traffic is landing in
// `direct`; consistently near or above 100% means coverage is healthy.
async function getSearchConsole(req, res) {
  if (!isSearchConsoleConfigured()) {
    return res.status(200).json({
      configured: false,
      message:
        "Search Console is not configured. Set GSC_SITE_URL, GSC_SERVICE_ACCOUNT_EMAIL and GSC_PRIVATE_KEY, " +
        "enable the Search Console API in the Google Cloud project, and add the service account as a user " +
        "on the property in Search Console (Settings -> Users and permissions).",
    });
  }

  const days = Math.min(parseInt(req.query.days) || 28, 90);
  const dimension = ["query", "page", "date", "country", "device"].includes(req.query.dimensions)
    ? req.query.dimensions
    : "date";

  try {
    const gsc = await querySearchAnalytics({
      days,
      dimensions: [dimension],
      rowLimit: Math.min(parseInt(req.query.limit) || 100, 500),
    });

    // Compare over the SAME window Search Console actually returned (it lags
    // ~2 days), not over "last N days from now", or the two never line up.
    const [measuredVisitors, purchases] = await Promise.all([
      Event.distinct("anonymousId", {
        "attribution.channel": "google_organic",
        createdAt: { $gte: new Date(gsc.range.startDate), $lte: new Date(`${gsc.range.endDate}T23:59:59.999Z`) },
      }),
      Event.countDocuments({
        eventName: "purchase",
        "attribution.channel": "google_organic",
        createdAt: { $gte: new Date(gsc.range.startDate), $lte: new Date(`${gsc.range.endDate}T23:59:59.999Z`) },
      }),
    ]);

    const measured = measuredVisitors.length;

    res.json({
      configured: true,
      days,
      dimension,
      range: gsc.range,
      searchConsole: gsc.totals,
      measured: { googleOrganicVisitors: measured, googleOrganicPurchases: purchases },
      coverage: {
        measuredPct: gsc.totals.clicks
          ? parseFloat(((measured / gsc.totals.clicks) * 100).toFixed(1))
          : null,
        note: "Approximate. Search Console counts clicks; we count distinct devices. Well under 100% means Google traffic is being mis-attributed as direct.",
      },
      rows: gsc.rows,
    });
  } catch (err) {
    if (err.code === "GSC_NOT_CONFIGURED") {
      return res.status(200).json({ configured: false, message: err.message });
    }
    console.error("[SearchConsole] query failed:", err.message);
    res.status(502).json({
      configured: true,
      error: "Search Console query failed",
      detail: err.message,
    });
  }
}

export default {
  getFunnel,
  getSummary,
  getEvents,
  getTopProducts,
  getChannels,
  getSearchConsole,
};
