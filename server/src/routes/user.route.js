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
   authGuard     → Protects routes using JWT + role
   logoutService → Clears refresh token / session
   regenerateToken → Issues new access token
================================================================ */
import {
  authGuard,
  logoutService,
  regenerateToken,
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
userRouter.post("/user/profile", authGuard("User"), userProfile);

userRouter.put("/user/profile/update", authGuard("User"), userUpdateProfile);

userRouter.post("/user/reset-password", authGuard("User"), userResetPassword);

/* ===============================================================
   ORDER HISTORY (PROTECTED)
================================================================ */
userRouter.post(
  "/user/order-history",
  authGuard("User"),
  userOrderPreviousHistory
);

/* ===============================================================
   CART MANAGEMENT (PROTECTED)
   ---------------------------------------------------------------
   Handles cart CRUD operations
================================================================ */
userRouter.post("/user/addtocart", authGuard("User"), userAddToCart);

userRouter.get("/user/preview-addtocart", authGuard("User"), userGetAddToCart);

userRouter.put("/user/cart/update", authGuard("User"), userUpdateCartQuantity);

userRouter.delete(
  "/user/cart/:productId",
  authGuard("User"),
  userRemoveFromCart
);

userRouter.delete("/user/cart/clear", authGuard("User"), userClearCart);

/* ===============================================================
   WISHLIST MANAGEMENT (PROTECTED)
================================================================ */
userRouter.post("/user/addtowishlist", authGuard("User"), userAddToWishList);

userRouter.get("/user/wishlist", authGuard("User"), userGetProductWishList);

userRouter.delete(
  "/user/wishlist/:productId",
  authGuard("User"),
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
  authGuard("User"),
  userAccountDeletePreview
);

userRouter.delete(
  "/user/delete-confirm",
  authGuard("User"),
  userAccountDeleteConfirm
);

/* ===============================================================
   SESSION & TOKEN MANAGEMENT
================================================================ */
userRouter.post("/user/logout", authGuard("User"), logoutService);

userRouter.post("/refresh-token", authGuard("User"), regenerateToken);

/* ===============================================================
   RAZORPAY CHECKOUT FLOW (PROTECTED)
   ---------------------------------------------------------------
   - get-key          → Exposes public Razorpay key
   - create-order     → Creates Razorpay order + DB order
   - paymentverification → Client-side signature verification
================================================================ */
userRouter.get("/rp/get-key", authGuard("User"), razorpayKeyGetController);

userRouter.post(
  "/user/create-order",
  authGuard("User"),
  razorpayCreateOrderController
);

userRouter.post(
  "/user/paymentverification",
  authGuard("User"),
  razorpayPaymentVerificationController
);

/* ===============================================================
   RAZORPAY WEBHOOK (PUBLIC – SERVER TO SERVER)
   ---------------------------------------------------------------
   ⚠️ IMPORTANT:
   - Uses RAW body (NOT express.json)
   - Required for Razorpay signature verification
   - No authGuard (Razorpay servers call this)
================================================================ */
userRouter.post(
  "/rp/webhook",
  bodyParser.raw({ type: "application/json" }),
  razorpayWebHookController
);

export default userRouter;
