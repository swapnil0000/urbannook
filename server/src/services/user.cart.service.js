import Product from "../model/product.model.js";
import Cart from "../model/user.cart.model.js";
import User from "../model/user.model.js";
import { cartDetailsMissing } from "../utils/ValidateRes.js";
import { applyCouponCodeService } from "../services/coupon.code.service.js";
import { getPublicOfferConfig } from "../utils/offer.util.js";
import { getActiveCartRules, evaluateCartRules, applyBestDiscount } from "../utils/cartRule.util.js";
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
        // Whether this product can be gift-wrapped (admin opt-in per
        // product) — used to scale the Gift Wrap add-on's quantity/price to
        // only the eligible lines, never every product in the cart.
        giftWrapEligible: { $ifNull: ["$p.giftWrapEligible", false] },
        // Optional per-product title template (e.g. "{variant} Cosplay Wooden
        // Katana ({variant} Inspired, 104cm)"). Frontend substitutes
        // {variant} with `selectedVariant` below; blank/missing = use `name`
        // as-is, so this can't affect products that never set it.
        variantTitleTemplate: { $ifNull: ["$p.variantTitleTemplate", ""] },
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
        // Eligibility requires product-level status AND the selected variant
        // not being out of stock (manual flag, or a tracked quantity <= 0 —
        // same rule as the PDP/order-creation guard). A variant with no
        // tracked quantity (null) or no match at all is never OOS by this
        // check — mirrors the tolerant fallback style already used for
        // price/image above. This keeps the cart subtotal/eligible-items
        // list honest without duplicating the hard order-creation guard in
        // rp.payment.controller.js (assertVariantAvailable), which remains
        // the real enforcement point.
        isEligibleForCalc: {
          $cond: [
            {
              $and: [
                { $ifNull: ["$p", false] },
                { $eq: ["$p.productStatus", "in_stock"] },
                {
                  $not: {
                    $let: {
                      vars: {
                        currentV: { $ifNull: ["$items.v.selectedVariant", "$vFromKey"] },
                        vDetails: { $ifNull: ["$p.variantDetails", []] }
                      },
                      in: {
                        $let: {
                          vars: {
                            matched: {
                              $filter: { input: "$$vDetails", as: "vd", cond: { $eq: ["$$vd.variantName", "$$currentV"] } }
                            }
                          },
                          in: {
                            $let: {
                              vars: {
                                mOOS: { $arrayElemAt: ["$$matched.variantOutOfStock", 0] },
                                mQty: { $arrayElemAt: ["$$matched.variantQuantity", 0] }
                              },
                              in: {
                                $or: [
                                  { $eq: ["$$mOOS", true] },
                                  { $and: [{ $ne: ["$$mQty", null] }, { $lte: ["$$mQty", 0] }] }
                                ]
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              ]
            },
            true,
            false
          ]
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

  // Gift wrap: read the boolean intent off the cart doc directly (aggregation
  // above only ever touches `products`), then price it live from the offers
  // collection — never from anything stored on the cart. If the offer has
  // since been switched off, price collapses to 0 and `selected` is forced
  // false so the cart never shows a phantom paid line for a dead offer.
  const cartDoc = await Cart.findOne({ userId }).select("giftWrap giftWrapNoteOptions").lean();
  const giftWrapConfig = await getPublicOfferConfig("gift_wrap");
  const base = cartData[0] || { availableItems: [], unavailableItems: [], cartSubtotal: 0, totalQuantity: 0 };

  // Gift wrap is priced per ELIGIBLE UNIT — sums quantity across every
  // eligible line (2x the same eligible product is 2 gift wraps, not 1).
  // Must match rp.payment.controller.js's giftWrapQty exactly, or the cart
  // display would disagree with what actually gets billed.
  const lineCount = base.availableItems.reduce(
    (sum, i) => (i.giftWrapEligible ? sum + (Number(i.quantity) || 0) : sum),
    0,
  );
  const giftWrapSelected = !!cartDoc?.giftWrap && giftWrapConfig.isActive && lineCount > 0;
  const giftWrap = {
    selected: giftWrapSelected,
    price: giftWrapSelected ? giftWrapConfig.price : 0,
    quantity: giftWrapSelected ? lineCount : 0,
    title: giftWrapConfig.title,
    note: giftWrapConfig.note,
    noteOptions: giftWrapSelected ? (cartDoc?.giftWrapNoteOptions?.length ? cartDoc.giftWrapNoteOptions : ["none"]) : ["none"],
  };

  // cartSubtotal must reflect active cart-rule discounts (e.g. "2+ Lamps =>
  // 50% off Pen Stand") — this is what applyCouponCodeService uses as the
  // base for coupon math, and it must be the SAME post-discount subtotal
  // rp.payment.controller.js actually charges, or the discount shown at
  // checkout can disagree with what the server applies at payment time.
  const activeRules = await getActiveCartRules();
  const ruleEvalItems = base.availableItems.map((i) => ({ productId: i.productId, quantity: i.quantity }));
  const { discountCandidatesByProduct } = evaluateCartRules(ruleEvalItems, activeRules);
  const discountedSubtotal = base.availableItems.reduce((sum, i) => {
    const candidates = discountCandidatesByProduct.get(String(i.productId)) || [];
    const discountedPrice = applyBestDiscount(i.price, candidates);
    return sum + discountedPrice * i.quantity;
  }, 0);

  return {
    statusCode: 200,
    message: "Cart fetched",
    data: { ...base, cartSubtotal: discountedSubtotal, giftWrap },
    success: true
  };
};

// Toggles the gift-wrap intent for a user's cart. Turning it ON is refused
// server-side if the offer isn't currently active — the toggle can only ever
// reflect real, currently-chargeable state, never a stale/guessed one.
// Turning it OFF is always allowed regardless of offer state.
const GIFT_NOTE_OPTIONS = ["birthday", "rakhi", "none"];

const toggleGiftWrapService = async ({ userId, selected, noteOptions }) => {
  if (!userId) throw new AuthenticationError("Unauthorized");

  const want = !!selected;
  if (want) {
    const config = await getPublicOfferConfig("gift_wrap");
    if (!config.isActive) throw new ValidationError("Gift wrap isn't available right now");
  }

  const notes = Array.isArray(noteOptions)
    ? noteOptions.filter((n) => GIFT_NOTE_OPTIONS.includes(n))
    : [];

  await Cart.findOneAndUpdate(
    { userId },
    {
      $set: {
        giftWrap: want,
        giftWrapNoteOptions: want && notes.length ? notes : ["none"],
      },
      $setOnInsert: { products: {} },
    },
    { upsert: true },
  );
  return { statusCode: 200, message: want ? "Gift wrap added" : "Gift wrap removed", success: true };
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

  // Cart emptied out via individual removals (not the "Clear cart" button) —
  // gift wrap must not survive it either, otherwise re-adding any product
  // later silently resurrects a stale "added" state the customer never
  // re-confirmed this time around.
  if (cart.products.size === 0 && cart.giftWrap) {
    cart.giftWrap = false;
    cart.giftWrapNoteOptions = ["none"];
  }

  cart.markModified('products');
  await cart.save();
  return { statusCode: 200, message: "Cart updated", success: true };
};

const clearCartService = async ({ userId }) => {
  await Cart.updateOne({ userId }, { $set: { products: {}, giftWrap: false, giftWrapNoteOptions: ["none"] }, $unset: { appliedCoupon: 1 } });
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

export {
  addToCartService,
  getCartService,
  cartQuantityService,
  clearCartService,
  mergeGuestCartService,
  toggleGiftWrapService,
};
