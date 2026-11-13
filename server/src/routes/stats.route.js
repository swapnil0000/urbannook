import { Router } from "express";
import { getSiteStats, getGoogleReviews, getGoogleBusinessReviews, fetchGoogleReviewPhoto, getPhotoReviews } from "../utils/siteStats.util.js";

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
