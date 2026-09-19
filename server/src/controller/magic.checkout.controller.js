import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import Order from "../model/order.model.js";
import Coupon from "../model/coupon.model.js";
import {
  calculateShippingRate,
  FALLBACK_SHIPPING_CHARGE,
} from "../services/shipping.service.js";
import { validateNewCoupon } from "../services/coupon.code.service.js";
import {
  isFreeShippingEligible,
  getFreeShippingConfig,
} from "../utils/freeShippingOffer.util.js";
import {
  verifyMagicCallback,
  toRazorpayServiceableAddress,
  stripCountryCode,
} from "../services/magic.checkout.service.js";

/**
 * Razorpay Magic Checkout (1CC) server callbacks.
 *
 * Razorpay's servers call these PUBLIC endpoints mid-checkout. They are mounted
 * with a RAW body parser (see user.route.js) and authenticated by the per-channel
 * secret configured in the Magic dashboard.
 *
 * Two rules hold across all three handlers:
 *   1. Always answer 200 with a valid body. A 500 here stalls the customer's
 *      checkout modal; degrade instead (flat shipping, empty coupon list).
 *   2. Never mutate state. Razorpay calls these speculatively — the customer may
 *      still abandon. Coupons are only committed at payment time.
 *
 * ⚠️ Search this file for "VERIFY" before go-live: the exact request field names
 * Razorpay sends and the response keys it expects must be confirmed against a
 * real sandbox request.
 */

const TAG = "[MAGIC]";

// Authenticate + parse a raw callback body. Returns the payload, or null after
// the response has already been sent (caller must return immediately).
const authedPayload = (channel, req, res) => {
  const auth = verifyMagicCallback(channel, req.body, req.headers, req.query);
  if (!auth.ok) {
    console.error(`${TAG}[${channel}] rejected: ${auth.reason}`);
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }

  try {
    const parsed = JSON.parse(req.body.toString("utf8"));
    console.log(`${TAG}[${channel}] auth=${auth.reason} payload=${JSON.stringify(parsed)}`);
    return parsed;
  } catch {
    console.error(`${TAG}[${channel}] invalid JSON body`);
    res.status(400).json({ success: false, message: "Invalid JSON" });
    return null;
  }
};

// Hydrate weight-accurate shipping inputs from the DB order created at
// order-create time (payment.razorpayOrderId === the Magic order_id).
const orderForRazorpayId = async (razorpayOrderId, projection) => {
  if (!razorpayOrderId) return null;
  return Order.findOne({ "payment.razorpayOrderId": razorpayOrderId }, projection).lean();
};

const cartItemsForOrder = (order) =>
  (order?.items || []).map((i) => ({
    productId: i.productId,
    quantity: i.productSnapshot?.quantity || 1,
    price: i.productSnapshot?.priceAtPurchase,
  }));

