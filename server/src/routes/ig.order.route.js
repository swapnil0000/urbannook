import { Router } from "express";
import {
  getIgOrderController,
  initIgPaymentController,
  getIgRpKeyController,
  listIgOrdersAdminController,
} from "../controller/ig.order.controller.js";
import { authGuardService } from "../services/common.auth.service.js";

const igOrderRouter = Router();

// Public routes
igOrderRouter.get("/ig-orders/rp-key", getIgRpKeyController);
igOrderRouter.get("/ig-orders/:igOrderId", getIgOrderController);
igOrderRouter.post("/ig-orders/init-payment", initIgPaymentController);

// Admin routes
igOrderRouter.get("/admin/ig-orders", authGuardService("ADMIN"), listIgOrdersAdminController);

export default igOrderRouter;
