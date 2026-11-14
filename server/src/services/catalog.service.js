// Catalog data layer shared by API v1 (deprecated) and API v2.
//
// Why this file exists: the product/category queries used to live inside the
// v1 controllers, so a second API version would have had to copy them. They
// now live here once; controllers only shape the HTTP response. Every
// function returns plain data and is cached in apiCache (10 min, System Guide
// §7), with a normalized key so junk query params cannot bust the cache.
import Product from "../model/product.model.js";
import Category from "../model/category.model.js";
import { NotFoundError } from "../utils/errors.js";
import { apiCache } from "../module/cache.manager.module.js";
import { buildCategories } from "../utils/category.util.js";
import { recentSalesByProduct, withRecentSales } from "../utils/productSignals.util.js";

const PRODUCT_FIELDS = "-_id -createdAt -updatedAt -__v";

/**
 * Paginated product grid. Params: page, perPage, search, category,
 * subCategory, status, featured (boolean).
 */
export const listProducts = ({
  page = 1,
  perPage = 10,
  search,
  category,
  subCategory,
  status,
  featured = false,
} = {}) => {
  const key = { route: "products:list", page, perPage, search, category, subCategory, status, featured };
  return apiCache.handle(key, async () => {
    // isAddon products (e.g. Gift Wrap) are real, cart-addable products but
    // never belong in the browsable grid - excluded here only; still
    // fetchable directly by ID via getProductDetails below.
    const query = { isPublished: true, isAddon: { $ne: true } };
    let sort = { priority: -1, createdAt: -1 }; // admin priority first, then latest

    if (search) {
      if (search.length <= 2) {
        // Short input like p , ph , pho
        query.productName = { $regex: `^${search}`, $options: "i" };
      } else {
        // for length inputs like iPhone 15 Pro Max
        query.$text = { $search: search };
        sort = { score: { $meta: "textScore" }, createdAt: -1 };
      }
    }

    if (!query.$text) {
      if (category) query.productCategory = { $regex: String(category), $options: "i" };
      if (subCategory) query.productSubCategory = { $regex: String(subCategory), $options: "i" };
      if (status) query.productStatus = status;
      if (featured) query.tags = "featured";
    }

    const [pageProducts, totalProducts] = await Promise.all([
      Product.find(query)
        .skip((page - 1) * perPage)
        .limit(perPage)
        .sort(sort)
        // createdAt stays in: the storefront's "New arrivals" sort reads it.
        .select("-_id -updatedAt -__v")
        .lean(),
      Product.countDocuments(query),
    ]);
    // Real units sold per product/variant power "Most bought" (all time),
    // "Trending" (30 days), and the 7-day product-card sales badge.
    const sales = await recentSalesByProduct(pageProducts.map((p) => p.productId));
    const products = withRecentSales(pageProducts, sales);

    return {
      products,
      pagination: {
        count: products.length,
        currentPage: page,
        totalProducts,
        totalPages: Math.ceil(totalProducts / perPage),
      },
    };
  });
};

