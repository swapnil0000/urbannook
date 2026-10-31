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
import { couponProductGateOk } from "../services/coupon.code.service.js";
import PromotionUsage from "../model/promotionUsage.model.js";
import Promotion from "../model/promotion.model.js";
import { backfillUserProfileFromCheckout, PLACEHOLDER_NAME } from "../services/user.profile.service.js";
import { capturedGuestContact } from "../services/guest.order.claim.service.js";
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
import { calculateShippingRate, staticShippingCharge } from "../services/shipping.service.js";
import { apiCache } from "../module/cache.manager.module.js";
import { sortVariantsOOSLast, deriveProductStatus, syncVariantOutOfStock } from "../utils/variantSort.js";

// ── Per-variant stock decrement ───────────────────────────────────────────────
// A "buy X get Y [% off/free]" reward (cart_rule or Promotion V2) must only
// discount up to `cap` units of Y — NOT the entire line regardless of
// quantity. Without this, a customer adding 2+ of the discounted/free
// product got ALL of them at the discounted price (e.g. 2 stands both free
// off a single Katana), not just one — a real revenue leak, not a display
// bug (priceAtPurchase is what's actually charged and invoiced).
//
// Mutates `oi` in place to the capped quantity + discounted price, and — if
// the cart quantity exceeds `cap` — returns a SECOND order item for the
// remainder at full price (same productId/variant, same pattern already
// used for the free_product gift line below: a product can legitimately
// appear as more than one line in `orderItems`). Returns null when no split
// is needed (quantity already <= cap, or the discount didn't actually lower
// the price — e.g. a reward with no matching candidate).
// The admin-configured cap for whichever candidate(s) matched this line —
// see cartRule.util.js's ruleRepeatCount / promotionEngine.util.js's
// promotionRepeatCount for how `cap` itself is computed (purely from the
// rule's own condition minQuantity vs. real cart quantity, never guessed
// here). When more than one rule discounts the same line, the most
// generous applicable cap wins — consistent with applyBestDiscount/
// applyBestPromotionDiscount already picking the best PRICE among
// candidates for the same line.
function capDiscountedQuantity(oi, fullUnitPrice, discountedUnitPrice, cap = 1) {
  const quantity = oi.productSnapshot.quantity;
  oi.productSnapshot.priceAtPurchase = discountedUnitPrice;
  if (discountedUnitPrice >= fullUnitPrice || quantity <= cap) return null;

  const remainder = quantity - cap;
  oi.productSnapshot.quantity = cap;
  return {
    productId: oi.productId,
    variantSku: oi.variantSku,
    productSnapshot: { ...oi.productSnapshot, quantity: remainder, priceAtPurchase: fullUnitPrice, isPromotionalGift: false },
  };
}

// Phase 5 — cheapest_item_free/cheapest_item_discount. Adjusts exactly ONE
// unit of `oi` (not its whole line quantity, even if quantity > 1 — "the
// cheapest item" is singular), same remainder-line split pattern as
// capDiscountedQuantity above, reused rather than reinvented.
function applyCheapestItemAdjustment(oi, mode, value) {
  const quantity = oi.productSnapshot.quantity;
  const fullPrice = oi.productSnapshot.priceAtPurchase;
  const adjustedPrice = mode === "free" ? 0 : Math.max(0, Math.round(fullPrice * (1 - Number(value || 0) / 100)));
  oi.productSnapshot.priceAtPurchase = adjustedPrice;
  if (adjustedPrice === 0) oi.productSnapshot.isPromotionalGift = true;
  const amount = fullPrice - adjustedPrice;
  if (quantity <= 1) return { amount, remainderLine: null };
  const remainder = quantity - 1;
  oi.productSnapshot.quantity = 1;
  return {
    amount,
    remainderLine: {
      productId: oi.productId,
      variantSku: oi.variantSku,
      productSnapshot: { ...oi.productSnapshot, quantity: remainder, priceAtPurchase: fullPrice, isPromotionalGift: false },
    },
  };
}

// Free products a promotion granted on this order (the synthetic ₹0 lines), listed with the exact
// product id + SKU so fulfilment knows what to pack and ship. Built from the order's own lines, so
// a gift that was skipped (out of stock) is never listed.
function buildPromotionalGiftSummary(orderItems, promotionResult) {
  const out = [];
  for (const g of promotionResult?.freeGifts || []) {
    if (!g.targetProductId) continue;
    const line = orderItems.find((oi) => oi.productId === g.targetProductId
      && oi.productSnapshot?.isPromotionalGift && oi.productSnapshot.priceAtPurchase === 0
      && (!g.targetVariantSku || oi.variantSku === g.targetVariantSku));
    if (!line) continue;
    out.push({
      productId: line.productId,
      variantSku: line.variantSku || "",
      productName: line.productSnapshot.productName,
      selectedVariant: line.productSnapshot.selectedVariant,
      quantity: line.productSnapshot.quantity,
      promotionId: String(g.promotionId),
      promotionName: g.name || "",
    });
  }
  return out;
}

// Phase 5 — picks the single winning cheapestItemAdjustments entry (same
// priority/stackable/createdAt tiebreak as resolveProductWinners elsewhere
// in this engine, reused via isBetterPromoForProduct) and applies it to
// whichever order line currently has the LOWEST post-discount unit price
// (CURRENT price, not list price — "cheapest" means cheapest to the
// customer right now, consistent with discounts already baked in by the
// per-item loop above this is called after), optionally narrowed to the
// reward's own targetScope. A free_product gift line or an already-zeroed
// line never counts as a candidate — those aren't "paid items" to begin
// with. No-op (returns unchanged orderItems) when nothing qualifies.
function applyCheapestItemReward(orderItems, cheapestItemAdjustments, matchedPromotions, promoDiscountByPromotionId, discountCandidatesByProduct, maxDiscountAmountByPromotionId) {
  if (!cheapestItemAdjustments?.length) return;
  const metaById = new Map(matchedPromotions.map((p) => [String(p._id), { priority: p.priority || 0, stackable: p.stackable !== false, createdAt: p.createdAt || null }]));
  const fallbackMeta = { priority: 0, stackable: true, createdAt: null };
  let winner = cheapestItemAdjustments[0];
  let winnerMeta = metaById.get(winner.promotionId) || fallbackMeta;
  for (const adj of cheapestItemAdjustments.slice(1)) {
    const meta = metaById.get(adj.promotionId) || fallbackMeta;
    if (isBetterPromoForProduct(meta, winnerMeta)) { winner = adj; winnerMeta = meta; }
  }

  // Single-winner protection (combination-testing finding, 2026-10-19):
  // a product that already has a winning product-level discount candidate
  // (resolveProductWinners already ran, so any survivor here IS the single
  // winner for that product) is NOT eligible to also be picked as the
  // cheapest item for a DIFFERENT promotion's cheapest-item reward — that
  // would compound two promotions on one product, the exact thing
  // resolveProductWinners exists to prevent for discountCandidatesByProduct/
  // freeGifts. A product with no discount candidates at all is unaffected.
  const alreadyWonElsewhere = new Set(
    [...(discountCandidatesByProduct?.entries() || [])]
      .filter(([, candidates]) => candidates.length && candidates[0].ruleId !== winner.promotionId)
      .map(([productId]) => productId),
  );

  const candidates = orderItems.filter((oi) =>
    oi.productSnapshot.priceAtPurchase > 0
    && !oi.productSnapshot.isPromotionalGift
    && !alreadyWonElsewhere.has(oi.productId)
    && (!winner.scopeProductIds || winner.scopeProductIds.includes(oi.productId)),
  );
  if (!candidates.length) return;
  let cheapest = candidates[0];
  for (const oi of candidates.slice(1)) {
    if (oi.productSnapshot.priceAtPurchase < cheapest.productSnapshot.priceAtPurchase) cheapest = oi;
  }

  // Phase 4 composition: maxDiscountAmount bounds a cheapest-item reward
  // exactly like it bounds every other reward type. "free" is all-or-
  // nothing (can't half-free one unit), so if the remaining budget can't
  // cover the FULL value, skip the adjustment entirely rather than
  // partially/over-granting it.
  const budget = maxDiscountAmountByPromotionId?.get(winner.promotionId);
  if (budget != null) {
    const spent = promoDiscountByPromotionId.get(winner.promotionId) || 0;
    const remaining = Math.max(0, budget - spent);
    const fullValue = cheapest.productSnapshot.priceAtPurchase;
    if (remaining < fullValue) return; // not enough budget left to grant this at all
  }

  const { amount, remainderLine } = applyCheapestItemAdjustment(cheapest, winner.mode, winner.value);
  if (remainderLine) orderItems.push(remainderLine);
  if (amount > 0) {
    promoDiscountByPromotionId.set(winner.promotionId, (promoDiscountByPromotionId.get(winner.promotionId) || 0) + amount);
  }
}

