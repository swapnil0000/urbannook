import { addToCartService } from "../services/user.cart.service.js";
import Product from "../model/product.model.js";

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

const userGetAddToCart = async (req, res) => {
  try {
    const { userId } = req.user;
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
    const productIds = userExist?.addedToWishList.map((id) => {
      return id?.productId;
    });
    const productDetails = await Product.find({
      _id: productIds,
    }).select("-_id");

    if (userExist?.addedToCart?.length == 0) {
      return res
        .status(200)
        .json(
          new ApiRes(200, `Nothing in cart for user ${userEmail}`, null, true),
        );
    }
    return res
      .status(200)
      .json(new ApiRes(200, `Preview of Added to cart`, productDetails, true));
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

    if (!productId || quantity === undefined || !action) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "productId, quantity and action are required",
            null,
            false,
          ),
        );
    }

    if (isNaN(quantity) || Number(quantity) < 0) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "quantity must be a non-negative number",
            null,
            false,
          ),
        );
    }

    const user = await User.findOne({ userEmail });
    const cartItem = user.addedToCart.find(
      (item) => item.productId.toString() === productId,
    );
    if (!cartItem) {
      return res
        .status(404)
        .json(new ApiError(404, "Product not found in cart", null, false));
    }

    switch (action) {
      case "add":
        cartItem.quantity += Number(quantity);
        break;
      case "sub":
        cartItem.quantity -= Number(quantity);
        if (cartItem.quantity <= 0) {
          user.addedToCart = user.addedToCart.filter(
            (item) => item.productId.toString() !== productId,
          );
        }
        break;

      default:
        return res
          .status(400)
          .json(
            new ApiError(400, "Invalid action. Use add | sub", null, false),
          );
    }

    await user.save();

    return res
      .status(200)
      .json(
        new ApiRes(200, "Cart updated successfully", user.addedToCart, true),
      );
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, null, false));
  }
};

const userRemoveFromCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const { productId } = req.body;

    const user = await User.findOne({ userEmail });
    if (!user) {
      return res
        .status(404)
        .json(new ApiError(404, "User not found", null, false));
    }
    const updatedUser = await User.findOneAndUpdate(
      { userEmail, "addedToCart.productId": productDetails._id },
      {
        $pull: {
          addedToCart: {
            productId,
          },
        },
      },
      {
        new: true,
      },
    );
    if (!updatedUser)
      return res
        .status(200)
        .json(
          new ApiRes(200, "Product already removed from cart", null, false),
        );

    return res
      .status(200)
      .json(new ApiRes(200, "Product removed from cart", null, true));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, `Internal Server Error - ${error}`, null, false));
  }
};

const userClearCart = async (req, res) => {
  try {
    const { userId } = req.user;

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
  userGetAddToCart,
  userUpdateCartQuantity,
  userRemoveFromCart,
  userClearCart,
  userOrderPreviousHistory,
};
