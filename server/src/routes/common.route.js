import { Router } from "express";
import {
  sendOtpViaEmailController,
  verifyEmailOtpController,
} from "../controller/common.controller.js";
const commonRouter = Router();
commonRouter.post("/send-otp", sendOtpViaEmailController);
commonRouter.post("/verify-otp", verifyEmailOtpController);
export default commonRouter;
