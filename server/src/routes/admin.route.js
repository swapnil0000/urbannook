import { Router } from "express";
import {
  adminLogin,
  adminProfile,
  createProduct,
  getJoinedUserWaitList,
  nfcGenrateUserId,
  totalProducts,
  updateProduct,
  nfcAssignGeneratedUserId,
  nfcPauseGeneratedUserId,
} from "../controller/admin.controller.js";
import {
  authGuardService,
  logoutService,
} from "../services/common.auth.service.js";

const adminRouter = Router();
adminRouter.route("/admin/login").post(adminLogin);
adminRouter
  .route("/admin/total/products")
  .get(authGuardService("Admin"), totalProducts);
adminRouter
  .route("/admin/profile")
  .post(authGuardService("Admin"), adminProfile);
adminRouter
  .route("/admin/logout")
  .post(authGuardService("Admin"), logoutService);
adminRouter
  .route("/admin/add/inventory")
  .post(authGuardService("Admin"), createProduct);

adminRouter
  .route("/admin/update/inventory/:productId")
  .post(authGuardService("Admin"), updateProduct);
adminRouter
  .route("/admin/joined/waitlist")
  .get(authGuardService("Admin"), getJoinedUserWaitList);

adminRouter.get(
  "/admin/nfc/generate-id",
  authGuardService("Admin"),
  nfcGenrateUserId,
);

adminRouter.post(
  "/admin/nfc/assign",
  authGuardService("Admin"),
  nfcAssignGeneratedUserId,
);

adminRouter.post(
  "/admin/nfc/pause",
  authGuardService("Admin"),
  nfcPauseGeneratedUserId,
);
export default adminRouter;
