import Product from "../model/product.model.js";
import { finalProductName } from "../utlis/ValidateRes.js";
import {
  adminLoginService,
  totalProductService,
} from "../services/admin.auth.service.js";
import { ApiError, ApiRes } from "../utlis/index.js";
import { v4 as uuidv4 } from "uuid";
import { fieldMissing } from "../utlis/ValidateRes.js";
import cookieOptions from "../config/config.js";
import { profileFetchService } from "../services/common.auth.service.js";
import UserWaistList from "../model/user.waitlist.model.js";
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    const action = "login";
    const missing = fieldMissing({ email, password, action });
    if (!missing?.success) {
      return res
        .status(Number(missing?.statusCode))
        .json(
          new ApiError(
            missing?.statusCode,
            missing?.message,
            missing?.data,
            missing?.success,
          ),
        );
    }
    // existing User and pass check
    let result = await adminLoginService(email, password);

    if (result?.statusCode >= 400) {
      return res.status(Number(result?.statusCode)).json(result);
    }
    return res
      .status(Number(result?.statusCode))
      .cookie("adminAccessToken", result?.data?.adminAccessToken, cookieOptions)
      .json(
        new ApiRes(
          Number(result?.statusCode),
          result?.message,
          result?.data,
          result?.success,
        ),
      );
  } catch (error) {
    return new ApiError(500, null, `Internal Server Error -${error}`, false);
  }
};

const adminProfile = async (req, res) => {
  try {
    const { userEmail } = req.body;
    const userDetails = await profileFetchService({ userEmail, role: "Admin" });
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

const createProduct = async (req, res) => {
  const {
    productName,
    sellingPrice,
    productStatus,
    productQuantity = 1,
  } = req.body;

  const normalizedName = finalProductName(productName);

  const existing = await Product.findOne({ productName: normalizedName });
  if (existing) {
    return res
      .status(409)
      .json(new ApiError(409, "Product already exists", null, false));
  }

  const product = await Product.create({
    productName: normalizedName,
    productId: `UN-PROD-${uuidv4()}`,
    sellingPrice,
    productStatus,
    productQuantity,
  });

  return res
    .status(201)
    .json(new ApiRes(201, "Product created", product, true));
};
const updateProduct = async (req, res) => {
  const { productId } = req.params;

  const {
    productName,
    sellingPrice,
    productCategory,
    productQuantity,
    productStatus,
  } = req.body;

  const existingProductDetails = await Product.findOne({
    productName,
  });
  console.log(existingProductDetails);

  if (existingProductDetails) {
    return res
      .status(409)
      .json(
        new ApiError(
          409,
          `Product with name ${existingProductDetails?.productName} - already exist and it's Product Id is ${existingProductDetails?.productId} `,
          null,
          false,
        ),
      );
  }

  const updatedProductQunatity = {
    productName: productName?.length > 0 ? productName : null,
    sellingPrice: sellingPrice?.length > 0 ? sellingPrice : null,
    productCategory: productCategory?.length > 0 ? productCategory : null,
    productStatus: productStatus?.length > 0 ? productStatus : null,
    productQuantity: productQuantity?.length > 0 ? productQuantity : 0,
  };

  const product = await Product.findOneAndUpdate(
    { productId },
    {
      $set: {
        productName,
        sellingPrice,
        productCategory,
        productStatus,
      },
      $inc: {
        productQuantity: updatedProductQunatity?.productQuantity,
      },
    },
    {
      new: true,
    },
  ).select("-_id -__v -createdAt -updatedAt");

  if (!product) {
    return res
      .status(404)
      .json(new ApiError(404, "Failed to update details", null, false));
  }

  return res
    .status(200)
    .json(new ApiRes(200, "Product updated successfully", product, true));
};

const adminLogout = (req, res) => {
  const { userEmail } = req.body;
  if (!userEmail)
    return res
      .status(400)
      .json(new ApiError(400, `UserId not avaialable`, [], false));
  return res
    .clearCookie("adminAccessToken", cookieOptions)
    .status(200)
    .json(new ApiRes(200, `Logout Successfully`, [], true));
};

const getJoinedUserWaitList = async (_, res) => {
  try {
    const joinedUserWaitList = await UserWaistList.find()
      .select("-_id")
      .sort({ createdAt: -1 });
    if (!joinedUserWaitList) {
      return res
        .status(404)
        .json(
          new ApiError(404, `Failed to fetch joinedUserWaitList`, null, false),
        );
    }
    const totalJoinedUserWaitList =
      await UserWaistList.countDocuments(joinedUserWaitList);
    return res.status(200).json(
      new ApiRes(
        200,
        !totalJoinedUserWaitList
          ? `Sorry! No User Joined WaitList`
          : `Joined User WaitList`,
        !totalJoinedUserWaitList
          ? null
          : {
              joinedUserWaitList,
              totalJoinedUserWaitList,
            },
        true,
      ),
    );
  } catch (error) {
    return new ApiError(500, null, `Internal Server Error -${error}`, false);
  }
};

const totalProducts = async (_, res) => {
  try {
    const result = await totalProductService();

    return res
      .status(result.statusCode)
      .json(
        new ApiRes(
          result.statusCode,
          result.message,
          result.data,
          result.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, null, `Internal Server Error - ${error}`, false));
  }
};

export {
  adminLogin,
  adminLogout,
  adminProfile,
  createProduct,
  updateProduct,
  getJoinedUserWaitList,
  totalProducts,
};
