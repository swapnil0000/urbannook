import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  guestCreateOrderController,
  guestOrderStatusController,
  guestSendOtpController,
  guestVerifyOtpController,
} from "../controller/guest.checkout.controller.js";

const guestRouter = Router();

const guestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many requests, please try again later",
});

// Public guest checkout routes (no auth required)
guestRouter.post("/guest/create-order", guestLimiter, guestCreateOrderController);
guestRouter.get("/guest/order/:orderId/status", guestOrderStatusController);
guestRouter.post("/guest/send-otp", guestLimiter, guestSendOtpController);
guestRouter.post("/guest/verify-otp", guestLimiter, guestVerifyOtpController);

export default guestRouter;
