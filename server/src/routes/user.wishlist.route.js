import { Router } from "express";
import {
  userAddToWishList,
  userGetProductWishList,
  userDeleteFromProductWishList,
} from "../controller/user.wishlist.controller.js";
const userWaitListRouter = Router();
userWaitListRouter.post("/user/wishlist/add", userAddToWishList);
userWaitListRouter.post("/user/wishlist/get", userGetProductWishList);
userWaitListRouter.delete(
  "/user/wishlist/:productId",
  userDeleteFromProductWishList,
);

export default userWaitListRouter;
