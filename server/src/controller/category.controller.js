import { ApiRes } from "../utils/index.js";
import Product from "../model/product.model.js";
import Category from "../model/category.model.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { NotFoundError } from "../utils/errors.js";
import { apiCache } from "../module/cache.manager.module.js";
import { buildCategories, toCategorySlug } from "../utils/category.util.js";
import { recentSalesByProduct, withRecentSales } from "../utils/productSignals.util.js";

// Same in-memory product cache (10 min) as the other product endpoints
// (System Guide §7).
const loadCatalog = () =>
  apiCache.handle({ route: "categories:catalog" }, async () => {
    const [catalogProducts, categoryDocs] = await Promise.all([
      Product.find({ isPublished: true, isAddon: { $ne: true } })
        .sort({ priority: -1, createdAt: -1 })
        .select("-_id -createdAt -updatedAt -__v")
        .lean(),
      Category.find({}).select("-_id name slug categoryId image displayOrder isActive").lean(),
    ]);
    const sales = await recentSalesByProduct(catalogProducts.map((p) => p.productId));
    const products = withRecentSales(catalogProducts, sales);
    return { products, categories: buildCategories(products, categoryDocs) };
  });

// GET /categories - every category that has published products (no product data).
const listCategories = asyncHandler(async (req, res) => {
  const { categories } = await loadCatalog();
  const data = categories.map(({ productIds, variantSkus, ...c }) => c);
  return res.status(200).json(new ApiRes(200, "Category List", data, true));
});

// GET /category/:slug - one category with its products, in shop order.
const categoryDetails = asyncHandler(async (req, res) => {
  const slug = toCategorySlug(req.params.slug);
  const { products, categories } = await loadCatalog();
  const category = categories.find((c) => c.slug === slug);
  if (!category) throw new NotFoundError("Category doesn't exist");

  const ids = new Set(category.productIds);
  const { productIds, variantSkus, ...meta } = category;
  let list = products.filter((p) => ids.has(p.productId));
  // Collection pages (series, "Anime Katana"): only the variants that belong.
  if (variantSkus) {
    const skus = new Set(variantSkus);
    list = list.map((p) => ({ ...p, variantDetails: (p.variantDetails || []).filter((v) => skus.has(v.sku)) }));
  }
  const data = { ...meta, products: list };
  return res.status(200).json(new ApiRes(200, "Category Details", data, true));
});

export { listCategories, categoryDetails };
