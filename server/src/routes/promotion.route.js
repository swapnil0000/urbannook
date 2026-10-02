import { Router } from "express";
import {
  getActivePromotionsController,
  getPromotionsForProductController,
  evaluatePromotionsController,
  getProductDisplayController,
  getCartDisplayController,
  getCheckoutDisplayController,
} from "../controller/promotion.controller.js";

// Public, unauthenticated — mirrors freeShippingOfferRouter/cartRuleRouter
// exactly. Pure read/evaluate endpoints for the Promotion Engine V2
// `promotions` collection; no storefront UI calls these yet (this route's
// only job right now is to make the data reachable — see the plan this was
// built from). Nothing here touches the legacy `offers` collection's own
// routes (freeShippingOffer.route.js, cartRule.route.js), which stay exactly
// as they are.
const promotionRouter = Router();
promotionRouter.get("/promotions/active", getActivePromotionsController);
promotionRouter.get("/promotions/for-product/:productId", getPromotionsForProductController);
promotionRouter.post("/promotions/evaluate", evaluatePromotionsController);

// Display API (Phase 3) — fully display-ready, frontend renders only.
promotionRouter.get("/promotions/display/product/:productId", getProductDisplayController);
promotionRouter.post("/promotions/display/cart", getCartDisplayController);
promotionRouter.post("/promotions/display/checkout", getCheckoutDisplayController);

export default promotionRouter;
