// Public homepage / About numbers, read live from the database (never hand-typed): how many orders were delivered
// and the average of the approved product reviews (website + Google + WhatsApp ones added in Admin all count).
// Cached 10 min with the rest of the public API (System Guide §7).
import Order from "../model/order.model.js";
import ProductReview from "../model/product.specific.testimonial.model.js";
import { apiCache } from "../module/cache.manager.module.js";

// Status names are UPPERCASE in the Order model; the old lowercase list matched nothing and the endpoint always said 0.
const IN_PIPELINE = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

export const computeSiteStats = async () => {
  const [totalOrders, ordersDelivered, rating] = await Promise.all([
    Order.countDocuments({ status: { $in: IN_PIPELINE } }),
    Order.countDocuments({ status: "DELIVERED" }),
    ProductReview.aggregate([{ $match: { isApproved: true } }, { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } }]),
  ]);
  return {
    totalOrders,
    ordersDelivered,
    ratingAvg: rating[0] ? Math.round(rating[0].avg * 10) / 10 : 0,
    ratingCount: rating[0]?.n || 0,
  };
};

export const getSiteStats = () => apiCache.handle("site_stats", computeSiteStats);