/* ===============================================================
   1. SERVICEABILITY / SHIPPING
   ---------------------------------------------------------------
   POST /api/v1/magic/shipping-info
   Request  (VERIFY): { order_id, contact?, email?, addresses: [{ id, zipcode, state?, country? }] }
   Response (VERIFY): { addresses: [ ...see toRazorpayServiceableAddress... ] }   fees in PAISE

   Razorpay never talks to ShipMozo. It asks us; we ask ShipMozo. That is why
   ShipMozo not being a listed shipping partner in the dashboard does not matter.
================================================================ */
export const magicShippingInfoController = asyncHandler(async (req, res) => {
  const payload = authedPayload("shipping", req, res);
  if (!payload) return;

  const { addresses = [], order_id } = payload;
  const order = await orderForRazorpayId(order_id, { items: 1, amount: 1 });
  const cartItems = cartItemsForOrder(order);

  if (!order) {
    console.warn(`${TAG}[shipping] no DB order for ${order_id} — rating on pincode alone`);
  }

  // Free shipping is normally decided at order-create, but a Magic order has no
  // shipping line at that point — Razorpay takes whatever this callback returns.
  // So the offer has to be evaluated here, or it silently stops applying to
  // every Magic order. Mirrors the standard checkout's rules: per-product
  // eligibility, or cart subtotal at/above the configured threshold.
  let freeShipping = false;
  try {
    const subtotal = cartItems.reduce(
      (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1),
      0,
    );
    const config = await getFreeShippingConfig();
    const thresholdEligible = config.isActive && subtotal >= config.thresholdAmount;
    const productEligible = cartItems.length
      ? await isFreeShippingEligible(cartItems.map((i) => i.productId))
      : false;
    freeShipping = thresholdEligible || productEligible;
    if (freeShipping) {
      console.log(`${TAG}[shipping] free shipping applies (subtotal ₹${subtotal})`);
    }
  } catch (err) {
    // Offer lookup failing must not block checkout — fall back to charging.
    console.error(`${TAG}[shipping] free-shipping check failed, charging: ${err.message}`);
  }

  const results = await Promise.all(
    addresses.map(async (addr) => {
      try {
        const rate = await calculateShippingRate({
          pincode: addr.zipcode,
          paymentType: "PREPAID",
          cartItems,
        });
        // Still rate the pincode even when shipping is free — an unserviceable
        // pincode must be blocked regardless of who pays for delivery.
        return toRazorpayServiceableAddress(
          addr,
          freeShipping ? 0 : (rate?.total_charges ?? FALLBACK_SHIPPING_CHARGE),
          true,
        );
      } catch (err) {
        // A genuinely unserviceable pincode must block the order — we cannot
        // ship it. Anything else (API down, timeout) falls back to a flat rate
        // rather than taking checkout down with it. Mirrors the behaviour of
        // getShippingRateOrFallback in the standard checkout path.
        if (err.message?.includes("Pincode not serviceable")) {
          console.log(`${TAG}[shipping] pin ${addr.zipcode} unserviceable → blocked`);
          return toRazorpayServiceableAddress(addr, 0, false);
        }
        console.error(
          `${TAG}[shipping] pin ${addr.zipcode} rate failed, flat ₹${FALLBACK_SHIPPING_CHARGE}: ${err.message}`,
        );
        return toRazorpayServiceableAddress(
          addr,
          freeShipping ? 0 : FALLBACK_SHIPPING_CHARGE,
          true,
        );
      }
    }),
  );

  return res.status(200).json({ addresses: results });
});

/* ===============================================================
   2. GET PROMOTIONS  (list coupons in the Magic modal)
   ---------------------------------------------------------------
   POST /api/v1/magic/promotions
   Request  (VERIFY): { order_id, contact?, email? }
   Response (VERIFY): { promotions: [{ code, summary, description }] }

   Only broadly-redeemable coupons are listed. Internal/test/targeted/
   members-only coupons must never surface in a public coupon sheet — an
   INTERNAL_TEST coupon knocks an order down to ₹1.
================================================================ */
export const magicGetPromotionsController = asyncHandler(async (req, res) => {
  const payload = authedPayload("getPromotions", req, res);
  if (!payload) return;

  try {
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
        { $or: [{ maxTotalUses: null }, { maxTotalUses: { $exists: false } }, { $expr: { $lt: ["$usageCount", "$maxTotalUses"] } }] },
      ],
    })
      .select({ code: 1, title: 1, discountType: 1, discountValue: 1, minCartValue: 1, maxDiscountCap: 1 })
      .lean();

    const describe = (c) => {
      const cap = c.maxDiscountCap ? ` up to ₹${c.maxDiscountCap}` : "";
      const min = c.minCartValue ? ` on orders above ₹${c.minCartValue}` : "";
      return c.discountType === "PERCENTAGE"
        ? `${c.discountValue}% off${cap}${min}`
        : `₹${c.discountValue} off${min}`;
    };

    const promotions = coupons
      .filter((c) => c.code && c.discountType !== "INTERNAL_TEST")
      .map((c) => ({
        code: c.code,
        summary: c.title || describe(c),
        description: describe(c),
      }));

    console.log(`${TAG}[getPromotions] returning ${promotions.length} coupon(s)`);
    return res.status(200).json({ promotions });
  } catch (err) {
    // Auto-fetch calls this on every checkout open. An error must not stall the
    // modal — show no coupons rather than breaking the page.
    console.error(`${TAG}[getPromotions] failed, returning empty list: ${err.message}`);
    return res.status(200).json({ promotions: [] });
  }
});

