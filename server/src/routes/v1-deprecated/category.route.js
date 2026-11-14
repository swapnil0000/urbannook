// DEPRECATED v1 category routes. Moved here from routes/category.route.js when
// API v2 was added; kept working for old clients, never deleted.
// Successors (routes/v2/catalog.route.js):
//   GET /categories     -> GET /api/v2/catalog/categories
//   GET /category/:slug -> GET /api/v2/catalog/categories/:slug (slim product cards)
import { Router } from "express";
import { listCategories, categoryDetails } from "../../controller/category.controller.js";
import { deprecated } from "../../middleware/deprecation.middleware.js";

const categoryRouter = Router();
categoryRouter.get("/categories", deprecated("/api/v2/catalog/categories"), listCategories);
categoryRouter.get("/category/:slug", deprecated("/api/v2/catalog/categories/{slug}"), categoryDetails);
export default categoryRouter;
