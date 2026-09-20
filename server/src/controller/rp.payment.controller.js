import {
  razorpayCreateOrderService,
  razorpayFetchOrderService,
} from "../services/rp.payement.service.js";
import { ApiRes } from "../utils/index.js";
import User from "../model/user.model.js";
import Order from "../model/order.model.js";
import crypto from "crypto";
import Product from "../model/product.model.js";
import { v7 as uuidv7 } from "uuid";
import Cart from "../model/user.cart.model.js";
import env from "../config/envConfigSetup.js";
import Coupon from "../model/coupon.model.js";
import CouponUsage from "../model/couponUsage.model.js";
import { backfillUserProfileFromCheckout } from "../services/user.profile.service.js";
import {
  isMagicCheckoutEnabled,
  isMagicGuestsOnly,
  discountMagicLineItems,
  buildMagicLineItems,
  lineItemsTotalPaise,
  toOrderDeliveryAddress,
} from "../services/magic.checkout.service.js";
import { sendOrderConfirmationWhatsApp } from "../services/whatsapp.send.service.js";
import {
  sendOrderConfirmation,
  sendPaymentReceipt,
  sendGuestAccountCreatedEmail,
} from "../services/email.service.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";
import { computeOrderCharge } from "../utils/orderAmount.util.js";
import { buildPlaceholderEmail, isPlaceholderEmail } from "../utils/placeholderEmail.js";
import { uploadInvoiceToS3 } from "../utils/s3.utils.js";
import Address from "../model/address.new.model.js";
import html_to_pdf from "html-pdf-node";
import { generateInvoiceHtmlTemplate } from "../template/invoiceTemplate.template.js";
import { calculateShippingRate, FALLBACK_SHIPPING_CHARGE } from "../services/shipping.service.js";
import { apiCache } from "../module/cache.manager.module.js";

// ── Per-variant stock decrement ───────────────────────────────────────────────
// Runs once, atomically, the moment an order is confirmed PAID. For each ordered
// item we decrement THAT variant's tracked quantity (variantQuantity) by the
// purchased quantity. Variants with no tracked quantity (null) are skipped —
// they aren't stock-managed. The update is atomic ($inc on the positionally
// matched variant) so concurrent orders don't clobber each other. When a
// quantity crosses 0 the variant auto-derives out-of-stock everywhere (the OOS
// rule is computed, not stored). Best-effort: never throws into the payment flow.
const decrementStockForOrder = async (order) => {
  let anyChanged = false;
  for (const item of order.items || []) {
    const qty = item?.productSnapshot?.quantity;
    const variantName = item?.productSnapshot?.selectedVariant;
    if (!item.productId || !qty || qty < 1) continue;
    if (!variantName || variantName === "N/A") continue; // single-design / no variant
    try {
      const res = await Product.updateOne(
        {
          productId: item.productId,
          variantDetails: { $elemMatch: { variantName, variantQuantity: { $ne: null } } },
        },
        // Decrement the variant AND the product-level total (kept = sum of
        // tracked variant quantities) so both stay consistent between admin saves.
        { $inc: { "variantDetails.$.variantQuantity": -qty, productQuantity: -qty } },
      );
      if (res.modifiedCount > 0) anyChanged = true;
    } catch (err) {
      console.error(`[Stock] decrement failed order=${order.orderId} product=${item.productId} variant=${variantName}:`, err.message);
    }
  }
  // Product responses are cached (10-min TTL) — flush so the storefront reflects
  // the new stock (and any freshly out-of-stock variant) right away.
  if (anyChanged) {
    try { apiCache.clear(); } catch { /* best-effort */ }
  }
};

// Effective per-variant out-of-stock — mirrors the admin/storefront rule:
// manual flag, or a tracked quantity that has reached 0.
const isVariantOutOfStock = (variant) =>
  !!variant &&
  (variant.variantOutOfStock === true ||
    (variant.variantQuantity != null && Number(variant.variantQuantity) <= 0));

// Guard at order creation: block buying an out-of-stock (or over-ordered)
// variant. Only enforces when the variant is matched by name and stock-tracked;
// unmatched / "N/A" (single-design) items pass through untouched.
const assertVariantAvailable = (product, variantName, qty) => {
  if (!product?.variantDetails?.length) return;
  if (!variantName || variantName === "N/A") return;
  const variant = product.variantDetails.find((v) => v.variantName === variantName);
  if (!variant) return;
  if (isVariantOutOfStock(variant)) {
    throw new ValidationError(`"${product.productName} — ${variantName}" is out of stock.`);
  }
  if (variant.variantQuantity != null && qty > variant.variantQuantity) {
    throw new ValidationError(
      `Only ${variant.variantQuantity} unit(s) of "${product.productName} — ${variantName}" left.`,
    );
  }
};

// Genuinely unserviceable pincode must still block checkout — we cannot accept an
// order we cannot ship. Any OTHER failure (API down, network timeout after all
// retries, transient error) falls back to a flat rate instead, so a shipping-API
// outage doesn't take checkout down with it.
const getShippingRateOrFallback = async (params) => {
  try {
    return await calculateShippingRate(params);
  } catch (error) {
    if (error.message?.includes("Pincode not serviceable")) throw error;
    console.error(`[SHIPPING] pin ${params.pincode} | rate calc failed, using flat fallback ₹${FALLBACK_SHIPPING_CHARGE}: ${error.message}`);
    return {
      total_charges: FALLBACK_SHIPPING_CHARGE,
      type: "fallback",
      totalWeight: 0,
      expectedNoOfBoxes: params.cartItems?.length || 0,
      serviceName: null,
      courierName: null,
      estimatedDays: "3-4 Days",
      paymentType: params.paymentType || "PREPAID",
    };
  }
};
import { isFreeShippingEligible, getFreeShippingConfig } from "../utils/freeShippingOffer.util.js";
import { getActiveCartRules, evaluateCartRules, applyBestDiscount, getDiscountCandidatesForItem } from "../utils/cartRule.util.js";
import { getPublicOfferConfig } from "../utils/offer.util.js";
import { sendMetaCapiEvent } from "../services/meta.capi.service.js";
import { recordServerPurchase } from "../services/purchaseEvent.service.js";

// Collect Meta CAPI match-quality signals from the order-creation request.
// The webhook (Razorpay → server) has no browser context, so we persist these on
// the order and replay them into the server-side Purchase for high match quality.
const collectMetaTracking = (req) => ({
  fbp: req.body?.fbp || null,
  fbc: req.body?.fbc || null,
  anonymousId: req.body?.anonymousId || null, // persistent device id — fallback externalId for guests
  clientIp:
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || null,
  clientUserAgent: req.headers["user-agent"] || null,
  eventSourceUrl: req.headers["referer"] || req.headers["origin"] || null,
});

const PAYMENT_ERROR_MESSAGES = {
  BAD_REQUEST_ERROR: "Payment failed due to invalid request. Please try again.",
  GATEWAY_ERROR:
    "Payment gateway error. Please try again or use a different payment method.",
  SERVER_ERROR: "Payment server error. Please try again later.",
  payment_failed:
    "Payment failed. Please try again or use a different payment method.",
  payment_timeout:
    "Payment timed out. Your cart has been preserved. Please try again.",
  insufficient_funds: "Insufficient funds. Please check your account balance.",
  card_declined: "Card declined. Please contact your bank or try another card.",
  network_error: "Network error. Please check your connection and try again.",
  invalid_card: "Invalid card details. Please check and try again.",
  authentication_failed: "3D Secure authentication failed. Please try again.",
  signature_verification_failed:
    "Payment verification failed. Please contact support if amount was debited.",
  default: "Payment could not be processed. Please try again later.",
};

const getErrorMessage = (errorCode) => {
  return PAYMENT_ERROR_MESSAGES[errorCode] || PAYMENT_ERROR_MESSAGES.default;
};

const stripCountryCode = (mobile) => {
  if (!mobile) return "";
  const cleaned = mobile.toString().replace(/\D/g, "");
  return cleaned.length > 10 ? cleaned.slice(-10) : cleaned;
};

const razorpayKeyGetController = asyncHandler(async (_, res) => {
  const key_id = env.RP_KEY_ID;
  if (!key_id) {
    throw new NotFoundError("Rp - Key");
  }

  return res.status(200).json(new ApiRes(200, `Rp - Key`, key_id, true));
});

