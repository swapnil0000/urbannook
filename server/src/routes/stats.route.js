import { Router } from "express";
import { getSiteStats } from "../utils/siteStats.util.js";

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

export default statsRouter;
