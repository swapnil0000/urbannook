import { Router } from "express";
import { getActiveBannersController } from "../controller/siteBanner.controller.js";

const siteBannerRouter = Router();
siteBannerRouter.get("/site-banners/active", getActiveBannersController);

export default siteBannerRouter;
