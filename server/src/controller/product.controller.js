// API v1 product controllers - DEPRECATED, kept only so old clients keep
// working. Successor: /api/v2/catalog/products (controller/v2/catalog.controller.js).
// Why v2: v1 returns every product field (descriptions, specs, full galleries)
// for list views and uses ad-hoc keys like `listofPublishedProducts`; v2 sends
// slim product cards and one response envelope. Queries live in
// services/catalog.service.js, shared by both versions.
import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import {
  listProducts,
  getProductDetails,
  getProductsByTags,
} from "../services/catalog.service.js";

const productListing = asyncHandler(async (req, res) => {
  const { limit, currentPage, search, status, category, subCategory, featured } = req.query;
  const { products, pagination } = await listProducts({
    page: Number(currentPage) || 1,
    perPage: Number(limit) || 10,
    search,
    status,
    category,
    subCategory,
    featured: featured === "true",
  });

  // v1 response shape is frozen: old key names, and null when empty.
  const result = {
    listofPublishedProducts: products,
    pagination: {
      NolistofPublishedProducts: pagination.count,
      currentPage: pagination.currentPage,
      totalProducts: pagination.totalProducts,
      totalPages: pagination.totalPages,
    },
  };
  return res
    .status(200)
    .json(
      new ApiRes(
        200,
        products.length === 0 ? "No Published Product found" : "Product List",
        products.length === 0 ? null : result,
        true,
      ),
    );
});

const specificProductDetails = asyncHandler(async (req, res) => {
  const result = await getProductDetails(req.params.productId);
  return res.status(200).json(new ApiRes(200, `Product Details`, result, true));
});

const getProductsByTag = asyncHandler(async (_, res) => {
  const result = await getProductsByTags();
  return res.status(200).json(new ApiRes(200, `productDetails`, result, true));
});

export { productListing, specificProductDetails, getProductsByTag };
