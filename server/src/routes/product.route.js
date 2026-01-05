import { Router } from "express";
import {
  productListing,
  specificProductDetails,
} from "../controller/product.controller.js";
const productRouter = Router();
productRouter.route("/products").get(productListing);
productRouter.route("/products/:productId").get(specificProductDetails);
export default productRouter;
