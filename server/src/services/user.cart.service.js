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

const addToCartService = async ({ userId, productId, productQuanity, variant, color, image }) => {
  const validation = cartDetailsMissing(userId, productId);
  if (!validation?.success) throw new ValidationError(validation?.message);

  const product = await Product.findOne({ productId }).lean();
  if (!product) throw new NotFoundError("Product not found");

  // 1. DETERMINE VARIANT (Strict Fallback)
  let vName = variant || color;
  if (!vName || vName === "N/A" || vName === "") {
    vName = product.variantDetails?.[0]?.variantName || product.color?.[0] || "Standard Variant";
  }

  // 2. DETERMINE IMAGE
  let vImage = image;
  if (!vImage) {
    const matchedV = product.variantDetails?.find(v => v.variantName === vName);
    vImage = matchedV?.variantImage?.[0] || product.productImg || product.variantDetails?.[0]?.variantImage?.[0] || "https://urbannook.in/assets/logo.webp";
  }

  const cartKey = `${productId}:${vName}`;
  let cart = await Cart.findOne({ userId });
  if (!cart) cart = new Cart({ userId, products: {} });

  // SELF-HEALING: If an old N/A entry exists for this product, delete it to prevent collision
  if (vName !== "N/A") {
      const oldNaKey = `${productId}:N/A`;
      if (cart.products.has(oldNaKey)) {
          cart.products.delete(oldNaKey);
      }
  }

  const existing = (cart.products instanceof Map) ? cart.products.get(cartKey) : cart.products[cartKey];
  if (existing) return { statusCode: 200, message: `Product variant (${vName}) already in cart`, success: true };

  // 3. SAVE STRICT STRUCTURE (Only selectedVariant)
  const item = { 
      quantity: Number(productQuanity) || 1, 
      selectedVariant: vName, 
      image: vImage 
  };
  
  if (cart.products instanceof Map) cart.products.set(cartKey, item);
  else {
      if (!cart.products) cart.products = {};
      cart.products[cartKey] = item;
  }
  
  cart.markModified('products');
  await cart.save();
  return { statusCode: 200, message: `Added ${vName} to collection successfully`, success: true };
};

