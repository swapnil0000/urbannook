// Public homepage / About numbers, read live from the database (never hand-typed): how many orders were delivered
// and the average of the approved product reviews (website + Google + WhatsApp ones added in Admin all count).
// Cached 10 min with the rest of the public API (System Guide §7).
import Order from "../model/order.model.js";
import ProductReview from "../model/product.specific.testimonial.model.js";
import Product from "../model/product.model.js";
import { apiCache } from "../module/cache.manager.module.js";

// Status names are UPPERCASE in the Order model; the old lowercase list matched nothing and the endpoint always said 0.
const IN_PIPELINE = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

// A Google review = added from Admin → Product Reviews → Import Google (source "google"), or by the add-google-reviews
// script (userId "google:<id>"). Only approved ones are ever public.
const GOOGLE_REVIEW = { isApproved: true, $or: [{ source: "google" }, { userId: /^google:/ }] };
const GOOGLE_LIST_MAX = 100;

export const computeSiteStats = async () => {
  const [totalOrders, ordersDelivered, rating, googleReviewCount] = await Promise.all([
    Order.countDocuments({ status: { $in: IN_PIPELINE } }),
    Order.countDocuments({ status: "DELIVERED" }),
    ProductReview.aggregate([{ $match: { isApproved: true } }, { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } }]),
    ProductReview.countDocuments(GOOGLE_REVIEW),
  ]);
  return {
    totalOrders,
    ordersDelivered,
    ratingAvg: rating[0] ? Math.round(rating[0].avg * 10) / 10 : 0,
    ratingCount: rating[0]?.n || 0,
    googleReviewCount,
  };
};

/** The Google reviews shown in the homepage modal: newest first, public fields only (never the userId), with the product's name. */
export const computeGoogleReviews = async () => {
  const rows = await ProductReview.find(GOOGLE_REVIEW).sort({ createdAt: -1 }).limit(GOOGLE_LIST_MAX)
    .select("productId userName rating desc imageUrl imageUrls createdAt").lean();
  const names = new Map((await Product.find({ productId: { $in: [...new Set(rows.map((r) => r.productId))] } }).select("productId productName").lean()).map((p) => [p.productId, p.productName]));
  const reviews = rows.map((r) => ({
    id: String(r._id),
    userName: r.userName,
    rating: r.rating,
    desc: r.desc,
    images: r.imageUrls?.length ? r.imageUrls : r.imageUrl ? [r.imageUrl] : [],
    productName: names.get(r.productId) || "",
    createdAt: r.createdAt,
  }));
  const average = reviews.length ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10 : 0;
  return { count: reviews.length, average, reviews };
};

export const getSiteStats = () => apiCache.handle("site_stats", computeSiteStats);
export const getGoogleReviews = () => apiCache.handle("google_reviews", computeGoogleReviews);
