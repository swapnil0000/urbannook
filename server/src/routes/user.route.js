import { Router } from "express";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";

/* ===============================================================
   CONTROLLERS
   ---------------------------------------------------------------
   Contains all user-related business logic:
   - Auth
   - Profile
   - Cart
   - Wishlist
   - Orders
================================================================ */
import {
  userLogin,
  userRegister,
  userProfile,
  userAccountDeletePreview,
  userAccountDeleteConfirm,
  userResetPassword,
  userUpdateProfile,
  userForgetpassword,
  userForgotPasswordRequest,
  userForgotPasswordReset,
} from "../controller/user.controller.js";

import { userOrderPreviousHistory } from "../controller/user.cart.controller.js";

import {
  userAddToWishList,
  userGetProductWishList,
  userDeleteFromProductWishList,
} from "../controller/user.wishlist.controller.js";
/* ===============================================================
   AUTH SERVICES
   ---------------------------------------------------------------
   authGuardService     → Protects routes using JWT + role
   logoutService → Clears refresh token / session
   regenerateTokenService → Issues new access token
================================================================ */
import {
  authGuardService,
  logoutService,
} from "../services/common.auth.service.js";

/* ===============================================================
   VALIDATION MIDDLEWARE
   ---------------------------------------------------------------
   Input validation using Joi schemas
================================================================ */
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResetSchema,
  resetPasswordSchema,
} from "../validation/user.validation.js";

/* ===============================================================
   RAZORPAY PAYMENT CONTROLLERS
   ---------------------------------------------------------------
   - Order creation
   - Payment verification
   - Webhook handling (server-to-server)
================================================================ */
import {
  razorpayCreateOrderController,
  razorpayPaymentVerificationController,
  razorpayKeyGetController,
  razorpayWebHookController,
} from "../controller/rp.payment.controller.js";

const userRouter = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, please try again later",
});
/* ===============================================================
   AUTH ROUTES (PUBLIC)
   ---------------------------------------------------------------
   These routes do NOT require authentication
================================================================ */
userRouter.post("/user/login", authLimiter, validateRequest(loginSchema), userLogin);
userRouter.post("/user/register", authLimiter, validateRequest(registerSchema), userRegister);
userRouter.post("/user/forgot-password", userForgetpassword);

/* ===============================================================
   FORGOT PASSWORD WITH OTP (PUBLIC)
   ---------------------------------------------------------------
   Two-step password reset flow with OTP verification
================================================================ */
userRouter.post("/user/forgot-password/request", authLimiter, validateRequest(forgotPasswordRequestSchema), userForgotPasswordRequest);
userRouter.post("/user/forgot-password/reset", authLimiter, validateRequest(forgotPasswordResetSchema), userForgotPasswordReset);

/* ===============================================================
   PROFILE & ACCOUNT (PROTECTED)
   ---------------------------------------------------------------
   Requires valid JWT (User role)
================================================================ */
userRouter.get("/user/profile", authGuardService("USER"), userProfile);

userRouter.patch(
  "/user/profile/update",
  authGuardService("USER"),
  validateRequest(updateProfileSchema),
  userUpdateProfile,
);

userRouter.post(
  "/user/reset-password",
  authGuardService("USER"),
  validateRequest(resetPasswordSchema),
  userResetPassword,
);

/* ===============================================================
   ORDER HISTORY (PROTECTED)
================================================================ */
userRouter.get(
  "/user/order/history",
  authGuardService("USER"),
  userOrderPreviousHistory,
);

/* ===============================================================
   CART MANAGEMENT (PROTECTED)
   ---------------------------------------------------------------
   Handles cart CRUD operations
================================================================ */

/* ===============================================================
   WISHLIST MANAGEMENT (PROTECTED)
================================================================ */
userRouter.post(
  "/user/addtowishlist",
  authGuardService("USER"),
  userAddToWishList,
);

userRouter.get(
  "/user/wishlist",
  authGuardService("USER"),
  userGetProductWishList,
);

userRouter.delete(
  "/user/wishlist/:productId",
  authGuardService("USER"),
  userDeleteFromProductWishList,
);

/* ===============================================================
   ACCOUNT DELETION (2-STEP FLOW)
   ---------------------------------------------------------------
   1️⃣ Preview deletion (confirmation step)
   2️⃣ Final delete
================================================================ */
userRouter.post(
  "/user/delete-preview",
  authGuardService("USER"),
  userAccountDeletePreview,
);

userRouter.delete(
  "/user/delete-confirm",
  authGuardService("USER"),
  userAccountDeleteConfirm,
);

/* ===============================================================
   SESSION & TOKEN MANAGEMENT
================================================================ */
userRouter.post("/user/logout", authGuardService("USER"), logoutService);
/* ===============================================================
   RAZORPAY CHECKOUT FLOW (PROTECTED)
   ---------------------------------------------------------------
   - get-key          → Exposes public Razorpay key
   - create-order     → Creates Razorpay order + DB order
   - paymentverification → Client-side signature verification
================================================================ */
userRouter.get(
  "/rp/get-key",
  authGuardService("USER"),
  razorpayKeyGetController,
);

userRouter.post(
  "/user/create-order",
  authGuardService("USER"),
  razorpayCreateOrderController,
);

userRouter.post(
  "/user/payment/verification",
  authGuardService("USER"),
  razorpayPaymentVerificationController,
);

/* ===============================================================
   RAZORPAY WEBHOOK (PUBLIC – SERVER TO SERVER)
   ---------------------------------------------------------------
   ⚠️ IMPORTANT:
   - Uses RAW body (NOT express.json)
   - Required for Razorpay signature verification
   - No authGuardService (Razorpay servers call this)
================================================================ */
userRouter.post(
  "/rp/webhook",
  bodyParser.raw({ type: "application/json" }),
  razorpayWebHookController,
);

export default userRouter;
