import { Router } from "express";
import { getFreeShippingConfigController } from "../controller/freeShippingOffer.controller.js";

const freeShippingOfferRouter = Router();
freeShippingOfferRouter.get("/free-shipping-offer", getFreeShippingConfigController);

export default freeShippingOfferRouter;
