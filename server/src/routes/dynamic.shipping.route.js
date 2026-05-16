import express from "express";
import {
  pinCodeDeliverableOrNotCheck,
  dynamicShippingCal,
} from "../controller/dynamic.shipping.controller.js";

const dynamicShippingRouter = express.Router();

dynamicShippingRouter.post("/pincode/check", pinCodeDeliverableOrNotCheck);

dynamicShippingRouter.post("/sp-rate/cal", dynamicShippingCal);

export default dynamicShippingRouter;