/* ===============================================================
   3. APPLY PROMOTION  (validate a code, return the discount)
   ---------------------------------------------------------------
   POST /api/v1/magic/promotions/apply
   Request  (VERIFY): { order_id, code, contact?, email? }
   Response (VERIFY): success → { promotion: { reference_id, type, code, value, value_type, description } }
                                 value in PAISE
                      failure → { failure_code, failure_reason }

   Eligibility is delegated to validateNewCoupon — the same function the
   storefront uses — so per-user caps, TARGETED assignment, MEMBERS_ONLY,
   validity window and min-cart behave identically in both checkouts.
================================================================ */
export const magicApplyPromotionController = asyncHandler(async (req, res) => {
  const payload = authedPayload("applyPromotion", req, res);
  if (!payload) return;

  const { order_id, code, contact, email } = payload;

  // Razorpay treats a 200 with failure_code as "coupon rejected, show this
  // reason" — which is what we want for every business rejection.
  const fail = (reason, failureCode = "INVALID_PROMOTION") => {
    console.log(`${TAG}[applyPromotion] reject "${code}": ${reason}`);
    return res.status(200).json({ failure_code: failureCode, failure_reason: reason });
  };

  if (!code) return fail("No coupon code provided.");

  const cleanCode = String(code).toUpperCase().trim();
  const coupon = await Coupon.findOne({ code: cleanCode, isArchived: false }).lean();
  if (!coupon) return fail("Invalid or inactive coupon.");

  // Product subtotal the discount applies to. The DB order's amount is the
  // source of truth; Razorpay's order_amount is a fallback.
  // VERIFY: confirm the field name and whether it already includes shipping.
  const order = await orderForRazorpayId(order_id, { amount: 1 });
  const subtotalRupees =
    Number(order?.amount) || Number(payload.order_amount) / 100 || 0;

  if (subtotalRupees <= 0) {
    return fail("Could not read your cart total. Please retry.", "REQUIREMENT_NOT_MET");
  }

  // Mirrors the storefront's global floor (see applyCouponCodeService).
  if (subtotalRupees <= 99) {
    return fail("Coupons are not applicable on cart values of ₹99 or less.", "REQUIREMENT_NOT_MET");
  }

  let discountRupees;
  try {
    discountRupees = await validateNewCoupon({
      coupon,
      cartProductTotal: subtotalRupees,
      email,
      mobile: stripCountryCode(contact),
      // Magic collects a phone number but no session — treat every Magic
      // customer as a guest. MEMBERS_ONLY and INTERNAL_TEST coupons are
      // correctly refused as a result.
      isLoggedIn: false,
    });
  } catch (err) {
    return fail(err.message || "This coupon cannot be applied.");
  }

  if (!discountRupees || discountRupees <= 0) {
    return fail("This coupon gives no discount on your cart.");
  }

  console.log(`${TAG}[applyPromotion] "${cleanCode}" ok — ₹${discountRupees} off ₹${subtotalRupees}`);

  return res.status(200).json({
    promotion: {
      reference_id: coupon.couponId || cleanCode,
      type: "coupon",
      code: cleanCode,
      value: Math.round(discountRupees * 100), // PAISE
      value_type: "fixed_amount", // we resolve percentages ourselves
      description: coupon.title || `₹${discountRupees} off`,
    },
  });
});
