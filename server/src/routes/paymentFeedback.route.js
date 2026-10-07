import { Router } from "express";
import rateLimit from "express-rate-limit";
import { submitPaymentFeedbackController } from "../controller/paymentFeedback.controller.js";
import { paymentFeedbackSchema } from "../validation/paymentFeedback.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";

const paymentFeedbackRouter = Router();

// Generous for the same carrier-NAT reason as /offer/claim — this only has to
// stop scripted stuffing.
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
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

paymentFeedbackRouter.post(
  "/payment-feedback",
  feedbackLimiter,
  validateRequest(paymentFeedbackSchema),
  submitPaymentFeedbackController,
);

// The admin "Failed orders" tab reads this collection from the admin server
// (urbannook-admin), which shares the DB — no admin route here.

export default paymentFeedbackRouter;
