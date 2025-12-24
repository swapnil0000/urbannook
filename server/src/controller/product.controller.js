import { ApiError, ApiRes } from "../utlis/index.js";
import Product from "../model/product.model.js";
const productListing = async (req, res) => {
  try {
    const { limit, currentPage, search, status, category } = req.query;
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

    const listOfProducts = await Product.find(query)
      .skip((currentPage - 1) * limit)
      .limit(Number(limit)) // for limit
      .sort({ createdAt: -1 }); // latest one
    console.log();

    return res.status(200).json(
      new ApiRes(
        200,
        listOfProducts?.length == 0
          ? `No Product found for your search`
          : `Product List`,
        {
          listOfProducts: listOfProducts?.length == 0 ? null : listOfProducts,
        },
        true
      )
    );
  } catch (error) {
    return res.status(500).json(new ApiError(500, error.message, null, false));
  }
};
export { productListing };