/** One published product with recommended, combo and version data inlined. */
export const getProductDetails = (productId) =>
  apiCache.handle({ route: "products:detail", productId }, async () => {
    const productDetails = await Product.findOne({ productId, isPublished: true })
      .select(PRODUCT_FIELDS)
      .lean();

    if (!productDetails) {
      throw new NotFoundError("Product Doesn't exist");
    }

    // Inline the admin-curated recommended products so the PDP needs no extra
    // API call. Published only, and the admin-defined order is preserved.
    const recIds = Array.isArray(productDetails.recommendedProducts)
      ? productDetails.recommendedProducts.filter(Boolean).map(String)
      : [];
    let recommendedProductsDetails = [];
    if (recIds.length) {
      const recs = await Product.find({ productId: { $in: recIds }, isPublished: true })
        .select(PRODUCT_FIELDS)
        .lean();
      const byId = new Map(recs.map((p) => [String(p.productId), p]));
      recommendedProductsDetails = recIds.map((id) => byId.get(id)).filter(Boolean);
    }
    productDetails.recommendedProductsDetails = recommendedProductsDetails;

    // Inline the admin-picked combo companions (offered as a "buy together"
    // popup after add-to-cart). Published only, admin order preserved; an
    // empty result is what switches the popup off for that product.
    const comboIds = Array.isArray(productDetails.comboProductIds)
      ? productDetails.comboProductIds.filter(Boolean).map(String)
      : [];
    let comboProductsDetails = [];
    if (comboIds.length) {
      const combos = await Product.find({ productId: { $in: comboIds }, isPublished: true })
        .select(PRODUCT_FIELDS)
        .lean();
      const comboById = new Map(combos.map((p) => [String(p.productId), p]));
      comboProductsDetails = comboIds.map((id) => comboById.get(id)).filter(Boolean);
    }
    productDetails.comboProductsDetails = comboProductsDetails;

    // Cross-product versions (Wooden <-> LED): for every variant that has a
    // variantGroup, inline the OTHER published, active variants in that group
    // so the PDP can render its version toggle without another request.
    // A variant with a group but no other versions gets `versions: []` - the
    // PDP shows the toggle greyed out. No group = no `versions` key at all.
    const groups = [
      ...new Set((productDetails.variantDetails || []).map((v) => v.variantGroup).filter(Boolean)),
    ];
    if (groups.length) {
      const peers = await Product.find(
        { isPublished: true, "variantDetails.variantGroup": { $in: groups } },
        { _id: 0, productId: 1, variantDetails: 1 },
      ).lean();
      const byGroup = new Map();
      for (const p of peers) {
        for (const pv of p.variantDetails || []) {
          if (!pv.variantGroup || pv.isActive === false) continue;
          const list = byGroup.get(pv.variantGroup) || [];
          list.push({
            type: pv.variantType || "",
            productId: p.productId,
            sku: pv.sku || "",
            variantName: pv.variantName || "",
            outOfStock:
              pv.variantOutOfStock === true ||
              (pv.variantQuantity != null && pv.variantQuantity <= 0),
          });
          byGroup.set(pv.variantGroup, list);
        }
      }
      for (const v of productDetails.variantDetails || []) {
        if (!v.variantGroup) continue;
        v.versions = (byGroup.get(v.variantGroup) || []).filter(
          (o) => !(o.productId === productDetails.productId && o.sku === v.sku),
        );
      }
    }

    return productDetails;
  });

/** Two products per homepage tag (featured, new_arrival, best_seller, trending). */
export const getProductsByTags = () =>
  apiCache.handle("products_by_tags", async () => {
    const productDetails = await Product.aggregate([
      { $match: { isPublished: true, isAddon: { $ne: true } } },
      { $project: { productName: 1, productId: 1, uiProductId: 1, variantDetails: 1, _id: 0, tags: 1 } },
      {
        $facet: {
          featured: [{ $match: { tags: "featured" } }, { $limit: 2 }],
          new_arrival: [{ $match: { tags: "new_arrival" } }, { $limit: 2 }],
          best_seller: [{ $match: { tags: "best_seller" } }, { $limit: 2 }],
          trending: [{ $match: { tags: "trending" } }, { $limit: 2 }],
        },
      },
    ]);
    return productDetails[0];
  });

/** Every published product plus the category tree built from them. */
export const loadCatalog = () =>
  apiCache.handle({ route: "categories:catalog" }, async () => {
    const [catalogProducts, categoryDocs] = await Promise.all([
      Product.find({ isPublished: true, isAddon: { $ne: true } })
        .sort({ priority: -1, createdAt: -1 })
        .select(PRODUCT_FIELDS)
        .lean(),
      Category.find({}).select("-_id name slug categoryId image displayOrder isActive").lean(),
    ]);
    const sales = await recentSalesByProduct(catalogProducts.map((p) => p.productId));
    const products = withRecentSales(catalogProducts, sales);
    return { products, categories: buildCategories(products, categoryDocs) };
  });

/** Categories without their internal product lists. */
export const listCategoryMeta = async () => {
  const { categories } = await loadCatalog();
  return categories.map(({ productIds, variantSkus, ...c }) => c);
};

/** One category (by normalized slug) with its products in shop order. */
export const getCategoryWithProducts = async (slug) => {
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
  return { ...meta, products: list };
};
