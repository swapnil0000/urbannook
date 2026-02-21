import { Router } from "express";
import { authGuardService } from "../services/common.auth.service.js";
import {
  applyCouponCodeController,
  getAllCouponCodeController,
} from "../controller/coupon.code.controller.js";
const couponCodeRouter = Router();
couponCodeRouter.post(
  "/coupon/apply",
  authGuardService("USER"),
  applyCouponCodeController,
);
couponCodeRouter.get("/coupon/list", getAllCouponCodeController);

export default couponCodeRouter;
