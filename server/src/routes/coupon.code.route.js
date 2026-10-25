import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authGuardService, optionalAuthGuard } from "../services/common.auth.service.js";
import {
  applyCouponCodeController,
  getAllCouponCodeController,
  getCouponOffersController,
  revealCouponCodeController,
} from "../controller/coupon.code.controller.js";
const couponCodeRouter = Router();
couponCodeRouter.post(
  "/coupon/apply",
  authGuardService("USER"),
  applyCouponCodeController,
);
couponCodeRouter.post("/coupon/list", getAllCouponCodeController);


// Never cached: the list changes as coupons expire, and a code must never be
// served from a shared cache (Cloudflare applies max-age to /api/*).
const noStore = (_req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  next();
};
// Reveal is per signed-in user and the number is already proven, so this only
// stops scripted harvesting of every code.
const revealLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many reveal attempts, please try again later",
});
couponCodeRouter.post("/coupon/offers", noStore, optionalAuthGuard("USER"), getCouponOffersController);
couponCodeRouter.post(
  "/coupon/reveal",
  revealLimiter,
  noStore,
  authGuardService("USER"),
  revealCouponCodeController,
);

export default couponCodeRouter;
