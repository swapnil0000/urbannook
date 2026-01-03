import User from "../model/user.model.js";
import Product from "../model/product.model.js";
import mongoose from "mongoose";
import {
  cartDetailsMissing,
  fieldMissing,
} from "../utlis/CommonResponse.js";

const loginService = async (userEmail, userPassword) => {
  //fieldMissing
  let missing = fieldMissing({
    userEmail,
    userPassword,
    action: "login",
  });

  if (!missing?.success) {
    return {
      statusCode: Number(missing?.statusCode),
      message: missing?.message,
      data: missing?.data || null,
      success: missing?.success,
    };
  }
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
      data: userEmail,
      success: false,
    };
  }

  const userRefreshToken = await res?.genRefreshToken();
  const userAccessToken = await res?.genAccessToken();

  res.userRefreshToken = userRefreshToken;
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
      userRefreshToken,
      userAccessToken,
    },
    success: true,
  };
};

const registerService = async (
  userEmail,
  userPassword,
  userMobileNumber,
  userAddress,
  userPinCode,
  userName
) => {
  //fieldMissing
  let missing = fieldMissing({
    userName,
    userEmail,
    userPassword,
    userMobileNumber,
    userAddress,
    userPinCode,
    action: "register",
  });

  if (!missing?.success) {
    return {
      statusCode: Number(missing?.statusCode),
      message: missing?.message,
      data: missing?.data || null,
      success: missing?.success,
    };
  }
  const res = await User.findOne({
    $or: [{ userMobileNumber }, { userEmail }, { userName }],
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
  const newRegisteringUser = await User.create({
    userName,
    userEmail,
    userPassword,
    userMobileNumber,
    userAddress,
    userPinCode,
  });
  if (!newRegisteringUser)
    return {
      statusCode: 400,
      message: `Failed to create user with ${userEmail}`,
      data: userEmail,
      success: false,
    };
  return {
    statusCode: 200,
    message: `Created user with - ${userEmail}`,
    data: userEmail,
    success: true,
  };
};

const addToCartService = async (userEmail, productName, productQuanity) => {
  try {
    let missing = cartDetailsMissing(userEmail, productName);
    if (!missing?.success) {
      return {
        statusCode: Number(missing?.statusCode),
        message: missing?.message,
        data: missing?.data || null,
        success: missing?.success,
      };
    }
    const quantityToUpdate = productQuanity || 1;
    const updatedUser = await User.findOne({ userEmail });
    if (!updatedUser) {
      return {
        statusCode: 404,
        message: "User not found in DB",
        data: null,
        success: false,
      };
    }
    const productDetails = await Product.findOne({ productName });
    if (!productDetails) {
      return {
        statusCode: 404,
        message: "Product not found in DB",
        data: [],
        success: false,
      };
    }

    const cartItem = updatedUser.addedToCart.find((item) =>
      item.productId?.equals(productDetails._id)
    );

    if (cartItem) {
      cartItem.quantity += quantityToUpdate;
    } else {
      updatedUser.addedToCart.push({
        productId: productDetails._id,
        quantity: quantityToUpdate,
      });
    }

    await updatedUser.save();

    return {
      statusCode: 200,
      message: `Added to cart: ${productName}`,
      data: {
        productName,
        productQuanityToUpdate: quantityToUpdate,
      },
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

const addToWishList = async (userEmail, productName) => {
  try {
    let missing = cartDetailsMissing(userEmail, productName);
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
        message: "Product not found",
        data: [],
        success: false,
      };
    }

    // update wishlist
    const updatedUser = await User.findOneAndUpdate(
      { userEmail },
      { $addToSet: { addedToWishList: { productId: productDetails?._id } } },
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
  addToCartService,
  addToWishList,
  deleteFromWishList,
};
