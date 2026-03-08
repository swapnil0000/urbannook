import { Router } from "express";
import {
  sendOtpViaEmailServiceController,
  verifyEmailOtpController,
  verifyOtpEmailForgotPasswordController,
  regenrateRefreshToken,
} from "../controller/common.controller.js";
const commonRouter = Router();
commonRouter.post("/send-otp", sendOtpViaEmailServiceController);
commonRouter.post("/verify-otp", verifyEmailOtpController);
commonRouter.post(
  "/forgot-password/verify-otp",
  verifyOtpEmailForgotPasswordController,
);
commonRouter.post("/refresh-token", regenrateRefreshToken);

export default commonRouter;
