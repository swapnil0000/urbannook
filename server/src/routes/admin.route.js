import { Router } from "express";
import {
  adminLogin,
  adminProfile,
  createProduct,
  getJoinedUserWaitList,
  totalProducts,
} from "../controller/admin.controller.js";
import {
  authGuardService,
  logoutService,
} from "../services/common.auth.service.js";
const adminRouter = Router();
adminRouter.route("/admin/login").post(adminLogin);
adminRouter
  .route("/admin/totalproducts")
  .get(authGuardService("Admin"), totalProducts);
adminRouter
  .route("/admin/profile")
  .post(authGuardService("Admin"), adminProfile);
adminRouter
  .route("/admin/logout")
  .post(authGuardService("Admin"), logoutService);
adminRouter
  .route("/admin/addtoinventory")
  .post(authGuardService("Admin"), createProduct);
adminRouter
  .route("/admin/joinedwaitlist")
  .get(authGuardService("Admin"), getJoinedUserWaitList);

export default adminRouter;
