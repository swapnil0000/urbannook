import { Router } from "express";
import {
  getTestimonials,
  submitTestimonial,
} from "../controller/testimonial.controller.js";
import { testimonialRateLimiter } from "../middleware/rateLimiter.middleware.js";
import { sanitizeTestimonialInput } from "../middleware/sanitization.middleware.js";

const testimonialRouter = Router();

/**
 * GET /testimonials
 * Public route - no authentication required
 * Returns all approved testimonials sorted by creation date (newest first)
 */
testimonialRouter.get("/", getTestimonials);

/**
 * POST /testimonials
 * Public route - no authentication required
 * Rate limited to 3 submissions per IP per 60 minutes
 * Input sanitization applied to prevent XSS attacks
 */
testimonialRouter.post(
  "/",
  testimonialRateLimiter,
  sanitizeTestimonialInput,
  submitTestimonial
);

export default testimonialRouter;
