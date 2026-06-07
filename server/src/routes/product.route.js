import { Router } from "express";
import {
  getProductsByTag,
  productListing,
  specificProductDetails,
  getCategories,
} from "../controller/product.controller.js";
const productRouter = Router();
productRouter.get("/products/categories", getCategories);
productRouter.get("/products/homepage", getProductsByTag);
productRouter.get("/products", productListing);
productRouter.get("/product/:productId", specificProductDetails);
export default productRouter;
