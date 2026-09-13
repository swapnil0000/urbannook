import { Router } from "express";
import rateLimit from "express-rate-limit";
import { syncGuestCartController } from "../controller/guestCart.controller.js";
import { guestCartSyncSchema } from "../validation/guestCart.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";

const guestCartRouter = Router();

// Generous on purpose, matching offerLead.route.js's reasoning: this fires
// debounced while a guest types on the Contact step, and Indian mobile
// carrier NAT means many genuine visitors can share one IP.
const guestCartSyncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      statusCode: 429,
      message: "Too many attempts. Please try again in a little while.",
      data: null,
      success: false,
    });
  },
});

guestCartRouter.post(
  "/guest-cart/sync",
  guestCartSyncLimiter,
  validateRequest(guestCartSyncSchema),
  syncGuestCartController,
);

export default guestCartRouter;
