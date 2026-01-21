import Cart from "../model/user.cart.model.js";
import User from "../model/user.model.js";
import { cartDetailsMissing } from "../utlis/CommonResponse.js";
const addToCartService = async ({ userId, productId, productQuanity }) => {
  try {
    if (!userId) {
      return {
        statusCode: 401,
        message: "Unauthorized",
        data: null,
        success: false,
      };
    }
    let missing = cartDetailsMissing(productId);
    if (!missing?.success) {
      return {
        statusCode: Number(missing?.statusCode),
        message: missing?.message,
        data: missing?.data || null,
        success: missing?.success,
      };
    }

    const userMongoDbId = await User.findOne({ userId });
    console.log(userMongoDbId?._id);

    const cartDetails = await Cart.aggregate([
      {
        $match: { user: userMongoDbId?._id },
      },
      {
        $unwind: { path: "$products", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $addFields: {
          isProductInCart: {
            $in: [productId, "$products.product"],
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          user: { $first: "$user" },
          products: { $push: "$products" },
          isProductInCart: { $max: "$isProductInCart" },
        },
      },
    ]);
    if (cartDetails[0]?.isProductInCart) {
      return {
        statusCode: 200,
        message: `Item already in cart: ${productId}`,
        data: productId,
        success: true,
      };
    }
    const updatedCart = await Cart.findOneAndUpdate(
      { userId },
      {
        $push: {
          products: { product: productId, quantity: productQuanity || 1 },
        },
      },
      { upsert: true, new: true, rawResult: true },
    );

    return {
      statusCode: 200,
      message: `Added to cart: ${productId}`,
      data: updatedCart,
      success: true,
    };
  } catch (error) {
    console.error("AddToCart Error:", error);
    return {
      statusCode: 500,
      message: "Internal server error",
      data: error.message,
      success: false,
    };
  }
};
export { addToCartService };
