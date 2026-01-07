import User from "../model/user.model.js";
import Product from "../model/product.model.js";
import mongoose from "mongoose";
import { cartDetailsMissing, fieldMissing } from "../utlis/CommonResponse.js";

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
  const res = await User.findOne({ userEmail: userEmail.toLowerCase() });
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
      message: "Current Password is wronng",
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

  const fullNameRegex = /^[A-Za-z]+(?:\s[A-Za-z]+)*$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/;
  const mobileRegex = /^[6-9]\d{9}$/;
  const addressRegex = /^[A-Za-z0-9\s,./#-]{5,100}$/;
  const pinCodeRegex = /^[1-9][0-9]{5}$/;

  if (!fullNameRegex.test(userName.trim())) {
    return {
      statusCode: 400,
      message: "Full name must contain only alphabets and single spaces ",
      success: false,
    };
  }

  if (!emailRegex.test(userEmail)) {
    return {
      statusCode: 400,
      message: "Invalid email format",
      success: false,
    };
  }

  if (!passwordRegex.test(userPassword)) {
    return {
      statusCode: 400,
      message:
        "Password must be at least 8 characters with uppercase, lowercase, number & special character",
      success: false,
    };
  }

  if (!mobileRegex.test(String(userMobileNumber))) {
    return {
      statusCode: 400,
      message: "Invalid mobile number (must be 10 digits, start with 6–9)",
      success: false,
    };
  }

  if (!addressRegex.test(userAddress)) {
    return {
      statusCode: 400,
      message: "Address contains invalid characters or length",
      success: false,
    };
  }

  if (!pinCodeRegex.test(String(userPinCode))) {
    return {
      statusCode: 400,
      message: "Pin code must be exactly 6 digits and cannot start with 0",
      success: false,
    };
  }

  const res = await User.findOne({
    $or: [{ userMobileNumber }, { userEmail: userEmail.toLowerCase() }],
  });

  if (res) {
    let matchedValue;
    if (res?.userEmail == userEmail) matchedValue = userEmail;
    else if (res?.userMobileNumber == userMobileNumber)
      matchedValue = userMobileNumber;

    return {
      statusCode: 409,
      message: `User Already exist with - ${matchedValue}`,
      data: userEmail,
      success: false,
    };
  }

  const newRegisteringUser = await User.create({
    userName: userName.toLowerCase(),
    userEmail: userEmail.toLowerCase(),
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
        message: `Product not found in DB with name : ${productName}`,
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
      { userEmail },
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

export {
  loginService,
  registerService,
  addToCartService,
  addToWishList,
  deleteFromWishList,
};
