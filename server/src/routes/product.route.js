import { Router } from "express";
import {
  productListing,
} from "../controller/product.controller.js";
const productRouter = Router();
productRouter.route("/products").get(productListing);
export default productRouter;
