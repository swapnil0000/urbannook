import { Router } from "express";
import {
  userAddToWishList,
  userGetProductWishList,
  userDeleteFromProductWishList,
} from "../controller/user.wishlist.controller.js";
import { authGuardService } from "../services/common.auth.service.js";
const userWishListRouter = Router();
userWishListRouter.post(
  "/user/wishlist/add",
  authGuardService("USER"),
  userAddToWishList,
);
userWishListRouter.get(
  "/user/wishlist/get",
  authGuardService("USER"),
  userGetProductWishList,
);
userWishListRouter.delete(
  "/user/wishlist/:productId",
  authGuardService("USER"),
  userDeleteFromProductWishList,
);

export default userWishListRouter;
