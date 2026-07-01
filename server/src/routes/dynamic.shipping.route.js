import express from "express";
import {
  dynamicShippingCal,
} from "../controller/dynamic.shipping.controller.js";

const dynamicShippingRouter = express.Router();

dynamicShippingRouter.post("/sp-rate/cal", dynamicShippingCal);

export default dynamicShippingRouter;