const razorpayCreateOrderController = asyncHandler(async (req, res) => {
  /* Not Handling the amount because it could be manipulate at client side like 0 as amount */
  const {
    items,
    userEmail,
    senderMobile,
    receiverMobile,
    addressId,
    deliveryAddress: clientAddress,
    paymentMethod: reqPaymentMethod,
    pointsToRedeem,
  } = req.body;
  const { userId } = req.user;
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ValidationError("Items are required");
  }

  // Magic Checkout (1CC): Razorpay collects the address inside its own modal,
  // so there is none to validate here and no pincode to rate shipping against.
  // Shipping comes from the /magic/shipping-info callback and the address lands
  // on the order via the webhook. Magic is PREPAID-only — COD keeps the
  // existing flow with its 2x-shipping advance.
  // MAGIC_CHECKOUT_GUESTS_ONLY is the rollout switch: Magic for guests, the
  // existing flow for signed-in customers. It was defined and never read, so
  // turning it on changed nothing — every logged-in customer got Magic anyway.
  const isMagic =
    isMagicCheckoutEnabled() && req.body?.magic === true && !isMagicGuestsOnly();

  if (!isMagic && !addressId && !clientAddress?.formattedAddress?.trim()) {
    throw new ValidationError("Delivery address is required");
  }

  const user = await User.findOne({ userId }).lean();
  const stripCountryCode = (mobile) => {
    if (!mobile) return "";
    const trimmed = mobile.trim();
    // Strip +91 or 91 prefix if present
    if (trimmed.startsWith("+91")) {
      return trimmed.substring(3);
    } else if (trimmed.startsWith("91") && trimmed.length === 12) {
      return trimmed.substring(2);
    }
    return trimmed;
  };
  const selectedAddr = isMagic ? null : await Address.findOne({ addressId }).lean();

  if (!isMagic && !selectedAddr && !clientAddress) {
    throw new ValidationError("Selected address not found");
  }

  // Determine final mobile numbers with fallback logic
  const finalSenderMobile = stripCountryCode(
    senderMobile || user?.mobileNumber?.toString() || "",
  );
  const finalReceiverMobile = stripCountryCode(
    receiverMobile || finalSenderMobile,
  );

  // Validate sender mobile (required). Magic collects the number in its own
  // modal, so a logged-in user without one on file is still allowed through —
  // the webhook writes the verified number onto the order.
  if (!isMagic && (!finalSenderMobile || !/^[0-9]{10}$/.test(finalSenderMobile))) {
    throw new ValidationError("Valid sender mobile number is required");
  }

  // Validate receiver mobile if provided
  if (receiverMobile && !/^[0-9]{10}$/.test(finalReceiverMobile)) {
    throw new ValidationError(
      "Receiver mobile number must be exactly 10 digits",
    );
  }

  // Handle pricing logic
  let finalAmount;
  let couponCodeId = null;
  let couponCodeName = null;
  let discountAmount = 0;
  let isApplied = false;
  let summary = {};

  // Fetch cart to get the calculated grand total from applyCoupon API
  const cart = await Cart.findOne({ userId }).lean();

  if (!cart) {
    throw new ValidationError("Cart not found. Please add items to your cart.");
  }

  // Check if pricing has been calculated (appliedCoupon.summary must exist with a valid grandTotal)
  const grandTotal = cart?.appliedCoupon?.summary?.grandTotal;
  if (grandTotal == null || grandTotal <= 0) {
    throw new ValidationError(
      "Cart pricing not calculated. Please refresh the page.",
    );
  }

  finalAmount = grandTotal;
  couponCodeId = cart.appliedCoupon?.couponCodeId || null;
  couponCodeName = cart.appliedCoupon?.name || null;
  discountAmount = cart.appliedCoupon?.discountValue || 0;
  isApplied = cart.appliedCoupon?.isApplied || false;
  summary = cart.appliedCoupon?.summary || {};

  const productIds = items.map((i) => i.productId);
  const uniqueProductIds = [...new Set(productIds)]; // Get unique IDs

  const products = await Product.find({
    productId: { $in: uniqueProductIds },
    productStatus: "in_stock",
  });

  if (products.length !== uniqueProductIds.length) {
    throw new ValidationError("One or more products unavailable");
  }

  const orderItems = items.map((item) => {
    const product = products.find((p) => p.productId === item.productId);

    // Find the cart item to get its specific image
    let itemImage = null;
    const itemVariant = item.variant || item.color || "N/A";
    // Block out-of-stock / over-ordered variants before the order is created.
    assertVariantAvailable(product, itemVariant, item.quantity);
    const cartKey = `${item.productId}:${itemVariant}`;

    // 1. Try to get image from Cart Snapshot (Most accurate for what user saw)
    const getCartProduct = (key) => {
      if (!cart.products) return null;
      if (typeof cart.products.get === "function") return cart.products.get(key);
      return cart.products[key];
    };

    const cartProductByVariant = getCartProduct(cartKey);
    const cartProductById = getCartProduct(item.productId);

    if (cartProductByVariant && cartProductByVariant.image) {
      itemImage = cartProductByVariant.image;
    } else if (cartProductById && cartProductById.image) {
      itemImage = cartProductById.image;
    }

    // 2. Fallback to Product Variant Details (if snapshot fails or is empty)
    if (!itemImage && product.variantDetails && product.variantDetails.length > 0) {
      const variant = product.variantDetails.find(v =>
        v.variantName === itemVariant ||
        v.variantName === item.variant ||
        v.variantName === item.color
      );
      if (variant && variant.variantImage && variant.variantImage.length > 0) {
        itemImage = variant.variantImage[0];
      }
    }

    // 3. Fallback to top-level product image (Legacy/Compatibility)
    if (!itemImage) {
      itemImage = product.productImg;
    }

    // 4. Final safety check: Ensure itemImage is not empty for validation
    if (!itemImage) {
      itemImage = "https://urbannook.in/assets/logo.webp"; // placeholder if everything fails
    }

    // Find the variant specific price
    let priceAtPurchase = 0;
    let matchedVariant = null;
    if (product.variantDetails && product.variantDetails.length > 0) {
      matchedVariant = product.variantDetails.find(v =>
        v.variantName === itemVariant ||
        v.variantName === item.variant ||
        v.variantName === item.color
      );
      if (matchedVariant && matchedVariant.variantPrice) {
        priceAtPurchase = matchedVariant.variantPrice;
      } else {
        // Default to first variant's price if no match or no price on match
        priceAtPurchase = product.variantDetails[0].variantPrice || 0;
      }
    }

    return {
      productId: product.productId,
      // Temporary, NOT part of the Order schema — used only to resolve this
      // line's variant identity for cart-rule matching below (variantSku is
      // the reliable identifier, not the variant name — see
      // utils/cartRule.util.js). Dropped automatically when this object is
      // eventually persisted via Order.create (Mongoose ignores fields not
      // declared on the schema).
      variantSku: matchedVariant?.sku || "",
      productSnapshot: {
        quantity: item.quantity,
        productImg: itemImage,
        productName: product.productName,
        productCategory: product.productCategory,
        productSubCategory: product.productSubCategory,
        priceAtPurchase: priceAtPurchase,
        shipping: String(summary?.shipping ?? ""),
        selectedVariant: itemVariant,
        // Snapshotted so order history/invoices keep showing the title as it
        // was worded at purchase time, even if the product's template is
        // edited later. Blank when the product never set one.
        variantTitleTemplate: product.variantTitleTemplate || "",
        // Stable variant identifier, frozen at purchase time — unlike
        // selectedVariant (a display name), this never goes stale if an
        // admin renames the variant afterward. Admin dispatch/analytics
        // views should key off this first, falling back to name-matching
        // only for orders placed before this field existed.
        variantSku: matchedVariant?.sku || "",
      },
    };
  });

  // Generic, data-driven cart-promotion rules (server/src/model/cartRule.model.js)
  // — e.g. "2+ Lamps => free shipping" or "2+ Lamps => 50% off Pen Stand".
  // Fully additive to the existing combo-banner system below (isFreeShippingEligible):
  // either mechanism unlocking free shipping is enough, and this is the ONLY
  // place a rule's product discount is actually applied to the charged price
  // — baked into `priceAtPurchase` here so subtotal, the persisted order, and
  // the invoice all agree with each other and with what was charged.
  const activeCartRules = await getActiveCartRules();
  const cartRuleResult = evaluateCartRules(
    orderItems.map((oi) => ({ productId: oi.productId, quantity: oi.productSnapshot.quantity, variantSku: oi.variantSku })),
    activeCartRules,
  );
  for (const oi of orderItems) {
    const candidates = getDiscountCandidatesForItem(cartRuleResult.discountCandidatesByProduct, oi.productId, oi.variantSku);
    if (candidates?.length) {
      oi.productSnapshot.priceAtPurchase = applyBestDiscount(oi.productSnapshot.priceAtPurchase, candidates);
    }
  }

  const deliveryAddressSnapshot = {
    addressId: addressId,
    fullName:
      clientAddress?.fullName ||
      selectedAddr?.fullName ||
      user?.userName ||
      user?.name ||
      "Customer",
    mobileNumber:
      clientAddress?.mobileNumber ||
      selectedAddr?.mobileNumber ||
      finalSenderMobile,
    addressLine:
      clientAddress?.addressLine ||
      clientAddress?.formattedAddress ||
      selectedAddr?.formattedAddress ||
      selectedAddr?.addressLine,
    city: clientAddress?.city || selectedAddr?.city || "",
    state: clientAddress?.state || selectedAddr?.state || "",
    pinCode: clientAddress?.pinCode || selectedAddr?.pinCode || null,
    formattedAddress:
      clientAddress?.formattedAddress || selectedAddr?.formattedAddress || "",
    deliveryAddressFull:
      clientAddress?.deliveryAddressFull || selectedAddr?.deliveryAddressFull || "",
    landmark: clientAddress?.landmark || selectedAddr?.landmark || "",
    flatOrFloorNumber:
      clientAddress?.flatOrFloorNumber || selectedAddr?.flatOrFloorNumber || "",
    lat:
      clientAddress?.lat ||
      selectedAddr?.location?.coordinates?.[1] ||
      selectedAddr?.lat ||
      0,
    long:
      clientAddress?.long ||
      selectedAddr?.location?.coordinates?.[0] ||
      selectedAddr?.long ||
      0,
  };

  // Re-calculate shipping to get enriched data (type, weight, boxes).
  // Magic has no pincode at this point — Razorpay rates the address through the
  // /magic/shipping-info callback and adds shipping_fee to the order itself, so
  // shipping must stay OUT of the amount we create the order with.
  const shippingResult = isMagic
    ? null
    : await getShippingRateOrFallback({
        pincode: deliveryAddressSnapshot.pinCode,
        paymentType: reqPaymentMethod === "COD" ? "COD" : "PREPAID",
        cartItems: items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          price: orderItems.find(oi => oi.productId === i.productId)?.productSnapshot.priceAtPurchase
        }))
      });

  // realShippingAmount = actual carrier rate — always used as the basis for
  // the COD upfront advance (a fraud/RTO-risk deposit, not a shipping fee).
  // chargedShippingAmount = what the customer's order total reflects — 0 when
  // the free-shipping offer applies. These must NOT be the same variable:
  // zeroing shipping for the customer should not also zero the COD advance.
  const realShippingAmount = isMagic
    ? 0 // added by Razorpay from the serviceability callback, not by us
    : (shippingResult?.total_charges || summary?.shipping || 179);

  // Recompute subtotal from actual order items — authoritative, not from cart snapshot.
  // Computed AFTER the cart-rule discount loop above has already reduced any
  // discounted items' priceAtPurchase, so this naturally includes those discounts.
  const subtotal = orderItems.reduce((s, i) => s + (i.productSnapshot.priceAtPurchase * i.productSnapshot.quantity), 0);

  // Free shipping unlocks via ANY of: the combo-banner offer (source +
  // recommended product both present), any active generic cart rule whose
  // effects include free_shipping (e.g. "2+ Lamps"), OR the cart subtotal
  // simply being at/above the admin-configured thresholdAmount — plain,
  // direct comparison, whole-cart (any products count), no rules table.
  const freeShippingConfig = await getFreeShippingConfig();
  const thresholdEligible = freeShippingConfig.isActive && subtotal >= freeShippingConfig.thresholdAmount;
  const freeShippingUnlocked =
    (await isFreeShippingEligible(items.map((i) => i.productId))) || cartRuleResult.freeShipping || thresholdEligible;
  const chargedShippingAmount = freeShippingUnlocked ? 0 : realShippingAmount;
  // console.log(
  //   `[FreeShipping][Order:auth] realShipping=₹${realShippingAmount} chargedShipping=₹${chargedShippingAmount} items=${items.map(i => `${i.productId}x${i.quantity}`).join(",")}`,
  // );

  // Gift wrap: server-authoritative price + intent. `cart.giftWrap` is the
  // ONLY source for "did they select it" (never req.body); price always comes
  // fresh from the live offer config, so a stale intent left over after an
  // admin disables the offer can never add a charge.
  const giftWrapConfig = await getPublicOfferConfig("gift_wrap");
  // One gift wrap per ELIGIBLE UNIT in the order (admin opt-in per product)
  // — sums quantity across every line whose product is eligible, so 2x the
  // same eligible product is 2 gift wraps, not 1. Auto-derived, not client-set.
  const giftWrapQty = orderItems.reduce((sum, oi) => {
    const product = products.find((p) => p.productId === oi.productId);
    return product?.giftWrapEligible ? sum + (Number(oi.productSnapshot.quantity) || 0) : sum;
  }, 0);
  const giftWrapSelected = !!cart.giftWrap && giftWrapConfig.isActive && giftWrapQty > 0;
  const giftWrapAmount = giftWrapSelected ? giftWrapConfig.price * giftWrapQty : 0;
  const giftWrapNoteOptions = giftWrapSelected && cart.giftWrapNoteOptions?.length ? cart.giftWrapNoteOptions : ["none"];

  // Always re-derive discount from the live coupon + current subtotal.
  // This fixes: products added after coupon was applied, COD/prepaid toggle, page not refreshed.
  let isInternalTestOrder = false;
  if (isApplied && couponCodeId) {
    const liveCoupon = await Coupon.findOne(
      { couponId: couponCodeId },
      {
        code: 1, discountType: 1, discountValue: 1, maxDiscountCap: 1,
        isInternal: 1, isArchived: 1, isActive: 1, isTest: 1,
        maxUsesPerUser: 1, scope: 1, audience: 1, assignedTo: 1,
        // Fields missing from original projection — caused silent bypass of these rules
        minCartValue: 1, validFrom: 1, validUntil: 1,
        maxTotalUses: 1, usageCount: 1,
      }
    ).lean();

    // console.log(
    //   `[Coupon:PaymentRecheck] couponId=${couponCodeId} code=${liveCoupon?.code || "-"} ` +
    //   `found=${!!liveCoupon} scope=${liveCoupon?.scope || "-"} audience=${liveCoupon?.audience || "-"} ` +
    //   `isActive=${liveCoupon?.isActive} isArchived=${liveCoupon?.isArchived} isTest=${liveCoupon?.isTest} ` +
    //   `assignedToCount=${liveCoupon?.assignedTo?.length ?? "-"} userId=${userId} userEmail=${userEmail || "-"}`
    // );

    if (!liveCoupon || liveCoupon.isArchived) {
      // console.log(`[Coupon:PaymentRecheck] REJECT — not found or archived`);
      throw new ValidationError(
        "The coupon you applied is no longer available. Please remove it from your cart and try again."
      );
    }
    if (!liveCoupon.isActive) {
      // console.log(`[Coupon:PaymentRecheck] REJECT — coupon is paused (isActive=false)`);
      throw new ValidationError(
        "This coupon has been paused. Please remove it from your cart and try again."
      );
    }

    const isValidInternal = liveCoupon.isInternal && liveCoupon.discountType === "INTERNAL_TEST";
    if (liveCoupon.isTest && !isValidInternal) {
      // console.log(`[Coupon:PaymentRecheck] REJECT — isTest=true and not a valid internal coupon`);
      throw new ValidationError(
        "This coupon is no longer available for customers. Please remove it from your cart and try again."
      );
    }
    // isInternal=true without INTERNAL_TEST type is DB corruption — reject clearly, don't silently zero-out
    if (liveCoupon.isInternal && !isValidInternal) {
      console.error(`[Coupon:Security] Coupon ${couponCodeId} has isInternal=true but discountType=${liveCoupon.discountType}`);
      throw new ValidationError(
        "This coupon is invalid. Please remove it from your cart and try again."
      );
    }

    // Re-check scope/audience — the coupon's targeting rules could have changed
    // between apply-time (coupon.code.service.js) and this payment step, e.g. an
    // admin removed this user from the assignedTo list. This function requires
    // a logged-in user (req.user, checked at the top of this controller), so
    // audience=MEMBERS_ONLY is always satisfied here — only scope=TARGETED needs
    // an actual re-check.
    if (liveCoupon.scope === "TARGETED") {
      const normEmailForScope  = user?.email?.toLowerCase().trim() || null;
      const normMobileForScope = user?.mobileNumber?.toString().replace(/\D/g, "").slice(-10) || finalSenderMobile || null;
      const scopeIdentifiers   = [normEmailForScope, normMobileForScope].filter(Boolean);
      const assignment = (liveCoupon.assignedTo || []).find((a) => scopeIdentifiers.includes(a.identifier));

      console.log(
        `[Coupon:PaymentRecheck] TARGETED re-check: identifiers=${scopeIdentifiers.join("/") || "-"} ` +
        `assignmentFound=${!!assignment} usedAt=${assignment?.usedAt || "-"} isValidInternal=${isValidInternal}`
      );

      if (!assignment) {
        console.log(`[Coupon:PaymentRecheck] REJECT — TARGETED: no assignment found for ${scopeIdentifiers.join("/") || "(no identifiers)"}`);
        throw new ValidationError(
          "This coupon is no longer assigned to you. Please remove it from your cart and try again."
        );
      }
      // Internal test coupons let the assigned team member reuse them (same
      // carve-out as validateNewCoupon's skipSingleUseGate) — everyone else's
      // single-use gate is enforced.
      if (assignment.usedAt && !isValidInternal) {
        console.log(`[Coupon:PaymentRecheck] REJECT — TARGETED: assignment already used at ${assignment.usedAt}`);
        throw new ValidationError(
          "Your personal coupon has already been used. Please remove it from your cart and try again."
        );
      }
    }

    // Re-check validity window — coupon may have expired or not yet started between apply and pay
    const now = new Date();
    if (liveCoupon.validFrom && now < new Date(liveCoupon.validFrom)) {
      console.log(`[Coupon:PaymentRecheck] REJECT — not valid yet (validFrom=${liveCoupon.validFrom})`);
      throw new ValidationError(
        "This coupon is not valid yet. Please remove it from your cart and try again."
      );
    }
    if (liveCoupon.validUntil && now > new Date(liveCoupon.validUntil)) {
      console.log(`[Coupon:PaymentRecheck] REJECT — expired (validUntil=${liveCoupon.validUntil})`);
      throw new ValidationError(
        "This coupon has expired. Please remove it from your cart and try again."
      );
    }

    // Re-check minimum cart value against re-derived product subtotal
    // (user may have removed items from cart after applying the coupon)
    if (subtotal < (liveCoupon.minCartValue || 0)) {
      console.log(`[Coupon:PaymentRecheck] REJECT — subtotal ₹${subtotal} < minCartValue ₹${liveCoupon.minCartValue}`);
      throw new ValidationError(
        `A minimum cart value of ₹${liveCoupon.minCartValue} is required for this coupon. Please remove it from your cart and try again.`
      );
    }

    // Re-check global cap (non-atomic snapshot, main enforcement is atomic $inc in webhook)
    if (liveCoupon.maxTotalUses != null && liveCoupon.usageCount >= liveCoupon.maxTotalUses) {
      console.log(`[Coupon:PaymentRecheck] REJECT — global cap reached (${liveCoupon.usageCount}/${liveCoupon.maxTotalUses})`);
      throw new ValidationError(
        "This coupon has reached its maximum usage limit. Please remove it from your cart and try again."
      );
    }

    if (isValidInternal) {
      // ── INTERNAL TEST: completely separate path ──────────────────────────────
      // Always ₹1 regardless of cart size, shipping, or payment method.
      isInternalTestOrder = true;
      discountAmount = Math.max(subtotal + giftWrapAmount + chargedShippingAmount - 1, 0); // stored for audit record
    } else if (liveCoupon.discountType === "PERCENTAGE") {
      let d = Math.floor((subtotal * liveCoupon.discountValue) / 100);
      if (liveCoupon.maxDiscountCap) d = Math.min(d, liveCoupon.maxDiscountCap);
      discountAmount = Math.min(d, subtotal);
    } else { // FLAT
      discountAmount = Math.min(liveCoupon.discountValue || 0, subtotal);
    }

    // ── Per-user limit re-check (race condition guard) ────────────────────────
    // IMPORTANT: use the authenticated user's DB record for identity, NOT req.body values.
    // req.body.userEmail / senderMobile are client-controlled and could be faked to bypass limits.
    // Internal coupons are included now — their per-user limit (maxUsesPerUser, null = unlimited)
    // is enforced the same way; only the single-use usedAt gate is skipped for them elsewhere.
    if (isApplied) {
      const normEmailCheck  = user?.email?.toLowerCase().trim() || null;
      const normMobileCheck = user?.mobileNumber?.toString().replace(/\D/g, "").slice(-10) || finalSenderMobile || null;
      const identifiers     = [normEmailCheck, normMobileCheck].filter(Boolean);

      if (identifiers.length > 0 && liveCoupon.maxUsesPerUser) {
        const priorUses = await CouponUsage.countDocuments({
          couponId: couponCodeId,
          $or: [
            ...(normEmailCheck  ? [{ email:  normEmailCheck  }] : []),
            ...(normMobileCheck ? [{ mobile: normMobileCheck }] : []),
          ],
        });
        console.log(`[Coupon:PaymentRecheck] Per-user check: identifiers=${identifiers.join("/")} priorUses=${priorUses} limit=${liveCoupon.maxUsesPerUser}`);
        if (priorUses >= liveCoupon.maxUsesPerUser) {
          console.log(`[Coupon:PaymentRecheck] REJECT — per-user limit reached`);
          throw new ValidationError(
            liveCoupon.maxUsesPerUser === 1
              ? "You have already used this coupon. Please remove it from your cart."
              : `You have already used this coupon ${priorUses} time(s) (limit: ${liveCoupon.maxUsesPerUser}). Please remove it from your cart.`
          );
        }
      }
    }
    console.log(`[Coupon:PaymentRecheck] ✅ PASSED — couponCodeId=${couponCodeId} discountAmount=₹${discountAmount} isInternalTestOrder=${isInternalTestOrder}`);
  }

  // Everything about what we charge — COD advance included — lives in
  // computeOrderCharge so the guest checkout below cannot drift from this one.
  // A cart-applied coupon now stays in the amount on Magic too; it reaches
  // Razorpay as a `promotion` a few lines down.
  const charge = computeOrderCharge({
    subtotal,
    giftWrapAmount,
    chargedShippingAmount,
    realShippingAmount,
    discountAmount,
    isInternalTestOrder,
    isMagic,
    paymentMethod: reqPaymentMethod,
  });
  finalAmount = charge.finalAmount;
  const { isCOD, codPartialAmount, codRemainingAmount, razorpayChargeAmount, razorpayChargeAmountPaise } = charge;

  // Sync shipping in snapshots — customer-facing amount (0 when free-shipping offer applies)
  orderItems.forEach(i => { i.productSnapshot.shipping = String(chargedShippingAmount); });

  // An order only counts as a Magic order if it carries line_items — that is
  // what switches Razorpay into the 1CC flow, not a boolean flag.
  let magicOrderOptions = {};
  // What Razorpay is actually asked to charge. Identical to
  // razorpayChargeAmountPaise off the Magic path; on it, the line items decide.
  let magicChargePaise = razorpayChargeAmountPaise;
  if (isMagic) {
    const lineItems = buildMagicLineItems(orderItems);

    // Gift wrap is part of the order amount, so it has to appear as a line item
    // too — Razorpay reconciles amount against line_items_total and would
    // otherwise reject the order for the gift-wrap difference.
    if (giftWrapSelected && giftWrapAmount > 0) {
      const giftWrapPaise = Math.round(giftWrapAmount * 100);
      lineItems.push({
        type: "e-commerce",
        sku: "gift-wrap",
        price: giftWrapPaise,
        offer_price: giftWrapPaise,
        tax_amount: 0,
        quantity: 1,
        name: giftWrapConfig.title || "Gift Wrap",
        description: "Gift wrapping",
      });
    }

    // The discount rides on the items, not on a `promotions` entry — Razorpay
    // accepts that array and then drops it, leaving full-price items against a
    // discounted amount, and bills the items. See discountMagicLineItems.
    const fullTotal = lineItemsTotalPaise(lineItems);
    const discounted = discountMagicLineItems(lineItems, razorpayChargeAmountPaise);

    magicOrderOptions = {
      line_items: discounted.lineItems,
      line_items_total: discounted.total,
    };
    // Charge exactly what the items add up to. Splitting a discount across
    // whole paise can leave a few unplaced, and an amount that disagrees with
    // the line items is precisely what makes Razorpay bill its own number.
    magicChargePaise = discounted.total;
    console.log(
      `[MAGIC][order-create] ${lineItems.length} line item(s), full ₹${fullTotal / 100}, ` +
        `after discount ₹${discounted.total / 100} (asked ₹${razorpayChargeAmount})`,
    );
  }

  const razorpayOrder = await razorpayCreateOrderService(
    magicChargePaise,
    "INR",
    magicOrderOptions,
  );

  // What Razorpay actually STORED, not what we asked for. A 1CC order is
  // reconciled as amount = line_items_total - promotions, and if Razorpay
  // drops or rewrites either side, the modal quietly charges its own number
  // while our logs still show ours. This is the only place the two can be
  // compared.
  if (isMagic) {
    const rp = razorpayOrder?.data || {};
    console.log(
      `[MAGIC][order-create][echo] razorpay says: amount ₹${(rp.amount || 0) / 100}, ` +
        `line_items_total ₹${(rp.line_items_total || 0) / 100}, ` +
        `promotions ${JSON.stringify(rp.promotions || [])}`,
    );
  }

  // Checkout is where a WhatsApp-login user first tells us their real name and
  // email — copy those onto the account so the profile and future order mail
  // stop showing the generated placeholder. Deliberately not awaited on the
  // critical path below; it never throws.
  await backfillUserProfileFromCheckout({
    userId,
    email: userEmail,
    name: deliveryAddressSnapshot.fullName,
    mobile: deliveryAddressSnapshot.mobileNumber,
  });

  const order = await Order.create({
    orderId: uuidv7(),
    userEmail,
    userId,
    userName: deliveryAddressSnapshot.fullName,
    userMobile: deliveryAddressSnapshot.mobileNumber,
    items: orderItems,
    // Whole-rupee, matching exactly what razorpayChargeAmountPaise actually
    // charges — finalAmount itself can be fractional (realShippingAmount is
    // a live carrier rate, not guaranteed integer), so storing it unrounded
    // here could drift a few paise from the real charge in the order record.
    amount: Math.ceil(finalAmount),
    giftWrap: { selected: giftWrapSelected, price: giftWrapAmount, quantity: giftWrapQty, title: giftWrapConfig.title, noteOptions: giftWrapNoteOptions },
    shippingInfo: {
      // Real carrier cost for internal accounting — grouped with the other
      // carrier-enrichment fields below, not the customer-facing amount.
      amount: realShippingAmount,
      type: shippingResult?.type || "standard",
      expectedNoOfBoxes: shippingResult?.expectedNoOfBoxes || 0,
      totalWeight: shippingResult?.totalWeight || 0,
      serviceName: shippingResult?.serviceName || null
    },
    senderMobile: finalSenderMobile,
    receiverMobile: finalReceiverMobile,
    deliveryAddress: deliveryAddressSnapshot,
    payment: { razorpayOrderId: razorpayOrder?.data?.id },
    status: "CREATED",
    isMagicOrder: isMagic,
    // Both read back by the Magic serviceability callback: it must not add a
    // shipping fee on top of a ₹1 internal test order, and it cannot re-derive
    // the cart rules that unlocked free shipping here.
    isInternalTestOrder,
    freeShippingUnlocked,
    paymentMethod: isCOD ? "COD" : "PREPAID",
    codDetails: isCOD ? { partialAmountPaid: codPartialAmount, remainingAmount: codRemainingAmount } : undefined,
    coupon: {
      couponCodeId,
      couponCodeName,
      discountAmount,
      isApplied,
    },
    loyalty: {
      balanceBeforeOrder: loyaltyPricing.balanceBeforeOrder,
      pointsRedeemed: loyaltyPricing.pointsRedeemed,
      discountFromPoints: loyaltyPricing.discountFromPoints,
      // Not committed yet — the actual debit ledger entry (and the real
      // balanceAfterRedeem) is only written once payment is confirmed in the
      // webhook below, same reasoning as coupon usage tracking: an order that's
      // created but never paid must not have permanently spent real points.
      balanceAfterRedeem: loyaltyPricing.balanceBeforeOrder - loyaltyPricing.pointsRedeemed,
    },
    metaTracking: collectMetaTracking(req),
    note: "Amount is the final amount paid by the user",
  });

  return res.status(200).json(
    new ApiRes(
      200,
      "Order created",
      {
        orderId: order.orderId,
        razorpayOrderId: razorpayOrder?.data?.id,
        amount: magicChargePaise,
        currency: "INR",
        // Whether this order really is a 1CC order — the client must switch the
        // modal into Magic on THIS, not on its own build-time flag. The two can
        // disagree (server flag off, guests-only rollout), and opening the Magic
        // modal on an order that carries no line_items breaks checkout.
        magic: isMagic,
        paymentMethod: isCOD ? "COD" : "PREPAID",
        codDetails: isCOD ? { partialAmountPaid: codPartialAmount, remainingAmount: codRemainingAmount } : null,
        senderMobile: finalSenderMobile,
        receiverMobile: finalReceiverMobile,
      },
      true,
    ),
  );
});

