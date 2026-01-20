import { Router } from "express";
import {
  productListing,
  specificProductDetails,
} from "../controller/product.controller.js";
const productRouter = Router();
productRouter.get("/products", productListing);
productRouter.post("/product-detail", specificProductDetails);
export default productRouter;
