import { ApiError, ApiRes } from "../utlis/index.js";
import Product from "../model/product.model.js";
const productListing = async (req, res) => {
  try {
    const { limit, currentPage, search, status, category, subCategory } =
      req.query;
    const page = Number(currentPage) || 1;
    const perPage = Number(limit) || 10;
    /*category -> Filter by category	Electronics , search -> Keyword search in name	iPhone */
    const query = {};
    if (search) {
      query.productName = {
        $regex: String(search),
        $options: "i", // makes it case - insensitive Eg - Chair , chair, CHAIR - all same
      };
    }

    if (category) {
      query.productCategory = {
        $regex: String(category),
        $options: "i", // makes it case - insensitive Eg - Chair , chair, CHAIR - all same
      };
    }
    if (subCategory) {
      query.productCategory = {
        $regex: String(subCategory),
        $options: "i", // makes it case - insensitive Eg - Chair , chair, CHAIR - all same
      };
    }
    if (status) {
      query.productStatus = status;
    }
    const totalProducts = await Product.countDocuments(query);

    const listOfProducts = await Product.find(query)
      .skip((page - 1) * perPage)
      .limit(perPage) // for limit
      .sort({ createdAt: -1 }) // latest one
      .select("-_id");

    return res.status(200).json(
      new ApiRes(
        200,
        listOfProducts?.length == 0
          ? `No Product found for your search`
          : `Product List`,
        {
          listOfProducts:
            listOfProducts?.length == 0
              ? null
              : {
                  listOfProducts,
                  pagination: {
                    totalProducts,
                    currentPage: page,
                    totalPages: Math.ceil(totalProducts / perPage),
                  },
                },
        },
        true,
      ),
    );
  } catch (error) {
    return res.status(500).json(new ApiError(500, error.message, null, false));
  }
};
const specificProductDetails = async (req, res) => {
  const { productId } = req.body;
  if (!productId) {
    return res
      .status(404)
      .json(new ApiError(404, `Product ID is missing`, null, false));
  }
  const productDetails = await Product.findOne({
    productId,
  }).select("-_id");
  if (!productDetails) {
    return res
      .status(404)
      .json(new ApiError(404, `Product Doesn't exist`, null, false));
  }
  return res
    .status(200)
    .json(new ApiRes(200, `Product Details`, productDetails, true));
};
const getProductsByTag = async (_, res) => {
  try {
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
  } catch (error) {
    return res.status(500).json(new ApiError(500, error.message, null, false));
  }
};
export { productListing, specificProductDetails, getProductsByTag };
