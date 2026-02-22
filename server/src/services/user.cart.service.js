import Product from "../model/product.model.js";
import Cart from "../model/user.cart.model.js";
import User from "../model/user.model.js";
import { cartDetailsMissing } from "../utils/ValidateRes.js";
import { applyCouponCodeService } from "../services/coupon.code.service.js";
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
} from "../utils/errors.js";

const addToCartService = async ({ userId, productId }) => {
  const userAndProductIdValidation = cartDetailsMissing(userId, productId);
  if (!userAndProductIdValidation?.success) {
    throw new ValidationError(
      userAndProductIdValidation?.message,
      userAndProductIdValidation?.data,
    );
  }

  /* `.lean()` is used here because we only need raw data for validation and checks.
    It returns a plain JavaScript object instead of a full Mongoose document,
   which improves performance and reduces memory usage. */

  const userDetails = await User.findOne({ userId }).lean();
  if (!userDetails) {
    throw new AuthenticationError("Invalid userDetails - unauthorized");
  }

  const productDetails = await Product.findOne(
    { productId },
    { productName: 1 },
  ).lean();

  if (!productDetails) {
    throw new NotFoundError(`productDetails not found with ${productId}`);
  }

  const key = `products.${productId}`;

  /*
   Existing Cart check and Updating are seperated intentionally because 
   MongoDB update queries do not reliably tell whether a field already existed or was newly added, 
   which makes it difficult to return the correct business message ("Added" vs "Already in cart").
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
};

const getCartService = async ({ userId }) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

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
    {
      $addFields: {
        productFound: { $size: "$product" },
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        productId: "$product.productId",
        name: "$product.productName",
        price: "$product.sellingPrice",
        image: "$product.productImg",
        quantity: "$items.v",
        stock: "$product.productQuantity",
        productStatus: "$product.productStatus",
        productFound: 1,
        // Calculation eligibility: Stock check and Status check
        isEligibleForCalc: {
          $cond: {
            if: { $gt: ["$productFound", 0] },
            then: {
              $and: [
                { $eq: ["$product.productStatus", "in_stock"] }, 
                { $gt: ["$product.productQuantity", 0] }
              ],
            },
            else: false,
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        allItems: { $push: "$$ROOT" },
        cartSubtotal: {
          $sum: {
            $cond: [
              "$isEligibleForCalc",
              { $multiply: ["$price", "$quantity"] },
              0,
            ],
          },
        },
        totalQuantity: {
          $sum: { $cond: ["$isEligibleForCalc", "$quantity", 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        availableItems: {
          $filter: {
            input: "$allItems",
            as: "item",
            cond: { $eq: ["$$item.isEligibleForCalc", true] },
          },
        },
        unavailableItems: {
          $filter: {
            input: "$allItems",
            as: "item",
            cond: { $eq: ["$$item.isEligibleForCalc", false] },
          },
        },
        cartSubtotal: 1,
        totalQuantity: 1,
      },
    },
  ]);

  if (!cartData || cartData.length === 0) {
    return {
      statusCode: 200,
      message: "Cart is empty",
      data: {
        availableItems: [],
        unavailableItems: [],
        cartSubtotal: 0,
        totalQuantity: 0,
      },
      success: true,
    };
  }

  return {
    statusCode: 200,
    message: "Cart preview fetched",
    data: cartData[0],
    success: true,
  };
}

const cartQuantityService = async ({ userId, productId, quantity, action }) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  if (!productId || quantity === undefined || !action) {
    throw new ValidationError("productId, quantity and action are required");
  }

  const cartDetails = await Cart.findOne({ userId });

  if (!cartDetails) {
    throw new NotFoundError("Cart not found");
  }

  const productQuanityMap = cartDetails.products;
  const cartHasProductOrNot = productQuanityMap.has(String(productId));

  if (!cartHasProductOrNot) {
    throw new ValidationError("Product not in cart");
  }

  const productQuantity = productQuanityMap.get(productId);
  switch (action) {
    case "add":
      productQuanityMap.set(productId, productQuantity + quantity);
      break;
    case "sub":
      if (productQuantity <= quantity) {
        throw new ValidationError("Cannot reduce below 1. Use remove instead.");
      }
      productQuanityMap.set(productId, productQuantity - quantity);
      break;
    case "remove":
      productQuanityMap.delete(productId);
      break;
    default:
      throw new ValidationError("Invalid action");
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
    message: `Cart quantity updated successfully`,
    success: true,
  };
};

const clearCartService = async ({ userId }) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

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
