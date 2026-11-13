// Public homepage / About numbers, read live from the database (never hand-typed): how many orders were delivered
// and the average of the approved product reviews (website + Google + WhatsApp ones added in Admin all count).
// Cached 10 min with the rest of the public API (System Guide §7).
import Order from "../model/order.model.js";
import ProductReview from "../model/product.specific.testimonial.model.js";
import Product from "../model/product.model.js";
import axios from "axios";
import GoogleReviewInbox from "../model/googleReviewInbox.model.js";
import { apiCache } from "../module/cache.manager.module.js";

// Status names are UPPERCASE in the Order model; the old lowercase list matched nothing and the endpoint always said 0.
const IN_PIPELINE = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

// A Google review = added from Admin → Product Reviews → Import Google (source "google"), or by the add-google-reviews
// script (userId "google:<id>"). Only approved ones are ever public.
const GOOGLE_REVIEW = { isApproved: true, $or: [{ source: "google" }, { userId: /^google:/ }] };
const GOOGLE_LIST_MAX = 100;
// Every approved review that carries at least one photo (website customers + Google imports) for the homepage wall.
const PHOTO_REVIEW = { isApproved: true, $or: [{ imageUrls: { $exists: true, $ne: [] } }, { imageUrl: { $nin: [null, ""] } }] };
const PHOTO_LIST_MAX = 200;

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

/** The homepage "Straight from your desks" wall: approved reviews that have photos, newest first, public fields only
 *  (never the userId), each with its product's name so a card can lead to the product. */
export const computePhotoReviews = async () => {
  const rows = await ProductReview.find(PHOTO_REVIEW).sort({ createdAt: -1 }).limit(PHOTO_LIST_MAX)
    .select("productId userName rating desc imageUrl imageUrls createdAt").lean();
  const names = new Map((await Product.find({ productId: { $in: [...new Set(rows.map((r) => r.productId))] } }).select("productId productName").lean()).map((p) => [p.productId, p.productName]));
  const reviews = rows
    .map((r) => ({
      id: String(r._id),
      userName: r.userName,
      rating: r.rating,
      desc: r.desc,
      images: (r.imageUrls?.length ? r.imageUrls : r.imageUrl ? [r.imageUrl] : []).filter(Boolean),
      productId: r.productId,
      productName: names.get(r.productId) || "",
      createdAt: r.createdAt,
    }))
    .filter((r) => r.images.length);
  return { count: reviews.length, reviews };
};

export const getSiteStats = () => apiCache.handle("site_stats", computeSiteStats);
export const getPhotoReviews = () => apiCache.handle("photo_reviews", computePhotoReviews);
export const getGoogleReviews = () => apiCache.handle("google_reviews", computeGoogleReviews);

// ── Google Business Profile reviews (homepage "Loved by our customers") ────────────────────────────────────────────
// Source: the admin's synced inbox (every review of the real Google Business Profile, read-only). The headline rating and
// count use EVERY rated review in the inbox (ignored ones too: they are still real reviews on the profile); the cards
// show every review the team has not Ignored (star-only ones too), newest first, exactly as written. No filtering by stars.
const GBP_LIST_MAX = 300;
const ANON_NAME = "A Google user";
// Google serves review photos from these hosts only (also the allow-list of the photo proxy below).
const GOOGLE_IMAGE_HOST = /^https:\/\/[a-z0-9-]+\.(googleusercontent\.com|ggpht\.com)\//i;
const PHOTO_SIZES = { thumb: "=s640", full: "=s1600" };

/** Indexes (into the stored media list) of a review's photos; videos are skipped. */
const photoIndexes = (media = []) => media.map((m, i) => (m && !m.isVideo && GOOGLE_IMAGE_HOST.test(m.url || m.thumbnailUrl || "") ? i : -1)).filter((i) => i >= 0);

/** Photos the team attached by hand: https links on our own CDN (google-reviews/ folder) only. */
const ownPhotoUrls = (list = []) => (Array.isArray(list) ? list : []).filter((u) => typeof u === "string" && /^https:\/\/[^\s]+\/google-reviews\/[^\s/]+$/i.test(u));

/** One inbox row → the public card shape (no ids beyond Google's review id, no admin fields, no raw photo links). */
export const toPublicGoogleReview = (r) => ({
  id: String(r.googleReviewId),
  userName: r.isAnonymous || !String(r.reviewerName || "").trim() ? ANON_NAME : String(r.reviewerName).trim(),
  avatar: r.isAnonymous ? "" : r.reviewerPhotoUrl || "",
  rating: r.rating,
  text: String(r.text || "").trim(),
  reply: String(r.reply || "").trim(),
  createdAt: r.createTime || null,
  ownPhotos: ownPhotoUrls(r.ownPhotos), // our own CDN, shown first
  photos: photoIndexes(r.media), // the storefront loads photo n through GET /stats/google-review-photo/:id/:n
});

/** Average (1 decimal) and count over the rated reviews. */
export const summarizeRatings = (ratings) => {
  const rated = ratings.filter((n) => n > 0);
  return { count: rated.length, average: rated.length ? Math.round((rated.reduce((a, n) => a + n, 0) / rated.length) * 10) / 10 : 0 };
};

export const computeGoogleBusinessReviews = async () => {
  const [ratings, rows] = await Promise.all([
    GoogleReviewInbox.find({ rating: { $gt: 0 } }).select("rating").lean(),
    GoogleReviewInbox.find({ status: { $ne: "ignored" }, rating: { $gt: 0 } })
      .sort({ createTime: -1 }).limit(GBP_LIST_MAX)
      .select("googleReviewId reviewerName reviewerPhotoUrl isAnonymous rating text reply createTime media ownPhotos").lean(),
  ]);
  return {
    ...summarizeRatings(ratings.map((r) => r.rating)),
    reviews: rows.map(toPublicGoogleReview),
    // Links come from the server env (Infisical); a missing one simply hides its button.
    profileUrl: process.env.GOOGLE_BUSINESS_PROFILE_URL || "",
    writeReviewUrl: process.env.GOOGLE_WRITE_REVIEW_URL || "",
  };
};

export const getGoogleBusinessReviews = () => apiCache.handle("google_business_reviews", computeGoogleBusinessReviews);

/** One photo of a (not ignored) Google review, fetched from Google (their photo links block hot-linking from other sites).
 *  The photo is looked up by review id + index, never by a caller-supplied URL. Returns { type, data } or null. */
export const fetchGoogleReviewPhoto = async (id, n, size = "full") => {
  const doc = await GoogleReviewInbox.findOne({ googleReviewId: String(id), status: { $ne: "ignored" } }).select("media").lean();
  const item = doc?.media?.[Number(n)];
  const base = item && !item.isVideo ? item.url || item.thumbnailUrl : "";
  if (!base || !GOOGLE_IMAGE_HOST.test(base)) return null;
  const suffix = PHOTO_SIZES[size] || PHOTO_SIZES.full;
  const candidates = /=[swh][\w-]*$/.test(base) ? [base.replace(/=[swh][\w-]*$/, suffix), base] : [base];
  for (const url of candidates) {
    try {
      const img = await axios.get(url, { responseType: "arraybuffer", timeout: 15_000, maxContentLength: 15 * 1024 * 1024, maxRedirects: 2 });
      const type = String(img.headers["content-type"] || "");
      if (type.startsWith("image/")) return { type, data: Buffer.from(img.data) };
    } catch { /* try the next size */ }
  }
  return null;
};
