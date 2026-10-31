import { Router } from "express";
import { getActiveHeroBannerController } from "../controller/heroBanner.controller.js";

// Public, unauthenticated, read-only. Writes happen only from the admin repo
// (/admin/hero-banner), same collection.
const heroBannerRouter = Router();
heroBannerRouter.get("/hero-banner/active", getActiveHeroBannerController);

export default heroBannerRouter;
