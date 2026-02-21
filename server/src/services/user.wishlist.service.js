import Product from "../model/product.model.js";
import WishList from "../model/user.wishlist.model.js";
import { cartDetailsMissing } from "../utlis/ValidateRes.js";
const addToWishListService = async (userId, productId) => {
  try {
    let missing = cartDetailsMissing(userId, productId);

    if (!missing?.success) {
      return {
        statusCode: Number(missing?.statusCode),
        message: missing?.message,
        data: missing?.data || null,
        success: missing?.success,
      };
    }
    // Check product
    const productDetails = await Product.findOne(
      { productId },
      { productName: 1 },
    ).lean();
    if (!productDetails) {
      return {
        statusCode: 404,
        message: `Product not found with name : ${productDetails?.productName}`,
        data: [],
        success: false,
      };
    }
    const alreadyExists = await WishList.findOne({
      userId,
      products: productId,
    }).select("-__v -_id");

    if (alreadyExists) {
      return {
        statusCode: 200,
        message: "Product already in wishlist",
        data: {
          userId: alreadyExists?.userId,
          productId,
        },
        success: true,
      };
    }

    // update wishlist
    const updatedWishList = await WishList.findOneAndUpdate(
      { userId },
      { $addToSet: { products: productId } },
      { new: true, upsert: true },
    ).select("-__v -_id");

    if (!updatedWishList) {
      return {
        statusCode: 400,
        message: "Failed to add to wishlist",
        data: [],
        success: false,
      };
    }

    return {
      statusCode: 200,
      message: `Added to wishlist: ${productDetails?.productName}`,
      data: `${productDetails?.productName}`,
      success: true,
    };
  } catch (error) {
    console.error(`[ERROR] Wishlist Error:`, error.message, error.stack);
    return {
      statusCode: 500,
      message: "Internal server error",
      data: error.message,
      success: false,
    };
  }
};

const getWishListService = async (userId) => {
  if (!userId) {
    return {
      statusCode: 401,
      message: "Unauthorized",
      data: null,
      success: false,
    };
  }

  const wishList = await WishList.findOne({ userId });

  if (!wishList || wishList.products.length === 0) {
    return {
      statusCode: 200,
      message: "Wishlist is empty",
      data: [],
      success: true,
    };
  }

  const productDetails = await Product.find({
    productId: { $in: wishList.products },
  }).select(
    "productId productName productImg productCategory sellingPrice productStatus -_id",
  );

  return {
    statusCode: 200,
    message: "Wishlist fetched",
    data: productDetails,
    success: true,
  };
};

const deleteFromWishListService = async (userId, productId) => {
  try {
    const productDetails = await Product.findOne({ productId });
    if (!productDetails) {
      return {
        statusCode: 404,
        message: `Product not found with id : ${productId}`,
        data: [],
        success: false,
      };
    }
    const updatedWishList = await WishList.findOneAndUpdate(
      { userId },
      {
        $pull: {
          products: productId,
        },
      },
      {
        new: true,
      },
    );

    await updatedWishList.save();
    if (!updatedWishList)
      return {
        statusCode: 404,
        message: `Failed to remove from wishlist`,
        data: [],
        success: false,
      };

    return {
      statusCode: 200,
      message: `${productDetails?.productName} deleted from wishlist`,
      data: `${productDetails?.productName}`,
      success: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      message: "Internal server error",
      data: error.message,
      success: false,
    };
  }
};
export { addToWishListService, deleteFromWishListService, getWishListService };
