// API v1 category controllers - DEPRECATED, kept only so old clients keep
// working. Successor: /api/v2/catalog/categories (controller/v2/catalog.controller.js).
// Why v2: v1 /category/:slug returns every field of every product in the
// category; v2 returns slim product cards. Queries live in
// services/catalog.service.js, shared by both versions.
import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { toCategorySlug } from "../utils/category.util.js";
import { listCategoryMeta, getCategoryWithProducts } from "../services/catalog.service.js";

// GET /categories - every category that has published products (no product data).
const listCategories = asyncHandler(async (req, res) => {
  const data = await listCategoryMeta();
  return res.status(200).json(new ApiRes(200, "Category List", data, true));
});

// GET /category/:slug - one category with its products, in shop order.
const categoryDetails = asyncHandler(async (req, res) => {
  const data = await getCategoryWithProducts(toCategorySlug(req.params.slug));
  return res.status(200).json(new ApiRes(200, "Category Details", data, true));
});

export { listCategories, categoryDetails };
