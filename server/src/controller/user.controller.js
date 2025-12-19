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
    const { email, password, mobileNumber } = req.body;
    //fieldMissing
    const action = "login";
    const actionRoute = "admin";

    let missing = fieldMissing(
      email,
      password,
      mobileNumber,
      action,
      actionRoute
    );
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
    let result = await loginService(email, password);
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
    const { email, password, mobileNumber } = req.body;
    //fieldMissing
    let action = "register";
    let missing = fieldMissing(email, password, mobileNumber, action);
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
    let result = await registerService(email, mobileNumber);
    if (result?.success == false) {
      return res.status(Number(result?.statusCode)).json(result);
    }
    const newRegisteringUser = await User.create({
      email,
      password,
      mobileNumber,
      previousOrder: null,
    });
    if (!newRegisteringUser)
      return res
        .status(400)
        .json(
          new ApiError(400, `Failed to create user with ${email}`, email, true)
        );
    return res
      .status(200)
      .json(new ApiRes(200, `User created with ${email}`, email, true));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userProfile = async (req, res) => {
  try {
    const { email } = req.body;
    const userDetails = await profileFetchService({ email, role: "User" });
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
  const { email, productName, productQuanity } = req.body;
  let missing = addToCartDetailsMissing(email, productName);

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
    email,
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

const userForgetPassword = async (req, res) => {
  const { email, mobileNumber } = req.body;

  if (!email || !mobileNumber) {
    return res
      .status(400)
      .json(
        new ApiError(
          400,
          `Email or Mobile Number is required`,
          missing?.data,
          missing?.success
        )
      );
  }

  const userDetails = await User.findOne({
    $or: [{ email }, { mobileNumber }],
  });
  if (!userDetails) {
    return {
      statusCode: 404,
      message: "User doesn't exist",
      data: null,
      success: false,
    };
  }
  // send otp to email or mno whichever is used
  //verify otp
  // forgot password
};

const userResetPassword = async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!email || !currentPassword) {
    return res
      .status(400)
      .json(
        new ApiError(
          400,
          `Email or currentPassword is required`,
          missing?.data,
          missing?.success
        )
      );
  }
  const userDetails = await User.findOne({ email });
  let result = await loginService(email, currentPassword);
  if (result?.statusCode >= 400) {
    return res.status(Number(result?.statusCode)).json(result);
  }
  //new pass and curr pass comparison
  const passCheck = (await userDetails.passCheck(currentPassword))
    ? true
    : false;
  const oldPassAndNewPassCompare = await bcrypt.compare(
    newPassword,
    userDetails?.password
  );

  if (passCheck) {
    if (oldPassAndNewPassCompare)
      return res
        .status(200)
        .json(
          new ApiRes(
            200,
            `Current Password and New Password is same for user - ${email}`,
            email,
            true
          )
        );
  }

  if (!userDetails?._id) {
    return res
      .status(Number(400))
      .json(new ApiError(400, `Unable to reset password`, null, false));
  }
  userDetails.password = newPassword;
  await userDetails.save(); // using this because while using findOneAndUpdate it doesn't trigger pre middleware and hence plain text saved
  return res
    .status(Number(200))
    .json(
      new ApiRes(
        200,
        `Password updated successfully for user ${email}`,
        email,
        true
      )
    );
};

const userUpdateProfile = async (req, res) => {
  const { email } = req.body;
  const action = "login";
  const actionRoute = "User" || "user" || "USER";

  let missing = fieldMissing(email, action, actionRoute);
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
};
export {
  userLogin,
  userRegister,
  userProfile,
  userAddToCart,
  userResetPassword,
  userUpdateProfile,
};
