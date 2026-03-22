import { Router } from "express";
import {
  getProductsByTag,
  productListing,
  specificProductDetails,
  getProductOrderCount,
} from "../controller/product.controller.js";
const productRouter = Router();
productRouter.get("/products", productListing);
productRouter.get("/product/:productId", specificProductDetails);
productRouter.get("/products/homepage", getProductsByTag);
productRouter.get("/product/:productId/order-count", getProductOrderCount);
export default productRouter;
