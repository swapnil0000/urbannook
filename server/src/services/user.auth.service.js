import User from "../model/user.model.js";
import Product from "../model/product.model.js";
import mongoose from "mongoose";
const loginService = async (userEmail, userPassword) => {
  const res = await User.findOne({ userEmail });
  if (!res) {
    return {
      statusCode: 404,
      message: "User doesn't exist",
      data: null,
      success: false,
    };
  }

  //pass check
  const passCheck = (await res.passCheck(userPassword)) ? true : false;

  if (!passCheck) {
    return {
      statusCode: 401,
      message: "Password is wronng",
      data: email,
      success: false,
    };
  }

  const accessToken = await res.genAccessToken();
  res.userRefreshToken = accessToken;
  await res.save();
  return {
    statusCode: 200,
    message: "user details",
    data: {
      userName: res?.userName,
      userEmail: res?.userEmail,
      userMobileNumber: res?.userMobileNumber,
      userAddress: res?.userAddress,
      userPinCode: res?.userPinCode,
      addedToCart: res?.addedToCart,
      userPreviousOrder: res?.userPreviousOrder,
      role: res?.role,
      accessToken,
    },
    success: true,
  };
};

const registerService = async (userEmail, userMobileNumber,userName) => {
  const res = await User.findOne({
    $or: [{ userMobileNumber }, { userEmail },{userName}],
  });
  // check for pre-exist
  if (res) {
    return {
      statusCode: 409,
      message: "User Already exist",
      data: userEmail,
      success: false,
    };
  }
  return {
    statusCode: 200,
    message: `Creating user with - ${userEmail}`,
    data: userEmail,
    success: true,
  };
};

const addToCart = async (userEmail, productName, productQuanity) => {
  const quantityToAdd = productQuanity || 1;

  const updatedUser = await User.findOneAndUpdate(
    { userEmail },
    {
      $inc: { [`addedToCart.${productName}`]: quantityToAdd },
    },
    { new: true }
  ).select("-userPassword -userRefreshToken -__v -_id -createdAt");

  if (!updatedUser) {
    return {
      statusCode: 400,
      message: "Failed to add to cart",
      data: [],
      success: false,
    };
  }

  return {
    statusCode: 200,
    message: `Added to cart: ${productName}`,
    data: {
      productName,
      productQuanityAdded: quantityToAdd,
    },
    success: true,
  };
};

const addToWishList = async (userEmail, productName) => {
  try {
    if (!userEmail) {
      return {
        statusCode: 404,
        message: "Product not found",
        data: [],
        success: false,
      };
    }
    // Check product
    const productDetails = await Product.findOne({ productName });
    if (!productDetails) {
      return {
        statusCode: 404,
        message: "Product not found",
        data: [],
        success: false,
      };
    }

    // update wishlist
    const updatedUser = await User.findOneAndUpdate(
      { userEmail },
      { $addToSet: { addedToWishList: productDetails?._id } },
      { new: true }
    ).select("-userPassword -userRefreshToken -__v -_id -createdAt");

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

const deleteFromWishList = async (userEmail, productId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return {
        statusCode: 400,
        message: "Invalid productId - mongoose",
        data: [],
        success: false,
      };
    }
    const productDetails = await Product.findById(productId);
    if (!productDetails) {
      return {
        statusCode: 404,
        message: "Product not found",
        data: [],
        success: false,
      };
    }

    const userExist = await User.findOneAndUpdate(
      { userEmail },
      {
        $pull: { addedToWishList: productDetails?._id },
      },
      {
        new: true,
      }
    );
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
export {
  loginService,
  registerService,
  addToCart,
  addToWishList,
  deleteFromWishList,
};
