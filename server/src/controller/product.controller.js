import { ApiRes } from "../utils/index.js";
import Product from "../model/product.model.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { NotFoundError } from "../utils/errors.js";
import { apiCache } from "../module/cache.manager.module.js";

const productListing = asyncHandler(async (req, res) => {
  const {
    limit,
    currentPage,
    search,
    status,
    category,
    subCategory,
    featured,
  } = req.query;

  const fetcher = async () => {
    const page = Number(currentPage) || 1;
    const perPage = Number(limit) || 10;
    /*category -> Filter by category	Electronics , search -> Keyword search in name	iPhone */
    // isAddon products (e.g. Gift Wrap) are real, cart-addable products but
    // never belong in the browsable grid — excluded here only; still
    // fetchable directly by ID via specificProductDetails below.
    const query = { isPublished: true, isAddon: { $ne: true } };
    let sort = { priority: -1, createdAt: -1 }; // admin priority first, then latest

    if (search) {
      if (search.length <= 2) {
        // Short input like p , ph , pho
        query.productName = {
          $regex: `^${search}`,
          $options: "i", // makes it case - insensitive Eg - Chair , chair, CHAIR - all same
        };
      } else {
        // for length inputs like iPhone 15 Pro Max
        query.$text = { $search: search };
        sort = { score: { $meta: "textScore" }, createdAt: -1 };
      }
    }

    if (!query.$text) {
      if (category)
        query.productCategory = { $regex: String(category), $options: "i" };
      if (subCategory)
        query.productSubCategory = {
          $regex: String(subCategory),
          $options: "i",
        };
      if (status) query.productStatus = status;
      if (featured === "true") query.tags = "featured";
    }

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
    const productDetails = await Product.findOne({
      productId,
      isPublished: true,
    })
      .select("-_id -createdAt -updatedAt -__v")
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
      const recs = await Product.find({
        productId: { $in: recIds },
        isPublished: true,
      })
        .select("-_id -createdAt -updatedAt -__v")
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
      const combos = await Product.find({
        productId: { $in: comboIds },
        isPublished: true,
      })
        .select("-_id -createdAt -updatedAt -__v")
        .lean();
      const comboById = new Map(combos.map((p) => [String(p.productId), p]));
      comboProductsDetails = comboIds.map((id) => comboById.get(id)).filter(Boolean);
    }
    productDetails.comboProductsDetails = comboProductsDetails;

    return productDetails;
  };

  const result = await apiCache.handle(req.params, fetcher);

  return res.status(200).json(new ApiRes(200, `Product Details`, result, true));
});

const getProductsByTag = asyncHandler(async (_, res) => {
  const fetcher = async () => {
    const productDetails = await Product.aggregate([
      {
        $match: {
          isPublished: true,
          isAddon: { $ne: true },
        },
      },
      {
        $project: {
          productName: 1,
          productId: 1,
          uiProductId: 1,
          variantDetails: 1,
          _id: 0,
          tags: 1,
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
    return productDetails[0];
  };

  const result = await apiCache.handle("products_by_tags", fetcher);
  return res.status(200).json(new ApiRes(200, `productDetails`, result, true));
});

export { productListing, specificProductDetails, getProductsByTag };
