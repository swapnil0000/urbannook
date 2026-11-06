import { Router } from "express";
import { getSiteStats, getGoogleReviews } from "../utils/siteStats.util.js";

const statsRouter = Router();

// Public endpoint - no auth required
statsRouter.get("/stats/public", async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await getSiteStats() });
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

export default statsRouter;
