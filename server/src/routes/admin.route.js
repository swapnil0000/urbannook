import { Router } from "express";
import {
  adminLogin,
  adminProfile,
  createProduct,
} from "../controller/admin.controller.js";
import {
  authGuardService,
  logoutService,
} from "../services/common.auth.service.js";
const adminRouter = Router();
adminRouter.route("/admin-login").post(adminLogin);
adminRouter
  .route("/admin-profile")
  .post(authGuardService("Admin"), adminProfile);
adminRouter
  .route("/admin-logout")
  .post(authGuardService("Admin"), logoutService);
adminRouter
  .route("/addtoinventory")
  .post(authGuardService("Admin"), createProduct);

export default adminRouter;
