import express from "express";
import { authGuardService } from "../services/common.auth.service.js";
import {
  pinCodeDeliverableOrNotCheck,
  dynamicShippingCal,
} from "../controller/dynamic.shipping.controller.js";

const dynamicShippingRouter = express.Router();

dynamicShippingRouter.post(
  "/pincode/check",
  authGuardService("USER"),
  pinCodeDeliverableOrNotCheck,
);

dynamicShippingRouter.post(
  "/sp-rate/cal",
  authGuardService("USER"),
  dynamicShippingCal,
);
export default dynamicShippingRouter;
