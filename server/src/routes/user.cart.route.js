import { Router } from "express";
import {
  userAddToCart,
  userGetAddToCart,
  userUpdateCartQuantity,
  userRemoveFromCart,
  userClearCart,
} from "../controller/user.cart.controller.js";
import { authGuardService } from "../services/common.auth.service.js";
const userCartRouter = Router();
userCartRouter.post("/user/addtocart", authGuardService("USER"), userAddToCart);
userCartRouter.get(
  "/user/preview-addtocart",
  authGuardService("USER"),
  userGetAddToCart,
);
userCartRouter.put(
  "/user/cart/update",
  authGuardService("USER"),
  userUpdateCartQuantity,
);

userCartRouter.delete(
  "/user/cart/:productId",
  authGuardService("USER"),
  userRemoveFromCart,
);

userCartRouter.delete(
  "/user/clear-cart",
  authGuardService("USER"),
  userClearCart,
);
export default userCartRouter;
