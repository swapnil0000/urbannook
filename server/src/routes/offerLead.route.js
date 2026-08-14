import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  claimOfferController,
  getCampaignController,
} from "../controller/offerLead.controller.js";
import { offerClaimSchema } from "../validation/offerLead.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";

const offerLeadRouter = Router();

/**
 * Generous on purpose: a large share of this traffic is Indian mobile carriers
 * behind carrier-grade NAT, where hundreds of genuine visitors share one IP.
 * This is here to stop scripted stuffing, not to police real users.
 */
const offerClaimLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 40,
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

// Public read of the live offer terms — what the storefront renders instead of
// hardcoding the code and amount.
offerLeadRouter.get("/offer/campaign", getCampaignController);

offerLeadRouter.post(
  "/offer/claim",
  offerClaimLimiter,
  validateRequest(offerClaimSchema),
  claimOfferController,
);

export default offerLeadRouter;
