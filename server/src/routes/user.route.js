import { Router } from "express";
import {
  userLogin,
  userRegister,
  userAddToCart,
  userProfile,
  userResetPassword,
  userUpdateProfile,
} from "../controller/user.controller.js";
import {
  authGuard,
  logoutService,
  regenerateToken,
} from "../services/common.auth.service.js";
const userRouter = Router();
userRouter.route("/user-login").post(userLogin);
userRouter.route("/user-register").post(userRegister);
userRouter.route("/user-profile").post(authGuard("User"), userProfile);
userRouter
  .route("/user-profile/update")
  .put(authGuard("User"), userUpdateProfile);
userRouter
  .route("/user-reset-password")
  .post(authGuard("User"), userResetPassword);
userRouter.route("/user-logout").post(authGuard("User"), logoutService);
userRouter.route("/addtocart").post(authGuard("User"), userAddToCart);
userRouter.route("/refresh-token").post(authGuard("User"), regenerateToken);
export default userRouter;
