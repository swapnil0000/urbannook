import bcrypt from "bcrypt";
import { validateUserInput } from "../utlis/CommonResponse.js";
import { ApiError, ApiRes } from "../utlis/index.js";
import User from "../model/user.model.js";
import {
  addToCartService,
  addToWishList,
  loginService,
  registerService,
  deleteFromWishList,
} from "../services/user.auth.service.js";
import cookieOptions from "../config/config.js";
import { profileFetchService } from "../services/common.auth.service.js";
import Product from "../model/product.model.js";
const userLogin = async (req, res) => {
  try {
    const { userEmail, userPassword } = req.body;
    // field Missing , existing User and pass check
    let result = await loginService(userEmail, userPassword);
    console.log(result, "====result");

    if (result?.statusCode >= 400) {
      return res.status(Number(result?.statusCode)).json(result);
    }
    return res
      .status(Number(result?.statusCode))
      .cookie("userAccessToken", result?.data?.userAccessToken, cookieOptions)
      .json(
        new ApiRes(Number(result?.statusCode), `User Details`, {
          role: result?.data?.role,
          userName: result?.data?.userName,
          userEmail: result?.data?.userEmail,
          userMobileNumber: result?.data?.userMobileNumber,
          userAddresults: result?.data?.userAddress,
          userPinCode: result?.data?.userPinCode,
          addedToCart: result?.data?.addedToCart,
          userPreviousOrder: result?.data?.userPreviousOrder,
          userAccessToken: result?.data?.userAccessToken,
        }),
        true
      );
  } catch (error) {
    return new ApiError(500, null, `Internal Server Error -${error}`, false);
  }
};

