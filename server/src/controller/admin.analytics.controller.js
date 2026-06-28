import Event from "../model/event.model.js";

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

// GET /api/v1/admin/analytics/funnel?days=7
async function getFunnel(req, res) {
  const since = sinceDate(req.query.days);

  const counts = await Promise.all(
    FUNNEL_STEPS.map(({ dbName }) =>
      Event.countDocuments({ eventName: dbName, createdAt: { $gte: since } })
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

  res.json({ days: parseInt(req.query.days) || 7, since, steps });
}

// GET /api/v1/admin/analytics/summary?days=7
async function getSummary(req, res) {
  const since = sinceDate(req.query.days);

  const [totalEvents, purchases] = await Promise.all([
    Event.countDocuments({ createdAt: { $gte: since } }),
    Event.find(
      { eventName: "purchase", createdAt: { $gte: since } },
      "properties userId"
    ).lean(),
  ]);

  const revenue = purchases.reduce((s, e) => s + (Number(e.properties?.value) || 0), 0);

  res.json({
    days: parseInt(req.query.days) || 7,
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

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("eventName userId anonymousId sessionId properties path createdAt")
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

export default { getFunnel, getSummary, getEvents, getTopProducts };
