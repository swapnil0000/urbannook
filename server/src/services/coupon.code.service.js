import Coupon from "../model/coupon.model.js";
import CouponUsage from "../model/couponUsage.model.js";
import { getCartService } from "../services/user.cart.service.js";
import Cart from "../model/user.cart.model.js";
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

// cartProductTotal = product subtotal only — discount applies to products, not shipping (industry standard)
// isLoggedIn: true for authenticated users; false/undefined for guests
async function validateNewCoupon({ coupon, cartProductTotal, email, mobile, isLoggedIn }) {
  const tag = "[Coupon:Storefront]";
  const now = new Date();

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
  if (coupon.maxTotalUses != null && coupon.usageCount >= coupon.maxTotalUses) {
    console.log(`${tag} REJECT "${coupon.code}" — global cap reached (${coupon.usageCount}/${coupon.maxTotalUses})`);
    throw new ValidationError("This coupon has reached its maximum number of uses.");
  }

  const normEmail  = normalizeEmail(email);
  const normMobile = normalizeMobile(mobile);
  const identifiers = [normEmail, normMobile].filter(Boolean);

  // Internal test coupons skip only the TARGETED single-use (usedAt) gate, so an assigned
  // team member can redeem repeatedly. Their per-user limit is still enforced below via
  // maxUsesPerUser (blank/null = unlimited).
  const skipSingleUseGate = isValidInternal;

  // Per-user cap — enforced whenever a maxUsesPerUser limit is set (null = unlimited).
  if (identifiers.length > 0 && coupon.maxUsesPerUser) {
    const priorCount = await CouponUsage.countDocuments({
      couponId: coupon.couponId,
      $or: [
        ...(normEmail  ? [{ email:  normEmail  }] : []),
        ...(normMobile ? [{ mobile: normMobile }] : []),
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

    // throws ValidationError/NotFoundError on any failure
    const discountAmount = await validateNewCoupon({
      coupon: newCoupon,
      cartProductTotal: cartSubtotal,
      email,
      mobile,
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

const getAllCouponCodeService = async ({ userId, code }) => {
  // ── Single-coupon lookup by exact code (used by guests typing a code manually) ──
  // Lets the storefront show the correct discount for HIDDEN coupons without listing them.
  // Only returns a coupon if the exact code is known — hidden coupons never appear in the
  // general list below. Server still fully re-validates at order creation.
  if (code) {
    const cleanCode = String(code).trim().toUpperCase();
    const one = await Coupon.findOne(
      {
        code: cleanCode,
        scope: "PUBLIC",
        audience: { $ne: "MEMBERS_ONLY" },
        isActive: true,
        isArchived: false,
        isTest: false, // testing/internal coupons stay invisible; isHidden is intentionally NOT filtered
      },
      { couponId: 1, code: 1, title: 1, notes: 1, discountType: 1, discountValue: 1, maxDiscountCap: 1, minCartValue: 1, validUntil: 1 },
    ).lean();

    const data = one
      ? [{
          id:            one.couponId,
          code:          one.code,
          title:         one.title || one.code,
          description:   one.notes || null,
          discountType:  one.discountType,
          discountValue: one.discountValue || 0,
          maxDiscountCap: one.maxDiscountCap || null,
          minCartValue:  one.minCartValue || 0,
          validUntil:    one.validUntil || null,
        }]
      : [];

    return { statusCode: 200, message: "couponLookup", data, success: true };
  }

  const results = [];

  // 1. New-model PUBLIC + EVERYONE coupons — always visible, no login required.
  // Match audience:"EVERYONE" OR no audience field at all (coupons created before the field was added).
  // Exclude audience:"MEMBERS_ONLY" which requires a logged-in account.
  const newCoupons = await Coupon.find(
    { scope: "PUBLIC", audience: { $ne: "MEMBERS_ONLY" }, isActive: true, isArchived: false, isTest: false, isHidden: { $ne: true } },
    { couponId: 1, code: 1, title: 1, notes: 1, discountType: 1, discountValue: 1, maxDiscountCap: 1, minCartValue: 1, validUntil: 1 },
  ).lean();

  for (const c of newCoupons) {
    results.push({
      id:            c.couponId,
      code:          c.code,
      title:         c.title || c.code,
      description:   c.notes || null,
      discountType:  c.discountType,   // "PERCENTAGE" | "FLAT"
      discountValue: c.discountValue || 0,
      maxDiscountCap: c.maxDiscountCap || null,
      minCartValue:  c.minCartValue || 0,
      validUntil:    c.validUntil || null,
    });
  }

  // Legacy waitlist-only coupons retired — all coupons now come from the new model above.

  return { statusCode: 200, message: "activeCouponCodeList", data: results, success: true };
};

export { applyCouponCodeService, getAllCouponCodeService };
