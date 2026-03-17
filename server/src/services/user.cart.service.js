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

const addToCartService = async ({ userId, productId, productQuanity, color }) => {
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
    { productName: 1, color: 1 },
  ).lean();

  if (!productDetails) {
    throw new NotFoundError(`productDetails not found with ${productId}`);
  }

  // Determine the effective color
  let selectedColor = color;
  if (!selectedColor || selectedColor === "N/A") {
    selectedColor =
      productDetails.color && productDetails.color.length > 0
        ? productDetails.color[0]
        : "N/A";
  }

  // Composite Key for Map: productId:color
  const cartKey = `${productId}:${selectedColor}`;
  const key = `products.${cartKey}`;

  const cart = await Cart.findOne({ userId }).lean();

  if (cart && cart.products && cart.products[cartKey]) {
    return {
      statusCode: 200,
      message: "Already in cart",
      data: `User - ${userDetails.name}, Product - ${productDetails.productName} (${selectedColor})`,
      success: true,
    };
  }

  await Cart.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: { userId },
      $set: {
        [key]: { quantity: productQuanity || 1, selectedColor },
      },
    },
    { upsert: true },
  );

  return {
    statusCode: 200,
    message: `Added to cart`,
    data: `User - ${userDetails?.name}, Product: ${productDetails.productName} (${selectedColor})`,
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
      $addFields: {
        // Composite key split: productId:color
        extractedProductId: {
          $arrayElemAt: [{ $split: ["$items.k", ":"] }, 0],
        },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "extractedProductId",
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
        cartKey: "$items.k", // Keep full key for updates
        name: "$product.productName",
        price: "$product.sellingPrice",
        image: "$product.productImg",
        quantity: {
          $cond: {
            if: { $isNumber: "$items.v" },
            then: "$items.v",
            else: {
              $cond: {
                if: { $isNumber: "$items.v.quantity" },
                then: "$items.v.quantity",
                else: 1
              }
            }
          }
        },
        selectedColor: {
          $cond: {
            if: { $isNumber: "$items.v" },
            then: "N/A",
            else: { $ifNull: ["$items.v.selectedColor", "N/A"] },
          },
        },
        stock: "$product.productQuantity",
        productStatus: "$product.productStatus",
        productFound: 1,
        isEligibleForCalc: {
          $cond: {
            if: { $gt: ["$productFound", 0] },
            then: {
              $and: [
                { $eq: ["$product.productStatus", "in_stock"] },
                { $gt: ["$product.productQuantity", 0] },
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
              {
                $and: [
                  "$isEligibleForCalc",
                  { $isNumber: "$price" },
                  { $gt: ["$quantity", 0] },
                ],
              },
              { $multiply: [{ $ifNull: ["$price", 0] }, { $ifNull: ["$quantity", 0] }] },
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
};

const cartQuantityService = async ({ userId, productId, quantity, action, color }) => {
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
  
  // Try to find by composite key first, fallback to plain productId
  let selectedColor = color || "N/A";
  let cartKey = `${productId}:${selectedColor}`;
  
  if (!productQuanityMap.has(cartKey)) {
    // Fallback check if it was stored without color (legacy)
    if (productQuanityMap.has(String(productId))) {
      cartKey = String(productId);
    } else {
      throw new ValidationError("Product variant not in cart");
    }
  }

  let itemData = productQuanityMap.get(cartKey);
  let currentQty = typeof itemData === "object" ? itemData.quantity : itemData;

  switch (action) {
    case "add":
      currentQty += quantity;
      break;
    case "sub":
      if (currentQty <= quantity) {
        throw new ValidationError("Cannot reduce below 1. Use remove instead.");
      }
      currentQty -= quantity;
      break;
    case "remove":
      productQuanityMap.delete(cartKey);
      break;
    default:
      throw new ValidationError("Invalid action");
  }

  if (action !== "remove") {
    if (typeof itemData === "object") {
      const updatedItemData = { ...itemData, quantity: currentQty };
      productQuanityMap.set(cartKey, updatedItemData);
    } else {
      productQuanityMap.set(cartKey, currentQty);
    }
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

// NEW: Dedicated merge service for guest cart items
const mergeGuestCartService = async ({ userId, guestItems }) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  if (!Array.isArray(guestItems) || guestItems.length === 0) {
    throw new ValidationError("guestItems must be a non-empty array");
  }

  const userDetails = await User.findOne({ userId }).lean();
  if (!userDetails) {
    throw new AuthenticationError("Invalid userDetails - unauthorized");
  }

  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, products: {} });
  }

  const syncedItems = [];
  const failedItems = [];

  for (const guestItem of guestItems) {
    try {
      const productId = guestItem.mongoId || guestItem.id;
      const selectedColor = guestItem.selectedColor || 'N/A';
      const guestQuantity = guestItem.quantity || 1;

      // Validate product exists
      const productDetails = await Product.findOne(
        { productId },
        { productName: 1, color: 1 },
      ).lean();

      if (!productDetails) {
        failedItems.push({
          ...guestItem,
          reason: `Product not found: ${productId}`
        });
        continue;
      }

      // Determine effective color
      let effectiveColor = selectedColor;
      if (!effectiveColor || effectiveColor === "N/A") {
        effectiveColor =
          productDetails.color && productDetails.color.length > 0
            ? productDetails.color[0]
            : "N/A";
      }

      const cartKey = `${productId}:${effectiveColor}`;

      // Check if item already exists in cart
      if (cart.products.has(cartKey)) {
        // Item exists - add guest quantity to existing quantity
        const existingData = cart.products.get(cartKey);
        const existingQty = typeof existingData === "object" ? existingData.quantity : existingData;
        const newQty = existingQty + guestQuantity;

        cart.products.set(cartKey, {
          quantity: newQty,
          selectedColor: effectiveColor
        });

        syncedItems.push({
          productId,
          color: effectiveColor,
          action: 'merged',
          previousQty: existingQty,
          addedQty: guestQuantity,
          newQty: newQty
        });
      } else {
        // Item doesn't exist - add it
        cart.products.set(cartKey, {
          quantity: guestQuantity,
          selectedColor: effectiveColor
        });

        syncedItems.push({
          productId,
          color: effectiveColor,
          action: 'added',
          quantity: guestQuantity
        });
      }
    } catch (e) {
      console.error('Failed to merge guest item:', guestItem, e);
      failedItems.push({
        ...guestItem,
        reason: e.message
      });
    }
  }

  // Save cart
  await cart.save();

  return {
    statusCode: 200,
    message: `Merged ${syncedItems.length} items${failedItems.length > 0 ? `, ${failedItems.length} failed` : ''}`,
    data: {
      syncedItems,
      failedItems,
      totalSynced: syncedItems.length,
      totalFailed: failedItems.length
    },
    success: failedItems.length === 0
  };
};

export {
  addToCartService,
  getCartService,
  cartQuantityService,
  clearCartService,
  mergeGuestCartService,
};