const userRegister = async (req, res) => {
  try {
    const {
      userEmail,
      userPassword,
      userName,
      userAddress,
      userPinCode,
      userMobileNumber,
    } = req.body;

    //fieldMissing and existing User check
    let result = await registerService(
      userEmail,
      userPassword,
      userMobileNumber,
      userAddress,
      userPinCode,
      userName
    );
    // when user registers - for first time we are generating token so we can move them directly to home page
    let token = await loginService(userEmail, userPassword);

    if (result?.statusCode >= 400) {
      return res.status(Number(result?.statusCode)).json(result);
    }

    return res
      .status(200)
      .cookie("userAccessToken", token?.data?.userAccessToken, cookieOptions)
      .json(
        new ApiRes(
          200,
          `User created with ${userEmail}`,
          { userEmail, userAccessToken: token?.data?.userAccessToken },
          true
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userProfile = async (req, res) => {
  try {
    const { userEmail } = req.user;
    const userDetails = await profileFetchService({ userEmail, role: "User" });
    if (!userDetails) {
      return res
        .status(404)
        .json(new ApiError(404, "User not found", null, false));
    }
    return res
      .status(200)
      .json(new ApiRes(200, `User Details`, userDetails, true));
  } catch (error) {
    return res.status(500).json(new ApiError(500, error.message, null, false));
  }
};

const userAddToCart = async (req, res) => {
  try {
    const { userEmail } = req.user;
    const { productName, productQuanity } = req.body;
    // fieldMissing and adding to cart check
    const productAdditionToCart = await addToCartService(
      userEmail,
      productName,
      productQuanity
    );
    if (!productAdditionToCart?.success) {
      return res
        .status(Number(productAdditionToCart?.statusCode))
        .json(
          new ApiError(
            productAdditionToCart?.statusCode,
            productAdditionToCart?.message,
            productAdditionToCart?.data,
            productAdditionToCart?.success
          )
        );
    }
    return res
      .status(Number(productAdditionToCart?.statusCode))
      .json(
        new ApiRes(
          productAdditionToCart?.statusCode,
          productAdditionToCart?.message,
          productAdditionToCart?.data,
          productAdditionToCart?.success
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userGetAddToCart = async (req, res) => {
  try {
    const { userEmail } = req.user;
    if (!userEmail) {
      return res
        .status(404)
        .json(new ApiError(404, `User Email not found exist`, null, false));
    }
    const userExist = await User.findOne({ userEmail });
    if (!userExist)
      return res
        .status(404)
        .json(new ApiError(404, `User doesn't exist in DB`, null, false));

    return res
      .status(200)
      .json(
        new ApiRes(
          200,
          `Preview of Added to cart`,
          userExist?.addedToCart,
          true
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userUpdateCartQuantity = async (req, res) => {
  try {
    const { userEmail } = req.user;
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res
        .status(400)
        .json(
          new ApiError(400, "productId and quantity are required", null, false)
        );
    }

    const user = await User.findOne({ userEmail });
    if (!user) {
      return res
        .status(404)
        .json(new ApiError(404, "User not found", null, false));
    }

    const cartItem = user.addedToCart.find(
      (item) => item.productId.toString() === productId
    );

    if (!cartItem) {
      return res
        .status(404)
        .json(new ApiError(404, "Product not found in cart", null, false));
    }

    // Quantity <= 0 → remove item
    if (quantity <= 0) {
      user.addedToCart = user.addedToCart.filter(
        (item) => item.productId.toString() !== productId
      );
    } else {
      cartItem.quantity = quantity;
    }

    await user.save();

    return res
      .status(200)
      .json(
        new ApiRes(200, "Cart updated successfully", user.addedToCart, true)
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, null, false));
  }
};

const userRemoveFromCart = async (req, res) => {
  try {
    const { userEmail } = req.user;
    const { productId } = req.params;

    const user = await User.findOne({ userEmail });
    if (!user) {
      return res
        .status(404)
        .json(new ApiError(404, "User not found", null, false));
    }

    const initialLength = user.addedToCart.length;

    user.addedToCart = user.addedToCart.filter(
      (item) => item.productId.toString() !== productId
    );

    if (initialLength === user.addedToCart.length) {
      return res
        .status(404)
        .json(new ApiError(404, "Product not found in cart", null, false));
    }

    await user.save();

    return res
      .status(200)
      .json(
        new ApiRes(200, "Product removed from cart", user.addedToCart, true)
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, null, false));
  }
};

const userClearCart = async (req, res) => {
  try {
    const { userEmail } = req.user;

    const user = await User.findOne({ userEmail });
    if (!user) {
      return res
        .status(404)
        .json(new ApiError(404, "User not found", null, false));
    }

    user.addedToCart = [];
    await user.save();

    return res
      .status(200)
      .json(new ApiRes(200, "Cart cleared successfully", [], true));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, null, false));
  }
};

const userAddToWishList = async (req, res) => {
  try {
    const { userEmail } = req.user;
    const { productName } = req.body;

    // fieldMissing and Addition To WishList check
    const productAdditionToWishList = await addToWishList(
      userEmail,
      productName
    );

    if (!productAdditionToWishList?.success) {
      return res
        .status(Number(productAdditionToWishList?.statusCode))
        .json(
          new ApiError(
            productAdditionToWishList?.statusCode,
            productAdditionToWishList?.message,
            productAdditionToWishList?.data,
            productAdditionToWishList?.success
          )
        );
    }
    return res
      .status(Number(productAdditionToWishList?.statusCode))
      .json(
        new ApiRes(
          productAdditionToWishList?.statusCode,
          productAdditionToWishList?.message,
          productAdditionToWishList?.data,
          productAdditionToWishList?.success
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userGetProductWishList = async (req, res) => {
  try {
    const { userEmail } = req.user;
    const userExist = await User.findOne({ userEmail });

    if (!userExist)
      return res
        .status(404)
        .json(
          new ApiError(
            404,
            `User Email not found or user doesn't exist`,
            null,
            false
          )
        );
    const productDetails = await Product.findById(
      userExist?.addedToWishList
    ).select("-_id");
    return res
      .status(200)
      .json(new ApiRes(200, `Preview of Added to cart`, productDetails, true));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userDeleteFromProductWishList = async (req, res) => {
  try {
    const { userEmail } = req.user;
    const { productId } = req.params;
    const deleteProduct = await deleteFromWishList(userEmail, productId);
    if (!deleteProduct?.success) {
      return res
        .status(Number(deleteProduct?.statusCode))
        .json(
          new ApiError(
            deleteProduct?.statusCode,
            deleteProduct?.message,
            deleteProduct?.data,
            deleteProduct?.success
          )
        );
    }

    return res
      .status(200)
      .json(
        new ApiRes(
          deleteProduct?.statusCode,
          deleteProduct?.message,
          deleteProduct?.data,
          deleteProduct?.success
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userForgetuserPassword = async (req, res) => {
  try {
    const { userEmail } = req.user;
    const { userMobileNumber } = req.body;

    if (!userEmail || !userMobileNumber) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            `userEmail or Mobile Number is required`,
            missing?.data,
            missing?.success
          )
        );
    }

    const userDetails = await User.findOne({
      $or: [{ userEmail }, { userMobileNumber }],
    });
    if (!userDetails) {
      return {
        statusCode: 404,
        message: "User doesn't exist",
        data: null,
        success: false,
      };
    }
    // send otp to userEmail or mno whichever is used
    //verify otp
    // forgot userPassword
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userResetPassword = async (req, res) => {
  try {
    const { userEmail } = req.user;
    const { currentuserPassword, newuserPassword } = req.body;
    if (!userEmail || !currentuserPassword) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            `userEmail or currentuserPassword is required`,
            missing?.data,
            missing?.success
          )
        );
    }
    const userDetails = await User.findOne({ userEmail });
    let result = await loginService(userEmail, currentuserPassword);
    if (result?.statusCode >= 400) {
      return res.status(Number(result?.statusCode)).json(result);
    }
    //new pass and curr pass comparison
    const passCheck = (await userDetails.passCheck(currentuserPassword))
      ? true
      : false;
    const oldPassAndNewPassCompare = await bcrypt.compare(
      newuserPassword,
      userDetails?.userPassword
    );

    if (passCheck) {
      if (oldPassAndNewPassCompare)
        return res
          .status(200)
          .json(
            new ApiRes(
              200,
              `Current userPassword and New userPassword is same for user - ${userEmail}`,
              userEmail,
              true
            )
          );
    }

    if (!userDetails?._id) {
      return res
        .status(Number(400))
        .json(new ApiError(400, `Unable to reset userPassword`, null, false));
    }
    userDetails.userPassword = newuserPassword;
    await userDetails.save(); // using this because while using findOne it doesn't trigger pre middleware and hence plain text saved
    return res
      .status(Number(200))
      .json(
        new ApiRes(
          200,
          `userPassword updated successfully for user ${userEmail}`,
          userEmail,
          true
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userUpdateProfile = async (req, res) => {
  try {
    const { userEmail } = req.user;
    // not adding userMobileNumber becuase they would be requiring otp verification
    const { userName, userAddress, userPinCode } = req.body;
    if (!userEmail) {
      return res
        .status(404)
        .json(new ApiError(404, `Email is required for update`, null, false));
    }

    let validate = validateUserInput({ userName, userAddress, userPinCode });
    if (!validate?.success) {
      return res
        .status(Number(validate?.statusCode))
        .json(
          new ApiError(
            validate?.statusCode,
            validate?.message,
            validate?.data,
            validate?.success
          )
        );
    }

    if (String(userPinCode).length > 0 && String(userPinCode).length != 6) {
      return res
        .status(404)
        .json(
          new ApiError(404, `userPinCode must be of 6 digits`, null, false)
        );
    }

    const updatingFieldValues = {};
    userName?.length > 0 && (updatingFieldValues.userName = userName);
    userAddress?.length > 0 && (updatingFieldValues.userAddress = userAddress);
    String(userPinCode).length > 0 &&
      String(userPinCode).length < 7 &&
      String(userPinCode).length == 6 &&
      (updatingFieldValues.userPinCode = userPinCode);

    /* This is for finding and updating the fields only and only if the currValu and DB Stored values are different  i.e. $or does this for us firstly checks then $ne compares the values from db and currentValue*/
    const updatedUserDetails = await User.findOneAndUpdate(
      {
        userEmail,
        $or: [
          userName ? { userName: { $ne: userName } } : {},
          userAddress ? { userAddress: { $ne: userAddress } } : {},
          userPinCode ? { userPinCode: { $ne: userPinCode } } : {},
        ],
      },
      {
        $set: updatingFieldValues,
      },
      {
        new: true,
      }
    );
    if (!updatedUserDetails) {
      return res
        .status(400)
        .json(new ApiError(400, "No changes detected", null, false));
    }
    return res.status(200).json(
      new ApiRes(
        200,
        `User Details Updated of - ${userEmail}`,
        {
          userName: updatedUserDetails?.userName,
          userAddress: updatedUserDetails?.userAddress,
          userPinCode: updatedUserDetails?.userPinCode,
        },
        true
      )
    );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userAccountDeletePreview = async (req, res) => {
  try {
    const { userEmail } = req.user;

    if (!userEmail) {
      return res
        .status(400)
        .json(new ApiError(400, `Email is required for deleting`, null, false));
    }

    const userDetails = await User.findOne({ userEmail });
    if (!userDetails) {
      return res
        .status(404)
        .json(new ApiError(404, "User not found", null, false));
    }

    // Generate token (base64 encode the email)
    const confirmToken = Buffer.from(userEmail).toString("base64");

    return res.status(200).json(
      new ApiRes(
        200,
        "Are you sure you want to delete your account?",
        {
          userEmail,
          confirmToken,
          confirmDelete: true,
          note: "Send this token with confirmDelete=true to delete account",
        },
        true
      )
    );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userAccountDeleteConfirm = async (req, res) => {
  const { confirmToken, confirmDelete } = req.body;

  if (!confirmToken || confirmDelete !== true) {
    return res
      .status(400)
      .json(
        new ApiError(
          400,
          `confirmToken and confirmDelete=true are required for deleting`,
          null,
          false
        )
      );
  }

  try {
    // Decode token to get userEmail
    const userEmail = Buffer.from(confirmToken, "base64").toString("utf-8");

    // Find user
    const user = await User.findOne({ userEmail });
    if (!user) {
      return res
        .status(404)
        .json(new ApiError(404, "User not found", null, false));
    }

    // Delete user
    await User.deleteOne({ userEmail });

    return res
      .status(200)
      .json(new ApiRes(200, "User account deleted successfully", null, true));
  } catch (err) {
    return res
      .status(500)
      .json(new ApiError(500, "Internal server error", err, false));
  }
};

const userOrderPreviousHistory = async (req, res) => {
  try {
    const { userEmail } = req.user;
    if (!userEmail) {
      return res
        .status(404)
        .json(new ApiError(404, `User Email Not found`, null, false));
    }
    const userPreviousOrder = await User.findOne({ userEmail }).populate(
      "userPreviousOrder.productId",
      "productName sellingPrice"
    );
    const orders = userPreviousOrder?.userPreviousOrder || [];

    return res
      .status(200)
      .json(
        new ApiRes(
          200,
          orders.length === 0
            ? "No orders placed yet"
            : "Orders fetched successfully",
          { userEmail, userPreviousOrder: orders },
          true
        )
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

export {
  userLogin,
  userRegister,
  userProfile,
  userAddToCart,
  userGetAddToCart,
  userOrderPreviousHistory,
  userAccountDeletePreview,
  userAccountDeleteConfirm,
  userResetPassword,
  userUpdateProfile,
  userAddToWishList,
  userGetProductWishList,
  userDeleteFromProductWishList,
  userUpdateCartQuantity,
  userRemoveFromCart,
  userClearCart,
  userForgetuserPassword,
};
