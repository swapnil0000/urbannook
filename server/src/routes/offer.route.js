import { Router } from "express";
import { getOfferByTypeController } from "../controller/offer.controller.js";

const offerRouter = Router();
offerRouter.get("/offers/:type", getOfferByTypeController);

export default offerRouter;
