import { Router } from "express";
import {
  getProductsByTag,
  productListing,
  specificProductDetails,
} from "../controller/product.controller.js";
const productRouter = Router();
productRouter.get("/products", productListing);
productRouter.post("/product-detail", specificProductDetails);
productRouter.get("/products/homepage", getProductsByTag);
export default productRouter;
