import { Router } from "express";
import {
  adminLogin,
  adminProfile,
  createProduct,
  viewProduct,
  getJoinedUserWaitList,
  nfcGenrateUserId,
  totalProducts,
  updateProduct,
  nfcAssignGeneratedUserId,
  nfcPauseGeneratedUserId,
} from "../controller/admin.controller.js";
import userBulkEmailWaitlistController from "../controller/user.bulk.email.waitlist.controller.js";
import {
  authGuardService,
  logoutService,
} from "../services/common.auth.service.js";

const adminRouter = Router();

// --- Auth Routes ---
adminRouter.route("/admin/login").post(adminLogin);
adminRouter
  .route("/admin/logout")
  .post(authGuardService("Admin"), logoutService);
adminRouter
  .route("/admin/profile")
  .post(authGuardService("Admin"), adminProfile);

// --- Product/Inventory Routes ---
adminRouter
  .route("/admin/total/products")
  .get(authGuardService("Admin"), totalProducts);
adminRouter
  .route("/admin/add/inventory")
  .post(authGuardService("Admin"), createProduct);
adminRouter
  .route("/admin/view/inventory/:productId")
  .get(authGuardService("Admin"), viewProduct);
adminRouter
  .route("/admin/update/inventory/:productId")
  .post(authGuardService("Admin"), updateProduct);

// --- Waitlist Routes ---
adminRouter
  .route("/admin/joined/waitlist")
  .get(authGuardService("Admin"), getJoinedUserWaitList);

// Send Bulk Emails
adminRouter.post(
  "/admin/send-bulk-emails/waitlist",
  authGuardService("Admin"),
  userBulkEmailWaitlistController,
);

// --- NFC Routes ---
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
