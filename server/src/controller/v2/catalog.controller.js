// API v2 catalog controllers. Replace the deprecated v1 product/category
// endpoints (routes/v1-deprecated/). Differences from v1:
//  - list views return product cards (utils/productCard.util.js), not whole
//    documents: less JSON over the network and in server-rendered HTML;
//  - one envelope (utils/apiV2.js), empty lists are [] not null;
//  - page size is capped so one request cannot pull the whole catalog.
// Data comes from services/catalog.service.js, shared with v1.
import { asyncHandler } from "../../middleware/errorHandler.middleware.js";
import { sendV2 } from "../../utils/apiV2.js";
import { toProductCard, toProductCards } from "../../utils/productCard.util.js";
import { toCategorySlug } from "../../utils/category.util.js";
import {
  listProducts,
  getProductDetails,
  getProductsByTags,
  listCategoryMeta,
  getCategoryWithProducts,
} from "../../services/catalog.service.js";

const MAX_PAGE_SIZE = 48;
const DEFAULT_PAGE_SIZE = 12;

const toInt = (value, fallback, min, max) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};

// GET /api/v2/catalog/products?page&limit&search&category&subCategory&status&featured
export const listProductsV2 = asyncHandler(async (req, res) => {
  const { page, limit, search, category, subCategory, status, featured } = req.query;
  const { products, pagination } = await listProducts({
    page: toInt(page, 1, 1, 10000),
    perPage: toInt(limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
    search: search ? String(search) : undefined,
    category: category ? String(category) : undefined,
    subCategory: subCategory ? String(subCategory) : undefined,
    status: status ? String(status) : undefined,
    featured: featured === "true",
  });
  return sendV2(res, toProductCards(products), {
    meta: {
      pagination: {
        page: pagination.currentPage,
        limit: toInt(limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
        count: pagination.count,
        total: pagination.totalProducts,
        totalPages: pagination.totalPages,
      },
    },
  });
});

// GET /api/v2/catalog/products/by-tag - two cards per homepage tag.
export const productsByTagV2 = asyncHandler(async (_req, res) => {
  const facets = (await getProductsByTags()) || {};
  const data = Object.fromEntries(Object.entries(facets).map(([tag, list]) => [tag, toProductCards(list)]));
  return sendV2(res, data);
});

// GET /api/v2/catalog/products/:productId - full product for the PDP; the
// inlined recommended and combo products are cards (the PDP only shows a
// name, price and first image for them).
export const productDetailsV2 = asyncHandler(async (req, res) => {
  const product = await getProductDetails(String(req.params.productId));
  return sendV2(res, {
    ...product,
    recommendedProductsDetails: toProductCards(product.recommendedProductsDetails),
    comboProductsDetails: toProductCards(product.comboProductsDetails),
  });
});

// GET /api/v2/catalog/categories
export const listCategoriesV2 = asyncHandler(async (_req, res) => {
  return sendV2(res, await listCategoryMeta());
});

// GET /api/v2/catalog/categories/:slug - category meta + product cards.
export const categoryDetailsV2 = asyncHandler(async (req, res) => {
  const category = await getCategoryWithProducts(toCategorySlug(req.params.slug));
  return sendV2(res, { ...category, products: category.products.map(toProductCard) });
});