const razorpayWebHookController = async (req, res) => {
  const secret = env.RP_WEBHOOK_SECRET;

  const signature = req.headers["x-razorpay-signature"];
  if (!signature) {
    return res.status(400).json({
      statusCode: 400,
      data: null,
      success: false,
      message: "Missing signature",
    });
  }
  // Signature verification
  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(req.body); // req.body is already a Buffer from bodyParser.raw()
  const expectedSignature = shasum.digest("hex");

  /* Checking specifically because the webhook url is public we cant use any guard service
  because it is a server to server call so checking this helps us to figure the verification */
  if (expectedSignature === signature) {
    // Signature is valid, process the webhook
    const payload = JSON.parse(req.body.toString("utf8"));
    const event = payload.event;

    switch (event) {
      /* =======================
         PAYMENT SUCCESS
      ======================== */
      case "payment.captured": {
        const payment = payload.payload.payment.entity;
        const razorpayOrderId = payment.order_id;

        const order = await Order.findOne({
          "payment.razorpayOrderId": razorpayOrderId,
        });
        if (!order) break;

        // ── Magic Checkout: the address only exists now ────────────────────
        // Razorpay collected it in its own modal, so pull it onto the order
        // BEFORE anything downstream (emails, ShipMozo, order confirmation)
        // reads deliveryAddress. Also picks up the shipping fee Razorpay added
        // from our serviceability callback.
        if (order.isMagicOrder && !order.deliveryAddress?.pinCode) {
          const rpOrder = await razorpayFetchOrderService(razorpayOrderId);
          const magicAddress = toOrderDeliveryAddress(rpOrder?.customer_details);

          if (magicAddress) {
            order.deliveryAddress = magicAddress;
            order.userName = magicAddress.fullName || order.userName;
            order.userMobile = magicAddress.mobileNumber || order.userMobile;
            order.senderMobile = magicAddress.mobileNumber || order.senderMobile;
            order.receiverMobile = magicAddress.mobileNumber || order.receiverMobile;

            // A Magic guest reaches order-create with no email at all, so the
            // order carries a placeholder. Replace it with what the customer
            // actually typed, or the account created below is built on an
            // address that can never receive mail.
            const email = rpOrder?.customer_details?.email;
            if (email && (!order.userEmail || isPlaceholderEmail(order.userEmail))) {
              order.userEmail = email;
            }

            // Guest account creation further down reads order.guestInfo, which
            // is empty on the Magic path until now — without this a Magic guest
            // never gets an account and "Login to track order" fails for them.
            if (order.isGuestOrder) {
              order.guestInfo = {
                name: order.guestInfo?.name || magicAddress.fullName || "",
                email: order.guestInfo?.email || email || "",
                mobile: order.guestInfo?.mobile || magicAddress.mobileNumber || "",
              };
            }

            // Razorpay adds shipping_fee (from /magic/shipping-info) and
            // subtracts any promotion, then re-states the order amount. Trust
            // its numbers — they are what the customer actually paid.
            const shippingFeeRupees = Number(rpOrder?.shipping_fee || 0) / 100;
            if (shippingFeeRupees > 0) {
              order.shippingInfo = { ...(order.shippingInfo?.toObject?.() || order.shippingInfo || {}), amount: shippingFeeRupees };
            }
            const amountAtCreate = Number(order.amount) || 0;
            const paidRupees = Number(payment.amount || 0) / 100;
            if (paidRupees > 0) order.amount = Math.ceil(paidRupees);

            // Whatever coupon the customer actually ended up with is the one on
            // Razorpay's order, not necessarily the one their cart had when the
            // order was created — inside Magic they can swap it or remove it.
            // Recording the cart's coupon regardless burned a redemption the
            // customer never got (usageCount, per-user caps and the CouponUsage
            // audit all key off order.coupon further down).
            const rpPromotion = Array.isArray(rpOrder?.promotions) ? rpOrder.promotions[0] : null;
            if (rpPromotion?.code) {
              const rpCode = String(rpPromotion.code).toUpperCase().trim();
              const sameAsCart =
                order.coupon?.couponCodeName &&
                String(order.coupon.couponCodeName).toUpperCase().trim() === rpCode;
              if (!sameAsCart) {
                const applied = await Coupon.findOne({ code: rpCode, isArchived: false }, { couponId: 1, code: 1 }).lean();
                order.coupon = {
                  couponCodeId: applied?.couponId || rpPromotion.reference_id || null,
                  couponCodeName: applied?.code || rpCode,
                  discountAmount: Math.round(Number(rpPromotion.value || 0)) / 100,
                  isApplied: true,
                };
                console.log(`[MAGIC][webhook] coupon on ${razorpayOrderId} is "${rpCode}" (₹${order.coupon.discountAmount}), not the cart's`);
              }
            } else if (order.coupon?.isApplied) {
              // No promotion echoed back. That does not prove the discount was
              // lost — Razorpay does not always return `promotions` on a fetch —
              // so check the money instead: a Magic order is created at
              // subtotal-minus-discount and Razorpay adds shipping on top, so a
              // honoured coupon pays (created amount + shipping fee). Anything
              // materially above that means the customer paid full price and the
              // redemption must NOT be recorded against them.
              const expectedRupees = amountAtCreate + shippingFeeRupees;
              if (paidRupees > expectedRupees + 1) {
                console.log(
                  `[MAGIC][webhook] coupon "${order.coupon.couponCodeName}" not honoured on ${razorpayOrderId} ` +
                    `(paid ₹${paidRupees} vs expected ₹${expectedRupees}) — not redeeming it`,
                );
                order.coupon = { couponCodeId: null, couponCodeName: null, discountAmount: 0, isApplied: false };
              }
            }

            await order.save();
            console.log(
              `[MAGIC][webhook] address captured for ${razorpayOrderId} — pin ${magicAddress.pinCode}, shipping ₹${shippingFeeRupees}, paid ₹${paidRupees}`,
            );
          } else {
            console.error(
              `[MAGIC][webhook] no customer_details on ${razorpayOrderId} — order has NO address, fulfilment will fail`,
            );
          }
        }

        // idempotent update
        if (order.status !== "PAID") {
          const wasFailedByCron = order.status === "FAILED";

          // ── STEP 1: Create guest account BEFORE marking PAID ──────────────
          // This prevents the race condition where the client polling detects
          // PAID status before the account is created, causing "user not exist"
          // errors when the user immediately clicks "Login to Track Order".
          let guestCredentials = null;
          if (order.isGuestOrder && order.guestInfo?.email) {
            try {
              const guestEmail = order.guestInfo.email.toLowerCase();
              const guestName = order.guestInfo.name || "Customer";
              const guestMobile = order.guestInfo.mobile;
              const tempPassword = generateTempPassword();

              let accountUser = await User.findOne({ email: guestEmail });
              const isExistingUser = !!accountUser;

              if (!accountUser) {
                accountUser = new User({
                  userId: uuidv7(),
                  name: guestName,
                  email: guestEmail,
                  password: tempPassword,
                  mobileNumber: guestMobile ? parseInt(guestMobile, 10) : null,
                  isVerified: true,
                  role: "USER",
                });
                await accountUser.save();
                await Cart.create({ userId: accountUser.userId, products: {} });
              }
              // Existing user: just link the order — never overwrite their password

              await Order.updateOne(
                { _id: order._id },
                { $set: { userId: accountUser.userId, isNewGuestAccount: !isExistingUser } },
              );

              // Only send account-created email for brand-new accounts
              guestCredentials = isExistingUser ? null : { guestEmail, guestName, tempPassword };
              console.log(`[INFO] Guest account ready - Email: ${guestEmail}, isNew: ${!isExistingUser}`);
            } catch (guestAccountError) {
              console.error("[ERROR] Guest account creation failed:", guestAccountError.message, guestAccountError.stack);
            }
          }

          // ── STEP 2: Mark order as PAID (account already exists at this point) ──
          order.payment.razorpayPaymentId = payment.id;
          order.status = "PAID";
          order.payment.errorCode = null;
          order.payment.errorDescription = "";

          const historyNote = wasFailedByCron
            ? "Late Payment Recovery: Order was FAILED by system (timeout), but payment was confirmed later via webhook."
            : "Payment successfully captured via Razorpay.";

          order.statusHistory.push({
            status: "PAID",
            timestamp: new Date(),
            note: historyNote,
          });

          await order.save();

          // Decrement per-variant stock now that the order is confirmed PAID.
          // Guarded by the `order.status !== "PAID"` block above → runs once.
          await decrementStockForOrder(order);

          // ── STEP 3: Send credentials email now that order is confirmed ────
          if (guestCredentials) {
            await sendGuestAccountCreatedEmail(
              guestCredentials.guestEmail,
              guestCredentials.guestName,
              guestCredentials.tempPassword,
              order.orderId,
            ).catch((err) =>
              console.error("[ERROR] Failed to send guest account email:", err.message),
            );
          }

          try {
            await Cart.updateOne(
              { userId: order.userId },
              {
                $set: { products: {} },
                $unset: { appliedCoupon: 1 },
              },
            );
            console.log(
              `[INFO] Cart cleared after successful payment - UserId: ${order.userId}, OrderId: ${order.orderId}`,
            );
          } catch (cartError) {
            console.error(
              `[ERROR] Failed to clear cart after payment - UserId: ${order.userId}, OrderId: ${order.orderId}:`,
              cartError.message,
            );
          }

          // 1.5. COUPON REDEMPTION TRACKING — runs after payment confirmed, not at apply time
          if (order.coupon?.isApplied && order.coupon?.couponCodeId) {
            try {
              const couponId   = order.coupon.couponCodeId;
              const couponCode = order.coupon.couponCodeName;
              const discount   = order.coupon.discountAmount || 0;

              // Internal coupons ARE tracked here (usageCount + CouponUsage) so their per-user
              // limit can be enforced. They are still kept out of analytics — the admin filters
              // them by isInternal coupon id, not by the presence/absence of usage records.
              const normMobile = (order.userMobile || order.senderMobile || "")
                .replace(/\D/g, "").slice(-10) || null;
              const normEmail  = order.userEmail?.toLowerCase().trim() || null;

              // Atomically increment usageCount — respects maxTotalUses cap
              const updatedCoupon = await Coupon.findOneAndUpdate(
                {
                  couponId,
                  isArchived: false,
                  $or: [
                    { maxTotalUses: null },
                    { $expr: { $lt: ["$usageCount", "$maxTotalUses"] } },
                  ],
                },
                { $inc: { usageCount: 1 } },
                { new: true },
              );

              if (updatedCoupon) {
                // ── Per-user limit safety net in webhook ─────────────────────
                // Two simultaneous orders can race past the per-user check at order-creation time
                // and both reach the webhook. Guard here using countDocuments (this IS the atomic
                // last line of defence — discount is already given but we prevent audit corruption
                // and protect against future uses by rolling back the usageCount increment).
                let perUserOk = true;
                if (updatedCoupon.maxUsesPerUser && (normEmail || normMobile)) {
                  const priorUses = await CouponUsage.countDocuments({
                    couponId,
                    $or: [
                      ...(normEmail  ? [{ email:  normEmail  }] : []),
                      ...(normMobile ? [{ mobile: normMobile }] : []),
                    ],
                  });
                  if (priorUses >= updatedCoupon.maxUsesPerUser) {
                    perUserOk = false;
                    // Roll back the usageCount increment so future orders are not blocked unfairly
                    await Coupon.updateOne({ couponId }, { $inc: { usageCount: -1 } });
                    console.warn(`[Coupon:Security] Order=${order.orderId} code=${couponCode} — per-user limit hit in webhook (race condition). usageCount rolled back. priorUses=${priorUses} limit=${updatedCoupon.maxUsesPerUser}`);
                  }
                }

                if (perUserOk) {
                  const productSubtotal = order.items.reduce(
                    (s, i) => s + ((i.productSnapshot?.priceAtPurchase || 0) * (i.productSnapshot?.quantity || 0)),
                    0,
                  );
                  await CouponUsage.create({
                    couponId,
                    couponCode,
                    orderId:               order.orderId,
                    orderType:             "WEBSITE",
                    userId:                order.userId || null,
                    email:                 normEmail,
                    mobile:                normMobile,
                    discountAmount:        discount,
                    cartValueBeforeDiscount: productSubtotal,
                    usedAt:                new Date(),
                  });

                  // Mark TARGETED assignment as used (embedded in coupon document)
                  if (updatedCoupon.scope === "TARGETED" && (normEmail || normMobile)) {
                    await Coupon.updateOne(
                      {
                        couponId,
                        assignedTo: {
                          $elemMatch: {
                            identifier: { $in: [normEmail, normMobile].filter(Boolean) },
                            usedAt: null,
                          },
                        },
                      },
                      { $set: { "assignedTo.$.usedAt": new Date() } },
                    );
                  }

                  console.log(`[Coupon:Apply] Order=${order.orderId} code=${couponCode} discount=₹${discount} usageCount=${updatedCoupon.usageCount} — tracked`);
                }
              } else {
                console.log(`[Coupon:Apply] Order=${order.orderId} code=${couponCode} — cap already reached, skipped increment`);
              }
            } catch (couponErr) {
              console.error(`[Coupon:Apply] Failed to track coupon for order ${order.orderId}:`, couponErr.message);
            }
          }

          // 1.6. LOYALTY POINTS REDEMPTION — debit the real ledger only now that
          // payment is confirmed (mirrors coupon tracking above: an order that
          // never gets paid must not permanently cost the user real points,
          // even though the discount was already priced into this order at
          // creation time).
          if (order.loyalty?.pointsRedeemed > 0) {
            try {
              const ledgerEntry = await writeLedgerEntry({
                userId: order.userId,
                orderId: order.orderId,
                orderType: "WEBSITE",
                type: "REDEEM_ORDER",
                points: -order.loyalty.pointsRedeemed,
                reason: `Redeemed at checkout on order ${order.orderId}`,
                createdBy: "system",
              });
              if (ledgerEntry) {
                await Order.updateOne(
                  { _id: order._id },
                  { $set: { "loyalty.balanceAfterRedeem": ledgerEntry.balanceAfter } },
                );
              }
              console.log(`[Loyalty:Redeem] Order=${order.orderId} pointsRedeemed=${order.loyalty.pointsRedeemed} balanceAfter=${ledgerEntry?.balanceAfter ?? "already-written"}`);
            } catch (loyaltyErr) {
              console.error(`[Loyalty:Redeem] Failed to write ledger entry for order ${order.orderId}:`, loyaltyErr.message);
            }
          }

          // 2. EMAIL NOTIFICATION LOGIC
          try {
            if (order.userEmail) {
              const isCOD = order.paymentMethod === "COD";

              const orderDetails = {
                orderId: order.orderId,
                items: order.items.map((item) => ({
                  productName: item.productSnapshot.productName,
                  quantity: item.productSnapshot.quantity,
                  price: item.productSnapshot.priceAtPurchase,
                })),
                total: order.amount,
                orderDate: order.createdAt,
                senderMobile: order.senderMobile,
                receiverMobile: order.receiverMobile,
                paymentMethod: order.paymentMethod,
                codDetails: order.codDetails,
              };

              // Send order confirmation email.
              // A WhatsApp-login customer, and a Magic guest who gave no email,
              // carry a placeholder address on a domain with no mail server.
              // Sending there bounces, and bounces at volume get the real
              // transactional mail filtered. They get WhatsApp instead.
              const canEmail = order.userEmail && !isPlaceholderEmail(order.userEmail);
              if (canEmail) {
                await sendOrderConfirmation(order.userEmail, orderDetails).catch(
                  (err) => {
                    console.error(
                      "Failed to send order confirmation email:",
                      err,
                    );
                  },
                );
              } else {
                console.log(`[EMAIL] Skipped confirmation for ${order.orderId} — no real address on file`);
              }

              // Same confirmation over WhatsApp. It gets read far more often
              // than email, and a WhatsApp-login customer may have no real
              // email address at all. Not awaited — a messaging hiccup must
              // not hold up the payment response. Silently no-ops until the
              // template id and API key are configured.
              sendOrderConfirmationWhatsApp({
                mobileNumber: order.userMobile,
                name: order.userName,
                orderId: order.orderId,
                amount: order.amount,
              }).catch(() => {});

              // For COD, only the advance was actually captured via Razorpay right now —
              // the receipt must reflect that amount, not the full order total.
              const paymentDetails = {
                paymentId: payment.id,
                amount: isCOD ? order.codDetails?.partialAmountPaid ?? order.amount : order.amount,
                orderId: order.orderId,
                date: new Date(),
                paymentMethod: isCOD ? "COD" : "Razorpay",
                codDetails: isCOD ? order.codDetails : null,
              };
              if (canEmail) {
                await sendPaymentReceipt(order.userEmail, paymentDetails).catch(
                  (err) => {
                    console.error("Failed to send payment receipt email:", err);
                  },
                );
              }
            }
          } catch (emailError) {
            console.error("Error sending emails:", emailError);
          }

          try {
            if (!order.invoiceData || !order.invoiceData.isGenerated) {
              console.log(
                `[INFO] Generating PDF Invoice for Order: ${order.orderId}...`,
              );
              const invoiceHtml = generateInvoiceHtmlTemplate(order);
              const file = { content: invoiceHtml };
              const options = {
                format: "A4",
                args: [
                  "--no-sandbox",
                  "--disable-setuid-sandbox",
                  "--disable-dev-shm-usage",
                  "--disable-gpu",
                ],
              };
              const pdfBuffer = await html_to_pdf.generatePdf(file, options);
              const savedFileKey = await uploadInvoiceToS3(
                pdfBuffer,
                order.userId,
                order.orderId,
              );
              await Order.updateOne(
                { _id: order._id },
                {
                  $set: {
                    "invoiceData.isGenerated": true,
                    "invoiceData.s3FileKey": savedFileKey,
                  },
                },
              );

              console.log(
                `✅ Invoice uploaded to S3 successfully: ${savedFileKey}`,
              );
            }
          } catch (invoiceError) {
            console.error(
              "❌ Error generating or uploading invoice to S3:",
              invoiceError,
            );
          }
          try {
            const capiContents = order.items.map((i) => ({
              id: i.productId,
              quantity: i.productSnapshot.quantity,
            }));
            await sendMetaCapiEvent({
              eventName: "Purchase",
              eventId: order.orderId,
              eventSourceUrl: order.metaTracking?.eventSourceUrl,
              userData: {
                // Never hash a placeholder address into Meta's user data. A
                // WhatsApp-login customer, and a Magic guest who gave no email,
                // carry one on a domain that does not exist — sending it as a
                // real identifier pollutes matching instead of improving it.
                email: isPlaceholderEmail(order.userEmail) ? null : order.userEmail,
                phone: order.userMobile || order.senderMobile,
                firstName: (order.userName || order.guestInfo?.name || "").split(" ")[0],
                lastName: (order.userName || order.guestInfo?.name || "").split(" ").slice(1).join(" "),
                externalId: order.userId || order.metaTracking?.anonymousId,
                fbp: order.metaTracking?.fbp,
                fbc: order.metaTracking?.fbc,
                clientIp: order.metaTracking?.clientIp,
                clientUserAgent: order.metaTracking?.clientUserAgent,
                zip: order.deliveryAddress?.pinCode ? String(order.deliveryAddress.pinCode) : null,
                city: order.deliveryAddress?.city || null,
                state: order.deliveryAddress?.state || null,
              },
              customData: {
                currency: "INR",
                value: order.amount,
                content_ids: capiContents.map((c) => c.id),
                contents: capiContents,
                num_items: capiContents.reduce((n, c) => n + (c.quantity || 1), 0),
                order_id: order.orderId,
              },
            });
          } catch (capiError) {
            console.error("[Meta CAPI] Purchase dispatch error:", capiError.message);
          }

          // First-party purchase → Event collection. Inside the
          // `order.status !== "PAID"` guard, so it runs exactly once per order
          // however many times Razorpay replays the webhook. This is what makes
          // /admin/analytics revenue match reality: the browser-side purchase
          // is lost to ad-blockers and closed tabs, this one never is.
          await recordServerPurchase(order, {
            recoveredFrom: wasFailedByCron ? "FAILED" : undefined,
          });
        }

        console.log("✅ Payment Captured:", payment.id);
        break;
      }

      case "payment.failed": {
        const payment = payload.payload.payment.entity;
        const errorCode = payment.error_code || "payment_failed";
        const errorDescription =
          payment.error_description || "Payment attempt failed.";

        await Order.updateOne(
          {
            "payment.razorpayOrderId": payment.order_id,
            status: { $nin: ["PAID", "DELIVERED", "SHIPPED"] },
          },
          {
            $set: {
              status: "FAILED",
              "payment.errorCode": errorCode,
              "payment.errorDescription": errorDescription,
            },
            $push: {
              statusHistory: {
                status: "FAILED",
                timestamp: new Date(),
                note: `Payment failed: ${errorDescription}`,
              },
            },
          },
        );

        console.log("❌ Payment Failed:", payment.id, errorCode);
        break;
      }
      case "order.paid": {
        const orderEntity = payload.payload.order.entity;
        console.log("📦 Order Paid Event:", orderEntity.id);
        break;
      }

      default:
        console.log("Unhandled event:", event);
    }
    return res.status(200).json({ status: "ok" });
  } else {
    // Signature is invalid
    return res.status(400).json({
      statusCode: 400,
      success: false,
      error: "Invalid signature",
      data: null,
    });
  }
};

