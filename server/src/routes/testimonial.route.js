import { Router } from "express";
import {
  getTestimonials,
  submitTestimonial,
} from "../controller/testimonial.controller.js";
import { testimonialRateLimiter } from "../middleware/rateLimiter.middleware.js";
import { sanitizeTestimonialInput } from "../middleware/sanitization.middleware.js";

const testimonialRouter = Router();
testimonialRouter.get("/testimonials", getTestimonials);
testimonialRouter.post(
  "/",
  testimonialRateLimiter,
  sanitizeTestimonialInput,
  submitTestimonial,
);

export default testimonialRouter;
