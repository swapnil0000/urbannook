import Product from "../model/product.model.js";
import WishList from "../model/user.wishlist.model.js";
import { cartDetailsMissing } from "../utils/ValidateRes.js";
import { ValidationError, NotFoundError, InternalServerError } from "../utils/errors.js";

const addToWishListService = async (userId, productId) => {
  let missing = cartDetailsMissing(userId, productId);

  if (!missing?.success) {
    throw new ValidationError(missing?.message, missing?.data);
  }
  
  // Check product
  const productDetails = await Product.findOne(
    { productId },
    { productName: 1 },
  ).lean();
  
  if (!productDetails) {
    throw new NotFoundError(`Product not found with id: ${productId}`);
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
    throw new InternalServerError("Failed to add to wishlist");
  }

  return {
    statusCode: 200,
    message: `Added to wishlist: ${productDetails?.productName}`,
    data: `${productDetails?.productName}`,
    success: true,
  };
};

const getWishListService = async (userId) => {
  if (!userId) {
    throw new ValidationError("Unauthorized");
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
  const productDetails = await Product.findOne({ productId });
  
  if (!productDetails) {
    throw new NotFoundError(`Product not found with id: ${productId}`);
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

  if (updatedWishList) {
    await updatedWishList.save();
  }
  
  if (!updatedWishList) {
    throw new NotFoundError("Failed to remove from wishlist");
  }

  return {
    statusCode: 200,
    message: `${productDetails?.productName} deleted from wishlist`,
    data: `${productDetails?.productName}`,
    success: true,
  };
};

export { addToWishListService, deleteFromWishListService, getWishListService };
