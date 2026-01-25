import {
  existingProductUpdateService,
  createNewProductService,
} from "../services/admin.auth.service.js";
import {
  adminLoginService,
  totalProductService,
} from "../services/admin.auth.service.js";
import { ApiError, ApiRes } from "../utlis/index.js";

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
  const { email: adminEmail } = req.user;
  const {
    productName,
    productImg,
    productDes,
    sellingPrice,
    productCategory,
    productQuantity,
    productStatus,
    tags,
    productSubDes,
    productSubCategory,
  } = req.body || {};
  const createNewProductServiceValidation = await createNewProductService(
    adminEmail,
    productName,
    productImg,
    productDes,
    sellingPrice,
    productCategory,
    productQuantity,
    productStatus,
    tags,
    productSubDes,
    productSubCategory,
  );
  return !createNewProductServiceValidation?.success
    ? res
        .status(Number(createNewProductServiceValidation?.statusCode))
        .json(
          new ApiError(
            createNewProductServiceValidation?.statusCode,
            createNewProductServiceValidation?.message,
            createNewProductServiceValidation?.data,
            createNewProductServiceValidation?.success,
          ),
        )
    : res
        .status(Number(createNewProductServiceValidation?.statusCode))
        .json(
          new ApiRes(
            createNewProductServiceValidation?.statusCode,
            createNewProductServiceValidation?.message,
            createNewProductServiceValidation?.data,
            createNewProductServiceValidation?.success,
          ),
        );
};

const updateProduct = async (req, res) => {
  const { productId } = req.params;
  const { email: adminEmail } = req.user;
  const {
    productName,
    uiProductId,
    productImg,
    productDes,
    sellingPrice,
    productCategory,
    productQuantity,
    productStatus,
    tags,
    productSubDes,
    productSubCategory,
    action,
  } = req.body;

  const productUpateExistingServiceValidation =
    await existingProductUpdateService(
      adminEmail,
      productId,
      productName ? productName : null,
      uiProductId ? uiProductId : null,
      productImg ? productImg : null,
      productDes ? productDes : null,
      sellingPrice ? sellingPrice : null,
      productCategory ? productCategory : null,
      productQuantity ? productQuantity : null,
      productStatus ? productStatus : null,
      tags ? tags : null,
      productSubDes ? productSubDes : null,
      productSubCategory ? productSubCategory : null,
      action ? action : null,
    );

  return !productUpateExistingServiceValidation.success
    ? res
        .status(Number(productUpateExistingServiceValidation?.statusCode))
        .json(
          new ApiError(
            productUpateExistingServiceValidation?.statusCode,
            productUpateExistingServiceValidation?.message,
            productUpateExistingServiceValidation?.data,
            productUpateExistingServiceValidation?.success,
          ),
        )
    : res
        .status(Number(productUpateExistingServiceValidation?.statusCode))
        .json(
          new ApiRes(
            productUpateExistingServiceValidation?.statusCode,
            productUpateExistingServiceValidation?.message,
            productUpateExistingServiceValidation?.data,
            productUpateExistingServiceValidation?.success,
          ),
        );
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
