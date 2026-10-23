import Coupon from "../model/coupon.model.js";
import CouponUsage from "../model/couponUsage.model.js";
import Product from "../model/product.model.js";
import User from "../model/user.model.js";
import { validateNewCoupon } from "./coupon.code.service.js";
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} from "../utils/errors.js";

/**
 * "Offers & Discounts" coupon cards.
 *
 * The list is built ONLY from Coupon documents the admin configured, and it
 * NEVER contains the code itself. The code is released by revealCouponCodeService(),
 * and only to an account whose mobile number was proven over WhatsApp (the
 * existing login flow sets User.verifiedMobile) and matches the number the
 * customer entered. The rule lives here, not in the UI.
 */

const rupees = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

const normalizeMobile10 = (raw) => {
  const digits = String(raw ?? "").replace(/\D/g, "");
  let local = digits;
  if (local.length === 12 && local.startsWith("91")) local = local.slice(2);
  else if (local.length === 11 && local.startsWith("0")) local = local.slice(1);
  return /^[6-9]\d{9}$/.test(local) ? Number(local) : null;
};

/** What the storefront may advertise: live, public, customer-facing coupons. */
const advertisableFilter = (now = new Date()) => ({
  scope: "PUBLIC",
  isActive: true,
  isArchived: false,
  isTest: false,
  isInternal: { $ne: true },
  isHidden: { $ne: true },
  discountType: { $in: ["PERCENTAGE", "FLAT"] },
  discountValue: { $gt: 0 },
  $and: [
    { $or: [{ validFrom: null }, { validFrom: { $exists: false } }, { validFrom: { $lte: now } }] },
    { $or: [{ validUntil: null }, { validUntil: { $exists: false } }, { validUntil: { $gt: now } }] },
  ],
});

const notExhausted = (c) => c.maxTotalUses == null || (c.usageCount || 0) < c.maxTotalUses;

const headlineFor = (c) => {
  if (c.discountType === "PERCENTAGE") {
    return c.maxDiscountCap ? `${c.discountValue}% OFF up to ${rupees(c.maxDiscountCap)}` : `${c.discountValue}% OFF`;
  }
  return `${rupees(c.discountValue)} OFF`;
};

const summaryFor = (c) => {
  const off = c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : rupees(c.discountValue);
  return `Get ${off} off ${c.minCartValue > 0 ? `on orders above ${rupees(c.minCartValue)}` : "on your order"}`;
};

/** Only conditions actually configured on the coupon, in plain language. */
const buildTerms = (c, productNames) => {
  const t = [];
  t.push(
    c.discountType === "PERCENTAGE"
      ? `${c.discountValue}% off on the product total${c.maxDiscountCap ? `, up to a maximum of ${rupees(c.maxDiscountCap)}` : ""}.`
      : `Flat ${rupees(c.discountValue)} off on the product total.`,
  );
  if (c.minCartValue > 0) t.push(`Valid on a minimum product total of ${rupees(c.minCartValue)}.`);
  if (productNames.length) {
    const shown = productNames.slice(0, 3).join(", ");
    const rest = productNames.length - 3;
    t.push(`Applies when your cart includes: ${shown}${rest > 0 ? ` and ${rest} more` : ""}.`);
  }
  if (c.audience === "MEMBERS_ONLY") t.push("For registered members only.");
  if (c.validUntil) {
    t.push(
      `Valid until ${new Date(c.validUntil).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
      })} IST.`,
    );
  }
  if (c.maxUsesPerUser) {
    t.push(c.maxUsesPerUser === 1 ? "Can be used once per customer." : `Can be used up to ${c.maxUsesPerUser} times per customer.`);
  }
  if (c.maxTotalUses != null) t.push("Limited number of redemptions; may end before the validity date.");
  t.push("Only one coupon can be applied per order.");
  t.push("Discount applies to products only, not to shipping. Not applicable on carts of ₹99 or less.");
  return t;
};

