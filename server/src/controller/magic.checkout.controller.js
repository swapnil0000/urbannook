import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import Order from "../model/order.model.js";
import Coupon from "../model/coupon.model.js";
import {
  calculateShippingRate,
  FALLBACK_SHIPPING_CHARGE,
} from "../services/shipping.service.js";
import {
  verifyMagicCallbackSignature,
  toRazorpayServiceableAddress,
} from "../services/magic.checkout.service.js";

/**
 * Razorpay Magic Checkout (1CC) server callbacks.
 *
 * Razorpay calls these PUBLIC, unauthenticated endpoints mid-checkout (from
 * their servers). They are mounted with a RAW body parser (see user.route.js)
 * and authenticated by the HMAC signature — same trust model as the webhook.
 *
 * Magic is PREPAID-only here; COD stays on the existing flow. So serviceability
 * always reports cod:false.
 *
 * ⚠️ VERIFY AT ACTIVATION: the exact request field names Razorpay sends and the
 * exact response keys it expects are confirmed against the live Magic sandbox.
 * The shapes below follow the published 1CC contract; adjust field names once
 * a real sandbox request is captured. Search this file for "VERIFY".
 */

// Parse + authenticate a raw callback body. Returns the parsed payload, or null
// after already sending a 400 (caller must return on null).
const authedPayload = (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  if (!verifyMagicCallbackSignature(req.body, signature)) {
    res.status(400).json({ success: false, message: "Invalid signature" });
    return null;
  }
  try {
    return JSON.parse(req.body.toString("utf8"));
  } catch {
    res.status(400).json({ success: false, message: "Invalid JSON" });
    return null;
  }
};

// Hydrate weight-accurate shipping inputs from the DB order created at 1CC
// order-create time (payment.razorpayOrderId === Magic order_id).
const cartItemsForOrder = async (razorpayOrderId) => {
  if (!razorpayOrderId) return [];
  const order = await Order.findOne(
    { "payment.razorpayOrderId": razorpayOrderId },
    { items: 1 },
  ).lean();
  return (order?.items || []).map((i) => ({
    productId: i.productId,
    quantity: i.productSnapshot?.quantity || 1,
    price: i.productSnapshot?.priceAtPurchase,
  }));
};

/**
 * POST /api/v1/magic/shipping-info
 * Request  (VERIFY): { order_id, addresses: [{ id, zipcode, state?, country? }] }
 * Response (VERIFY): { addresses: [{ id, zipcode, serviceable, shipping_fee, cod, cod_fee }] }
 * Fees in PAISE. Always returns 200 with a valid body — a shipping-API blip must
 * not break the modal; it falls back to a flat rate (mirrors getShippingRateOrFallback).
 */
export const magicShippingInfoController = asyncHandler(async (req, res) => {
  const payload = authedPayload(req, res);
  if (!payload) return;

  const { addresses = [], order_id } = payload;
  const cartItems = await cartItemsForOrder(order_id);

  const results = await Promise.all(
    addresses.map(async (addr) => {
      try {
        const rate = await calculateShippingRate({
          pincode: addr.zipcode,
          paymentType: "PREPAID",
          cartItems,
        });
        return toRazorpayServiceableAddress(
          addr,
          rate?.total_charges ?? FALLBACK_SHIPPING_CHARGE,
          true,
        );
      } catch (err) {
        // Genuinely unserviceable pincode → mark unserviceable so Magic blocks it.
        if (err.message?.includes("Pincode not serviceable")) {
          return toRazorpayServiceableAddress(addr, 0, false);
        }
        // Any other failure (API down/timeout) → flat fallback, don't block checkout.
        console.error(`[MAGIC][shipping] pin ${addr.zipcode} fallback: ${err.message}`);
        return toRazorpayServiceableAddress(addr, FALLBACK_SHIPPING_CHARGE, true);
      }
    }),
  );

  return res.status(200).json({ addresses: results });
});

/**
 * POST /api/v1/magic/promotions   (get available coupons)
 * Response (VERIFY): { promotions: [{ reference_id, type, code, summary, description }] }
 * Returns active PUBLIC/EVERYONE coupons within their validity window. Internal/
 * test/targeted/members-only coupons are never surfaced to the Magic modal.
 */
