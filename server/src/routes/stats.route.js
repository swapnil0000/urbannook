import { Router } from "express";
import mongoose from "mongoose";
import Order from "../model/order.model.js";
import Coupon from "../model/coupon.model.js";
import User from "../model/user.model.js";
import Testimonial from "../model/testimonial.model.js";
import ProductReview from "../model/product.specific.testimonial.model.js";
import { excludeTestOrdersMatch, testUsersMatch } from "../utils/testIdentities.js";

const statsRouter = Router();

// Real paid orders that weren't cancelled/refunded: website + Instagram (the
// admin panel's collection — read here without a model, count only). Team
// test orders are left out, same rule as the admin's "Exclude testing"
// (utils/testIdentities.js). Order `status` is PAYMENT state
// (PAID/FAILED/CREATED); this used to count lowercase delivery words that no
// order ever has, so it always returned 0 and the About page fell back to a
// made-up number.
// Also the review count + average (approved product reviews and testimonials —
// what the site shows) and sign-ups minus testers, for the homepage tiles and
// the login card, which were typed in by hand ("2,000+ reviews" with ~70).
const LIVE = { status: "PAID", resolutionStatus: { $nin: ["CANCELLED", "REFUNDED"] } };

// Public endpoint - no auth required
statsRouter.get("/stats/public", async (req, res) => {
  try {
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
    return res.status(200).json({
      success: true,
      data: {
        totalOrders: web + instagram,
        totalReviews,
        avgRating: totalReviews ? Math.round((ratingSum / totalReviews) * 100) / 100 : null,
        members: Math.max(0, users - testUsers),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
    });
  }
});

export default statsRouter;
