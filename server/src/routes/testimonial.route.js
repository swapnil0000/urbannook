import { Router } from "express";
import multer from "multer";
import {
  getTestimonials,
  submitTestimonial,
  submitProductReview,
  updateProductReview,
  getProductReviews,
  getPendingReviews,
  handleReviewApproval,
} from "../controller/testimonial.controller.js";
import { testimonialRateLimiter } from "../middleware/rateLimiter.middleware.js";
import { sanitizeTestimonialInput } from "../middleware/sanitization.middleware.js";
import { authGuardService, optionalAuthGuard } from "../services/common.auth.service.js";

// Memory storage - buffer passed directly to S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
});

const testimonialRouter = Router();

// Global testimonials (homepage)
testimonialRouter.get("/testimonials", getTestimonials);
testimonialRouter.post("/testimonials", testimonialRateLimiter, sanitizeTestimonialInput, submitTestimonial);

// Product-specific reviews
testimonialRouter.post("/specific/review", authGuardService("USER"), upload.array("images", 3), submitProductReview);
testimonialRouter.patch("/specific/review/:reviewId", authGuardService("USER"), upload.array("images", 3), updateProductReview);
testimonialRouter.get("/specific/review", optionalAuthGuard("USER"), getProductReviews);

// Admin routes
testimonialRouter.get("/admin/reviews/pending", authGuardService("Admin"), getPendingReviews);
testimonialRouter.patch("/admin/reviews/:reviewId", authGuardService("Admin"), handleReviewApproval);

export default testimonialRouter;
