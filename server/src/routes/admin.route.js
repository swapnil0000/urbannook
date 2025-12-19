import { Router } from "express";
import {
  adminLogin,
  updateProduct,
  adminProfile,
  createProduct,
  productListing,
} from "../controller/admin.controller.js";
import { authGuard, logoutService } from "../services/common.auth.service.js";
const adminRouter = Router();
adminRouter.route("/admin-login").post(adminLogin);
adminRouter.route("/admin-profile").post(authGuard("Admin"), adminProfile);
adminRouter.route("/admin-logout").post(authGuard("Admin"), logoutService);

//prodcuts
adminRouter.route("/admin/products").get(authGuard("Admin"), productListing);
adminRouter
  .route("/admin/product/:productId")
  .patch(authGuard("Admin"), updateProduct);
adminRouter.route("/addtoinventory").post(authGuard("Admin"), createProduct);
export default adminRouter;