const productNamesFor = async (cs) => {
  const ids = [...new Set(cs.flatMap((c) => c.eligibleProductIds || []))];
  if (!ids.length) return new Map();
  const rows = await Product.find({ productId: { $in: ids } }, { productId: 1, productName: 1 }).lean();
  return new Map(rows.map((p) => [p.productId, p.productName]));
};

/** How many times this customer has already used each coupon. */
const usedByUser = async (userId, couponIds) => {
  if (!userId || !couponIds.length) return new Map();
  const user = await User.findOne({ userId }, { email: 1, mobileNumber: 1, verifiedMobile: 1 }).lean();
  if (!user) return new Map();
  const or = [{ userId }];
  if (user.email) or.push({ email: String(user.email).toLowerCase() });
  for (const m of [user.mobileNumber, user.verifiedMobile]) if (m) or.push({ mobile: String(m) });
  const rows = await CouponUsage.aggregate([
    { $match: { couponId: { $in: couponIds }, reversed: { $ne: true }, $or: or } },
    { $group: { _id: "$couponId", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.n]));
};

const getCouponOffersService = async ({ userId } = {}) => {
  const docs = await Coupon.find(advertisableFilter()).sort({ minCartValue: 1, discountValue: 1 }).limit(30).lean();
  const live = docs.filter(notExhausted);
  const [names, used] = await Promise.all([
    productNamesFor(live),
    usedByUser(userId, live.map((c) => c.couponId)),
  ]);

  const data = live
    .filter((c) => !(c.maxUsesPerUser && (used.get(c.couponId) || 0) >= c.maxUsesPerUser))
    .map((c) => {
      const eligible = (c.eligibleProductIds || []).map((id) => names.get(id)).filter(Boolean);
      return {
        id: c.couponId,
        title: c.title || headlineFor(c),
        headline: headlineFor(c),
        summary: summaryFor(c),
        discountType: c.discountType,
        discountValue: c.discountValue,
        maxDiscountCap: c.maxDiscountCap || null,
        minCartValue: c.minCartValue || 0,
        validUntil: c.validUntil || null,
        membersOnly: c.audience === "MEMBERS_ONLY",
        terms: buildTerms(c, eligible),
        // deliberately NO code, notes or eligible ids here
      };
    });

  return { statusCode: 200, message: "couponOffers", data, success: true };
};

const revealCouponCodeService = async ({ userId, couponId, mobile }) => {
  const entered = normalizeMobile10(mobile);
  if (!entered) throw new ValidationError("Enter a valid 10-digit mobile number.");
  if (!couponId || typeof couponId !== "string") throw new ValidationError("Coupon is required.");

  const user = await User.findOne({ userId }, { email: 1, mobileNumber: 1, verifiedMobile: 1 }).lean();
  if (!user) throw new AuthorizationError("Please sign in to reveal this coupon.");

  // The gate: the number must have been proven over WhatsApp AND be the one entered.
  if (!user.verifiedMobile) {
    throw new AuthorizationError("Verify your mobile number on WhatsApp to reveal this code.", { code: "MOBILE_NOT_VERIFIED" });
  }
  if (user.verifiedMobile !== entered) {
    throw new AuthorizationError("This number does not match the one verified on your account.", { code: "MOBILE_MISMATCH" });
  }

  const coupon = await Coupon.findOne({ ...advertisableFilter(), couponId }).lean();
  if (!coupon || !notExhausted(coupon)) throw new NotFoundError("This coupon is no longer available.");

  // Same per-customer / validity / audience rules the cart applies at checkout.
  // Cart size and product presence are not the customer's problem at reveal
  // time, so they are satisfied with the coupon's own thresholds.
  await validateNewCoupon({
    coupon,
    cartProductTotal: Math.max(coupon.minCartValue || 0, 100),
    cartProductIds: coupon.eligibleProductIds || [],
    email: user.email,
    mobile: String(user.verifiedMobile),
    isLoggedIn: true,
  });

  return { statusCode: 200, message: "Coupon revealed", data: { id: coupon.couponId, code: coupon.code }, success: true };
};

export { getCouponOffersService, revealCouponCodeService };
