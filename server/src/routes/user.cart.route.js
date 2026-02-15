import { Router } from "express";
import {
  userAddToCart,
  userGetCart,
  userUpdateCartQuantity,
  userClearCart,
} from "../controller/user.cart.controller.js";
import { authGuardService } from "../services/common.auth.service.js";
const userCartRouter = Router();
userCartRouter.post("/user/cart/add", authGuardService("USER"), userAddToCart);
userCartRouter.get("/user/cart/get", authGuardService("USER"), userGetCart);
userCartRouter.post(
  "/user/cart/update",
  authGuardService("USER"),
  userUpdateCartQuantity,
);

userCartRouter.delete(
  "/user/cart/clear",
  authGuardService("USER"),
  userClearCart,
);
export default userCartRouter;
