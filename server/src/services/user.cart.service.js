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

const addToCartService = async ({ userId, productId, productQuanity, variant, image }) => {
  const userAndProductIdValidation = cartDetailsMissing(userId, productId);
  if (!userAndProductIdValidation?.success) {
    throw new ValidationError(
      userAndProductIdValidation?.message,
      userAndProductIdValidation?.data,
    );
  }

  const userDetails = await User.findOne({ userId }).lean();
  if (!userDetails) {
    throw new AuthenticationError("Invalid userDetails - unauthorized");
  }

  const productDetails = await Product.findOne(
    { productId },
    { productName: 1, color: 1, variantDetails: 1 },
  ).lean();

  if (!productDetails) {
    throw new NotFoundError(`productDetails not found with ${productId}`);
  }

  // Determine the effective variant
  let selectedVariant = variant;
  if (!selectedVariant || selectedVariant === "N/A") {
    const availableVariants = (productDetails.variantDetails && productDetails.variantDetails.length > 0)
      ? productDetails.variantDetails.map(v => v.variantName)
      : productDetails.color;

    selectedVariant =
      availableVariants && availableVariants.length > 0
        ? availableVariants[0]
        : "N/A";
  }

  let selectedImage = image;
  
  if (!selectedImage && productDetails.variantDetails) {
    const variantObj = productDetails.variantDetails.find(v => v.variantName === selectedVariant);
    if (variantObj && variantObj.variantImage && variantObj.variantImage.length > 0) {
      selectedImage = variantObj.variantImage[0];
    } else if (productDetails.variantDetails[0]?.variantImage?.[0]) {
       selectedImage = productDetails.variantDetails[0].variantImage[0];
    }
  }

  if (!selectedImage) {
    selectedImage = "https://urbannook.in/assets/logo.webp";
  }

  // Composite Key for Map: productId:variant
  const cartKey = `${productId}:${selectedVariant}`;

  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, products: {} });
  }

  // Check if item already exists with this key
  const existingItem = (cart.products instanceof Map) 
    ? cart.products.get(cartKey) 
    : cart.products[cartKey];

  if (existingItem) {
    return {
      statusCode: 200,
      message: "Already in cart",
      data: `User - ${userDetails.name}, Product - ${productDetails.productName} (${selectedVariant})`,
      success: true,
    };
  }

  // STRICT: only save selectedVariant, never selectedColor
  const newItem = { 
    quantity: productQuanity || 1, 
    selectedVariant: selectedVariant, 
    image: selectedImage 
  };

  if (cart.products instanceof Map) {
    cart.products.set(cartKey, newItem);
  } else {
    if (!cart.products) cart.products = {};
    cart.products[cartKey] = newItem;
  }
  
  cart.markModified('products');
  await cart.save();

  return {
    statusCode: 200,
    message: `Added to cart`,
    data: `User - ${userDetails?.name}, Product: ${productDetails.productName} (${selectedVariant})`,
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
        extractedProductId: {
          $arrayElemAt: [{ $split: ["$items.k", ":"] }, 0],
        },
        variantFromKey: {
          $let: {
            vars: {
              parts: { $split: ["$items.k", ":"] }
            },
            in: {
              $cond: {
                if: { $gt: [{ $size: "$$parts" }, 1] },
                then: { $arrayElemAt: ["$$parts", 1] },
                else: "N/A"
              }
            }
          }
        }
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
        mongoId: "$product._id",
        productId: "$product.productId",
        cartKey: "$items.k",
        name: "$product.productName",
        selectedVariant: {
          $let: {
            vars: {
              rawVariant: { 
                $ifNull: [
                  "$items.v.selectedVariant", 
                  { $ifNull: ["$items.v.selectedColor", "$variantFromKey"] }
                ] 
              }
            },
            in: { 
              $cond: [
                { $or: [{ $eq: ["$$rawVariant", ""] }, { $not: ["$$rawVariant"] }] }, 
                "N/A", 
                "$$rawVariant"
              ] 
            }
          }
        },
        price: {
          $let: {
            vars: {
              currentVariant: { 
                $ifNull: [
                  "$items.v.selectedVariant", 
                  { $ifNull: ["$items.v.selectedColor", "$variantFromKey"] }
                ] 
              },
              variantMatch: {
                $filter: {
                  input: { $ifNull: ["$product.variantDetails", []] },
                  as: "vd",
                  cond: { 
                    $eq: [
                      "$$vd.variantName", 
                      { $ifNull: ["$items.v.selectedVariant", { $ifNull: ["$items.v.selectedColor", "$variantFromKey"] }] }
                    ] 
                  }
                }
              }
            },
            in: {
              $cond: {
                if: { $gt: [{ $size: "$$variantMatch" }, 0] },
                then: { $ifNull: [{ $arrayElemAt: ["$$variantMatch.variantPrice", 0] }, 0] },
                else: { 
                  $ifNull: [
                    { $arrayElemAt: ["$product.variantDetails.variantPrice", 0] }, 
                    { $ifNull: ["$product.price", 0] }
                  ]
                }
              }
            }
          }
        },
        image: {
          $cond: {
            if: { $and: [{ $not: { $isNumber: "$items.v" } }, { $ifNull: ["$items.v.image", false] }] },
            then: "$items.v.image",
            else: {
              $let: {
                vars: {
                  firstVariant: { $arrayElemAt: [{ $ifNull: ["$product.variantDetails", []] }, 0] }
                },
                in: {
                  $ifNull: [
                    { $arrayElemAt: [{ $ifNull: ["$$firstVariant.variantImage", []] }, 0] },
                    "https://urbannook.in/assets/logo.webp"
                  ]
                }
              }
            }
          }
        },
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
              { $eq: ["$isEligibleForCalc", true] },
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

const cartQuantityService = async ({ userId, productId, quantity, action, variant, image }) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  if (!productId || !action) {
    throw new ValidationError("productId and action are required");
  }

  const cartDetails = await Cart.findOne({ userId });

  if (!cartDetails) {
    throw new NotFoundError("Cart not found");
  }

  const productQuanityMap = cartDetails.products;
  const requestedVariant = variant || "N/A";
  
  // Robust Key Selection: Try exact match first, then legacy
  let cartKey = `${productId}:${requestedVariant}`;
  
  if (!productQuanityMap.has(cartKey)) {
    if (productQuanityMap.has(String(productId))) {
      cartKey = String(productId);
    } else {
      throw new ValidationError(`Product ${productId} variant ${requestedVariant} not in cart`);
    }
  }

  let itemData = productQuanityMap.get(cartKey);
  let currentQty = (typeof itemData === "object" && itemData !== null) ? itemData.quantity : itemData;

  switch (action) {
    case "add":
      currentQty += (quantity || 1);
      break;
    case "sub":
      if (currentQty <= (quantity || 1)) {
        productQuanityMap.delete(cartKey);
        action = "remove";
      } else {
        currentQty -= (quantity || 1);
      }
      break;
    case "remove":
      productQuanityMap.delete(cartKey);
      break;
    default:
      throw new ValidationError("Invalid action");
  }

  if (action !== "remove") {
    // FORCE MIGRATE: remove selectedColor, use selectedVariant
    const updatedItemData = { 
        quantity: currentQty,
        selectedVariant: requestedVariant, 
        image: (typeof itemData === "object" && itemData !== null ? itemData.image : null) || image 
    };
    
    // If the old key was legacy or different, delete it and use the new correct key
    if (cartKey !== `${productId}:${requestedVariant}`) {
        productQuanityMap.delete(cartKey);
        cartKey = `${productId}:${requestedVariant}`;
    }
    
    productQuanityMap.set(cartKey, updatedItemData);
  }

  cartDetails.markModified('products');
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

const mergeGuestCartService = async ({ userId, guestItems }) => {
  if (!userId) {
    throw new AuthenticationError("Unauthorized");
  }

  if (!Array.isArray(guestItems) || guestItems.length === 0) {
    return {
      statusCode: 200,
      message: "No guest items to merge",
      data: { syncedItems: [], failedItems: [], totalSynced: 0, totalFailed: 0 },
      success: true
    };
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
      const productId = guestItem.mongoId || guestItem.id || guestItem.productId;
      const selectedVariant = guestItem.selectedVariant || guestItem.selectedColor || 'N/A';
      const guestQuantity = guestItem.quantity || 1;

      const productDetails = await Product.findOne(
        { productId },
        { productName: 1, color: 1, variantDetails: 1 },
      ).lean();

      if (!productDetails) {
        failedItems.push({
          ...guestItem,
          reason: `Product not found: ${productId}`
        });
        continue;
      }

      let effectiveVariant = selectedVariant;
      if (!effectiveVariant || effectiveVariant === "N/A") {
        const availableVariants = (productDetails.variantDetails && productDetails.variantDetails.length > 0)
          ? productDetails.variantDetails.map(v => v.variantName)
          : productDetails.color;

        effectiveVariant =
          availableVariants && availableVariants.length > 0
            ? availableVariants[0]
            : "N/A";
      }

      const cartKey = `${productId}:${effectiveVariant}`;
      
      let selectedImage = guestItem.image;
      if (!selectedImage && productDetails.variantDetails) {
        const variantObj = productDetails.variantDetails.find(v => v.variantName === effectiveVariant);
        if (variantObj && variantObj.variantImage && variantObj.variantImage.length > 0) {
          selectedImage = variantObj.variantImage[0];
        } else if (productDetails.variantDetails[0]?.variantImage?.[0]) {
          selectedImage = productDetails.variantDetails[0].variantImage[0];
        }
      }

      if (!selectedImage) {
        selectedImage = "https://urbannook.in/assets/logo.webp";
      }

      const existingData = (cart.products instanceof Map) ? cart.products.get(cartKey) : cart.products[cartKey];

      if (existingData) {
        const existingQty = (typeof existingData === "object" && existingData !== null) ? existingData.quantity : existingData;
        const newQty = existingQty + guestQuantity;

        const updatedItem = {
          quantity: newQty,
          selectedVariant: effectiveVariant,
          image: selectedImage
        };

        if (cart.products instanceof Map) {
          cart.products.set(cartKey, updatedItem);
        } else {
          cart.products[cartKey] = updatedItem;
        }

        syncedItems.push({
          productId,
          variant: effectiveVariant,
          action: 'merged',
          previousQty: existingQty,
          addedQty: guestQuantity,
          newQty: newQty
        });
      } else {
        const newItem = {
          quantity: guestQuantity,
          selectedVariant: effectiveVariant,
          image: selectedImage
        };

        if (cart.products instanceof Map) {
          cart.products.set(cartKey, newItem);
        } else {
          cart.products[cartKey] = newItem;
        }

        syncedItems.push({
          productId,
          variant: effectiveVariant,
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

  cart.markModified('products');
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
