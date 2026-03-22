import { Router } from "express";
import {
  getIgOrderController,
  initIgPaymentController,
  getIgRpKeyController,
} from "../controller/ig.order.controller.js";

const igOrderRouter = Router();

igOrderRouter.get("/ig-orders/rp-key", getIgRpKeyController);
igOrderRouter.get("/ig-orders/:igOrderId", getIgOrderController);
igOrderRouter.post("/ig-orders/init-payment", initIgPaymentController);

export default igOrderRouter;
