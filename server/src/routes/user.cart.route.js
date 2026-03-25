import { Router } from "express";
import {
  userAddToCart,
  userGetCart,
  userUpdateCartQuantity,
  userClearCart,
  getOrderStatus,
  userMergeGuestCart,
} from "../controller/user.cart.controller.js";
import { authGuardService } from "../services/common.auth.service.js";
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

// NEW: Merge guest cart items
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

userCartRouter.get(
  "/user/order/status/:orderId",
  getOrderStatus,
);

export default userCartRouter;
