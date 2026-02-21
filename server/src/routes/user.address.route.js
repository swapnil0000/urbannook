import { Router } from "express";
import {
  userAddressUpdate,
  userCreateAddress,
  userAddressSuggestionFromLatLngController,
  userAddressSearchFromInputController,
} from "../controller/user.address.controller.js";
import { authGuardService } from "../services/common.auth.service.js";
const userAddressRouter = Router();
userAddressRouter.post(
  "/user/address/search",
  authGuardService("USER"),
  userAddressSearchFromInputController,
);

userAddressRouter.post(
  "/user/address/suggestion",
  authGuardService("USER"),
  userAddressSuggestionFromLatLngController,
);
userAddressRouter.post(
  "/user/address/create",
  authGuardService("USER"),
  userCreateAddress,
);
userAddressRouter.post(
  "/user/address/update",
  authGuardService("USER"),
  userAddressUpdate,
);

export default userAddressRouter;
