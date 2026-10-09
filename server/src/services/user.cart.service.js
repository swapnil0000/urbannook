import Product from "../model/product.model.js";
import Cart from "../model/user.cart.model.js";
import User from "../model/user.model.js";
import { cartDetailsMissing } from "../utils/ValidateRes.js";
import { applyCouponCodeService } from "../services/coupon.code.service.js";
import { getPublicOfferConfig } from "../utils/offer.util.js";
import {
  getActivePromotions,
  evaluatePromotions,
  buildCartContext,
  getDiscountCandidatesForItem as getPromotionDiscountCandidatesForItem,
  applyBestPromotionDiscount,
  // Generic cap-tracking utilities (moved off the deleted cartRule.util.js
  // 2026-10-09 — never actually cart-rule-specific), reused here so this
  // preview shares the exact same budget-sharing machinery real checkout
  // uses.
  createRuleBudgetTracker,
  withRuleBudget,
  spendRuleBudget,
  applicableCap,
} from "../utils/promotionEngine.util.js";
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
        // Variant SKU — the reliable variant identity (see cartRule.util.js's
        // header comment), needed so cart-rule/promotion discount matching
        // below can correctly scope to ONE variant instead of applying a
        // variant-scoped discount to every variant of the product (bug: this
        // field didn't exist here before, so the discount preview below used
        // to ignore variant scoping entirely).
        variantSku: {
          $let: {
            vars: {
              currentV: { $ifNull: ["$items.v.selectedVariant", "$vFromKey"] },
              vDetails: { $ifNull: ["$p.variantDetails", []] }
            },
            in: {
              $let: {
                vars: { matched: { $filter: { input: "$$vDetails", as: "vd", cond: { $eq: ["$$vd.variantName", "$$currentV"] } } } },
                in: { $ifNull: [{ $arrayElemAt: ["$$matched.sku", 0] }, ""] }
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
        // NOTE: this is a raw Mongo aggregation expression, not JS, so it
        // can't import the canonical isVariantOutOfStock (utils/variantSort.js
        // in this repo; utils/variantStock.js on the client) the way every
        // other OOS check in the codebase does — this $or below must be kept
        // hand-in-sync with those if the rule ever changes. variantOutOfStock
        // is now auto-synced to quantity at write time for tracked variants
        // (see variantSort.js's syncVariantOutOfStock), so mOOS alone would
        // actually be sufficient going forward — the $lte 0 branch is kept
        // as a defensive fallback for untracked variants and any stale data
        // written before that sync existed.
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
  const cartDoc = await Cart.findOne({ userId }).select("giftWrap giftWrapNoteOptions appliedCoupon").lean();
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

  // cartSubtotal must match what real checkout would actually charge, or
  // this preview lies to the customer. As of 2026-10-08 this evaluates
  // Promotion V2 ONLY (the legacy cart-rule adapter read the exact same
  // `promotions` collection and was removed from this preview the same way
  // it was removed from rp.payment.controller.js's real charge — see that
  // file's header comment for the full rationale). Two previously-confirmed
  // bugs this now fixes:
  //   1. Running the adapter at all here could silently out-compete a
  //      non-adapter-representable V2 promotion (OR/category/tag/etc.
  //      conditions) with no price comparison — same Critical Bug #1 as
  //      checkout, now fixed the same way: one evaluation, one candidate
  //      pool, best price always wins.
  //   2. This used to compute each line's discount `cap` independently
  //      (`Math.max(1, ...candidates.map(c => c.cap))`), with NO cross-line
  //      shared-budget tracking — unlike real checkout's
  //      createRuleBudgetTracker/withRuleBudget/spendRuleBudget, which exist
  //      specifically to stop one rule's sibling reward lines (e.g. 3
  //      variants of the same product, one rule) from each independently
  //      claiming the full cap off a single shared trigger. This preview
  //      could show MORE lines discounted than checkout would actually
  //      honor — "my cart page lied to me." Now uses the identical
  //      budget-tracker objects real checkout uses, so a cart evaluated here
  //      and at checkout a moment later (unchanged) produces the same price.
  const ruleEvalItems = base.availableItems.map((i) => ({ productId: i.productId, quantity: i.quantity, variantSku: i.variantSku || "" }));

  const productIds = [...new Set(base.availableItems.map((i) => String(i.productId)))];
  const cartProducts = productIds.length
    ? await Product.find({ productId: { $in: productIds } }, { productId: 1, productCategory: 1, productSubCategory: 1, tags: 1 }).lean()
    : [];
  const promoProductMeta = new Map(cartProducts.map((p) => [p.productId, { category: p.productCategory, subcategory: p.productSubCategory, tags: p.tags || [] }]));
  const activePromotions = await getActivePromotions();
  const promoSubtotalHint = base.availableItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const promoCtx = buildCartContext(ruleEvalItems, {
    subtotal: promoSubtotalHint,
    productMeta: promoProductMeta,
    customerType: "registered",
    // Same gate as real checkout (rp.payment.controller.js) — a coupon-linked
    // promotion must not preview as applied here if the cart hasn't actually
    // had that coupon applied, or this preview would show a discount
    // checkout then doesn't charge.
    appliedCouponCode: cartDoc?.appliedCoupon?.isApplied ? cartDoc.appliedCoupon.name : null,
  });
  const promotionResult = evaluatePromotions(ruleEvalItems, promoCtx, activePromotions);
  // Same shared-budget tracker real checkout builds from this exact result
  // — a rule's sibling reward lines (e.g. 3 variants, one trigger) share ONE
  // pool of discountable units here too, not one each.
  const ruleBudgets = createRuleBudgetTracker(promotionResult.discountCandidatesByProduct);

  // `cap` SCALES with how many times the promotion's own condition is
  // satisfied (e.g. 2x the trigger product in cart → up to 2 discounted
  // units), never a flat 1 — computed server-side by the engine from
  // admin-configured minQuantity vs. real cart quantity, read here not
  // re-derived — and is now also clamped to the remaining SHARED budget via
  // withRuleBudget, then spent via spendRuleBudget, in the same order real
  // checkout processes lines, so the two can never disagree.
  const discountedSubtotal = base.availableItems.reduce((sum, i) => {
    const rawCandidates = getPromotionDiscountCandidatesForItem(promotionResult.discountCandidatesByProduct, i.productId, i.variantSku);
    const candidates = withRuleBudget(rawCandidates, ruleBudgets);
    if (!candidates?.length) return sum + i.price * i.quantity;
    const discountedPrice = applyBestPromotionDiscount(i.price, candidates);
    if (discountedPrice >= i.price) return sum + i.price * i.quantity;
    const cap = applicableCap(candidates);
    const discountedUnits = Math.min(i.quantity, cap);
    const fullPriceUnits = i.quantity - discountedUnits;
    spendRuleBudget(candidates, ruleBudgets, discountedUnits);
    return sum + discountedPrice * discountedUnits + i.price * fullPriceUnits;
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

// Persists a guest's in-progress checkout (Contact-step contact details +
// current cart) to the SAME collection authenticated carts live in, keyed by
// `guest_<anonymousId>` (the stable per-browser id from analytics.js) instead
// of a real user id. Never gated on completing checkout — this is exactly
// what lets the admin's existing abandoned-cart dashboard (which already
// reads this collection and looks for cart.guestName/guestEmail/mobileNumber)
// pick up guests who leave before finishing, same as it already does for
// logged-in users. Upserts so repeated calls (debounced while typing) just
// update the one row per guest rather than creating duplicates.
const syncGuestCartService = async ({ anonymousId, guestName, guestEmail, guestMobile, items }) => {
  const userId = `guest_${anonymousId}`;

  const products = {};
  for (const item of items || []) {
    const variant = item.selectedVariant && item.selectedVariant !== "" ? item.selectedVariant : "N/A";
    const key = `${item.productId}:${variant}`;
    products[key] = {
      quantity: Number(item.quantity) || 1,
      selectedVariant: variant,
      image: item.image || null,
    };
  }

  await Cart.findOneAndUpdate(
    { userId },
    {
      $set: {
        products,
        guestName: guestName || null,
        guestEmail: guestEmail || null,
        mobileNumber: guestMobile || null,
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  return { statusCode: 200, message: "Guest cart synced", success: true };
};

export {
  addToCartService,
  getCartService,
  cartQuantityService,
  clearCartService,
  mergeGuestCartService,
  toggleGiftWrapService,
  syncGuestCartService,
};