export const magicGetPromotionsController = asyncHandler(async (req, res) => {
  const payload = authedPayload(req, res);
  if (!payload) return;

  const now = new Date();
  const coupons = await Coupon.find({
    isActive: true,
    isArchived: false,
    isTest: false,
    isInternal: false,
    scope: "PUBLIC",
    audience: "EVERYONE",
    $and: [
      { $or: [{ validFrom: null }, { validFrom: { $exists: false } }, { validFrom: { $lte: now } }] },
      { $or: [{ validUntil: null }, { validUntil: { $exists: false } }, { validUntil: { $gte: now } }] },
    ],
  })
    .select({ code: 1, title: 1, discountType: 1, discountValue: 1, minCartValue: 1 })
    .lean();

  const promotions = coupons
    .filter((c) => c.code)
    .map((c) => ({
      reference_id: c.code,
      type: "coupon",
      code: c.code,
      summary: c.title || c.code,
      description:
        c.discountType === "PERCENTAGE"
          ? `${c.discountValue}% off${c.minCartValue ? ` on orders above ₹${c.minCartValue}` : ""}`
          : `₹${c.discountValue} off${c.minCartValue ? ` on orders above ₹${c.minCartValue}` : ""}`,
    }));

  return res.status(200).json({ promotions });
});

// Product-subtotal discount, matching the checkout controller's math exactly.
const computeDiscountRupees = (coupon, subtotalRupees) => {
  if (coupon.discountType === "PERCENTAGE") {
    let d = Math.floor((subtotalRupees * coupon.discountValue) / 100);
    if (coupon.maxDiscountCap) d = Math.min(d, coupon.maxDiscountCap);
    return Math.min(d, subtotalRupees);
  }
  // FLAT
  return Math.min(coupon.discountValue || 0, subtotalRupees);
};

/**
 * POST /api/v1/magic/promotions/apply   (validate + apply a coupon)
 * Request  (VERIFY): { order_id, code, contact?, email? }
 * Response (VERIFY): success → { promotions: [{ reference_id, type, code, value, value_type, description }] }  (value in PAISE)
 *                    failure → { failure_code, failure_reason }
 *
 * NOTE: this enforces the core gates (active, window, min-cart, public/non-test).
 * Full parity with validateNewCoupon (per-user caps, targeted assignment, members-
 * only) should be wired via applyCouponCodeService before go-live — see TODO.
 */
export const magicApplyPromotionController = asyncHandler(async (req, res) => {
  const payload = authedPayload(req, res);
  if (!payload) return;

  const { order_id, code } = payload;
  const fail = (reason, codeStr = "INVALID_PROMOTION") =>
    res.status(200).json({ failure_code: codeStr, failure_reason: reason });

  if (!code) return fail("No coupon code provided.");

  const coupon = await Coupon.findOne({ code: String(code).toUpperCase().trim() }).lean();
  if (!coupon || coupon.isArchived || !coupon.isActive) return fail("Invalid or inactive coupon.");
  if (coupon.isTest || coupon.isInternal || coupon.scope !== "PUBLIC" || coupon.audience !== "EVERYONE") {
    return fail("This coupon is not available here.");
  }
  const now = new Date();
  if (coupon.validFrom && now < new Date(coupon.validFrom)) return fail("This coupon is not valid yet.");
  if (coupon.validUntil && now > new Date(coupon.validUntil)) return fail("This coupon has expired.");
  if (coupon.maxTotalUses != null && coupon.usageCount >= coupon.maxTotalUses) {
    return fail("This coupon has reached its usage limit.");
  }

  // Product subtotal to discount against. VERIFY: prefer the order_amount Razorpay
  // sends in the request; fall back to the DB order's stored amount.
  const order = order_id
    ? await Order.findOne({ "payment.razorpayOrderId": order_id }, { amount: 1 }).lean()
    : null;
  const subtotalRupees = Number(payload.order_amount) / 100 || order?.amount || 0;

  if (subtotalRupees < (coupon.minCartValue || 0)) {
    return fail(`Minimum order of ₹${coupon.minCartValue} required for this coupon.`);
  }

  // TODO(go-live): route through applyCouponCodeService to enforce per-user caps,
  // targeted assignment and members-only rules with the contact/email in the request.
  const discountRupees = computeDiscountRupees(coupon, subtotalRupees);
  if (discountRupees <= 0) return fail("This coupon gives no discount on your cart.");

  return res.status(200).json({
    promotions: [
      {
        reference_id: coupon.code,
        type: "coupon",
        code: coupon.code,
        value: Math.round(discountRupees * 100), // PAISE
        value_type: "fixed_amount",
        description: coupon.title || `Discount applied: ₹${discountRupees}`,
      },
    ],
  });
});
