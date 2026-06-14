import { ApiRes } from "../utils/index.js";
import Category from "../model/category.model.js";
import Product from "../model/product.model.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { apiCache } from "../module/cache.manager.module.js";
import { NotFoundError } from "../utils/errors.js";

// GET /api/v1/categories
// Returns all active categories with their subcategories
const getCategories = asyncHandler(async (req, res) => {
  const fetcher = async () => {
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select("-__v -createdAt -updatedAt");
    return categories;
  };

  const result = await apiCache.handle("categories_all", fetcher);
  return res
    .status(200)
    .json(new ApiRes(200, "Categories", result, true));
});

// GET /api/v1/categories/:slug
// Returns a single category with its products
const getCategoryBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { limit = 20, page = 1 } = req.query;

  const fetcher = async () => {
    const category = await Category.findOne({ slug, isActive: true }).select(
      "-__v -createdAt -updatedAt"
    );
    if (!category) throw new NotFoundError("Category not found");

    const perPage = Number(limit);
    const currentPage = Number(page);

    const products = await Product.find({
      productCategory: { $regex: `^${category.name}$`, $options: "i" },
      isPublished: true,
    })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .sort({ createdAt: -1 })
      .select("-_id -createdAt -updatedAt -__v");

    return { category, products, total: products.length };
  };

  const result = await apiCache.handle(
    `category_${slug}_p${page}_l${limit}`,
    fetcher
  );
  return res
    .status(200)
    .json(new ApiRes(200, "Category Details", result, true));
});

export { getCategories, getCategoryBySlug };
