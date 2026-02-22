import {
  addToWishListService,
  deleteFromWishListService,
  getWishListService,
} from "../services/user.wishlist.service.js";
import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

const userAddToWishList = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { productId } = req.body || {};
  
  const result = await addToWishListService(userId, productId);

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
});

const userGetProductWishList = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const result = await getWishListService(userId);

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
});

const userDeleteFromProductWishList = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { productId } = req.params;
  
  const result = await deleteFromWishListService(userId, productId);

  return res
    .status(200)
    .json(
      new ApiRes(
        result.statusCode,
        result.message,
        result.data,
        result.success,
      ),
    );
});

export {
  userAddToWishList,
  userGetProductWishList,
  userDeleteFromProductWishList,
};
