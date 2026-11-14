// API v2 catalog routes, mounted at /api/v2 (routes/v2/index.js).
// Resource-style paths: plural nouns, the HTTP method is the action.
// "by-tag" is declared before ":productId" so it is not read as an id.
import { Router } from "express";
import {
  listProductsV2,
  productsByTagV2,
  productDetailsV2,
  listCategoriesV2,
  categoryDetailsV2,
} from "../../controller/v2/catalog.controller.js";

const catalogV2Router = Router();
catalogV2Router.get("/catalog/products", listProductsV2);
catalogV2Router.get("/catalog/products/by-tag", productsByTagV2);
catalogV2Router.get("/catalog/products/:productId", productDetailsV2);
catalogV2Router.get("/catalog/categories", listCategoriesV2);
catalogV2Router.get("/catalog/categories/:slug", categoryDetailsV2);
export default catalogV2Router;
