import mongoose from "mongoose";
import { ApiRes } from "../utils/index.js";
import Product from "../model/product.model.js";
import Category from "../model/category.model.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { NotFoundError } from "../utils/errors.js";
import { apiCache } from "../module/cache.manager.module.js";

/**
 * Resolves a category slug to its stable { categoryId, subCategoryId }.
 * This is the core of "never breaks" — products are always queried by ID,
 * not by slug or name. Even if a category is renamed, the ID stays the same.
 */
const resolveCategoryIds = async (categorySlug, subCategorySlug) => {
  if (!categorySlug) return {};

  const cat = await Category.findOne({ slug: categorySlug })
    .select("categoryId subcategories")
    .lean();

  if (!cat?.categoryId) return { fallback: true };

  const result = { categoryId: cat.categoryId };

  if (subCategorySlug) {
    const sub = cat.subcategories?.find((s) => s.slug === subCategorySlug);
    if (sub?.subCategoryId) result.subCategoryId = sub.subCategoryId;
  }

  return result;
};

const productListing = asyncHandler(async (req, res) => {
  const {
    limit,
    currentPage,
    status,
    category,
    subCategory,
    featured,
  } = req.query;

  const fetcher = async () => {
    const page = Number(currentPage) || 1;
    const perPage = Number(limit) || 10;

    const query = { isPublished: true };
    let sort    = { createdAt: -1 };

    if (category) {
      const ids = await resolveCategoryIds(category, subCategory);

      if (ids.fallback) {
        // Category has no ID yet — pure slug/name match
        query.$or = [
          { categorySlug: category },
          { productCategory: { $regex: `^${category}$`, $options: "i" } },
        ];
        if (subCategory) {
          query.$and = [
            { $or: query.$or },
            {
              $or: [
                { subCategorySlug: subCategory },
                { productSubCategory: { $regex: `^${subCategory}$`, $options: "i" } },
              ],
            },
          ];
          delete query.$or;
        }
      } else {
        // Belt-and-suspenders: match by categoryId (fast, post-migration) OR
        // by slug/name (for products not yet migrated). This ensures products
        // always show regardless of whether the migration endpoint has been run.
        query.$or = [
          { categoryId: ids.categoryId },
          { categorySlug: category },
          { productCategory: { $regex: `^${category}$`, $options: "i" } },
        ];
        if (subCategory && ids.subCategoryId) {
          // For subcategory: combine with $and so both category and subCategory apply
          query.$and = [
            { $or: query.$or },
            {
              $or: [
                { subCategoryId: ids.subCategoryId },
                { subCategorySlug: subCategory },
                { productSubCategory: { $regex: `^${subCategory}$`, $options: "i" } },
              ],
            },
          ];
          delete query.$or;
        } else if (subCategory) {
          query.$and = [
            { $or: query.$or },
            {
              $or: [
                { subCategorySlug: subCategory },
                { productSubCategory: { $regex: `^${subCategory}$`, $options: "i" } },
              ],
            },
          ];
          delete query.$or;
        }
      }
    }

    if (status) query.productStatus = status;
    if (featured === "true") query.tags = "featured";

    const listOfProducts = await Product.find(query)
      .skip((page - 1) * perPage)
      .limit(perPage)
      .sort(sort)
      .select("-_id -createdAt -updatedAt -__v");

    return {
      listofPublishedProducts: listOfProducts,
      pagination: {
        NolistofPublishedProducts: listOfProducts.length,
        currentPage: page,
        totalPages: Math.ceil(listOfProducts?.length / perPage),
      },
    };
  };

  const result = await apiCache.handle(req.query, fetcher);
  return res
    .status(200)
    .json(
      new ApiRes(
        200,
        result.listofPublishedProducts.length === 0
          ? "No Published Product found"
          : "Product List",
        result.listofPublishedProducts.length === 0 ? null : result,
        true,
      ),
    );
});

const specificProductDetails = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const fetcher = async () => {
    const product = await Product.findOne({
      productId,
      isPublished: true,
    }).select("-_id -createdAt -updatedAt -__v");

    if (!product) throw new NotFoundError("Product Doesn't exist");
    return product;
  };

  const result = await apiCache.handle(req.params, fetcher);

  return res.status(200).json(new ApiRes(200, `Product Details`, result, true));
});

const getProductsByTag = asyncHandler(async (_, res) => {
  const fetcher = async () => {
    const products = await Product.aggregate([
      { $match: { isPublished: true } },
      {
        $project: {
          productName: 1, productId: 1, uiProductId: 1,
          variantDetails: 1, _id: 0, tags: 1,
        },
      },
      {
        $facet: {
          featured: [{ $match: { tags: "featured" } }, { $limit: 2 }],
          new_arrival: [{ $match: { tags: "new_arrival" } }, { $limit: 2 }],
          best_seller: [{ $match: { tags: "best_seller" } }, { $limit: 2 }],
          trending: [{ $match: { tags: "trending" } }, { $limit: 2 }],
        },
      },
    ]);
    return products[0];
  };

  const result = await apiCache.handle("products_by_tags", fetcher);
  return res.status(200).json(new ApiRes(200, `productDetails`, result, true));
});

const searchProducts = asyncHandler(async (req, res) => {
  const { q, limit } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(200).json(new ApiRes(200, "No results", { listofPublishedProducts: [] }, true));
  }

  const escapedQ = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = { $regex: escapedQ, $options: "i" };
  const perPage = Math.min(Number(limit) || 10, 20);

  const products = await Product.find({
    isPublished: true,
    $or: [
      { productName: regex },
      { productCategory: regex },
      { productSubCategory: regex },
      { productDes: regex },
    ],
  })
    .limit(perPage)
    .sort({ createdAt: -1 })
    .select("-_id -createdAt -updatedAt -__v");

  return res.status(200).json(
    new ApiRes(200, products.length ? "Search results" : "No results", { listofPublishedProducts: products }, true)
  );
});

export { productListing, specificProductDetails, getProductsByTag, searchProducts };
