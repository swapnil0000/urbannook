import { Router } from "express";
import {
  userAddressUpdate,
  userCreateAddress,
} from "../controller/user.address.controller.js";
import { authGuardService } from "../services/common.auth.service.js";
const userAddressRouter = Router();
userAddressRouter.post("/user/address/update",authGuardService("USER"),userAddressUpdate);
userAddressRouter.post("/user/address/create",authGuardService("USER"),userCreateAddress);

export default userAddressRouter;
