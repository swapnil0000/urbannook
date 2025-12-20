import bcrypt from "bcrypt";
import {
  addToCartDetailsMissing,
  fieldMissing,
} from "../utlis/CommonResponse.js";
import { ApiError, ApiRes } from "../utlis/index.js";
import User from "../model/user.model.js";
import {
  addToCart,
  loginService,
  registerService,
} from "../services/user.auth.service.js";
import cookieOptions from "../config/config.js";
import { profileFetchService } from "../services/common.auth.service.js";
const userLogin = async (req, res) => {
  try {
    const { userEmail, userPassword, userMobileNumber } = req.body;
    //fieldMissing
    let missing = fieldMissing({
      userEmail,
      userPassword,
      userMobileNumber,
      action: "login",
      actionRoute: "admin",
    });
    if (!missing?.success) {
      return res
        .status(Number(missing?.statusCode))
        .json(
          new ApiError(
            missing?.statusCode,
            missing?.message,
            missing?.data,
            missing?.success
          )
        );
    }
    // existing User and pass check
    let result = await loginService(userEmail, userPassword);
    if (result?.statusCode >= 400) {
      return res.status(Number(result?.statusCode)).json(result);
    }
    return res
      .status(Number(result?.statusCode))
      .cookie("userAccessToken", result?.data?.accessToken, cookieOptions)
      .cookie("role", result?.data?.role, cookieOptions)
      .json({
        email: result?.data?.email,
        message: result?.message,
        role: result?.data?.role,
      });
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
      return res
        .status(Number(missing?.statusCode))
        .json(
          new ApiError(
            missing?.statusCode,
            missing?.message,
            missing?.data,
            missing?.success
          )
        );
    }
    // existing User
    let result = await registerService(userEmail, userMobileNumber);
    if (result?.success == false) {
      return res.status(Number(result?.statusCode)).json(result);
    }
    const newRegisteringUser = await User.create({
      userName,
      userEmail,
      userPassword,
      userMobileNumber,
      userAddress,
      userPinCode,
      userPreviousOrder: null,
    });
    if (!newRegisteringUser)
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            `Failed to create user with ${userEmail}`,
            userEmail,
            true
          )
        );
    return res
      .status(200)
      .json(new ApiRes(200, `User created with ${userEmail}`, userEmail, true));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userProfile = async (req, res) => {
  try {
    const { userEmail } = req.body;
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
  const { userEmail, productName, productQuanity } = req.body;
  let missing = addToCartDetailsMissing(userEmail, productName);

  if (!missing?.success) {
    return res
      .status(Number(missing?.statusCode))
      .json(
        new ApiError(
          missing?.statusCode,
          missing?.message,
          missing?.data,
          missing?.success
        )
      );
  }

  // adding to cart
  const productAdditionToCart = await addToCart(
    userEmail,
    productName,
    productQuanity
  );
  if (!productAdditionToCart?.success) {
    return res
      .status(Number(missing?.statusCode))
      .json(
        new ApiError(
          missing?.statusCode,
          missing?.message,
          missing?.data,
          missing?.success
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
};

const userForgetuserPassword = async (req, res) => {
  const { userEmail, userMobileNumber } = req.body;

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
};

const userResetPassword = async (req, res) => {
  const { userEmail, currentuserPassword, newuserPassword } = req.body;
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
  await userDetails.save(); // using this because while using findOneAndUpdate it doesn't trigger pre middleware and hence plain text saved
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
};

const userUpdateProfile = async (req, res) => {
  const { userEmail } = req.body;
  const action = "login";
  const actionRoute = "User" || "user" || "USER";

  let missing = fieldMissing(userEmail, action, actionRoute);
  if (!missing?.success) {
    return res
      .status(Number(missing?.statusCode))
      .json(
        new ApiError(
          missing?.statusCode,
          missing?.message,
          missing?.data,
          missing?.success
        )
      );
  }

  const userDetails = await User.findOne({ userEmail });

  return res
    .status(200)
    .json(
      new ApiRes(
        200,
        `User Details Updated of - ${userEmail}`,
        userDetails,
        true
      )
    );
};
export {
  userLogin,
  userRegister,
  userProfile,
  userAddToCart,
  userResetPassword,
  userUpdateProfile,
};
