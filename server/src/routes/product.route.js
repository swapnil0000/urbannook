import { Router } from "express";
import {
  getProductsByTag,
  productListing,
  specificProductDetails,
  searchProducts,
} from "../controller/product.controller.js";
const productRouter = Router();
productRouter.get("/products/search", searchProducts);
productRouter.get("/products/homepage", getProductsByTag);
productRouter.get("/products", productListing);
productRouter.get("/product/:productId", specificProductDetails);
export default productRouter;
