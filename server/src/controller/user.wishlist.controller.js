import {
  addToWishListService,
  deleteFromWishListService,
  getWishListService,
} from "../services/user.wishlist.service.js";
import { ApiError, ApiRes } from "../utlis/index.js";
const userAddToWishList = async (req, res) => {
  try {
    const { userId } = req.user;
    const { productId } = req.body || {};
    // fieldMissing and Addition To WishList check
    const productAdditionToWishList = await addToWishListService(
      userId,
      productId,
    );

    if (!productAdditionToWishList?.success) {
      return res
        .status(Number(productAdditionToWishList?.statusCode))
        .json(
          new ApiError(
            productAdditionToWishList?.statusCode,
            productAdditionToWishList?.message,
            productAdditionToWishList?.data,
            productAdditionToWishList?.success,
          ),
        );
    }
    return res
      .status(Number(productAdditionToWishList?.statusCode))
      .json(
        new ApiRes(
          productAdditionToWishList?.statusCode,
          productAdditionToWishList?.message,
          productAdditionToWishList?.data,
          productAdditionToWishList?.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userGetProductWishList = async (req, res) => {
  try {
    const { userId } = req.user;
    const response = await getWishListService(userId);

    return res
      .status(response.statusCode)
      .json(
        new ApiRes(
          response.statusCode,
          response.message,
          response.data,
          response.success,
        ),
      );
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
    const deleteProduct = await deleteFromWishListService(userEmail, productId);
    if (!deleteProduct?.success) {
      return res
        .status(Number(deleteProduct?.statusCode))
        .json(
          new ApiError(
            deleteProduct?.statusCode,
            deleteProduct?.message,
            deleteProduct?.data,
            deleteProduct?.success,
          ),
        );
    }

    return res
      .status(200)
      .json(
        new ApiRes(
          deleteProduct?.statusCode,
          deleteProduct?.message,
          deleteProduct?.data,
          deleteProduct?.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

export {
  userAddToWishList,
  userGetProductWishList,
  userDeleteFromProductWishList,
};
