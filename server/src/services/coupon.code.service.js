import Coupon from "../model/coupon.model.js";
import CouponUsage from "../model/couponUsage.model.js";
import { getCartService } from "../services/user.cart.service.js";
import Cart from "../model/user.cart.model.js";
import User from "../model/user.model.js";
import {
  ValidationError,
  NotFoundError,
} from "../utils/errors.js";

// ── Identity normalizers (must match admin server logic exactly) ───────────────

function normalizeMobile(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  const last10 = digits.slice(-10);
  return last10.length >= 10 ? last10 : null;
}

function normalizeEmail(raw) {
  if (!raw) return null;
  const clean = String(raw).toLowerCase().trim();
  return clean.includes("@") ? clean : null;
}

// Who a signed-in customer is, read from OUR user record — never from the
// request body, which the client controls. A TARGETED coupon can be assigned
// to either an email or a mobile, so both (and the WhatsApp-verified number,
// which can differ from the typed profile one) must count as "this customer".
async function getUserCouponIdentity(userId) {
  if (!userId) return { email: null, mobiles: [] };
  const user = await User.findOne({ userId }, { email: 1, mobileNumber: 1, verifiedMobile: 1 }).lean();
  if (!user) return { email: null, mobiles: [] };
  const mobiles = [user.verifiedMobile, user.mobileNumber].map(normalizeMobile).filter(Boolean);
  return { email: normalizeEmail(user.email), mobiles: [...new Set(mobiles)] };
}

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

// Live-now, not used up: the same gate the "Offers" cards already apply.
const liveWindowFilter = (now = new Date()) => ({
  $and: [
    { $or: [{ validFrom: null }, { validFrom: { $exists: false } }, { validFrom: { $lte: now } }] },
    { $or: [{ validUntil: null }, { validUntil: { $exists: false } }, { validUntil: { $gt: now } }] },
    { $or: [{ maxTotalUses: null }, { maxTotalUses: { $exists: false } }, { $expr: { $lt: ["$usageCount", "$maxTotalUses"] } }] },
  ],
});

