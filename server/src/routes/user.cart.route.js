import { Router } from "express";
import { userAddToCart } from "../controller/user.cart.controller.js";
const userWishListRouter = Router();
userWishListRouter.post(
  "/user/addtocart",
  authGuardService("USER"),
  userAddToCart,
);
export default userWishListRouter;
