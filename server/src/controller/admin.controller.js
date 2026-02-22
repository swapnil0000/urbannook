import {
  adminLoginService,
  totalProductService,
  existingProductUpdateService,
  createNewProductService,
  viewProductDetailsService,
} from "../services/admin.auth.service.js";
import { ApiRes } from "../utils/index.js";
import { ValidationError, InternalServerError } from "../utils/errors.js";
import { fieldMissing } from "../utils/ValidateRes.js";
import cookieOptions from "../config/config.js";
import { profileFetchService } from "../services/common.auth.service.js";
import UserWaistList from "../model/user.waitlist.model.js";
import {
  nfcGenrateUserIdService,
  nfcAssignGeneratedUserIdService,
  nfcPauseGeneratedUserIdService,
} from "../services/nfc.image.service.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  const action = "login";
  const missing = fieldMissing({ email, password, action });
  if (!missing?.success) {
    throw new ValidationError(missing?.message, missing?.data);
  }
  // existing User and pass check
  let adminLoginServiceValidation = await adminLoginService(email, password);

  return res
    .status(Number(adminLoginServiceValidation?.statusCode))
    .cookie(
      "adminAccessToken",
      adminLoginServiceValidation?.data?.adminAccessToken,
      cookieOptions,
    )
    .json(
      new ApiRes(
        Number(adminLoginServiceValidation?.statusCode),
        adminLoginServiceValidation?.message,
        adminLoginServiceValidation?.data,
        adminLoginServiceValidation?.success,
      ),
    );
});

const adminProfile = asyncHandler(async (req, res) => {
  const { userEmail } = req.body;
  const profileFetchServiceValidation = await profileFetchService({
    userEmail,
    role: "Admin",
  });

  return res
    .status(Number(profileFetchServiceValidation.statusCode))
    .json(
      new ApiRes(
        profileFetchServiceValidation.statusCode,
        profileFetchServiceValidation.message,
        profileFetchServiceValidation.data,
        profileFetchServiceValidation.success,
      ),
    );
});

const createProduct = asyncHandler(async (req, res) => {
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
  
  const result = await createNewProductService(
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
  
  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success
      )
    );
});

const viewProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { email: adminEmail } = req.user;
  
  const result = await viewProductDetailsService(adminEmail, productId);
  
  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success
      )
    );
});

const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.body;
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

  const result = await existingProductUpdateService(
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

  return res
    .status(result.statusCode)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success
      )
    );
});

const adminLogout = asyncHandler(async (req, res) => {
  const { userEmail } = req.body;
  
  if (!userEmail) {
    throw new ValidationError("UserId not available");
  }
  
  return res
    .clearCookie("adminAccessToken", cookieOptions)
    .status(200)
    .json(new ApiRes(200, `Logout Successfully`, [], true));
});

const getJoinedUserWaitList = asyncHandler(async (_, res) => {
  const joinedUserWaitList = await UserWaistList.find()
    .select("userName userEmail createdAt updatedAt")
    .sort({ createdAt: -1 });
    
  if (!joinedUserWaitList) {
    throw new InternalServerError("Failed to fetch joinedUserWaitList");
  }
  
  const totalJoinedUserWaitList = await UserWaistList.countDocuments();
  
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
});

const totalProducts = asyncHandler(async (_, res) => {
  const totalProductServiceValidation = await totalProductService();
  
  return res
    .status(Number(totalProductServiceValidation.statusCode))
    .json(
      new ApiRes(
        totalProductServiceValidation.statusCode,
        totalProductServiceValidation.message,
        totalProductServiceValidation.data,
        totalProductServiceValidation.success,
      ),
    );
});

const nfcGenrateUserId = asyncHandler(async (req, res) => {
  const { email: adminEmail } = req.user || {};
  const nfcGenrateUserIdServiceValidation = await nfcGenrateUserIdService({
    adminEmail,
  });

  return res
    .status(Number(nfcGenrateUserIdServiceValidation.statusCode))
    .json(
      new ApiRes(
        nfcGenrateUserIdServiceValidation.statusCode,
        nfcGenrateUserIdServiceValidation.message,
        nfcGenrateUserIdServiceValidation.data,
        nfcGenrateUserIdServiceValidation.success,
      ),
    );
});

const nfcAssignGeneratedUserId = asyncHandler(async (req, res) => {
  const { email: adminEmail } = req.user || {};
  const { userId } = req.body;
  const nfcAssignGeneratedUserIdServiceValidation =
    await nfcAssignGeneratedUserIdService({
      adminEmail,
      userId,
    });

  return res
    .status(Number(nfcAssignGeneratedUserIdServiceValidation.statusCode))
    .json(
      new ApiRes(
        nfcAssignGeneratedUserIdServiceValidation.statusCode,
        nfcAssignGeneratedUserIdServiceValidation.message,
        nfcAssignGeneratedUserIdServiceValidation.data,
        nfcAssignGeneratedUserIdServiceValidation.success,
      ),
    );
});

const nfcPauseGeneratedUserId = asyncHandler(async (req, res) => {
  const { email: adminEmail } = req.user || {};
  const { userId } = req.body;
  const nfcPauseGeneratedUserIdServiceValidation =
    await nfcPauseGeneratedUserIdService({
      adminEmail,
      userId,
    });

  return res
    .status(Number(nfcPauseGeneratedUserIdServiceValidation.statusCode))
    .json(
      new ApiRes(
        nfcPauseGeneratedUserIdServiceValidation.statusCode,
        nfcPauseGeneratedUserIdServiceValidation.message,
        nfcPauseGeneratedUserIdServiceValidation.data,
        nfcPauseGeneratedUserIdServiceValidation.success,
      ),
    );
});

export {
  adminLogin,
  adminLogout,
  adminProfile,
  createProduct,
  viewProduct,
  updateProduct,
  getJoinedUserWaitList,
  totalProducts,
  nfcGenrateUserId,
  nfcAssignGeneratedUserId,
  nfcPauseGeneratedUserId,
};
