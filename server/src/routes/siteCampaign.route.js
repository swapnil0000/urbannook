import { Router } from "express";
import { getActiveSiteCampaignController, getSiteCampaignPreviewController } from "../controller/siteCampaign.controller.js";

// Public, unauthenticated, read-only. Writes happen only from the admin repo
// (/admin/site-campaigns), same collection.
const siteCampaignRouter = Router();
siteCampaignRouter.get("/site-campaign/active", getActiveSiteCampaignController);
siteCampaignRouter.get("/site-campaign/preview/:id", getSiteCampaignPreviewController);

export default siteCampaignRouter;
