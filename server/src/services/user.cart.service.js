import Product from "../model/product.model.js";
import Cart from "../model/user.cart.model.js";
import User from "../model/user.model.js";
import { cartDetailsMissing } from "../utlis/ValidateRes.js";
const addToCartService = async ({ userId, productId }) => {
  try {
    const userAndProductIdValidation = cartDetailsMissing(userId, productId);
    if (!userAndProductIdValidation?.success) {
      return {
        statusCode: userAndProductIdValidation?.statusCode,
        message: userAndProductIdValidation?.message,
        data: userAndProductIdValidation?.data,
        success: userAndProductIdValidation?.success,
      };
    }

    /* `.lean()` is used here because we only need raw data for validation and checks.
      It returns a plain JavaScript object instead of a full Mongoose document,
     which improves performance and reduces memory usage. */

    const userDetails = await User.findOne({ userId }).lean();
    if (!userDetails) {
      return {
        statusCode: 401,
        message: "Invalid userDetails - unauthorized",
        data: null,
        success: false,
      };
    }

    const productDetails = await Product.findOne(
      { productId },
      { productName: 1 },
    ).lean();

    if (!productDetails) {
      return {
        statusCode: 404,
        message: `productDetails not found with ${productId}`,
        success: false,
      };
    }

    const key = `products.${productId}`;

    /*
     Existing Cart check and Updating are seperated intentionally because 
     MongoDB update queries do not reliably tell whether a field already existed or was newly added, 
     which makes it difficult to return the correct business message (“Added” vs “Already in cart”).
     */
    const cart = await Cart.findOne({
      userId,
      [key]: { $exists: true },
    }).lean();

    if (cart) {
      return {
        statusCode: 200,
        message: "Already in cart",
        data: `User - ${userDetails.name}, Product - ${productDetails.productName}`,
        success: true,
      };
    }

    /* Cart Structure -> userId -> user mongooseId , product -> key : value -> product mongooseId : 1 
      Here quantity is saved with 1 always - to update we use different endpoints
    */
    await Cart.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: { userId },
        $set: { [key]: 1 },
      },
      { upsert: true },
    );

    return {
      statusCode: 200,
      message: `Added to cart`,
      data: `User - ${userDetails?.name} and Product Name :${productDetails.productName}`,
      success: true,
    };
  } catch (error) {
    console.error(`[ERROR] AddToCart Error:`, error.message, error.stack);
    return {
      statusCode: 500,
      message: "Internal server error",
      data: error.message,
      success: false,
    };
  }
};

const getCartService = async ({ userId }) => {
  try {
    if (!userId)
      return { statusCode: 401, message: "Unauthorized", success: false };

    const cartData = await Cart.aggregate([
      { $match: { userId } },
      { $project: { items: { $objectToArray: "$products" } } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.k",
          foreignField: "productId",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 0,
          productId: "$product.productId",
          name: "$product.productName",
          price: "$product.sellingPrice",
          image: "$product.productImg",
          quantity: "$items.v",
        },
      },
      {
        $group: {
          _id: null,
          items: { $push: "$$ROOT" },
          totalQuantity: { $sum: "$quantity" },
          cartSubtotal: {
            $sum: { $multiply: ["$price", "$quantity"] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          items: 1,
          totalQuantity: 1,
          cartSubtotal: 1,
        },
      },
    ]);

    if (!cartData || cartData.length === 0) {
      return {
        statusCode: 200,
        message: "Cart is empty",
        data: { items: [], totalQuantity: 0, cartSubtotal: 0 },
        success: true,
      };
    }

    return {
      statusCode: 200,
      message: "Cart preview fetched successfully",
      data: cartData[0],
      success: true,
    };
  } catch (error) {
    console.error(`[ERROR] GetCart Error:`, error.message, error.stack);
    return {
      statusCode: 500,
      message: "Internal server error",
      data: error.message,
      success: false,
    };
  }
};

const cartQuantityService = async ({ userId, productId, quantity, action }) => {
  if (!userId)
    return {
      statusCode: 401,
      message: "Unauthorized",
      data: null,
      success: false,
    };
  if (!productId && quantity === undefined && !action) {
    return {
      statusCode: 400,
      message: "productId, quantity and action are required",
      success: false,
    };
  }
  const cartDetails = await Cart.findOne({ userId });
  if (!cartDetails)
    return { statusCode: 404, message: "Cart not found", success: false };

  const productQuanityMap = cartDetails.products;
  const cartHasProductOrNot = productQuanityMap.has(String(productId));

  if (!cartHasProductOrNot) {
    return { statusCode: 400, message: "Product not in cart", success: false };
  }

  const productQuantity = productQuanityMap.get(productId);
  switch (action) {
    case "add":
      productQuanityMap.set(productId, productQuantity + quantity);
      break;
    case "sub":
      if (productQuantity <= quantity) {
        return {
          statusCode: 400,
          message: "Cannot reduce below 1. Use remove instead.",
          success: false,
        };
      }
      productQuanityMap.set(productId, productQuantity - quantity);
      break;
    case "remove":
      productQuanityMap.delete(productId);
      break;
    default:
      return { statusCode: 400, message: "Invalid action", success: false };
  }

  await cartDetails.save();

  if (cartDetails.appliedCoupon && cartDetails.appliedCoupon.isApplied) {
    const couponName = cartDetails.appliedCoupon.name;
    const recalculate = await applyCouponCodeService({
      userId,
      couponCodeName: couponName,
    });

    if (!recalculate.success) {
      await Cart.updateOne({ userId }, { $unset: { appliedCoupon: 1 } });
      return {
        statusCode: 200,
        message: "Quantity updated and coupon removed (Min value not met)",
        success: true,
      };
    }
  }
  return {
    statusCode: 200,
    message: `Quantity updated: ${action}`,
    success: true,
  };
};

const clearCartService = async ({ userId }) => {
  if (!userId)
    return { statusCode: 401, message: "Unauthorized", success: false };
  await Cart.updateOne(
    { userId },
    {
      $set: { products: {} },
      $unset: { appliedCoupon: 1 },
    },
  );

  return {
    statusCode: 200,
    message: "Cart and coupons cleared successfully",
    success: true,
  };
};

export {
  addToCartService,
  getCartService,
  cartQuantityService,
  clearCartService,
};
