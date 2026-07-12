import { Router } from "express";
import {
  getFreeShippingConfigController,
  getBannerForProductController,
  getAllActiveBannersController,
} from "../controller/freeShippingOffer.controller.js";

const freeShippingOfferRouter = Router();
freeShippingOfferRouter.get("/free-shipping-offer", getFreeShippingConfigController);
freeShippingOfferRouter.get("/free-shipping-offer/banner/:productId", getBannerForProductController);
freeShippingOfferRouter.get("/free-shipping-offer/banners", getAllActiveBannersController);

export default freeShippingOfferRouter;
