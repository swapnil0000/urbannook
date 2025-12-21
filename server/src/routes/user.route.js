import { Router } from "express";

/* ===================== USER CONTROLLERS ===================== */
import {
  userLogin,
  userRegister,
  userProfile,
  userUpdateProfile,
  userResetPassword,
  userAccountDeletePreview,
  userAccountDeleteConfirm,
  userOrderPreviousHistory,
  userAddToCart,
} from "../controller/user.controller.js";

/* ===================== AUTH & COMMON SERVICES ===================== */
import {
  authGuard,
  logoutService,
  regenerateToken,
} from "../services/common.auth.service.js";

const userRouter = Router();

/* ===============================================================
   AUTHENTICATION (Public Routes)
   - No token required
================================================================ */
userRouter.route("/user/login").post(userLogin); // User login
userRouter.route("/user/register").post(userRegister); // User registration

/* ===============================================================
   PROFILE & ACCOUNT (Protected Routes)
   - Requires valid user token
================================================================ */
userRouter.route("/user/profile").post(authGuard("User"), userProfile); // Fetch user profile

userRouter
  .route("/user/profile/update")
  .put(authGuard("User"), userUpdateProfile); // Update profile details

userRouter
  .route("/user-reset-password")
  .post(authGuard("User"), userResetPassword); // Reset password

/* ===============================================================
   ORDER & CART MANAGEMENT (Protected Routes)
================================================================ */
userRouter
  .route("/user/order-history")
  .post(authGuard("User"), userOrderPreviousHistory); // Previous orders

userRouter.route("/user/addtocart").post(authGuard("User"), userAddToCart); // Add items to cart

/* ===============================================================
   ACCOUNT DELETION FLOW (Protected Routes)
   - Two-step delete: preview → confirm
================================================================ */
userRouter
  .route("/user/delete-preview")
  .post(authGuard("User"), userAccountDeletePreview); // Delete confirmation token

userRouter
  .route("/user/delete-confirm")
  .delete(authGuard("User"), userAccountDeleteConfirm); // Final delete

/* ===============================================================
   SESSION & TOKEN MANAGEMENT (Protected Routes)
================================================================ */
userRouter.route("/user/logout").post(authGuard("User"), logoutService); // Logout user

userRouter.route("/refresh-token").post(authGuard("User"), regenerateToken); // Refresh access token

export default userRouter;
