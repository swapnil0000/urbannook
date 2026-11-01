import Order from "../model/order.model.js";

// Real demand signals for the storefront's sorts and badges, read from orders:
// units sold per product and per variant, all-time ("Most bought"), in the
// last TRENDING_WINDOW_DAYS ("Trending"), and in the last week (recent-sales
// card badge).
// Only orders that were actually paid for count (not CREATED/FAILED/CANCELLED).
// Read-only: nothing is written to products, so admin data is untouched.
export const TRENDING_WINDOW_DAYS = 30;
export const RECENT_SALES_WINDOW_DAYS = 7;
const SOLD_STATUSES = ["PAID", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

/** @returns {Promise<Map<string, { recent, last7Days, all, byVariantSku: Map<string, { recent, last7Days, all }>, byVariantName: Map<string, { recent, last7Days, all }> }>>} keyed by productId */
export const recentSalesByProduct = async (productIds = [], now = new Date()) => {
  if (!productIds.length) return new Map();
  const since = new Date(now.getTime() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const since7Days = new Date(now.getTime() - RECENT_SALES_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await Order.aggregate([
    // productId narrows orders before the unwind (same result, far cheaper)
    { $match: { status: { $in: SOLD_STATUSES }, "items.productId": { $in: productIds } } },
    { $unwind: "$items" },
    {
      $match: {
        "items.productId": { $in: productIds },
        "items.productSnapshot.lineType": { $ne: "FREE_GIFT" },
        "items.productSnapshot.isPromotionalGift": { $ne: true },
      },
    },
    {
      $group: {
        _id: {
          productId: "$items.productId",
          variantSku: "$items.productSnapshot.variantSku",
          variantName: "$items.productSnapshot.selectedVariant",
        },
        all: { $sum: "$items.productSnapshot.quantity" },
        recent: { $sum: { $cond: [{ $gte: ["$createdAt", since] }, "$items.productSnapshot.quantity", 0] } },
        last7Days: { $sum: { $cond: [{ $gte: ["$createdAt", since7Days] }, "$items.productSnapshot.quantity", 0] } },
      },
    },
  ]);
  const out = new Map();
  for (const { _id, all, recent, last7Days } of rows) {
    if (!out.has(_id.productId)) out.set(_id.productId, { recent: 0, last7Days: 0, all: 0, byVariantSku: new Map(), byVariantName: new Map() });
    const entry = out.get(_id.productId);
    entry.recent += recent;
    entry.last7Days += last7Days;
    entry.all += all;
    const addVariantSales = (map, key) => {
      if (!key) return;
      const v = map.get(key) || { recent: 0, last7Days: 0, all: 0 };
      map.set(key, { recent: v.recent + recent, last7Days: v.last7Days + last7Days, all: v.all + all });
    };
    addVariantSales(entry.byVariantSku, _id.variantSku);
    addVariantSales(entry.byVariantName, _id.variantName);
  }
  return out;
};

/**
 * Adds `soldRecent` (last 30 days), `soldLast7Days`, and `soldTotal` (all-time)
 * to each product and each of its variants. Stable purchase-time variant SKU
 * is used first; selected variant name is a fallback for legacy SKU-less
 * orders. Products are plain objects.
 */
export const withRecentSales = (products, sales) => products.map((p) => {
  const s = sales.get(p.productId);
  return {
    ...p,
    soldRecent: s?.recent || 0,
    soldLast7Days: s?.last7Days || 0,
    soldTotal: s?.all || 0,
    variantDetails: (p.variantDetails || []).map((v) => {
      const sv = s?.byVariantSku.get(v.sku) || s?.byVariantName.get(v.variantName);
      return { ...v, soldRecent: sv?.recent || 0, soldLast7Days: sv?.last7Days || 0, soldTotal: sv?.all || 0 };
    }),
  };
});
