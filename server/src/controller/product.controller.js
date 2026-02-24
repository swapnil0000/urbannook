import { ApiRes } from "../utils/index.js";
import Product from "../model/product.model.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { NotFoundError } from "../utils/errors.js";

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
  const page = Number(currentPage) || 1;
  const perPage = Number(limit) || 10;
  /*category -> Filter by category	Electronics , search -> Keyword search in name	iPhone */
  const query = {};
  let sort = { createdAt: -1 }; // default: latest products

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
      sort = {
        score: { $meta: "textScore" },
        createdAt: -1,
      };
    }
  }

  if (!query.$text) {
    if (category) {
      query.productCategory = { $regex: String(category), $options: "i" };
    }
    if (subCategory) {
      query.productSubCategory = {
        $regex: String(subCategory),
        $options: "i",
      };
    }
    if (status) {
      query.productStatus = status;
    }
    // Filter by featured tag
    if (featured === "true") {
      query.tags = "featured";
    }
  }
  query.isPublished = true;

  const totalProducts = await Product.countDocuments(query);

const listOfProducts = await Product.find(query)
  .skip((page - 1) * perPage)
  .limit(perPage)
  .sort(sort)
  .select("-_id -createdAt -updatedAt -__v");

// No need to filter anymore since query already includes isPublished: true
const listofPublishedProducts = listOfProducts;

  return res.status(200).json(
    new ApiRes(
      200,
      listofPublishedProducts?.length == 0
        ? `No Published Product found for your search`
        : `Product List`,
      listofPublishedProducts?.length == 0
        ? null
        : {
            listofPublishedProducts,
            pagination: {
              NolistofPublishedProducts: listofPublishedProducts?.length,
              currentPage: page,
              totalPages: Math.ceil(listofPublishedProducts?.length / perPage),
            },
          },

      true,
    ),
  );
});

const specificProductDetails = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!productId) {
    throw new NotFoundError("Product ID is missing");
  }
  const productDetails = await Product.findOne({
    productId,
  }).select("-_id");
  if (!productDetails) {
    throw new NotFoundError("Product Doesn't exist");
  }
  return res
    .status(200)
    .json(new ApiRes(200, `Product Details`, productDetails, true));
});

const getProductsByTag = asyncHandler(async (_, res) => {
  // const tags = ["featured", "new_arrival", "best_seller", "trending"];
  const productStatus = "in_stock";
  const productDetails = await Product.aggregate([
    {
      $match: { productStatus },
    },
    {
      $project: {
        productName: 1,
        productId: 1,
        uiProductId: 1,
        productImg: 1,
        sellingPrice: 1,
        _id: 0,
        tags: 1,
      },
    },
    {
      $facet: {
        featured: [
          {
            $match: {
              tags: "featured",
            },
          },
          {
            $limit: 2,
          },
        ],
        new_arrival: [
          {
            $match: {
              tags: "new_arrival",
            },
          },
          {
            $limit: 2,
          },
        ],
        best_seller: [
          {
            $match: {
              tags: "best_seller",
            },
          },
          {
            $limit: 2,
          },
        ],
        trending: [
          {
            $match: {
              tags: "trending",
            },
          },
          {
            $limit: 2,
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(new ApiRes(200, `productDetails`, productDetails, true));
});

export { productListing, specificProductDetails, getProductsByTag };
