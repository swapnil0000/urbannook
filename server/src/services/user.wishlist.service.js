const addToWishList = async (email, productName) => {
  try {
    let missing = cartDetailsMissing(productName);

    if (!missing?.success) {
      return {
        statusCode: Number(missing?.statusCode),
        message: missing?.message,
        data: missing?.data || null,
        success: missing?.success,
      };
    }
    // Check product
    const productDetails = await Product.findOne({ productName });
    if (!productDetails) {
      return {
        statusCode: 404,
        message: `Product not found with name : ${productName}`,
        data: [],
        success: false,
      };
    }

    // update wishlist
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $addToSet: { addedToWishList: { productId: productDetails?._id } } },
      { new: true }
    ).select("-password -userRefreshToken -__v -_id -createdAt");

    if (!updatedUser) {
      return {
        statusCode: 400,
        message: "Failed to add to wishlist",
        data: [],
        success: false,
      };
    }

    return {
      statusCode: 200,
      message: `Added to wishlist: ${productName}`,
      data: {
        productName,
      },
      success: true,
    };
  } catch (error) {
    console.error("Wishlist Error:", error);
    return {
      statusCode: 500,
      message: "Internal server error",
      data: error.message,
      success: false,
    };
  }
};

const deleteFromWishList = async (email, productId) => {
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
    const userExist = await User.findOneAndUpdate(
      { email },
      {
        $pull: {
          addedToWishList: {
            productId: productDetails?._id,
          },
        },
      },
      {
        new: true,
      }
    );

    await userExist.save();
    if (!userExist)
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
export { addToWishList, deleteFromWishList };
