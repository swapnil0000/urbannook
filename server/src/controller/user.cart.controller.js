import {
  addToCartService,
  previewCartService,
  cartQuantityService,
  clearCartService,
} from "../services/user.cart.service.js";
import { ApiError, ApiRes } from "../utlis/index.js";
const userAddToCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const { productId, productQuanity } = req.body;
    // fieldMissing and adding to cart check
    const productAdditionToCart = await addToCartService({
      userId,
      productId,
      productQuanity: productQuanity || 1,
    });
    if (!productAdditionToCart?.success) {
      return res
        .status(Number(productAdditionToCart?.statusCode))
        .json(
          new ApiError(
            productAdditionToCart?.statusCode,
            productAdditionToCart?.message,
            productAdditionToCart?.data,
            productAdditionToCart?.success,
          ),
        );
    }
    return res
      .status(Number(productAdditionToCart?.statusCode))
      .json(
        new ApiRes(
          productAdditionToCart?.statusCode,
          productAdditionToCart?.message,
          productAdditionToCart?.data,
          productAdditionToCart?.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userPreviewCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const cartDetails = await previewCartService({ userId });
    if (!cartDetails?.success) {
      return res
        .status(Number(cartDetails?.statusCode))
        .json(
          new ApiError(
            cartDetails?.statusCode,
            cartDetails?.message,
            cartDetails?.data,
            cartDetails?.success,
          ),
        );
    }
    return res
      .status(Number(cartDetails?.statusCode))
      .json(
        new ApiRes(
          cartDetails?.statusCode,
          cartDetails?.message,
          cartDetails?.data,
          cartDetails?.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};

const userUpdateCartQuantity = async (req, res) => {
  try {
    const { userId } = req.user;
    const { productId, quantity, action } = req.body || {};
    const productAdditionToCart = await cartQuantityService({
      userId,
      productId,
      quantity: quantity || 1,
      action,
    });
    if (!productAdditionToCart?.success) {
      return res
        .status(Number(productAdditionToCart?.statusCode))
        .json(
          new ApiError(
            productAdditionToCart?.statusCode,
            productAdditionToCart?.message,
            productAdditionToCart?.data,
            productAdditionToCart?.success,
          ),
        );
    }
    return res
      .status(Number(productAdditionToCart?.statusCode))
      .json(
        new ApiRes(
          productAdditionToCart?.statusCode,
          productAdditionToCart?.message,
          productAdditionToCart?.data,
          productAdditionToCart?.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, null, false));
  }
};

const userClearCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const clearCartServiceValidation = await clearCartService({ userId });
    if (!clearCartServiceValidation?.success) {
      return res
        .status(Number(clearCartServiceValidation?.statusCode))
        .json(
          new ApiError(
            clearCartServiceValidation?.statusCode,
            clearCartServiceValidation?.message,
            clearCartServiceValidation?.data,
            clearCartServiceValidation?.success,
          ),
        );
    }
    return res
      .status(Number(clearCartServiceValidation?.statusCode))
      .json(
        new ApiRes(
          clearCartServiceValidation?.statusCode,
          clearCartServiceValidation?.message,
          clearCartServiceValidation?.data,
          clearCartServiceValidation?.success,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, null, false));
  }
};

const userOrderPreviousHistory = async (req, res) => {
  try {
    const { userId } = req.user;
    if (!email) {
      return res
        .status(404)
        .json(new ApiError(404, `User Email Not found`, null, false));
    }
    const userPreviousOrder = await User.findOne({ email }).populate(
      "userPreviousOrder.productId",
      "productName sellingPrice",
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
          { email, userPreviousOrder: orders },
          true,
        ),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, [], false));
  }
};
export {
  userAddToCart,
  userPreviewCart as userGetAddToCart,
  userUpdateCartQuantity,
  userClearCart,
  userOrderPreviousHistory,
};