const generateTempPassword = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const guestCreateOrderController = asyncHandler(async (req, res) => {
  const { items, guestInfo, deliveryAddress, paymentMethod: reqPaymentMethod, couponCode: rawCouponCode, giftWrap: reqGiftWrap, giftWrapNoteOptions: reqGiftWrapNoteOptions, anonymousId } = req.body;

  // Magic Checkout (1CC): Razorpay collects the name, phone, email AND address
  // in its own modal and hands them to us on the webhook. Demanding them here
  // would put back on the page exactly the fields Magic exists to remove — a
  // guest would fill the form twice. So on this path everything the modal
  // collects is optional, and only what Magic never sees stays required.
  // Guests are the biggest win here: they have no saved address, so Magic's
  // address network does the most work for them.
  const isMagic = isMagicCheckoutEnabled() && req.body?.magic === true;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!isMagic) {
    if (!guestInfo?.name?.trim()) throw new ValidationError("Full name is required");
    if (!guestInfo?.email?.trim()) throw new ValidationError("Email is required");
    if (!guestInfo?.mobile?.trim()) throw new ValidationError("Mobile number is required");
  }

  // Whatever WAS supplied still has to be well formed — a malformed value is a
  // bug on the client, not something to quietly store.
  if (guestInfo?.email?.trim() && !emailRegex.test(guestInfo.email))
    throw new ValidationError("Invalid email address");

  const cleanMobile = stripCountryCode(guestInfo?.mobile || "");
  if (cleanMobile && !/^[0-9]{10}$/.test(cleanMobile))
    throw new ValidationError("Valid 10-digit mobile number is required");
  if (!isMagic && !cleanMobile)
    throw new ValidationError("Valid 10-digit mobile number is required");

  if (!items || !Array.isArray(items) || items.length === 0) throw new ValidationError("Items are required");

  if (!isMagic) {
    if (!deliveryAddress?.formattedAddress?.trim()) throw new ValidationError("Delivery address is required");
    if (!deliveryAddress?.pinCode) throw new ValidationError("Pincode is required");
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await Product.find({ productId: { $in: productIds }, productStatus: "in_stock" });

  if (products.length !== productIds.length) throw new ValidationError("One or more products unavailable");

  const rawItemsForShipping = [];

  const orderItems = items.map((item) => {
    const product = products.find((p) => p.productId === item.productId);
    const itemVariant = item.variant || "N/A";
    // Block out-of-stock / over-ordered variants before the order is created.
    assertVariantAvailable(product, itemVariant, item.quantity);

    let priceAtPurchase = 0;
    let matchedVariant = null;
    if (product.variantDetails && product.variantDetails.length > 0) {
      matchedVariant = product.variantDetails.find((v) => v.variantName === itemVariant);
      priceAtPurchase = matchedVariant?.variantPrice || product.variantDetails[0].variantPrice || 0;
    }
    // Shipping-rate calculation uses the pre-discount price (weight/rate
    // tiers, not the customer's charged amount) — deliberately NOT touched
    // by the cart-rule discount applied to orderItems below.
    rawItemsForShipping.push({ productId: item.productId, quantity: item.quantity, price: priceAtPurchase, selectedVariant: itemVariant });

    let itemImage = null;
    if (product.variantDetails?.length > 0) {
      const variant = product.variantDetails.find((v) => v.variantName === itemVariant);
      if (variant?.variantImage?.length > 0) itemImage = variant.variantImage[0];
    }
    if (!itemImage) itemImage = product.productImg || "https://urbannook.in/assets/logo.webp";

    return {
      productId: product.productId,
      // Temporary, NOT part of the Order schema — see the identical comment
      // in razorpayCreateOrderController above.
      variantSku: matchedVariant?.sku || "",
      productSnapshot: {
        quantity: item.quantity,
        productImg: itemImage,
        productName: product.productName,
        productCategory: product.productCategory,
        productSubCategory: product.productSubCategory,
        priceAtPurchase,
        selectedVariant: itemVariant,
        variantTitleTemplate: product.variantTitleTemplate || "",
        // Stable variant identifier — see the matching comment in
        // razorpayCreateOrderController above.
        variantSku: matchedVariant?.sku || "",
      },
    };
  });

  // Generic, data-driven cart-promotion rules — see the matching comment in
  // razorpayCreateOrderController above for the full rationale. Applied here
  // BEFORE subtotal is computed below, so the discount is baked into
  // priceAtPurchase and subtotal/order/invoice all agree.
  const activeCartRules = await getActiveCartRules();
  const cartRuleResult = evaluateCartRules(
    orderItems.map((oi) => ({ productId: oi.productId, quantity: oi.productSnapshot.quantity, variantSku: oi.variantSku })),
    activeCartRules,
  );
  for (const oi of orderItems) {
    const candidates = getDiscountCandidatesForItem(cartRuleResult.discountCandidatesByProduct, oi.productId, oi.variantSku);
    if (candidates?.length) {
      oi.productSnapshot.priceAtPurchase = applyBestDiscount(oi.productSnapshot.priceAtPurchase, candidates);
    }
  }

  // Recomputed from orderItems (post cart-rule discount), not accumulated
  // inline during the map above — mirrors the authenticated-user path.
  const subtotal = orderItems.reduce((s, i) => s + i.productSnapshot.priceAtPurchase * i.productSnapshot.quantity, 0);

  // Magic has no pincode yet — Razorpay rates the address through
  // /magic/shipping-info and adds shipping_fee to the order itself, so shipping
  // must stay OUT of the amount we create the order with.
  const shippingResult = isMagic
    ? null
    : await getShippingRateOrFallback({
        pincode: deliveryAddress.pinCode,
        paymentType: reqPaymentMethod === "COD" ? "COD" : "PREPAID",
        cartItems: rawItemsForShipping
      });
  const realShippingAmount = isMagic ? 0 : (shippingResult?.total_charges || 179);
  // Free shipping unlocks via ANY of: the combo-banner offer (source +
  // recommended product both present), any active generic cart rule whose
  // effects include free_shipping (e.g. "2+ Lamps"), OR the cart subtotal
  // simply being at/above the admin-configured thresholdAmount — plain,
  // direct comparison, whole-cart (any products count), no rules table.
  const freeShippingConfig = await getFreeShippingConfig();
  const thresholdEligible = freeShippingConfig.isActive && subtotal >= freeShippingConfig.thresholdAmount;
  const freeShippingUnlocked =
    (await isFreeShippingEligible(items.map((i) => i.productId))) || cartRuleResult.freeShipping || thresholdEligible;
  const chargedShippingAmount = freeShippingUnlocked ? 0 : realShippingAmount;
  // console.log(
  //   `[FreeShipping][Order:guest] realShipping=₹${realShippingAmount} chargedShipping=₹${chargedShippingAmount} items=${items.map(i => `${i.productId}x${i.quantity}`).join(",")}`,
  // );

  // Gift wrap: guests have no server-side cart to read intent from, so the
  // boolean (only) comes from req.body — that's safe, it just means "include
  // it or don't." Price is still never trusted from the client: it's always
  // the live offer config's price, zeroed automatically if the offer is off.
  const giftWrapConfig = await getPublicOfferConfig("gift_wrap");
  // One gift wrap per ELIGIBLE UNIT (admin opt-in per product) — sums
  // quantity across every line whose product is eligible, so 2x the same
  // eligible product is 2 gift wraps, not 1.
  const giftWrapQty = orderItems.reduce((sum, oi) => {
    const product = products.find((p) => p.productId === oi.productId);
    return product?.giftWrapEligible ? sum + (Number(oi.productSnapshot.quantity) || 0) : sum;
  }, 0);
  const giftWrapSelected = !!reqGiftWrap && giftWrapConfig.isActive && giftWrapQty > 0;
  const giftWrapAmount = giftWrapSelected ? giftWrapConfig.price * giftWrapQty : 0;
  const GIFT_NOTE_OPTIONS = ["birthday", "rakhi", "none"];
  const validReqNotes = Array.isArray(reqGiftWrapNoteOptions)
    ? reqGiftWrapNoteOptions.filter((n) => GIFT_NOTE_OPTIONS.includes(n))
    : [];
  const giftWrapNoteOptions = giftWrapSelected && validReqNotes.length ? validReqNotes : ["none"];

  // ── Guest coupon validation ───────────────────────────────────────────────────
  let couponCodeId = null, couponCodeName = null, discountAmount = 0, isApplied = false;
  let isInternalTestOrder = false;
  // Empty on the Magic path until the webhook fills it in from customer_details.
  const guestEmail = guestInfo?.email?.toLowerCase().trim() || "";

  if (rawCouponCode?.trim()) {
    const cleanCode = rawCouponCode.trim().toUpperCase();
    const liveCoupon = await Coupon.findOne({ code: cleanCode, isArchived: false }).lean();

    if (!liveCoupon || !liveCoupon.isActive) {
      throw new ValidationError("Invalid or inactive coupon.");
    }
    // Guests cannot use MEMBERS_ONLY coupons
    if (liveCoupon.audience === "MEMBERS_ONLY") {
      throw new ValidationError("This coupon is only available for registered members. Please sign in to use it.");
    }
    const isValidInternal = liveCoupon.isInternal && liveCoupon.discountType === "INTERNAL_TEST";
    if (liveCoupon.isTest && !isValidInternal) {
      throw new ValidationError("Invalid or inactive coupon.");
    }
    if (liveCoupon.isInternal && !isValidInternal) {
      throw new ValidationError("Invalid or inactive coupon.");
    }
    // Internal test coupons require a signed-in account so the assigned email is verified —
    // guests are not allowed to redeem them.
    if (isValidInternal) {
      throw new ValidationError("This coupon is only available to signed-in team members. Please sign in to use it.");
    }
    const now = new Date();
    if (liveCoupon.validFrom && now < new Date(liveCoupon.validFrom)) {
      throw new ValidationError("This coupon is not valid yet.");
    }
    if (liveCoupon.validUntil && now > new Date(liveCoupon.validUntil)) {
      throw new ValidationError("This coupon has expired.");
    }
    if (subtotal < (liveCoupon.minCartValue || 0)) {
      throw new ValidationError(`Minimum order of ₹${liveCoupon.minCartValue} required for this coupon.`);
    }
    if (liveCoupon.maxTotalUses != null && liveCoupon.usageCount >= liveCoupon.maxTotalUses) {
      throw new ValidationError("This coupon has reached its maximum number of uses.");
    }

    // Per-user limit check (by email + mobile)
    const normMobileCoupon = cleanMobile;
    const identifiers = [guestEmail, normMobileCoupon].filter(Boolean);
    if (identifiers.length > 0 && liveCoupon.maxUsesPerUser) {
      const priorUses = await CouponUsage.countDocuments({
        couponId: liveCoupon.couponId,
        $or: [
          { email: guestEmail },
          { mobile: normMobileCoupon },
        ],
      });
      if (priorUses >= liveCoupon.maxUsesPerUser) {
        throw new ValidationError(
          liveCoupon.maxUsesPerUser === 1
            ? "You have already used this coupon."
            : `You have already used this coupon ${priorUses} time(s) (limit: ${liveCoupon.maxUsesPerUser}).`
        );
      }
    }

    // TARGETED scope: must be in assignedTo list (internal coupons are already rejected above
    // for guests, so this path only handles normal targeted coupons here).
    if (liveCoupon.scope === "TARGETED") {
      const assignment = (liveCoupon.assignedTo || []).find(a => identifiers.includes(a.identifier));
      if (!assignment) {
        throw new ValidationError("This coupon has not been assigned to you.");
      }
      if (assignment.usedAt) {
        throw new ValidationError("Your personal coupon has already been used.");
      }
    }

    // Calculate discount
    if (isValidInternal) {
      isInternalTestOrder = true;
      discountAmount = Math.max(subtotal + giftWrapAmount + chargedShippingAmount - 1, 0);
    } else if (liveCoupon.discountType === "PERCENTAGE") {
      let d = Math.floor((subtotal * liveCoupon.discountValue) / 100);
      if (liveCoupon.maxDiscountCap) d = Math.min(d, liveCoupon.maxDiscountCap);
      discountAmount = Math.min(d, subtotal);
    } else {
      discountAmount = Math.min(liveCoupon.discountValue || 0, subtotal);
    }

    couponCodeId = liveCoupon.couponId;
    couponCodeName = liveCoupon.code;
    isApplied = true;
    console.log(`[Coupon:Guest] Applied "${cleanCode}" — discount ₹${discountAmount} on subtotal ₹${subtotal}`);
  }

  // Same maths as the logged-in checkout above — one shared function so the
  // two can never disagree about what a customer pays.
  const charge = computeOrderCharge({
    subtotal,
    giftWrapAmount,
    chargedShippingAmount,
    realShippingAmount,
    discountAmount,
    isInternalTestOrder,
    isMagic,
    paymentMethod: reqPaymentMethod,
  });
  const { finalAmount, isCOD, codPartialAmount, codRemainingAmount, razorpayChargeAmount, razorpayChargeAmountPaise } = charge;

  // Update orderItems with shipping value now that it's calculated — customer-facing amount
  orderItems.forEach(i => { i.productSnapshot.shipping = String(chargedShippingAmount); });

  // line_items is what makes Razorpay treat this as a 1CC order.
  let magicOrderOptions = {};
  // What Razorpay is actually asked to charge. Identical to
  // razorpayChargeAmountPaise off the Magic path; on it, the line items decide.
  let magicChargePaise = razorpayChargeAmountPaise;
  if (isMagic) {
    const lineItems = buildMagicLineItems(orderItems);
    if (giftWrapSelected && giftWrapAmount > 0) {
      const giftWrapPaise = Math.round(giftWrapAmount * 100);
      lineItems.push({
        type: "e-commerce",
        sku: "gift-wrap",
        price: giftWrapPaise,
        offer_price: giftWrapPaise,
        tax_amount: 0,
        quantity: 1,
        name: giftWrapConfig.title || "Gift Wrap",
        description: "Gift wrapping",
      });
    }
    // Same as the logged-in path: the discount has to be on the items, because
    // Razorpay silently discards a `promotions` entry.
    const fullTotal = lineItemsTotalPaise(lineItems);
    const discounted = discountMagicLineItems(lineItems, razorpayChargeAmountPaise);

    magicOrderOptions = {
      line_items: discounted.lineItems,
      line_items_total: discounted.total,
    };
    magicChargePaise = discounted.total;
    console.log(
      `[MAGIC][order-create][guest] ${lineItems.length} line item(s), full ₹${fullTotal / 100}, ` +
        `after discount ₹${discounted.total / 100} (asked ₹${razorpayChargeAmount})`,
    );
  }

  const razorpayOrder = await razorpayCreateOrderService(
    magicChargePaise,
    "INR",
    magicOrderOptions,
  );

  const order = await Order.create({
    orderId: uuidv7(),
    userEmail: guestEmail || buildPlaceholderEmail(`magic-${razorpayOrder?.data?.id || uuidv7()}`),
    // Reuse the SAME per-browser anonymousId the pre-payment guest-cart-sync
    // wrote as userId (see guestCart.route.js / syncGuestCartService) — this
    // is what lets the admin's abandoned-cart job recognize this guest as
    // converted once the order is PAID, instead of showing them as
    // permanently abandoned. Falls back to a fresh id only if the client
    // somehow didn't send one (older client build, etc).
    userId: anonymousId ? `guest_${anonymousId}` : `guest_${uuidv7()}`,
    // On Magic these are blank until the webhook reads customer_details. The
    // order model requires an email, so it gets a placeholder on the domain
    // that intentionally has no mail server — nothing is ever sent there, and
    // the webhook replaces it with the real address.
    userName: guestInfo?.name?.trim() || "",
    userMobile: cleanMobile,
    items: orderItems,
    // Whole-rupee, matching exactly what razorpayChargeAmountPaise actually
    // charges — finalAmount itself can be fractional (realShippingAmount is
    // a live carrier rate, not guaranteed integer), so storing it unrounded
    // here could drift a few paise from the real charge in the order record.
    amount: Math.ceil(finalAmount),
    giftWrap: { selected: giftWrapSelected, price: giftWrapAmount, quantity: giftWrapQty, title: giftWrapConfig.title, noteOptions: giftWrapNoteOptions },
    shippingInfo: {
      amount: realShippingAmount,
      type: shippingResult?.type || "standard",
      expectedNoOfBoxes: shippingResult?.expectedNoOfBoxes || 0,
      totalWeight: shippingResult?.totalWeight || 0,
      serviceName: shippingResult?.serviceName || null
    },
    senderMobile: cleanMobile,
    receiverMobile: cleanMobile,
    // On the Magic path deliveryAddress is absent — the webhook fills this in
    // from Razorpay's customer_details once payment succeeds.
    deliveryAddress: {
        fullName: guestInfo?.name?.trim() || "",
      mobileNumber: cleanMobile,
      formattedAddress: deliveryAddress?.formattedAddress || "",
      deliveryAddressFull: deliveryAddress?.deliveryAddressFull || deliveryAddress?.formattedAddress || "",
      pinCode: deliveryAddress?.pinCode ? parseInt(String(deliveryAddress.pinCode), 10) : null,
      landmark: deliveryAddress?.landmark || "",
      flatOrFloorNumber: deliveryAddress?.flatOrFloorNumber || "",
      lat: deliveryAddress?.lat || 0,
      long: deliveryAddress?.long || 0,
    },
    payment: { razorpayOrderId: razorpayOrder?.data?.id },
    status: "CREATED",
    isMagicOrder: isMagic,
    isInternalTestOrder,
    freeShippingUnlocked,
    paymentMethod: isCOD ? "COD" : "PREPAID",
    codDetails: isCOD ? { partialAmountPaid: codPartialAmount, remainingAmount: codRemainingAmount } : undefined,
    isGuestOrder: true,
    guestInfo: { name: guestInfo?.name?.trim() || "", email: guestEmail, mobile: cleanMobile },
    coupon: { couponCodeId, couponCodeName, discountAmount, isApplied },
    metaTracking: collectMetaTracking(req),
  });

  return res.status(200).json(
    new ApiRes(
      200,
      "Guest order created",
      {
        orderId: order.orderId,
        razorpayOrderId: razorpayOrder?.data?.id,
        amount: magicChargePaise,
        currency: "INR",
        magic: isMagic, // see the logged-in response — client follows this
        paymentMethod: isCOD ? "COD" : "PREPAID",
        codDetails: isCOD ? { partialAmountPaid: codPartialAmount, remainingAmount: codRemainingAmount } : null,
        senderMobile: cleanMobile,
        receiverMobile: cleanMobile,
        coupon: isApplied ? { code: couponCodeName, discountAmount } : null,
      },
      true,
    ),
  );
});

export {
  razorpayCreateOrderController,
  razorpayKeyGetController,
  razorpayWebHookController,
  guestCreateOrderController,
};
