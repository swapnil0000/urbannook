import { Router } from "express";
import {
  userAddToWishList,
  userGetProductWishList,
  userDeleteFromProductWishList,
} from "../controller/user.wishlist.controller.js";
const userWaitListRouter = Router();
userWaitListRouter.post("/user/add/wishlist", userAddToWishList);
userWaitListRouter.post("/user/get/wishlist", userGetProductWishList);
userWaitListRouter.delete(
  "/user/delete/wishlist",
  userDeleteFromProductWishList,
);

export default userWaitListRouter;