function calculateDiscount(coupon, cartProductTotal) {
  if (coupon.discountType === "INTERNAL_TEST") return 0; // caller overrides grand total to ₹1
  let amount;
  if (coupon.discountType === "PERCENTAGE") {
    amount = Math.floor((cartProductTotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountCap) amount = Math.min(amount, coupon.maxDiscountCap);
  } else {
    amount = coupon.discountValue;
  }
  return Math.min(amount, cartProductTotal);
}

// ── New-model coupon validation ───────────────────────────────────────────────

// Presence-only check — never scaled by quantity. 2 units of the qualifying
// product doesn't grant 2 coupons or change the discount amount; it's a
// plain yes/no gate, same as every other eligibility check here. Empty/unset
// eligibleProductIds = no restriction, identical to today's behavior for
// every coupon that doesn't use this field.
function couponProductGateOk(coupon, cartProductIds) {
  if (!coupon.eligibleProductIds?.length) return true;
  const have = new Set((cartProductIds || []).map(String));
  return coupon.eligibleProductIds.some((id) => have.has(String(id)));
}

// cartProductTotal = product subtotal only — discount applies to products, not shipping (industry standard)
// isLoggedIn: true for authenticated users; false/undefined for guests
// cartProductIds: distinct productIds currently in the cart/order — only
// needed for coupons with eligibleProductIds set; omit/empty is fine for
// every other coupon (couponProductGateOk is a no-op when the field is unset).
async function validateNewCoupon({ coupon, cartProductTotal, cartProductIds, email, mobile, isLoggedIn }) {
  const tag = "[Coupon:Storefront]";
  const now = new Date();

  console.log(
    `${tag} ELIGIBILITY CHECK "${coupon.code}" — scope=${coupon.scope} audience=${coupon.audience} ` +
    `isLoggedIn=${isLoggedIn} email=${email || "-"} mobile=${[].concat(mobile ?? []).join("/") || "-"} assignedToCount=${coupon.assignedTo?.length ?? 0} ` +
    `cartProductTotal=₹${cartProductTotal}`
  );

  if (!coupon.isActive) {
    console.log(`${tag} REJECT "${coupon.code}" — not active`);
    throw new ValidationError("This coupon is not currently active.");
  }
  // MEMBERS_ONLY coupons require a logged-in account — guests cannot redeem them
  if (coupon.audience === "MEMBERS_ONLY" && !isLoggedIn) {
    console.log(`${tag} REJECT "${coupon.code}" — MEMBERS_ONLY, not authenticated`);
    throw new ValidationError("This coupon is only available for registered members. Please sign in to use it.");
  }

  // isInternal is only valid when discountType is INTERNAL_TEST — guard against DB corruption
  const isValidInternal = coupon.isInternal && coupon.discountType === "INTERNAL_TEST";

  if (coupon.isTest && !isValidInternal) {
    // isTest coupons are invisible to storefront users.
    // Only valid INTERNAL_TEST coupons (isInternal=true + discountType=INTERNAL_TEST) are exempt.
    console.log(`${tag} REJECT "${coupon.code}" — in Testing mode (isTest=true)`);
    throw new NotFoundError("Invalid or inactive coupon");
  }
  if (coupon.isInternal && !isValidInternal) {
    // isInternal=true but discountType is not INTERNAL_TEST — data integrity issue, reject
    console.error(`${tag} SECURITY: Coupon "${coupon.code}" has isInternal=true but discountType=${coupon.discountType}`);
    throw new NotFoundError("Invalid or inactive coupon");
  }
  // INTERNAL_TEST coupons must be TARGETED — a PUBLIC ₹1 coupon is a security risk
  if (isValidInternal && coupon.scope !== "TARGETED") {
    console.log(`${tag} REJECT "${coupon.code}" — internal coupon must be TARGETED scope`);
    throw new ValidationError("This coupon is restricted. Contact admin.");
  }
  // Internal test coupons require a signed-in account so the assigned email is verified.
  if (isValidInternal && !isLoggedIn) {
    console.log(`${tag} REJECT "${coupon.code}" — internal coupon requires login`);
    throw new ValidationError("This coupon is only available to signed-in team members. Please sign in to use it.");
  }
  if (coupon.validFrom && now < new Date(coupon.validFrom)) {
    console.log(`${tag} REJECT "${coupon.code}" — not valid yet (starts ${coupon.validFrom})`);
    throw new ValidationError("This coupon is not valid yet.");
  }
  if (coupon.validUntil && now > new Date(coupon.validUntil)) {
    console.log(`${tag} REJECT "${coupon.code}" — expired (was valid until ${coupon.validUntil})`);
    throw new ValidationError("This coupon has expired.");
  }
  if (cartProductTotal < (coupon.minCartValue || 0)) {
    console.log(`${tag} REJECT "${coupon.code}" — cart ₹${cartProductTotal} < min ₹${coupon.minCartValue}`);
    throw new ValidationError(`Minimum order of ₹${coupon.minCartValue} required for this coupon`);
  }
  if (!couponProductGateOk(coupon, cartProductIds)) {
    console.log(`${tag} REJECT "${coupon.code}" — product gate not met (requires one of [${(coupon.eligibleProductIds || []).join(", ")}])`);
    throw new ValidationError("This coupon requires a specific product in your cart.");
  }
  if (coupon.maxTotalUses != null && coupon.usageCount >= coupon.maxTotalUses) {
    console.log(`${tag} REJECT "${coupon.code}" — global cap reached (${coupon.usageCount}/${coupon.maxTotalUses})`);
    throw new ValidationError("This coupon has reached its maximum number of uses.");
  }

  // `mobile` may be one number or several (a signed-in customer can have both a
  // profile and a WhatsApp-verified number) — any of them counts as this customer.
  const normEmail  = normalizeEmail(email);
  const normMobiles = [].concat(mobile ?? []).map(normalizeMobile).filter(Boolean);
  const identifiers = [normEmail, ...normMobiles].filter(Boolean);

  // Internal test coupons skip only the TARGETED single-use (usedAt) gate, so an assigned
  // team member can redeem repeatedly. Their per-user limit is still enforced below via
  // maxUsesPerUser (blank/null = unlimited).
  const skipSingleUseGate = isValidInternal;

  // Per-user cap — enforced whenever a maxUsesPerUser limit is set (null = unlimited).
  if (identifiers.length > 0 && coupon.maxUsesPerUser) {
    const priorCount = await CouponUsage.countDocuments({
      couponId: coupon.couponId,
      reversed: { $ne: true }, // a cancelled/refunded order's usage must not count against the limit
      $or: [
        ...(normEmail  ? [{ email:  normEmail  }] : []),
        ...(normMobiles.length ? [{ mobile: { $in: normMobiles } }] : []),
      ],
    });
    console.log(`${tag} Prior uses by this user for "${coupon.code}": ${priorCount} (limit: ${coupon.maxUsesPerUser})`);
    if (priorCount >= coupon.maxUsesPerUser) {
      throw new ValidationError(
        coupon.maxUsesPerUser === 1
          ? "You have already used this coupon."
          : `You have already used this coupon ${priorCount} time(s) (limit: ${coupon.maxUsesPerUser}).`,
      );
    }
  }

  // TARGETED scope: must be in embedded assignedTo list
  if (coupon.scope === "TARGETED") {
    if (identifiers.length === 0) {
      throw new ValidationError("Provide your email or mobile to redeem this coupon.");
    }
    const assignment = (coupon.assignedTo || []).find((a) => identifiers.includes(a.identifier));
    if (!assignment) {
      console.log(`${tag} REJECT "${coupon.code}" — TARGETED: not assigned to ${identifiers.join(" / ")}`);
      throw new ValidationError("This coupon has not been assigned to you.");
    }
    if (assignment.usedAt && !skipSingleUseGate) {
      console.log(`${tag} REJECT "${coupon.code}" — TARGETED: already used`);
      throw new ValidationError("Your personal coupon has already been used.");
    }
  }

  // Discount applies to product subtotal only (shipping excluded — industry standard)
  const discountAmount = calculateDiscount(coupon, cartProductTotal);
  console.log(`${tag} ✅ "${coupon.code}" valid — discount ₹${discountAmount} on product subtotal ₹${cartProductTotal}`);
  return discountAmount;
}

// ── Main apply service ────────────────────────────────────────────────────────

const applyCouponCodeService = async ({ userId, couponCodeName, email, mobile }) => {
  const tag = "[Coupon:Storefront]";
  console.log(`${tag} applyCouponCodeService called: userId=${userId} code="${couponCodeName || "-"}" email=${email || "-"} mobile=${mobile || "-"}`);

  const cartRes = await getCartService({ userId });

  if (
    !cartRes.success ||
    (cartRes.data.availableItems.length === 0 &&
      cartRes.data.unavailableItems.length === 0)
  ) {
    throw new ValidationError("Cannot calculate for empty cart");
  }

  const { cartSubtotal, availableItems } = cartRes.data;

  // --- CASE 1: No coupon provided — clear any applied coupon ---
  if (!couponCodeName || couponCodeName.trim() === "") {
    const snap = {
      couponCodeId: null, name: null, discountValue: 0, isApplied: false,
      summary: { subtotal: cartSubtotal, shipping: 0, discount: 0, grandTotal: cartSubtotal },
    };
    await Cart.updateOne({ userId }, { $set: { appliedCoupon: snap } });
    return { statusCode: 200, message: "No Coupon present", success: true, data: { items: availableItems, summary: snap.summary } };
  }

  // --- CASE 2: Global rule — cart too small ---
  if (cartSubtotal <= 99) {
    throw new ValidationError("Coupons are not applicable on cart values of ₹99 or less");
  }

  const cleanCode = couponCodeName.trim().toUpperCase();
  console.log(`${tag} Apply attempt: code="${cleanCode}" email=${email || "-"} mobile=${mobile || "-"} subtotal=₹${cartSubtotal}`);

  // --- CASE 3: Try new admin coupon model first ---
  // Debug: confirm which collection and DB we're querying
  console.log(`${tag} Querying collection: ${Coupon.collection.collectionName} on db: ${Coupon.db.name}`);
  const newCoupon = await Coupon.findOne({ code: cleanCode, isArchived: false }).lean();
  console.log(`${tag} New model result: ${newCoupon ? JSON.stringify({ code: newCoupon.code, isActive: newCoupon.isActive, isTest: newCoupon.isTest, isArchived: newCoupon.isArchived }) : "null (not found)"}`);

  if (newCoupon) {
    console.log(`${tag} Found in new model: couponId=${newCoupon.couponId} isActive=${newCoupon.isActive} isTest=${newCoupon.isTest} type=${newCoupon.discountType}`);

    // The customer is identified from our own user record, not from `email` /
    // `mobile` in the request body: that is what lets a coupon assigned to a
    // MOBILE work for a signed-in customer, and stops anyone claiming another
    // person's assigned coupon by sending their email. Same identifiers the
    // payment step re-checks with (rp.payment.controller.js).
    const identity = await getUserCouponIdentity(userId);

    // throws ValidationError/NotFoundError on any failure
    const discountAmount = await validateNewCoupon({
      coupon: newCoupon,
      cartProductTotal: cartSubtotal,
      cartProductIds: availableItems.map((i) => i.productId),
      email: identity.email,
      mobile: identity.mobiles,
      isLoggedIn: !!userId,
    });

    // Discount applies to product subtotal only. INTERNAL_TEST is handled at payment time
    // (payment controller detects INTERNAL_TEST and overrides finalAmount to ₹1 with real shipping).
    let finalDiscount, finalGrandTotal;
    if (newCoupon.isInternal && newCoupon.discountType === "INTERNAL_TEST") {
      finalDiscount   = 0;        // payment formula: subtotal + shipping - 0, then isInternal override → ₹1
      finalGrandTotal = 1;        // display ₹1 in cart so user knows what they'll pay
      console.log(`${tag} Internal coupon applied — grandTotal set to ₹1 for display; payment controller confirms ₹1 with real shipping`);
    } else {
      finalDiscount   = discountAmount;
      finalGrandTotal = Math.max(cartSubtotal - discountAmount, 0);
    }

    const snap = {
      couponCodeId: newCoupon.couponId,
      name: newCoupon.code,
      discountValue: finalDiscount,   // 0 for INTERNAL_TEST — payment controller uses this in formula
      isApplied: true,
      summary: {
        subtotal: cartSubtotal,
        shipping: 0,
        discount: newCoupon.isInternal ? cartSubtotal - 1 : finalDiscount,  // display: show products knocked to ₹1 (shipping added at payment)
        grandTotal: finalGrandTotal,
      },
    };

    await Cart.updateOne({ userId }, { $set: { appliedCoupon: snap } });
    return { statusCode: 200, message: "Coupon applied successfully", success: true, data: { items: availableItems, summary: snap.summary, isInternalTest: !!newCoupon.isInternal } };
  }

  // --- Not found in the new coupon model — reject. ---
  // Legacy CouponCode fallback (and its waitlist-signup gate) retired: every coupon
  // is now served by the new Coupon model.
  console.log(`${tag} REJECT "${cleanCode}" — not found`);
  throw new NotFoundError("Invalid or inactive coupon");
};

// ── List available coupons ─────────────────────────────────────────────────────
// Returns a unified array of coupons in a normalised shape that CouponList can
// render without knowing which model a coupon came from.

// Can THIS customer see / use this coupon at all, audience-wise? Pure.
//   TARGETED     → only someone it is assigned to (email or mobile) who has not used it
//   MEMBERS_ONLY → only a signed-in customer
// Everything else (min cart, product gate, per-user limit…) is validateNewCoupon's job.
function couponAudienceOk(coupon, { isLoggedIn, identifiers = [] }) {
  if (coupon.scope === "TARGETED") {
    return (coupon.assignedTo || []).some((a) => !a.usedAt && identifiers.includes(a.identifier));
  }
  if (coupon.audience === "MEMBERS_ONLY") return !!isLoggedIn;
  return true;
}

const LIST_FIELDS = { couponId: 1, code: 1, title: 1, notes: 1, discountType: 1, discountValue: 1, maxDiscountCap: 1, minCartValue: 1, validUntil: 1, eligibleProductIds: 1, scope: 1, audience: 1, assignedTo: 1, maxUsesPerUser: 1 };

const toListItem = (c, extra = {}) => ({
  id:            c.couponId,
  code:          c.code,
  title:         c.title || c.code,
  description:   c.notes || null,
  discountType:  c.discountType,   // "PERCENTAGE" | "FLAT"
  discountValue: c.discountValue || 0,
  maxDiscountCap: c.maxDiscountCap || null,
  minCartValue:  c.minCartValue || 0,
  validUntil:    c.validUntil || null,
  ...extra,
});

// userId MUST come from the verified session (the controller passes req.user),
// never from the request body — it decides which coupons are shown.
//
// cartProductIds: only meaningful for GUESTS, whose cart lives client-side
// (there's nothing server-side to look up) — the caller must pass the
// guest's current cart productIds. For a logged-in user, the server's own
// stored cart (getCartService) is the trusted source instead; anything a
// logged-in client might pass here is ignored, same trust boundary
// applyCouponCodeService already uses.
//
// email / mobile: only used for GUESTS, to recognise a TARGETED coupon assigned
// to them. A signed-in customer is identified from the user record instead.
const getAllCouponCodeService = async ({ userId, code, cartProductIds, email, mobile }) => {
  const tag = "[Coupon:List]";
  console.log(`${tag} getAllCouponCodeService called: userId=${userId || "-"} code="${code || "-"}"`);

  let effectiveCartProductIds = cartProductIds;
  let identity;
  if (userId) {
    const [cartRes, userIdentity] = await Promise.all([getCartService({ userId }), getUserCouponIdentity(userId)]);
    effectiveCartProductIds = cartRes.success ? cartRes.data.availableItems.map((i) => i.productId) : [];
    identity = userIdentity;
  } else {
    identity = { email: normalizeEmail(email), mobiles: [].concat(mobile ?? []).map(normalizeMobile).filter(Boolean) };
  }
  const identifiers = [identity.email, ...identity.mobiles].filter(Boolean);
  const isLoggedIn = !!userId;

  // Live now and not used up — an expired or sold-out coupon is not an offer.
  // Testing / internal coupons are never exposed here.
  const baseFilter = { isActive: true, isArchived: false, isTest: false, isInternal: { $ne: true }, ...liveWindowFilter() };

  // ── Single-coupon lookup by exact code (a guest typing a code manually) ──
  // Lets the storefront show the correct discount for HIDDEN coupons without listing them.
  // Server still fully re-validates at order creation.
  //   · PUBLIC / hidden → returned
  //   · MEMBERS_ONLY    → returned flagged `membersOnly` for a guest, so the UI can ask them
  //                       to sign in instead of claiming the code does not exist
  //   · TARGETED        → returned only if the email/mobile given is assigned to it and unused
  if (code) {
    const cleanCode = String(code).trim().toUpperCase();
    const one = await Coupon.findOne({ code: cleanCode, ...baseFilter }, LIST_FIELDS).lean();

    let data = [];
    if (!one) {
      console.log(`${tag} Code "${cleanCode}" NOT returned by lookup (missing, paused, archived, testing, internal, expired or used up).`);
    } else if (one.scope === "TARGETED") {
      if (couponAudienceOk(one, { isLoggedIn, identifiers })) data = [toListItem(one)];
      else console.log(`${tag} Code "${cleanCode}" is TARGETED and not assigned to the caller — not returned.`);
    } else if (one.audience === "MEMBERS_ONLY" && !isLoggedIn) {
      data = [toListItem(one, { membersOnly: true })];
    } else {
      data = [toListItem(one)];
    }

    // A product-gated coupon typed without its product in the cart: say so now,
    // instead of letting it "apply" and be refused at payment.
    if (data.length && !data[0].membersOnly && effectiveCartProductIds?.length && !couponProductGateOk(one, effectiveCartProductIds)) {
      data = [toListItem(one, { productGateFailed: true })];
    }

    // Already used up by this customer? Say so now instead of letting the guest
    // "apply" it and be refused at payment. Only possible once they have given us
    // an email/mobile (a signed-in customer is told by /coupon/apply instead).
    if (data.length && !data[0].membersOnly && !data[0].productGateFailed && identifiers.length && one.maxUsesPerUser) {
      const used = await CouponUsage.countDocuments({
        couponId: one.couponId,
        reversed: { $ne: true },
        $or: [
          ...(identity.email ? [{ email: identity.email }] : []),
          ...(identity.mobiles.length ? [{ mobile: { $in: identity.mobiles } }] : []),
        ],
      });
      if (used >= one.maxUsesPerUser) data = [toListItem(one, { alreadyUsed: true })];
    }
    if (data.length) console.log(`${tag} Code "${cleanCode}" matched and returned.`);

    return { statusCode: 200, message: "couponLookup", data, success: true };
  }

  // ── The list ──
  // Shown: PUBLIC coupons (members-only ones to signed-in customers), plus
  // TARGETED coupons to the person they are assigned to. Hidden coupons never
  // appear here (they work only when typed).
  const candidates = await Coupon.find(
    { ...baseFilter, isHidden: { $ne: true } },
    LIST_FIELDS,
  ).lean();

  // Product-gated coupons only appear once their required product is
  // actually in the cart — this IS the "coupon enable hua" moment: it's
  // invisible before, newly listed after. Real re-validation still happens
  // at apply/charge time regardless (validateNewCoupon), this is purely the
  // discovery/listing surface.
  let visible = candidates.filter(
    (c) => couponAudienceOk(c, { isLoggedIn, identifiers }) && couponProductGateOk(c, effectiveCartProductIds),
  );

  // A signed-in customer who has used a coupon up to its per-customer limit
  // should not be offered it again.
  if (userId && visible.length) {
    const used = await usedByUser(userId, visible.map((c) => c.couponId));
    visible = visible.filter((c) => !(c.maxUsesPerUser && (used.get(c.couponId) || 0) >= c.maxUsesPerUser));
  }

  // Legacy waitlist-only coupons retired — all coupons now come from the new model above.
  return { statusCode: 200, message: "activeCouponCodeList", data: visible.map((c) => toListItem(c)), success: true };
};

// validateNewCoupon is exported so the Magic Checkout apply-coupon callback can reuse
// the exact same eligibility rules (per-user caps, TARGETED assignment, MEMBERS_ONLY,
// validity window, min-cart) without going through the cart-mutating apply service.
export { usedByUser, getUserCouponIdentity, applyCouponCodeService, getAllCouponCodeService, validateNewCoupon, couponProductGateOk, couponAudienceOk };
