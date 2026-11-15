import { Router } from "express";
import { getSiteStats, getGoogleReviews, getGoogleBusinessReviews, fetchGoogleReviewPhoto, getPhotoReviews } from "../utils/siteStats.util.js";
import { apiCache } from "../module/cache.manager.module.js";
import mongoose from "mongoose";
import Order from "../model/order.model.js";
import Coupon from "../model/coupon.model.js";
import User from "../model/user.model.js";
import Testimonial from "../model/testimonial.model.js";
import ProductReview from "../model/product.specific.testimonial.model.js";
import { excludeTestOrdersMatch, testUsersMatch } from "../utils/testIdentities.js";

const statsRouter = Router();

// Real paid orders that weren't cancelled/refunded: website + Instagram (the admin panel's collection, read here without a model,
// count only), team test orders left out (utils/testIdentities.js, same rule as the admin's "Exclude testing"). Also the review count
// + average (approved product reviews and testimonials) and sign-ups minus testers. Cached 10 min like the other public stats.
const LIVE = { status: "PAID", resolutionStatus: { $nin: ["CANCELLED", "REFUNDED"] } };
const getLiveStats = () => apiCache.handle("site_live_stats", async () => {
    const internal = await Coupon.find({ isInternal: true }, { couponId: 1 }).lean();
    const real = { ...LIVE, ...excludeTestOrdersMatch(internal.map((c) => c.couponId)) };
    const ratings = { $group: { _id: null, n: { $sum: 1 }, sum: { $sum: "$rating" } } };
    const [web, instagram, users, testUsers, [pr], [tm]] = await Promise.all([
      Order.countDocuments(real),
      mongoose.connection.db.collection("instagramorders").countDocuments(real),
      User.estimatedDocumentCount(),
      User.countDocuments(testUsersMatch()),
      ProductReview.aggregate([{ $match: { isApproved: true } }, ratings]),
      Testimonial.aggregate([{ $match: { isApproved: true } }, ratings]),
    ]);
    const totalReviews = (pr?.n || 0) + (tm?.n || 0);
    const ratingSum = (pr?.sum || 0) + (tm?.sum || 0);
    return {
      totalOrders: web + instagram,
      totalReviews,
      avgRating: totalReviews ? Math.round((ratingSum / totalReviews) * 100) / 100 : null,
      members: Math.max(0, users - testUsers),
    };
});

// Public endpoint - no auth required
statsRouter.get("/stats/public", async (req, res) => {
  try {
    // Our site stats (orders delivered, rating over approved reviews, Google review count) plus the live figures the
    // homepage tiles, About page and login card read (real orders without team test orders, review count and average, members).
    const [site, live] = await Promise.all([getSiteStats(), getLiveStats()]);
    return res.status(200).json({ success: true, data: { ...site, ...live } });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
    });
  }
});

// The Google reviews behind the "Verified Google reviews" figure on the homepage (opens in a modal, nothing leaves the site)
statsRouter.get("/stats/google-reviews", async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await getGoogleReviews() });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch Google reviews" });
  }
});

// The real Google Business Profile reviews for the homepage "Loved by our customers" (read from the admin's synced inbox, cached 10 min)
statsRouter.get("/stats/google-business-reviews", async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await getGoogleBusinessReviews() });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch Google reviews" });
  }
});

// One photo from a Google review (?size=thumb for the card, default full for the viewer); browsers and the CDN cache it for a day
statsRouter.get("/stats/google-review-photo/:id/:n", async (req, res) => {
  try {
    const photo = await fetchGoogleReviewPhoto(req.params.id, req.params.n, req.query.size === "thumb" ? "thumb" : "full");
    if (!photo) return res.status(404).json({ success: false, message: "Photo not found" });
    res.set("Content-Type", photo.type);
    res.set("Cache-Control", "public, max-age=86400");
    return res.status(200).send(photo.data);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch photo" });
  }
});

// The photo-review wall on the homepage ("Straight from your desks"): every approved review that has a photo
statsRouter.get("/stats/photo-reviews", async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await getPhotoReviews() });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch photo reviews" });
  }
});

export default statsRouter;
