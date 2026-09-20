import { Router } from "express";
import { authGuardService } from "../services/common.auth.service.js";
import {
  passkeyRegisterOptions,
  passkeyRegisterVerify,
  passkeyLoginOptions,
  passkeyLoginVerify,
  passkeyStatus,
} from "../controller/passkey.controller.js";

const passkeyRouter = Router();

// Does the logged-in user already have a passkey? (drives the post-login prompt)
passkeyRouter.get("/user/passkey/status", authGuardService("USER"), passkeyStatus);

// Enroll a passkey (must be logged in)
passkeyRouter.post("/user/passkey/register/options", authGuardService("USER"), passkeyRegisterOptions);
passkeyRouter.post("/user/passkey/register/verify", authGuardService("USER"), passkeyRegisterVerify);

// Sign in with a passkey (public)
passkeyRouter.post("/user/passkey/login/options", passkeyLoginOptions);
passkeyRouter.post("/user/passkey/login/verify", passkeyLoginVerify);

export default passkeyRouter;
