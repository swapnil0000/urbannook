import { Router } from "express";
import {
  getFreeShippingConfigController,
  getBannerForProductController,
} from "../controller/freeShippingOffer.controller.js";

const freeShippingOfferRouter = Router();
freeShippingOfferRouter.get("/free-shipping-offer", getFreeShippingConfigController);
freeShippingOfferRouter.get("/free-shipping-offer/banner/:productId", getBannerForProductController);

export default freeShippingOfferRouter;