// Runs once, atomically, the moment an order is confirmed PAID. For each ordered
// item we decrement THAT variant's tracked quantity (variantQuantity) by the
// purchased quantity. Variants with no tracked quantity (null) are skipped —
// they aren't stock-managed. The update is atomic ($inc on the positionally
// matched variant), GUARDED by variantQuantity >= qty so two concurrent
// last-unit payment confirmations can't both succeed and push stock negative
// (the earlier assertVariantAvailable check at order-creation time is a
// courtesy UX check only — a plain read, not a lock — so this guard at the
// actual write is what actually prevents overselling). When a quantity
// crosses 0 the variant auto-derives out-of-stock everywhere (the OOS rule is
// computed, not stored) — and its position in the array is pushed to the end
// (see sortVariantsOOSLast) so it doesn't keep sitting among in-stock ones.
// Best-effort: never throws into the payment flow.
const decrementStockForOrder = async (order) => {
  let anyChanged = false;
  for (const item of order.items || []) {
    const qty = item?.productSnapshot?.quantity;
    const variantName = item?.productSnapshot?.selectedVariant;
    if (!item.productId || !qty || qty < 1) continue;
    if (!variantName || variantName === "N/A") continue; // single-design / no variant
    try {
      // Read first to tell "untracked" (variantQuantity null — correctly a
      // no-op) apart from "tracked but not enough left" (the case the write
      // guard below exists for) so only the latter gets logged as a problem.
      const productDoc = await Product.findOne(
        { productId: item.productId, "variantDetails.variantName": variantName },
        { "variantDetails.$": 1 },
      ).lean();
      const trackedVariant = productDoc?.variantDetails?.[0];
      if (!trackedVariant || trackedVariant.variantQuantity == null) continue; // not stock-tracked

      const res = await Product.updateOne(
        {
          productId: item.productId,
          variantDetails: { $elemMatch: { variantName, variantQuantity: { $ne: null, $gte: qty } } },
        },
        // Decrement the variant AND the product-level total (kept = sum of
        // tracked variant quantities) so both stay consistent between admin saves.
        { $inc: { "variantDetails.$.variantQuantity": -qty, productQuantity: -qty } },
      );
      if (res.modifiedCount > 0) {
        anyChanged = true;
        await resortVariantsIfNeeded(item.productId);
      } else {
        // Tracked, but not enough stock left at decrement time (the race this
        // guard exists for). Order is already PAID; no refund/cancellation is
        // triggered here (out of scope), just surfaced for manual follow-up.
        console.error(`[Stock] insufficient stock at decrement time order=${order.orderId} product=${item.productId} variant=${variantName} qty=${qty}`);
      }
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

// After a successful decrement: auto-flip variantOutOfStock for the variant
// that just hit 0 (quantity is the source of truth for any TRACKED variant —
// this is the ONE write path where quantity changes with zero admin anywhere
// near the edit form, so it's the one place that actually needs to sync the
// stored flag itself rather than relying on the admin server's own
// save-time sync). Then re-sort so any newly-OOS variant sinks to the end —
// mirrors the admin server's on-save sort (product.controller.js). Also
// re-derives productStatus from the fresh stock, same reasoning.
const resortVariantsIfNeeded = async (productId) => {
  try {
    const doc = await Product.findOne({ productId }, { variantDetails: 1, productQuantity: 1, productStatus: 1 }).lean();
    if (!doc?.variantDetails?.length) return;
    const synced = syncVariantOutOfStock(doc.variantDetails);
    const flagsChanged = synced.some((v, i) => v.variantOutOfStock !== doc.variantDetails[i]?.variantOutOfStock);
    const sorted = sortVariantsOOSLast(synced);
    const reordered = sorted.some((v, i) => v.variantName !== doc.variantDetails[i]?.variantName);
    const update = {};
    if (flagsChanged || reordered) update.variantDetails = sorted;
    const derivedStatus = deriveProductStatus(synced, doc.productQuantity, doc.productStatus);
    if (derivedStatus !== doc.productStatus) update.productStatus = derivedStatus;
    if (Object.keys(update).length) {
      // RAW write on purpose. `sorted` is the plain stored array (from .lean()), but Product.updateOne would cast it
      // through THIS repo's variant schema, which does not declare admin-only fields — and Mongoose silently drops
      // every undeclared key (variantMrp, variantDes, variantSwatch*, isActive …) from every variant. That is what
      // made MRP / "% off" vanish from a product the first time one of its variants sold out.
      await Product.collection.updateOne({ productId }, { $set: update });
    }
  } catch (err) {
    console.error(`[Stock] OOS resort/status update failed product=${productId}:`, err.message);
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
    const flat = staticShippingCharge(params.cartValue);
    console.error(`[SHIPPING] pin ${params.pincode} | rate calc failed, using static ₹${flat}: ${error.message}`);
    return {
      total_charges: flat,
      type: "standard", // order schema enum is standard|dynamic
      totalWeight: 0,
      expectedNoOfBoxes: params.cartItems?.length || 0,
      serviceName: null,
      courierName: null,
      estimatedDays: "24-48 hours",
      paymentType: params.paymentType || "PREPAID",
    };
  }
};
import { getFreeShippingConfig } from "../utils/freeShippingOffer.util.js";
// Promotion Engine V2 — the single discount-evaluation authority for the
// real charge (cartRule.util.js and the legacy cart-rule/offers display
// stack were deleted entirely 2026-10-09 — createRuleBudgetTracker/
// withRuleBudget/spendRuleBudget/applicableCap now live here too, since they
// were never actually cart-rule-specific).
import {
  getActivePromotions,
  evaluatePromotions,
  buildCartContext,
  applyBestPromotionDiscount,
  getDiscountCandidatesForItem as getPromotionDiscountCandidatesForItem,
  excludeUsageExhaustedPromotions,
  createRuleBudgetTracker,
  withRuleBudget,
  spendRuleBudget,
  applicableCap,
  buildMaxDiscountAmountMap,
  isBetterPromoForProduct,
  clampCapToDiscountBudget,
  clampOrderDiscountToBudget,
} from "../utils/promotionEngine.util.js";
import { getPublicOfferConfig } from "../utils/offer.util.js";
import { sendMetaCapiEvent } from "../services/meta.capi.service.js";
import { recordServerPurchase } from "../services/purchaseEvent.service.js";
import { sendGa4ServerPurchase } from "../services/ga4.mp.service.js";
import { validateGiftClaims, buildGiftOrderLines, GIFT_CLAIM_ERROR } from "../services/giftClaims.service.js";

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
  gaClientId: req.body?.gaClientId || null, // GA4 Measurement Protocol fallback purchase
  gaSessionId: req.body?.gaSessionId || null,
});

// Pull the address Razorpay collected inside the Magic modal onto our order,
// whether the payment that followed succeeded or failed. Razorpay saves
// customer_details on the Razorpay order as soon as the customer fills the
// modal — before payment even runs — so this is available on a failed
// attempt too, not just a captured one. Mutates `order` in place; the caller
// is responsible for `order.save()`. Returns true if an address was written.
const captureMagicAddressIfMissing = async (order, razorpayOrderId) => {
  if (!order?.isMagicOrder) {
    console.log(`[MAGIC][address-capture] skip ${razorpayOrderId} — not a Magic order`);
    return false;
  }
  if (order.deliveryAddress?.pinCode) {
    console.log(`[MAGIC][address-capture] skip ${razorpayOrderId} — address already on order`);
    return false;
  }

  console.log(`[MAGIC][address-capture] fetching Razorpay order ${razorpayOrderId} for customer_details`);
  const rpOrder = await razorpayFetchOrderService(razorpayOrderId);
  const magicAddress = toOrderDeliveryAddress(rpOrder?.customer_details);
  if (!magicAddress) {
    console.error(`[MAGIC][address-capture] no customer_details on ${razorpayOrderId} — order still has NO address`);
    return false;
  }

  // Pin code only — the customer's name and number stay out of the logs.
  console.log(`[MAGIC][address-capture] captured for ${razorpayOrderId} — pin ${magicAddress.pinCode}`);
  order.deliveryAddress = magicAddress;
  order.userName = magicAddress.fullName || order.userName;
  order.userMobile = magicAddress.mobileNumber || order.userMobile;
  order.senderMobile = magicAddress.mobileNumber || order.senderMobile;
  order.receiverMobile = magicAddress.mobileNumber || order.receiverMobile;

  const email = rpOrder?.customer_details?.email;
  if (email && (!order.userEmail || isPlaceholderEmail(order.userEmail))) {
    order.userEmail = email;
  }

  if (order.isGuestOrder) {
    order.guestInfo = {
      name: order.guestInfo?.name || magicAddress.fullName || "",
      email: order.guestInfo?.email || email || "",
      mobile: order.guestInfo?.mobile || magicAddress.mobileNumber || "",
    };
  }

  return true;
};

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
  // "Calculated" means the apply step has run and stored a subtotal. A grand total
  // of 0 is legitimate — a coupon worth the whole product total — and must not be
  // mistaken for "never calculated": the real amount (delivery still owed) is
  // recomputed from the live order below, this only gates a stale cart.
  const grandTotal = cart?.appliedCoupon?.summary?.grandTotal;
  const quotedSubtotal = cart?.appliedCoupon?.summary?.subtotal;
  if (grandTotal == null || !(quotedSubtotal > 0)) {
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

  // ── Promotion Engine V2 — the SINGLE discount-evaluation authority for the
  // real charge (consolidated 2026-10-08). Previously this controller ran a
  // legacy "cart_rule" adapter pass FIRST (via getActiveCartRules/
  // evaluateCartRules), baked its discount into priceAtPurchase, then ran
  // this Promotion V2 pass SECOND but skipped any line the adapter had
  // already touched. That adapter (promotionToCartRule.adapter.js) sources
  // its flattened "cart rules" from this EXACT SAME `promotions` collection
  // — so the two passes were two evaluations of the same data, and the
  // skip-if-already-discounted guard meant a promotion only representable in
  // the richer V2 shape (OR conditions, non-product leaves, etc.) could be
  // silently out-competed by a worse adapter-representable promotion on the
  // same line, with no price comparison between the two ever happening
  // (confirmed, audit 2026-10-08, Critical Bug #1). Evaluating ONLY here
  // means every active promotion — adapter-representable or not — competes
  // in the SAME applyBestPromotionDiscount/budget-tracking pass, so the best
  // price always wins deterministically. The adapter itself (and the
  // legacy-shaped PDP/mini-cart banner displays it powered) was deleted
  // entirely the next day (2026-10-09) — nothing reads it anymore, anywhere.
  let activePromotions = await getActivePromotions();
  // Courtesy pre-check — drop any promotion whose usage cap is ALREADY
  // exhausted before this cart even existed, so it can't grant one more
  // discounted order on top of a breach that already happened (audit
  // Critical Bug #5, partial fix — see excludeUsageExhaustedPromotions's
  // own comment for why this isn't the full atomic reservation fix).
  activePromotions = await excludeUsageExhaustedPromotions(activePromotions, { email: user?.email, mobile: user?.mobileNumber });
  const promoProductMeta = new Map(
    products.map((p) => [p.productId, { category: p.productCategory, subcategory: p.productSubCategory, tags: p.tags || [] }]),
  );
  const promoCartItems = orderItems.map((oi) => ({ productId: oi.productId, quantity: oi.productSnapshot.quantity, variantSku: oi.variantSku }));
  const promoSubtotalSoFar = orderItems.reduce((s, i) => s + i.productSnapshot.priceAtPurchase * i.productSnapshot.quantity, 0);
  // orderCount: a genuine live count for this authenticated user (not
  // client-trusted) — lets a "first order"/"returning customer" condition
  // actually match for this flow.
  const orderCount = await Order.countDocuments({ userId });
  // deliveryAddress: resolved from `selectedAddr` (the user's own saved
  // address, looked up server-side by addressId at line 385) falling back
  // to `clientAddress` (this request's raw body) only for whichever fields
  // a saved address doesn't have — same precedence already used to build
  // deliveryAddressSnapshot later in this function. This is the SAME
  // address the order actually ships to (not a separate, consequence-free
  // claim) — a customer misrepresenting it to unlock a geo-discount would
  // have to actually receive their order at that address, which is the
  // existing trust level this checkout already accepts for shipping-rate
  // purposes, not a new hole. Absent on the Magic path (no address known
  // yet) — a geo-targeted promotion simply won't match there, same as any
  // other unmet condition.
  const promoDeliveryAddress = (selectedAddr?.pinCode || clientAddress?.pinCode)
    ? {
        pincode: String(selectedAddr?.pinCode || clientAddress?.pinCode || ""),
        state: selectedAddr?.state || clientAddress?.state || null,
        country: "India",
      }
    : null;
  const promoCtx = buildCartContext(promoCartItems, {
    subtotal: promoSubtotalSoFar,
    productMeta: promoProductMeta,
    customerType: "registered",
    orderCount,
    deliveryAddress: promoDeliveryAddress,
    // Gates any promotion with a linkedCouponCode — see promotionCouponGateOk
    // in promotionEngine.util.js. isApplied/couponCodeName are already
    // resolved from cart.appliedCoupon above (lines 428-431), before this
    // point, so this is the real, already-validated applied coupon — never
    // the mere presence of a coupon input.
    appliedCouponCode: isApplied ? couponCodeName : null,
  });
  const promotionResult = evaluatePromotions(promoCartItems, promoCtx, activePromotions);
  const ruleBudgets = createRuleBudgetTracker(promotionResult.discountCandidatesByProduct);
  const maxDiscountAmountByPromotionId = buildMaxDiscountAmountMap(promotionResult.matchedPromotions);

  // Gross (pre-discount) product subtotal — snapshotted BEFORE the loop below
  // mutates priceAtPurchase, so PromotionUsage.cartValueBeforeDiscount (set
  // at webhook time, see STEP 2 below) can be the true pre-discount figure
  // instead of silently reading the already-discounted saved items (audit
  // 2026-10-10, finding A10).
  const promotionGrossProductSubtotal = orderItems.reduce(
    (s, i) => s + i.productSnapshot.priceAtPurchase * i.productSnapshot.quantity, 0,
  );
  // ₹ actually granted by each matched promotion on this order — product-
  // line discounts it won here, plus its own order-level discount if it
  // wins that further down. Snapshotted onto appliedPromotions so
  // PromotionUsage.discountAmount is never left at its schema default of 0
  // (same audit finding — previously NOTHING populated this, ever).
  const promoDiscountByPromotionId = new Map();
  // Which products each promotion actually touched on this order — Map<
  // promotionId, Map<productId, {productName, quantity}>> — so PromotionUsage
  // can answer "on what products" without recomputing the engine later
  // (2026-10-10, admin usage-reporting ask).
  const promoProductsByPromotionId = new Map();
  const addPromoProduct = (promotionId, productId, productName, qty) => {
    if (!promotionId || !productId || qty <= 0) return;
    if (!promoProductsByPromotionId.has(promotionId)) promoProductsByPromotionId.set(promotionId, new Map());
    const byProduct = promoProductsByPromotionId.get(promotionId);
    const existing = byProduct.get(productId);
    byProduct.set(productId, { productName, quantity: (existing?.quantity || 0) + qty });
  };

  const extraPromoDiscountLines = [];
  for (const oi of orderItems) {
    const rawCandidates = getPromotionDiscountCandidatesForItem(promotionResult.discountCandidatesByProduct, oi.productId, oi.variantSku);
    const candidates = withRuleBudget(rawCandidates, ruleBudgets);
    if (candidates?.length) {
      const fullPrice = oi.productSnapshot.priceAtPurchase;
      const discountedPrice = applyBestPromotionDiscount(fullPrice, candidates);
      // Every surviving candidate here shares one ruleId by construction —
      // resolveProductWinners already dropped every OTHER
      // promotion's candidates for this exact product before this ever ran.
      const winningRuleId = candidates[0]?.ruleId;
      // Cap scales with how many times the promotion's own condition is
      // satisfied — never a flat 1 — clamped to the remaining shared budget,
      // then further clamped (Phase 4) so this promotion's running ₹ total
      // never crosses its own maxDiscountAmount (no-op when unset).
      const cap = clampCapToDiscountBudget(
        applicableCap(candidates), fullPrice - discountedPrice, winningRuleId,
        promoDiscountByPromotionId, maxDiscountAmountByPromotionId,
      );
      // cap can now be 0 (budget-exhausted, Phase 4) where it previously
      // never was (applicableCap always returns >= 1) — capDiscountedQuantity
      // unconditionally mutates priceAtPurchase to the discounted price even
      // when cap is 0, which would wrongly zero-rate the line. Skip the split
      // entirely and leave the item at full price, same as "no candidate
      // matched at all".
      if (cap > 0) {
        const unitsUsed = Math.min(oi.productSnapshot.quantity, cap);
        const itemDiscountAmount = (fullPrice - discountedPrice) * unitsUsed;
        if (winningRuleId && itemDiscountAmount > 0) {
          promoDiscountByPromotionId.set(winningRuleId, (promoDiscountByPromotionId.get(winningRuleId) || 0) + itemDiscountAmount);
        }
        if (winningRuleId && unitsUsed > 0) {
          addPromoProduct(winningRuleId, oi.productId, oi.productSnapshot.productName, unitsUsed);
        }
        const remainderLine = capDiscountedQuantity(oi, fullPrice, discountedPrice, cap);
        spendRuleBudget(candidates, ruleBudgets, unitsUsed);
        if (remainderLine) extraPromoDiscountLines.push(remainderLine);
        // A discount that zeroes an item's price out (e.g. a percent_off 100
        // "get this free" reward) marks it as a promotional gift for
        // admin/order views — same field the free_product reward uses below.
        if (oi.productSnapshot.priceAtPurchase === 0) oi.productSnapshot.isPromotionalGift = true;
      }
    }
  }
  if (extraPromoDiscountLines.length) orderItems.push(...extraPromoDiscountLines);
  // Phase 5 — runs AFTER product-level discounts are baked in, so "cheapest"
  // reflects the customer's current (post-discount) price, not list price.
  applyCheapestItemReward(
    orderItems, promotionResult.cheapestItemAdjustments, promotionResult.matchedPromotions, promoDiscountByPromotionId,
    promotionResult.discountCandidatesByProduct, maxDiscountAmountByPromotionId,
  );

  // free_product reward: append a synthetic ₹0 line, flagged
  // isPromotionalGift so admin/order views can tell it apart from a paid
  // item. Runs through the EXACT SAME assertVariantAvailable-guarded stock
  // check as a real line (reused, not reimplemented) — if the gift target is
  // OOS/deleted, it's silently skipped (order still proceeds), matching the
  // existing "[Stock] insufficient stock" precedent for real items.
  // Explicit gift claiming: with a `claimedGifts` array, ONLY claims that the engine still grants for
  // this exact cart become ₹0 lines (re-validated server-side, never trusted from the client). A claim
  // that is no longer valid stops the order with a clear message instead of silently dropping or
  // converting it. Without the array (older clients) the previous automatic behaviour is kept.
  const claimMode = Array.isArray(req.body.claimedGifts);
  const giftClaims = claimMode ? validateGiftClaims(req.body.claimedGifts, promotionResult.freeGifts) : null;
  if (giftClaims?.rejected.length) {
    throw new ValidationError("A free gift you claimed is no longer available. Please review your cart.", { code: GIFT_CLAIM_ERROR, rejected: giftClaims.rejected });
  }
  const giftsToIssue = claimMode ? giftClaims.valid : promotionResult.freeGifts.filter((g) => g.targetProductId);
  orderItems.push(...(await buildGiftOrderLines({
    gifts: giftsToIssue,
    products,
    orderItems,
    claimMode,
    loadProduct: (id) => Product.findOne({ productId: id, productStatus: "in_stock" }),
    assertAvailable: assertVariantAvailable,
    onIssued: (g, pr, q) => addPromoProduct(g.promotionId, pr.productId, pr.productName, q),
  })));

  // Item identity for admin / warehouse / returns: every line is explicitly PAID or FREE_GIFT, with the
  // list price it would have cost (the same SKU can legitimately appear as both).
  for (const oi of orderItems) {
    const sn = oi.productSnapshot;
    if (!sn.lineType) sn.lineType = "PAID";
    if (sn.originalUnitPrice == null) {
      const pr = products.find((x) => x.productId === oi.productId);
      const v = pr?.variantDetails?.find((x) => x.sku && x.sku === oi.variantSku) || pr?.variantDetails?.find((x) => x.variantName === sn.selectedVariant) || pr?.variantDetails?.[0];
      sn.originalUnitPrice = Number(v?.variantPrice) || 0;
    }
  }

  // A WhatsApp-login account starts as "User 2393"; that placeholder must never
  // reach the order or the courier label, so it is skipped at every step.
  const realName = (n) => {
    const clean = String(n ?? "").trim();
    return clean && !PLACEHOLDER_NAME.test(clean) ? clean : "";
  };
  const resolvedFullName =
    realName(clientAddress?.fullName) ||
    realName(selectedAddr?.fullName) ||
    realName(user?.userName) ||
    realName(user?.name);

  // Magic collects the name in its own modal and the webhook writes it later
  if (!isMagic && !resolvedFullName) {
    throw new ValidationError("Please enter your full name to place the order");
  }

  const deliveryAddressSnapshot = {
    addressId: addressId,
    fullName: resolvedFullName || "Customer",
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
  // Static delivery charge by what the customer pays for the products (after offers): see staticShippingCharge.
  const shippingCartValue = orderItems.reduce((s, oi) => s + oi.productSnapshot.priceAtPurchase * oi.productSnapshot.quantity, 0);
  const shippingResult = isMagic
    ? null
    : await getShippingRateOrFallback({
        pincode: deliveryAddressSnapshot.pinCode,
        paymentType: reqPaymentMethod === "COD" ? "COD" : "PREPAID",
        cartValue: shippingCartValue,
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
    : (shippingResult?.total_charges || staticShippingCharge(shippingCartValue));

  // Recompute subtotal from actual order items — authoritative, not from cart snapshot.
  // Computed AFTER the cart-rule discount loop above has already reduced any
  // discounted items' priceAtPurchase, so this naturally includes those discounts.
  let subtotal = orderItems.reduce((s, i) => s + (i.productSnapshot.priceAtPurchase * i.productSnapshot.quantity), 0);

  // Promotion V2 order-level discounts (percent_off_order / flat_off_order —
  // "spend ₹2000+, get 10% off the whole order") — evaluated against the
  // GROSS subtotal above (product-level discounts already baked in, same as
  // any other threshold condition), applied here as a further deduction.
  // Multiple matched order-level rewards: the one giving the BIGGEST ₹
  // saving wins (same "best for the customer" convention as product
  // discounts), capped so it can never exceed the subtotal itself.
  if (promotionResult.orderLevelDiscounts?.length) {
    const amounts = promotionResult.orderLevelDiscounts.map((d) =>
      d.type === "percent_off_order" ? subtotal * (Number(d.value) / 100) : Number(d.value),
    );
    let promotionOrderDiscount = Math.round(Math.min(Math.max(...amounts, 0), subtotal));
    let winningOrderPromoId = null;
    if (promotionOrderDiscount > 0) {
      const winningIdx = amounts.indexOf(Math.max(...amounts));
      winningOrderPromoId = promotionResult.orderLevelDiscounts[winningIdx]?.promotionId;
      // Phase 4 — clamp BEFORE subtracting from subtotal, so the actual
      // charge reflects the capped amount, not the uncapped one.
      promotionOrderDiscount = clampOrderDiscountToBudget(
        promotionOrderDiscount, winningOrderPromoId, promoDiscountByPromotionId, maxDiscountAmountByPromotionId,
      );
    }
    subtotal -= promotionOrderDiscount;
    // Attribute this order-level discount to whichever promotion actually
    // won it, same per-promotion tracking the product-level loop above
    // does (audit 2026-10-10, finding A10).
    if (promotionOrderDiscount > 0 && winningOrderPromoId) {
      promoDiscountByPromotionId.set(winningOrderPromoId, (promoDiscountByPromotionId.get(winningOrderPromoId) || 0) + promotionOrderDiscount);
    }
  }

  // Free shipping unlocks via EITHER: any active Promotion whose reward is
  // free_shipping (covers the old "combo" shape too — a condition naming the
  // source product + a free_shipping reward IS just such a Promotion now;
  // the separate isFreeShippingEligible/combo-banner check was deleted
  // 2026-10-09 as fully redundant with promotionResult.freeShipping, which
  // evaluates the exact same Promotion documents directly), OR the cart
  // subtotal simply being at/above the admin-configured thresholdAmount —
  // plain, direct comparison, whole-cart (any products count).
  const freeShippingConfig = await getFreeShippingConfig();
  const thresholdEligible = freeShippingConfig.isActive && subtotal >= freeShippingConfig.thresholdAmount;
  const freeShippingUnlocked = thresholdEligible || promotionResult.freeShipping;
  const chargedShippingAmount = freeShippingUnlocked ? 0 : realShippingAmount;
  console.log(
    `[FreeShipping][Order:auth] items=[${orderItems.map((oi) => `${oi.productId}x${oi.productSnapshot.quantity}${oi.variantSku ? `(${oi.variantSku})` : ""}`).join(",")}] ` +
    `signals={thresholdEligible:${thresholdEligible}(threshold=₹${freeShippingConfig.thresholdAmount}, subtotal=₹${subtotal}), promotionFreeShipping:${promotionResult.freeShipping}} ` +
    `→ freeShippingUnlocked=${freeShippingUnlocked}, realShipping=₹${realShippingAmount}, chargedShipping=₹${chargedShippingAmount}`,
  );

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
    if (isValidInternal && liveCoupon.scope !== "TARGETED") {
      throw new ValidationError("This coupon is restricted. Please remove it from your cart and try again.");
    }
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
      // Same identity set the apply step uses (coupon.code.service.js getUserCouponIdentity):
      // profile number AND the WhatsApp-verified one, so a coupon assigned to either works.
      const scopeMobiles = [user?.verifiedMobile, user?.mobileNumber, finalSenderMobile]
        .map((m) => (m ? String(m).replace(/\D/g, "").slice(-10) : null))
        .filter((m) => m && m.length === 10);
      const scopeIdentifiers   = [normEmailForScope, ...new Set(scopeMobiles)].filter(Boolean);
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

    // Re-check product gate against the re-derived cart (user may have
    // removed the required product after applying the coupon) — presence
    // only, never scaled by quantity. This is what actually makes
    // Coupon.eligibleProductIds a real, enforced restriction rather than an
    // admin-only label.
    if (!couponProductGateOk(liveCoupon, uniqueProductIds)) {
      console.log(`[Coupon:PaymentRecheck] REJECT — product gate not met (requires one of [${(liveCoupon.eligibleProductIds || []).join(", ")}])`);
      throw new ValidationError(
        "This coupon requires a specific product in your cart. Please remove it from your cart and try again."
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
      const checkMobiles = [user?.verifiedMobile, user?.mobileNumber, finalSenderMobile]
        .map((m) => (m ? String(m).replace(/\D/g, "").slice(-10) : null))
        .filter((m) => m && m.length === 10);
      const identifiers     = [normEmailCheck, ...new Set(checkMobiles)].filter(Boolean);

      if ((identifiers.length > 0 || userId) && liveCoupon.maxUsesPerUser) {
        const priorUses = await CouponUsage.countDocuments({
          couponId: couponCodeId,
          reversed: { $ne: true },
          $or: [
            ...(userId ? [{ userId }] : []),
            ...(normEmailCheck  ? [{ email:  normEmailCheck  }] : []),
            ...(checkMobiles.length ? [{ mobile: { $in: [...new Set(checkMobiles)] } }] : []),
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
  // A coupon may take the whole product total, but the order still has delivery / gift wrap to pay; a ₹0 Razorpay order is never valid.
  if (!isInternalTestOrder && !(charge.finalAmount > 0)) throw new ValidationError("This order has nothing to pay. Please contact support.");
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
  // Generated here (before the Razorpay order exists) so it can be sent as
  // `receipt` below — Razorpay's own docs mark `receipt` mandatory for a
  // Magic order, and its Get/Apply Promotions callbacks echo it straight
  // back as `order_id` (with NO `razorpay_order_id` alongside it, unlike the
  // shipping-info callback). Without setting a receipt here, that echoed
  // `order_id` matched nothing in our DB and coupon lookups silently failed.
  const preGeneratedOrderId = uuidv7();
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
      receipt: preGeneratedOrderId,
      line_items: discounted.lineItems,
      line_items_total: discounted.total,
      // Points this order at a Razorpay Dashboard payment-methods config that
      // has Cash on Delivery turned off, so Magic's own "Cash on Delivery —
      // Not available for this order" tile never renders at all. Without
      // this, Razorpay falls back to the account's default config, which
      // still lists COD (greyed out) because it's enabled account-wide. We
      // never want Razorpay's own COD here — the site's real COD button is
      // a separate, non-Magic flow (see payChoice === "COD" on the client).
      ...(env.MAGIC_CHECKOUT_CONFIG_ID ? { checkout_config_id: env.MAGIC_CHECKOUT_CONFIG_ID } : {}),
    };
    console.log(
      env.MAGIC_CHECKOUT_CONFIG_ID
        ? `[MAGIC][order-create] using checkout_config_id=${env.MAGIC_CHECKOUT_CONFIG_ID}`
        : `[MAGIC][order-create] MAGIC_CHECKOUT_CONFIG_ID not set — using Razorpay account default config (COD tile may still show)`,
    );
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
    orderId: preGeneratedOrderId,
    userEmail,
    userId,
    userName: deliveryAddressSnapshot.fullName,
    userMobile: deliveryAddressSnapshot.mobileNumber,
    items: orderItems,
    promotionalGifts: buildPromotionalGiftSummary(orderItems, promotionResult),
    // Promotion Engine V2 — snapshot of which promotions matched at order-
    // creation time (see the wiring comment above). Empty when none matched.
    appliedPromotions: promotionResult.matchedPromotions.map((p) => ({
      promotionId: String(p._id), name: p.name, rewardTypes: [...new Set((p.rewards || []).map((r) => r.type))],
      discountAmount: Math.round(promoDiscountByPromotionId.get(String(p._id)) || 0),
      discountedProducts: [...(promoProductsByPromotionId.get(String(p._id))?.entries() || [])].map(
        ([productId, v]) => ({ productId, productName: v.productName, quantity: v.quantity }),
      ),
    })),
    promotionGrossProductSubtotal: Math.round(promotionGrossProductSubtotal),
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

// An order in one of these may still turn out to be paid. FAILED is included:
// the cleanup cron and a failed first attempt both set it before a retry pays.
const UNPAID_STATUSES = ["CREATED", "PROCESSING", "FAILED"];

/**
 * Moves an order to PAID for a captured Razorpay payment and runs everything
 * that follows it: Magic address capture, guest account, stock, coupon,
 * emails, invoice and purchase tracking.
 *
 * Called from the payment.captured webhook AND from the order-status poll
 * (after confirming the capture with Razorpay), so a customer who paid is
 * never left on "failed" just because the webhook is late, was lost, or an
 * earlier failed attempt on the same order arrived first. Safe to call twice.
 *
 * @returns {Promise<object>} the order
 */
const fulfilCapturedPayment = async (order, payment) => {
  const razorpayOrderId = payment.order_id;

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
    if (UNPAID_STATUSES.includes(order.status)) {
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
          order.userId = accountUser.userId;
          order.isNewGuestAccount = !isExistingUser;

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

      const historyNote = wasFailedByCron
        ? "Late Payment Recovery: Order was FAILED by system (timeout), but payment was confirmed later via webhook."
        : "Payment successfully captured via Razorpay.";

      // Atomic claim: the webhook and the status poll can both get here for
      // the same payment. Only the one that flips the status runs the side
      // effects below (stock, coupon, emails), so they happen exactly once.
      const guestClaimContact = capturedGuestContact(order, payment);
      const claimed = await Order.findOneAndUpdate(
        { _id: order._id, status: { $in: UNPAID_STATUSES } },
        {
          $set: {
            status: "PAID",
            "payment.razorpayPaymentId": payment.id,
            "payment.errorCode": null,
            "payment.errorDescription": "",
            ...(guestClaimContact
              ? { "payment.guestClaimContact": guestClaimContact }
              : {}),
          },
          $push: { statusHistory: { status: "PAID", timestamp: new Date(), note: historyNote } },
        },
        { new: true },
      );
      if (!claimed) {
        console.log(`[PAYMENT] ${order.orderId} already marked PAID by another path — skipping side effects`);
        return order;
      }

      // Decrement per-variant stock now that the order is confirmed PAID.
      // Guarded by the `order.status !== "PAID"` block above → runs once.
      await decrementStockForOrder(order);

      // Promotion Engine V2 — permanent usage audit trail, same
      // never-deleted invariant as CouponUsage, recorded here (once,
      // guarded by the same atomic claim above) rather than at
      // order-creation time, since a CREATED-but-never-PAID order should
      // never count against a promotion's usage limits.
      //
      // Usage-limit enforcement mirrors the Coupon pattern immediately
      // below this block EXACTLY (same atomic-$inc-with-$expr-guard +
      // per-user countDocuments + rollback-on-race shape), not a new
      // scheme: maxUsesTotal is enforced via one atomic findOneAndUpdate
      // per promotion (never over-increments under concurrency — same
      // guarantee decrementStockForOrder's $gte guard gives stock).
      // maxUsesPerUser is checked right after via countDocuments and
      // rolled back on a genuine race, exactly like the coupon per-user
      // safety net below. The reward/discount was already baked into the
      // charged amount at order-creation time (courtesy-level, like
      // assertVariantAvailable for stock) — a limit hit here, same as the
      // coupon case, only prevents THIS order from corrupting the count
      // for future ones; it doesn't retroactively re-charge the customer.
      if (order.appliedPromotions?.length) {
        // The TRUE pre-discount product subtotal, snapshotted at order-
        // creation time (see razorpayCreateOrderController/
        // guestCreateOrderController) — order.items' own priceAtPurchase is
        // already POST-discount by the time the order is saved, so
        // recomputing from it here would silently mislabel the post-
        // discount figure as "before discount" (audit 2026-10-10, finding
        // A10). Falls back to the (wrong but previously-the-only-option)
        // post-discount sum for any order that predates this field.
        const productSubtotalForUsage = order.promotionGrossProductSubtotal || order.items.reduce(
          (s, i) => s + ((i.productSnapshot?.priceAtPurchase || 0) * (i.productSnapshot?.quantity || 0)),
          0,
        );
        const normEmailForPromo = order.userEmail?.toLowerCase().trim() || null;
        const normMobileForPromo = (order.userMobile || "").replace(/\D/g, "").slice(-10) || null;

        for (const ap of order.appliedPromotions) {
          try {
            // Atomic check-and-increment — only succeeds if maxUsesTotal
            // is unset or usageCount is still under it.
            const updatedPromo = await Promotion.findOneAndUpdate(
              {
                _id: ap.promotionId,
                $or: [{ maxUsesTotal: null }, { $expr: { $lt: ["$usageCount", "$maxUsesTotal"] } }],
              },
              { $inc: { usageCount: 1 } },
              { new: true },
            );
            if (!updatedPromo) {
              console.warn(`[PromotionV2] order=${order.orderId} promotion=${ap.promotionId} — maxUsesTotal reached, usage not recorded`);
              continue;
            }

            let perUserOk = true;
            if (updatedPromo.maxUsesPerUser && (normEmailForPromo || normMobileForPromo)) {
              const priorUses = await PromotionUsage.countDocuments({
                promotionId: ap.promotionId,
                reversed: { $ne: true },
                $or: [
                  ...(normEmailForPromo ? [{ email: normEmailForPromo }] : []),
                  ...(normMobileForPromo ? [{ mobile: normMobileForPromo }] : []),
                ],
              });
              if (priorUses >= updatedPromo.maxUsesPerUser) {
                perUserOk = false;
                await Promotion.updateOne({ _id: ap.promotionId }, { $inc: { usageCount: -1 } });
                console.warn(`[PromotionV2:Security] order=${order.orderId} promotion=${ap.promotionId} — maxUsesPerUser hit (race). usageCount rolled back. priorUses=${priorUses} limit=${updatedPromo.maxUsesPerUser}`);
              }
            }
            if (!perUserOk) continue;

            await PromotionUsage.create({
              promotionId: ap.promotionId,
              promotionName: ap.name,
              orderId: order.orderId,
              orderType: "WEBSITE",
              userId: order.userId || null,
              email: order.userEmail || "",
              mobile: order.userMobile || "",
              rewardsSnapshot: { rewardTypes: ap.rewardTypes },
              discountAmount: ap.discountAmount || 0,
              discountedProducts: ap.discountedProducts || [],
              cartValueBeforeDiscount: productSubtotalForUsage,
              usedAt: new Date(),
            });
          } catch (err) {
            console.error(`[PromotionV2] usage recording failed order=${order.orderId} promotion=${ap.promotionId}:`, err.message);
          }
        }
      }

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
                reversed: { $ne: true }, // a cancelled/refunded order's usage must not count against the limit
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
              if (updatedCoupon.scope === "TARGETED" && (normEmail || normMobile || order.userId)) {
                // The assignment may be on the customer's profile or WhatsApp-verified
                // number, which can differ from the delivery number on the order —
                // include them or the coupon would never be marked used and could be reused.
                const accountMobiles = [];
                if (order.userId) {
                  const acct = await User.findOne({ userId: order.userId }, { email: 1, mobileNumber: 1, verifiedMobile: 1 }).lean();
                  for (const m of [acct?.verifiedMobile, acct?.mobileNumber]) {
                    const n = m ? String(m).replace(/\D/g, "").slice(-10) : null;
                    if (n && n.length === 10) accountMobiles.push(n);
                  }
                  if (acct?.email) accountMobiles.push(String(acct.email).toLowerCase().trim());
                }
                await Coupon.updateOne(
                  {
                    couponId,
                    assignedTo: {
                      $elemMatch: {
                        identifier: { $in: [normEmail, normMobile, ...accountMobiles].filter(Boolean) },
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

      // Same purchase to GA4 via Measurement Protocol — backfills the hits
      // the browser loses. GA4 dedupes on transaction_id, so orders the
      // browser already reported are not double counted.
      await sendGa4ServerPurchase(order);
    }
  return order;
};

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

    try {
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

        await fulfilCapturedPayment(order, payment);

        console.log("✅ Payment Captured:", payment.id);
        break;
      }

      case "payment.failed": {
        const payment = payload.payload.payment.entity;
        const errorCode = payment.error_code || "payment_failed";
        const errorDescription =
          payment.error_description || "Payment attempt failed.";
        const razorpayOrderId = payment.order_id;

        // Fetch first (not updateOne) so a Magic order can still have the
        // address the customer typed into the modal captured — otherwise a
        // failed Magic attempt leaves the order with no name/address/mobile
        // at all, even though Razorpay already collected them.
        const order = await Order.findOne({
          "payment.razorpayOrderId": razorpayOrderId,
          status: { $in: UNPAID_STATUSES },
        });

        if (order) {
          console.log(`[WEBHOOK] payment.failed for order ${order.orderId} (rp order ${razorpayOrderId}), isMagicOrder=${order.isMagicOrder}`);
          try {
            await captureMagicAddressIfMissing(order, razorpayOrderId);
          } catch (err) {
            console.error(`[MAGIC][address-capture] payment.failed capture threw: ${err.message}`);
          }

          order.status = "FAILED";
          order.payment.errorCode = errorCode;
          order.payment.errorDescription = errorDescription;
          order.statusHistory.push({
            status: "FAILED",
            timestamp: new Date(),
            note: `Payment failed: ${errorDescription}`,
          });
          await order.save();
          console.log(`[WEBHOOK] order ${order.orderId} marked FAILED, deliveryAddress.pinCode=${order.deliveryAddress?.pinCode || "none"}`);
        } else {
          console.warn(`[WEBHOOK] payment.failed — no order found for rp order ${razorpayOrderId}`);
        }

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
    } catch (error) {
      // A 5xx makes Razorpay redeliver; fulfilCapturedPayment is safe to re-run
      console.error(`[WEBHOOK] ${event} processing failed:`, error);
      return res.status(500).json({ status: "error" });
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

  // ── Promotion Engine V2 — the SINGLE discount-evaluation authority for the
  // real charge — see the matching comment in razorpayCreateOrderController
  // above for the full rationale (consolidated 2026-10-08; the legacy
  // adapter was deleted entirely 2026-10-09, not just retired from this path).
  // Identical wiring, guest path. orderCount is deliberately left unset here
  // (not merely omitted by oversight) — a guest's identity is self-reported
  // email/mobile with no verification, so there's no trustworthy "is this
  // their first order" signal to compute without inventing one; see the
  // audit's Decision Register item on guest identity trust.
  let activePromotions = await getActivePromotions();
  // Same courtesy pre-check as the authenticated flow above — see
  // excludeUsageExhaustedPromotions's own comment. Guest identity here is
  // the self-reported email/mobile (same trust level already accepted for
  // the existing per-user coupon check in this same controller).
  activePromotions = await excludeUsageExhaustedPromotions(activePromotions, { email: guestInfo?.email, mobile: cleanMobile });
  const promoProductMeta = new Map(
    products.map((p) => [p.productId, { category: p.productCategory, subcategory: p.productSubCategory, tags: p.tags || [] }]),
  );
  const promoCartItems = orderItems.map((oi) => ({ productId: oi.productId, quantity: oi.productSnapshot.quantity, variantSku: oi.variantSku }));
  const promoSubtotalSoFar = orderItems.reduce((s, i) => s + i.productSnapshot.priceAtPurchase * i.productSnapshot.quantity, 0);
  // deliveryAddress: this request's own `deliveryAddress` body field — the
  // SAME address this guest order is shipping to (not a separate,
  // consequence-free claim), same trust reasoning as the authenticated
  // flow's matching comment above. Absent on the Magic path (no address
  // known yet) — a geo-targeted promotion simply won't match there.
  const promoDeliveryAddress = deliveryAddress?.pinCode
    ? { pincode: String(deliveryAddress.pinCode), state: deliveryAddress.state || null, country: "India" }
    : null;
  const promoCtx = buildCartContext(promoCartItems, {
    subtotal: promoSubtotalSoFar,
    productMeta: promoProductMeta,
    customerType: "guest",
    deliveryAddress: promoDeliveryAddress,
    // Gates any promotion with a linkedCouponCode — see promotionCouponGateOk
    // in promotionEngine.util.js. Using the RAW input (not yet validated) is
    // safe here: the guest-coupon-validation block below (rawCouponCode?.trim())
    // THROWS on an invalid/inactive/ineligible code, aborting the whole
    // request before any response is sent — so by the time this would ever
    // actually reach the customer, the code is guaranteed genuine.
    appliedCouponCode: rawCouponCode?.trim() || null,
  });
  const promotionResult = evaluatePromotions(promoCartItems, promoCtx, activePromotions);
  const ruleBudgets = createRuleBudgetTracker(promotionResult.discountCandidatesByProduct);
  const maxDiscountAmountByPromotionId = buildMaxDiscountAmountMap(promotionResult.matchedPromotions);

  // See the matching comment in razorpayCreateOrderController above —
  // identical wiring, guest path.
  const promotionGrossProductSubtotal = orderItems.reduce(
    (s, i) => s + i.productSnapshot.priceAtPurchase * i.productSnapshot.quantity, 0,
  );
  const promoDiscountByPromotionId = new Map();
  // Which products each promotion actually touched on this order — Map<
  // promotionId, Map<productId, {productName, quantity}>> — so PromotionUsage
  // can answer "on what products" without recomputing the engine later
  // (2026-10-10, admin usage-reporting ask).
  const promoProductsByPromotionId = new Map();
  const addPromoProduct = (promotionId, productId, productName, qty) => {
    if (!promotionId || !productId || qty <= 0) return;
    if (!promoProductsByPromotionId.has(promotionId)) promoProductsByPromotionId.set(promotionId, new Map());
    const byProduct = promoProductsByPromotionId.get(promotionId);
    const existing = byProduct.get(productId);
    byProduct.set(productId, { productName, quantity: (existing?.quantity || 0) + qty });
  };

  const extraPromoDiscountLines = [];
  for (const oi of orderItems) {
    const rawCandidates = getPromotionDiscountCandidatesForItem(promotionResult.discountCandidatesByProduct, oi.productId, oi.variantSku);
    const candidates = withRuleBudget(rawCandidates, ruleBudgets);
    if (candidates?.length) {
      const fullPrice = oi.productSnapshot.priceAtPurchase;
      const discountedPrice = applyBestPromotionDiscount(fullPrice, candidates);
      const winningRuleId = candidates[0]?.ruleId;
      const cap = clampCapToDiscountBudget(
        applicableCap(candidates), fullPrice - discountedPrice, winningRuleId,
        promoDiscountByPromotionId, maxDiscountAmountByPromotionId,
      );
      // cap can be 0 here (budget-exhausted, Phase 4) — capDiscountedQuantity
      // unconditionally mutates priceAtPurchase even at cap 0, so skip the
      // split entirely rather than wrongly zero-rating the line.
      if (cap > 0) {
        const unitsUsed = Math.min(oi.productSnapshot.quantity, cap);
        const itemDiscountAmount = (fullPrice - discountedPrice) * unitsUsed;
        if (winningRuleId && itemDiscountAmount > 0) {
          promoDiscountByPromotionId.set(winningRuleId, (promoDiscountByPromotionId.get(winningRuleId) || 0) + itemDiscountAmount);
        }
        if (winningRuleId && unitsUsed > 0) {
          addPromoProduct(winningRuleId, oi.productId, oi.productSnapshot.productName, unitsUsed);
        }
        const remainderLine = capDiscountedQuantity(oi, fullPrice, discountedPrice, cap);
        spendRuleBudget(candidates, ruleBudgets, unitsUsed);
        if (remainderLine) extraPromoDiscountLines.push(remainderLine);
        if (oi.productSnapshot.priceAtPurchase === 0) oi.productSnapshot.isPromotionalGift = true;
      }
    }
  }
  if (extraPromoDiscountLines.length) orderItems.push(...extraPromoDiscountLines);
  // Phase 5 — runs AFTER product-level discounts are baked in, so "cheapest"
  // reflects the customer's current (post-discount) price, not list price.
  applyCheapestItemReward(
    orderItems, promotionResult.cheapestItemAdjustments, promotionResult.matchedPromotions, promoDiscountByPromotionId,
    promotionResult.discountCandidatesByProduct, maxDiscountAmountByPromotionId,
  );

  // Explicit gift claiming: with a `claimedGifts` array, ONLY claims that the engine still grants for
  // this exact cart become ₹0 lines (re-validated server-side, never trusted from the client). A claim
  // that is no longer valid stops the order with a clear message instead of silently dropping or
  // converting it. Without the array (older clients) the previous automatic behaviour is kept.
  const claimMode = Array.isArray(req.body.claimedGifts);
  const giftClaims = claimMode ? validateGiftClaims(req.body.claimedGifts, promotionResult.freeGifts) : null;
  if (giftClaims?.rejected.length) {
    throw new ValidationError("A free gift you claimed is no longer available. Please review your cart.", { code: GIFT_CLAIM_ERROR, rejected: giftClaims.rejected });
  }
  const giftsToIssue = claimMode ? giftClaims.valid : promotionResult.freeGifts.filter((g) => g.targetProductId);
  orderItems.push(...(await buildGiftOrderLines({
    gifts: giftsToIssue,
    products,
    orderItems,
    claimMode,
    loadProduct: (id) => Product.findOne({ productId: id, productStatus: "in_stock" }),
    assertAvailable: assertVariantAvailable,
    onIssued: (g, pr, q) => addPromoProduct(g.promotionId, pr.productId, pr.productName, q),
  })));

  // Item identity for admin / warehouse / returns: every line is explicitly PAID or FREE_GIFT, with the
  // list price it would have cost (the same SKU can legitimately appear as both).
  for (const oi of orderItems) {
    const sn = oi.productSnapshot;
    if (!sn.lineType) sn.lineType = "PAID";
    if (sn.originalUnitPrice == null) {
      const pr = products.find((x) => x.productId === oi.productId);
      const v = pr?.variantDetails?.find((x) => x.sku && x.sku === oi.variantSku) || pr?.variantDetails?.find((x) => x.variantName === sn.selectedVariant) || pr?.variantDetails?.[0];
      sn.originalUnitPrice = Number(v?.variantPrice) || 0;
    }
  }

  // Recomputed from orderItems (post cart-rule discount), not accumulated
  // inline during the map above — mirrors the authenticated-user path.
  let subtotal = orderItems.reduce((s, i) => s + i.productSnapshot.priceAtPurchase * i.productSnapshot.quantity, 0);

  // Promotion V2 order-level discounts — see the matching comment in
  // razorpayCreateOrderController above for the full rationale. Identical
  // wiring, guest path.
  if (promotionResult.orderLevelDiscounts?.length) {
    const amounts = promotionResult.orderLevelDiscounts.map((d) =>
      d.type === "percent_off_order" ? subtotal * (Number(d.value) / 100) : Number(d.value),
    );
    let promotionOrderDiscount = Math.round(Math.min(Math.max(...amounts, 0), subtotal));
    let winningOrderPromoId = null;
    if (promotionOrderDiscount > 0) {
      const winningIdx = amounts.indexOf(Math.max(...amounts));
      winningOrderPromoId = promotionResult.orderLevelDiscounts[winningIdx]?.promotionId;
      // Phase 4 — clamp BEFORE subtracting from subtotal, so the actual
      // charge reflects the capped amount, not the uncapped one.
      promotionOrderDiscount = clampOrderDiscountToBudget(
        promotionOrderDiscount, winningOrderPromoId, promoDiscountByPromotionId, maxDiscountAmountByPromotionId,
      );
    }
    subtotal -= promotionOrderDiscount;
    // Attribute this order-level discount to whichever promotion actually
    // won it, same per-promotion tracking the product-level loop above
    // does (audit 2026-10-10, finding A10).
    if (promotionOrderDiscount > 0 && winningOrderPromoId) {
      promoDiscountByPromotionId.set(winningOrderPromoId, (promoDiscountByPromotionId.get(winningOrderPromoId) || 0) + promotionOrderDiscount);
    }
  }

  // Magic has no pincode yet — Razorpay rates the address through
  // /magic/shipping-info and adds shipping_fee to the order itself, so shipping
  // must stay OUT of the amount we create the order with.
  const shippingCartValue = orderItems.reduce((s, oi) => s + oi.productSnapshot.priceAtPurchase * oi.productSnapshot.quantity, 0);
  const shippingResult = isMagic
    ? null
    : await getShippingRateOrFallback({
        pincode: deliveryAddress.pinCode,
        paymentType: reqPaymentMethod === "COD" ? "COD" : "PREPAID",
        cartItems: rawItemsForShipping,
        cartValue: shippingCartValue,
      });
  const realShippingAmount = isMagic ? 0 : (shippingResult?.total_charges || staticShippingCharge(shippingCartValue));
  // Free shipping unlocks via EITHER: any active Promotion whose reward is
  // free_shipping (the old combo-banner check was deleted 2026-10-09 as
  // fully redundant with promotionResult.freeShipping — see the matching
  // comment in the authenticated flow above), OR the cart subtotal simply
  // being at/above the admin-configured thresholdAmount.
  const freeShippingConfig = await getFreeShippingConfig();
  const thresholdEligible = freeShippingConfig.isActive && subtotal >= freeShippingConfig.thresholdAmount;
  const freeShippingUnlocked = thresholdEligible || promotionResult.freeShipping;
  const chargedShippingAmount = freeShippingUnlocked ? 0 : realShippingAmount;
  console.log(
    `[FreeShipping][Order:guest] items=[${orderItems.map((oi) => `${oi.productId}x${oi.productSnapshot.quantity}${oi.variantSku ? `(${oi.variantSku})` : ""}`).join(",")}] ` +
    `signals={thresholdEligible:${thresholdEligible}(threshold=₹${freeShippingConfig.thresholdAmount}, subtotal=₹${subtotal}), promotionFreeShipping:${promotionResult.freeShipping}} ` +
    `→ freeShippingUnlocked=${freeShippingUnlocked}, realShipping=₹${realShippingAmount}, chargedShipping=₹${chargedShippingAmount}`,
  );

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
  const GIFT_NOTE_OPTIONS = ["diwali", "bhai_dooj", "birthday", "rakhi", "none"];
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
    // Same global floor as the signed-in apply and Magic: no coupons on carts of ₹99 or less.
    if (subtotal <= 99) {
      throw new ValidationError("Coupons are not applicable on cart values of ₹99 or less.");
    }
    if (subtotal < (liveCoupon.minCartValue || 0)) {
      throw new ValidationError(`Minimum order of ₹${liveCoupon.minCartValue} required for this coupon.`);
    }
    if (liveCoupon.maxTotalUses != null && liveCoupon.usageCount >= liveCoupon.maxTotalUses) {
      throw new ValidationError("This coupon has reached its maximum number of uses.");
    }
    if (!couponProductGateOk(liveCoupon, productIds)) {
      throw new ValidationError("This coupon requires a specific product in your cart.");
    }

    // Per-user limit check (by email + mobile)
    const normMobileCoupon = cleanMobile;
    const identifiers = [guestEmail, normMobileCoupon].filter(Boolean);
    if (identifiers.length > 0 && liveCoupon.maxUsesPerUser) {
      const priorUses = await CouponUsage.countDocuments({
        couponId: liveCoupon.couponId,
        reversed: { $ne: true },
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
  if (!isInternalTestOrder && !(charge.finalAmount > 0)) throw new ValidationError("This order has nothing to pay. Please contact support.");
  const { finalAmount, isCOD, codPartialAmount, codRemainingAmount, razorpayChargeAmount, razorpayChargeAmountPaise } = charge;

  // Update orderItems with shipping value now that it's calculated — customer-facing amount
  orderItems.forEach(i => { i.productSnapshot.shipping = String(chargedShippingAmount); });

  // line_items is what makes Razorpay treat this as a 1CC order.
  let magicOrderOptions = {};
  // What Razorpay is actually asked to charge. Identical to
  // razorpayChargeAmountPaise off the Magic path; on it, the line items decide.
  let magicChargePaise = razorpayChargeAmountPaise;
  // See the logged-in path's comment on this same line — receipt is what
  // Get/Apply Promotions echo back as `order_id`.
  const preGeneratedOrderId = uuidv7();
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
      receipt: preGeneratedOrderId,
      line_items: discounted.lineItems,
      line_items_total: discounted.total,
      // See the logged-in path above — keeps Razorpay's own greyed-out COD
      // tile out of the Magic sheet entirely.
      ...(env.MAGIC_CHECKOUT_CONFIG_ID ? { checkout_config_id: env.MAGIC_CHECKOUT_CONFIG_ID } : {}),
    };
    magicChargePaise = discounted.total;
    console.log(
      env.MAGIC_CHECKOUT_CONFIG_ID
        ? `[MAGIC][order-create][guest] using checkout_config_id=${env.MAGIC_CHECKOUT_CONFIG_ID}`
        : `[MAGIC][order-create][guest] MAGIC_CHECKOUT_CONFIG_ID not set — using Razorpay account default config (COD tile may still show)`,
    );
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
    orderId: preGeneratedOrderId,
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
    promotionalGifts: buildPromotionalGiftSummary(orderItems, promotionResult),
    // Promotion Engine V2 — snapshot of which promotions matched at order-
    // creation time (see the wiring comment above). Empty when none matched.
    appliedPromotions: promotionResult.matchedPromotions.map((p) => ({
      promotionId: String(p._id), name: p.name, rewardTypes: [...new Set((p.rewards || []).map((r) => r.type))],
      discountAmount: Math.round(promoDiscountByPromotionId.get(String(p._id)) || 0),
      discountedProducts: [...(promoProductsByPromotionId.get(String(p._id))?.entries() || [])].map(
        ([productId, v]) => ({ productId, productName: v.productName, quantity: v.quantity }),
      ),
    })),
    promotionGrossProductSubtotal: Math.round(promotionGrossProductSubtotal),
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
  fulfilCapturedPayment,
  // exported so the stock-decrement / re-sort write can be tested against the real DB
  decrementStockForOrder,
  UNPAID_STATUSES,
  razorpayCreateOrderController,
  razorpayKeyGetController,
  razorpayWebHookController,
  guestCreateOrderController,
  // Pure helper exported for direct unit testing (no controller mocking
  // needed). applicableCap/createRuleBudgetTracker/withRuleBudget/
  // spendRuleBudget now live in cartRule.util.js (shared with
  // cartRule.controller.js's preview endpoint) — import those from there.
  capDiscountedQuantity,
  // Phase 5 (Admin Offer Control System) — same "export for direct unit
  // testing" convention as capDiscountedQuantity above.
  applyCheapestItemAdjustment,
  applyCheapestItemReward,
};
