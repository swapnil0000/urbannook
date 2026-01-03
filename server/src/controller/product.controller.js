import { ApiError, ApiRes } from "../utlis/index.js";
import Product from "../model/product.model.js";
const productListing = async (req, res) => {
  try {
    const { limit, currentPage, search, status, category } = req.query;
    const page = Number(currentPage) || 1;
    const perPage = Number(limit) || 10;
    /*category -> Filter by category	Electronics , search -> Keyword search in name	iPhone */
    const query = {};
    if (status) {
      query.productStatus = status;
    }
    if (category) {
      query.productCategory = {
        $regex: String(category),
        $options: "i", // makes it case - insensitive Eg - Chair , chair, CHAIR - all same
      };
    }
    if (search) {
      query.productName = {
        $regex: String(search),
        $options: "i", // makes it case - insensitive Eg - Chair , chair, CHAIR - all same
      };
    }
    const totalProducts = await Product.countDocuments(query);
    const listOfProducts = await Product.find(query)
      .skip((page - 1) * perPage)
      .limit(perPage) // for limit
      .sort({ createdAt: -1 }); // latest one

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
        true
      )
    );
  } catch (error) {
    return res.status(500).json(new ApiError(500, error.message, null, false));
  }
};
export { productListing };
