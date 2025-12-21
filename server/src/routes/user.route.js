import { Router } from "express";

/* ===================== CONTROLLERS ===================== */
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
  userPreviewAddToCart,
  userAddToWishList,
  userGetProductWishList,
  userDeleteFromProductWishList,
} from "../controller/user.controller.js";

/* ===================== AUTH SERVICES ===================== */
import {
  authGuard,
  logoutService,
  regenerateToken,
} from "../services/common.auth.service.js";

const userRouter = Router();

/* ===============================================================
   AUTH (PUBLIC)
================================================================ */
userRouter.post("/user/login", userLogin);
userRouter.post("/user/register", userRegister);

/* ===============================================================
   PROFILE & ACCOUNT (PROTECTED)
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
================================================================ */
userRouter.post("/user/addtocart", authGuard("User"), userAddToCart);

userRouter.get(
  "/user/preview-addtocart",
  authGuard("User"),
  userPreviewAddToCart
);

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
   SESSION & TOKEN
================================================================ */
userRouter.post("/user/logout", authGuard("User"), logoutService);

userRouter.post("/refresh-token", authGuard("User"), regenerateToken);

export default userRouter;
