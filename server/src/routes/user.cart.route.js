import { Router } from "express";
import {
  userAddToCart,
  userGetCart,
  userUpdateCartQuantity,
  userClearCart,
  getOrderStatus,
  getOrderView,
  getOrderSummaries,
  getOrderRecommendations,
  userMergeGuestCart,
  userToggleGiftWrap,
} from "../controller/user.cart.controller.js";
import { authGuardService, optionalAuthGuard } from "../services/common.auth.service.js";
import { csrfProtection } from "../middleware/csrf.middleware.js";

const userCartRouter = Router();

userCartRouter.post("/user/cart/add", authGuardService("USER"), csrfProtection, userAddToCart);
userCartRouter.get("/user/cart/get", authGuardService("USER"), userGetCart);
userCartRouter.post(
  "/user/cart/update",
  authGuardService("USER"),
  csrfProtection,
  userUpdateCartQuantity,
);

userCartRouter.post(
  "/user/cart/merge",
  authGuardService("USER"),
  csrfProtection,
  userMergeGuestCart,
);

userCartRouter.delete(
  "/user/cart/clear",
  authGuardService("USER"),
  csrfProtection,
  userClearCart,
);

userCartRouter.post(
  "/user/cart/gift-wrap",
  authGuardService("USER"),
  csrfProtection,
  userToggleGiftWrap,
);

// Customer order experience — owner only (the order is looked up by the signed-in user's id; anything else is a 404).
userCartRouter.get("/user/orders/summaries", authGuardService("USER"), getOrderSummaries);
userCartRouter.get("/user/order/view/:orderId", authGuardService("USER"), getOrderView);
userCartRouter.get("/user/order/recommendations/:orderId", authGuardService("USER"), getOrderRecommendations);

// Public — orderId (razorpay order id) is the implicit secret; no sensitive data exposed
userCartRouter.get("/user/order/status/:orderId", getOrderStatus);

export default userCartRouter;
