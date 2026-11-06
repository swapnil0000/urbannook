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
      Category.find({}).sort({ displayOrder: 1, createdAt: 1 }).select("-_id name slug categoryId image displayOrder isActive subcategories.name subcategories.slug subcategories.displayOrder").lean(),
    ]);
    const sales = await recentSalesByProduct(catalogProducts.map((p) => p.productId));
    const products = withRecentSales(catalogProducts, sales);
    return { products, categories: buildCategories(products, categoryDocs) };
  });

// GET /categories - every category that has published products (no product data).
const listCategories = asyncHandler(async (req, res) => {
  const { categories } = await loadCatalog();
  const data = categories.map(({ productIds, variantSkus, subcategories, ...c }) => ({
    ...c,
    subcategories: (subcategories || []).map(({ productIds: _ids, ...sc }) => sc),
  }));
  return res.status(200).json(new ApiRes(200, "Category List", data, true));
});

// GET /category/:slug and /category/:slug/:subSlug - one category (or one of its sub-categories) with its
// products, in shop order. `subcategories` lists the sub-categories of the category either way.
const categoryDetails = asyncHandler(async (req, res) => {
  const slug = toCategorySlug(req.params.slug);
  const { products, categories } = await loadCatalog();
  const category = categories.find((c) => c.slug === slug);
  if (!category) throw new NotFoundError("Category doesn't exist");

  let scope = category;
  let subcategory = null;
  if (req.params.subSlug) {
    const subSlug = toCategorySlug(req.params.subSlug);
    const sub = (category.subcategories || []).find((s) => s.slug === subSlug);
    if (!sub) throw new NotFoundError("Sub-category doesn't exist");
    scope = sub;
    subcategory = { slug: sub.slug, name: sub.name };
  }

  const ids = new Set(scope.productIds);
  const { productIds, variantSkus, subcategories, ...meta } = category;
  if (subcategory) Object.assign(meta, { itemCount: scope.itemCount, cover: scope.image || meta.cover, subcategory, indexable: false });
  let list = products.filter((p) => ids.has(p.productId));
  // Collection pages (series, "Anime Katana"): only the variants that belong.
  if (variantSkus) {
    const skus = new Set(variantSkus);
    list = list.map((p) => ({ ...p, variantDetails: (p.variantDetails || []).filter((v) => skus.has(v.sku)) }));
  }
  const data = { ...meta, subcategories: (subcategories || []).map(({ productIds: _ids, ...sc }) => sc), products: list };
  return res.status(200).json(new ApiRes(200, "Category Details", data, true));
});

export { listCategories, categoryDetails };
