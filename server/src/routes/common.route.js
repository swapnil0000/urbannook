import { Router } from "express";
import {
  sendOtpViaEmailServiceController,
  verifyEmailOtpController,
} from "../controller/common.controller.js";
const commonRouter = Router();
commonRouter.post("/send-otp", sendOtpViaEmailServiceController);
commonRouter.post("/verify-otp", verifyEmailOtpController);
export default commonRouter;
