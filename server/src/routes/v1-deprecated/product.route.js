// DEPRECATED v1 product routes. Moved here from routes/product.route.js when
// API v2 was added; kept working for old clients, never deleted.
// Successors (routes/v2/catalog.route.js):
//   GET /products          -> GET /api/v2/catalog/products        (slim cards, not full documents)
//   GET /product/:id       -> GET /api/v2/catalog/products/:id    (slim recommended/combo cards)
//   GET /products/homepage -> GET /api/v2/catalog/products/by-tag (slim cards)
import { Router } from "express";
import {
  getProductsByTag,
  productListing,
  specificProductDetails,
} from "../../controller/product.controller.js";
import { deprecated } from "../../middleware/deprecation.middleware.js";

const productRouter = Router();
productRouter.get("/products", deprecated("/api/v2/catalog/products"), productListing);
productRouter.get("/product/:productId", deprecated("/api/v2/catalog/products/{productId}"), specificProductDetails);
productRouter.get("/products/homepage", deprecated("/api/v2/catalog/products/by-tag"), getProductsByTag);
export default productRouter;