const getCartService = async ({ userId }) => {
  if (!userId) throw new AuthenticationError("Unauthorized");

  const cartData = await Cart.aggregate([
    { $match: { userId } },
    { $project: { items: { $objectToArray: "$products" } } },
    { $unwind: "$items" },
    {
      $addFields: {
        pId: { $arrayElemAt: [{ $split: ["$items.k", ":"] }, 0] },
        vFromKey: {
          $let: {
            vars: { parts: { $split: ["$items.k", ":"] } },
            in: { $cond: [{ $gt: [{ $size: "$$parts" }, 1] }, { $arrayElemAt: ["$$parts", 1] }, "N/A"] }
          }
        }
      }
    },
    { $lookup: { from: "products", localField: "pId", foreignField: "productId", as: "p" } },
    { $unwind: { path: "$p", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        mongoId: "$p._id",
        productId: "$p.productId",
        cartKey: "$items.k",
        name: "$p.productName",
        // SELF-HEALING VARIANT NAME
        selectedVariant: {
          $let: {
            vars: {
              rawV: { $ifNull: ["$items.v.selectedVariant", "$vFromKey"] },
              fallbackV: { $ifNull: [{ $arrayElemAt: ["$p.variantDetails.variantName", 0] }, "Standard Variant"] }
            },
            in: { $cond: [{ $or: [{ $eq: ["$$rawV", "N/A"] }, { $not: ["$$rawV"] }] }, "$$fallbackV", "$$rawV"] }
          }
        },
        // BULLETPROOF PRICE LOGIC
        price: {
          $let: {
            vars: {
              currentV: { $ifNull: ["$items.v.selectedVariant", "$vFromKey"] },
              vDetails: { $ifNull: ["$p.variantDetails", []] }
            },
            in: {
              $let: {
                vars: {
                  matched: {
                    $filter: {
                      input: "$$vDetails",
                      as: "vd",
                      cond: { $eq: ["$$vd.variantName", "$$currentV"] }
                    }
                  }
                },
                in: {
                  $cond: [
                    { $gt: [{ $size: "$$matched" }, 0] },
                    { $arrayElemAt: ["$$matched.variantPrice", 0] },
                    { $ifNull: [{ $arrayElemAt: ["$$vDetails.variantPrice", 0] }, { $ifNull: ["$p.price", 299] }] }
                  ]
                }
              }
            }
          }
        },
        // BULLETPROOF IMAGE LOGIC
        image: {
            $let: {
                vars: {
                    currentV: { $ifNull: ["$items.v.selectedVariant", "$vFromKey"] },
                    vDetails: { $ifNull: ["$p.variantDetails", []] }
                },
                in: {
                    $let: {
                        vars: {
                            matched: { $filter: { input: "$$vDetails", as: "vd", cond: { $eq: ["$$vd.variantName", "$$currentV"] } } }
                        },
                        in: {
                            $let: {
                                vars: {
                                    mImg: { $arrayElemAt: [{ $arrayElemAt: ["$$matched.variantImage", 0] }, 0] },
                                    pImg: "$p.productImg"
                                },
                                in: { $ifNull: ["$items.v.image", { $ifNull: ["$$mImg", { $ifNull: ["$$pImg", "https://urbannook.in/assets/logo.webp"] }] }] }
                            }
                        }
                    }
                }
            }
        },
        quantity: { $cond: [{ $isNumber: "$items.v" }, "$items.v", { $ifNull: ["$items.v.quantity", 1] }] },
        stock: "$p.productQuantity",
        isEligibleForCalc: {
          $cond: [{ $and: [{ $ifNull: ["$p", false] }, { $eq: ["$p.productStatus", "in_stock"] }, { $gt: ["$p.productQuantity", 0] }] }, true, false]
        }
      }
    },
    {
      $group: {
        _id: null,
        allItems: { $push: "$$ROOT" },
        cartSubtotal: { $sum: { $cond: ["$isEligibleForCalc", { $multiply: ["$price", "$quantity"] }, 0] } },
        totalQuantity: { $sum: { $cond: ["$isEligibleForCalc", "$quantity", 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        availableItems: { $filter: { input: "$allItems", as: "i", cond: { $eq: ["$$i.isEligibleForCalc", true] } } },
        unavailableItems: { $filter: { input: "$allItems", as: "i", cond: { $eq: ["$$i.isEligibleForCalc", false] } } },
        cartSubtotal: 1,
        totalQuantity: 1
      }
    }
  ]);
//changes
  return {
    statusCode: 200,
    message: "Cart fetched",
    data: cartData[0] || { availableItems: [], unavailableItems: [], cartSubtotal: 0, totalQuantity: 0 },
    success: true
  };
};

const cartQuantityService = async ({ userId, productId, quantity, action, variant, color, image }) => {
  const cart = await Cart.findOne({ userId });
  if (!cart) throw new NotFoundError("Cart not found");

  const vName = variant || color || "Standard Variant";
  let cartKey = `${productId}:${vName}`;
  
  if (!cart.products.has(cartKey)) {
      if (cart.products.has(String(productId))) cartKey = String(productId);
      else throw new ValidationError("Item not in cart");
  }

  let item = cart.products.get(cartKey);
  let qty = (typeof item === 'object' && item !== null) ? item.quantity : item;

  if (action === "add") qty += (quantity || 1);
  else if (action === "sub") {
      if (qty <= (quantity || 1)) { cart.products.delete(cartKey); action = "remove"; }
      else qty -= (quantity || 1);
  } else if (action === "remove") cart.products.delete(cartKey);

  if (action !== "remove") {
      const updated = { quantity: qty, selectedVariant: vName, image: (typeof item === 'object' ? item.image : null) || image };
      if (cartKey !== `${productId}:${vName}`) cart.products.delete(cartKey);
      cart.products.set(`${productId}:${vName}`, updated);
  }

  cart.markModified('products');
  await cart.save();
  return { statusCode: 200, message: "Cart updated", success: true };
};

const clearCartService = async ({ userId }) => {
  await Cart.updateOne({ userId }, { $set: { products: {} }, $unset: { appliedCoupon: 1 } });
  return { statusCode: 200, message: "Cart cleared", success: true };
};

const mergeGuestCartService = async ({ userId, guestItems }) => {
  let cart = await Cart.findOne({ userId });
  if (!cart) cart = new Cart({ userId, products: {} });

  for (const item of guestItems) {
    try {
        const pId = item.mongoId || item.id || item.productId;
        let vName = item.selectedVariant || "Standard Variant";
        const qty = Number(item.quantity) || 1;
        const key = `${pId}:${vName}`;
        
        // Anti-NA during merge
        if (vName === "N/A") continue;

        const existing = cart.products.get(key);
        const currentQty = (existing ? (typeof existing === 'object' ? existing.quantity : existing) : 0);
        
        cart.products.set(key, { quantity: currentQty + qty, selectedVariant: vName, image: item.image });
    } catch (e) { console.error("Merge error", e); }
  }

  cart.markModified('products');
  await cart.save();
  return { statusCode: 200, message: "Merged", success: true };
};

export { addToCartService, getCartService, cartQuantityService, clearCartService, mergeGuestCartService };
