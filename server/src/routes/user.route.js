import { Router } from "express";
import bodyParser from "body-parser";

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
  userUpdateProfile,
  userResetPassword,
  userAccountDeletePreview,
  userAccountDeleteConfirm,
  userOrderPreviousHistory,
  userAddToCart,
  userGetAddToCart,
  userAddToWishList,
  userGetProductWishList,
  userDeleteFromProductWishList,
  userUpdateCartQuantity,
  userRemoveFromCart,
  userClearCart,
} from "../controller/user.controller.js";

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
  regenerateTokenService,
} from "../services/common.auth.service.js";

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

/* ===============================================================
   AUTH ROUTES (PUBLIC)
   ---------------------------------------------------------------
   These routes do NOT require authentication
================================================================ */
userRouter.post("/user/login", userLogin);
userRouter.post("/user/register", userRegister);

/* ===============================================================
   PROFILE & ACCOUNT (PROTECTED)
   ---------------------------------------------------------------
   Requires valid JWT (User role)
================================================================ */
userRouter.post("/user/profile", authGuardService("User"), userProfile);

userRouter.put(
  "/user/profile/update",
  authGuardService("User"),
  userUpdateProfile
);

userRouter.post(
  "/user/reset-password",
  authGuardService("User"),
  userResetPassword
);

/* ===============================================================
   ORDER HISTORY (PROTECTED)
================================================================ */
userRouter.post(
  "/user/order-history",
  authGuardService("User"),
  userOrderPreviousHistory
);

/* ===============================================================
   CART MANAGEMENT (PROTECTED)
   ---------------------------------------------------------------
   Handles cart CRUD operations
================================================================ */
userRouter.post("/user/addtocart", authGuardService("User"), userAddToCart);

userRouter.get(
  "/user/preview-addtocart",
  authGuardService("User"),
  userGetAddToCart
);

userRouter.put(
  "/user/cart/update",
  authGuardService("User"),
  userUpdateCartQuantity
);

userRouter.delete(
  "/user/cart/:productId",
  authGuardService("User"),
  userRemoveFromCart
);

userRouter.delete("/user/cart/clear", authGuardService("User"), userClearCart);

/* ===============================================================
   WISHLIST MANAGEMENT (PROTECTED)
================================================================ */
userRouter.post(
  "/user/addtowishlist",
  authGuardService("User"),
  userAddToWishList
);

userRouter.get(
  "/user/wishlist",
  authGuardService("User"),
  userGetProductWishList
);

userRouter.delete(
  "/user/wishlist/:productId",
  authGuardService("User"),
  userDeleteFromProductWishList
);

/* ===============================================================
   ACCOUNT DELETION (2-STEP FLOW)
   ---------------------------------------------------------------
   1️⃣ Preview deletion (confirmation step)
   2️⃣ Final delete
================================================================ */
userRouter.post(
  "/user/delete-preview",
  authGuardService("User"),
  userAccountDeletePreview
);

userRouter.delete(
  "/user/delete-confirm",
  authGuardService("User"),
  userAccountDeleteConfirm
);

/* ===============================================================
   SESSION & TOKEN MANAGEMENT
================================================================ */
userRouter.post("/user/logout", authGuardService("User"), logoutService);

userRouter.post(
  "/refresh-token",
  authGuardService("User"),
  regenerateTokenService
);

/* ===============================================================
   RAZORPAY CHECKOUT FLOW (PROTECTED)
   ---------------------------------------------------------------
   - get-key          → Exposes public Razorpay key
   - create-order     → Creates Razorpay order + DB order
   - paymentverification → Client-side signature verification
================================================================ */
userRouter.get(
  "/rp/get-key",
  authGuardService("User"),
  razorpayKeyGetController
);

userRouter.post(
  "/user/create-order",
  authGuardService("User"),
  razorpayCreateOrderController
);

userRouter.post(
  "/user/paymentverification",
  authGuardService("User"),
  razorpayPaymentVerificationController
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
  razorpayWebHookController
);

export default userRouter;
