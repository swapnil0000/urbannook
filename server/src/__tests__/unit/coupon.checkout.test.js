/**
 * Unit tests: Coupon checkout flows — logged-in + guest, prepaid + COD
 *
 * Tests pure business logic extracted from:
 *   - coupon.code.service.js  → validateNewCoupon, calculateDiscount
 *   - rp.payment.controller.js → Razorpay amount formula (prepaid & COD)
 *
 * No DB, no network — all mocks.
 */

// ── Helpers mirroring service/controller logic exactly ───────────────────────

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
  if (coupon.discountType === "INTERNAL_TEST") return 0;
  let amount;
  if (coupon.discountType === "PERCENTAGE") {
    amount = Math.floor((cartProductTotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountCap) amount = Math.min(amount, coupon.maxDiscountCap);
  } else {
    amount = coupon.discountValue;
  }
  return Math.min(amount, cartProductTotal);
}

// Mirrors the Razorpay amount formula in both controllers (guest + auth)
function getRazorpayAmountPaise({ subtotal, shipping, discount, isInternalTest, paymentMethod }) {
  const finalAmount = isInternalTest ? 1 : Math.max(subtotal + shipping - discount, 0);
  const isCOD = paymentMethod === "COD";
  const codPartial = isCOD ? Math.min(Math.ceil(shipping) * 2, Math.ceil(finalAmount)) : 0;
  const razorpayCharge = isCOD ? codPartial : finalAmount;
  return Math.ceil(razorpayCharge) * 100; // paise
}

// Mirrors validateNewCoupon (synchronous portion — per-user DB checks excluded)
function validateCouponSync({ coupon, cartProductTotal, isLoggedIn }) {
  const now = new Date();

  if (!coupon.isActive) throw new Error("This coupon is not currently active.");
  if (coupon.audience === "MEMBERS_ONLY" && !isLoggedIn)
    throw new Error("This coupon is only available for registered members. Please sign in to use it.");

  const isValidInternal = coupon.isInternal && coupon.discountType === "INTERNAL_TEST";
  if (coupon.isTest && !isValidInternal) throw new Error("Invalid or inactive coupon");
  if (coupon.isInternal && !isValidInternal) throw new Error("Invalid or inactive coupon");
  if (isValidInternal && coupon.scope !== "TARGETED")
    throw new Error("This coupon is restricted. Contact admin.");

  if (coupon.validFrom && now < new Date(coupon.validFrom)) throw new Error("This coupon is not valid yet.");
  if (coupon.validUntil && now > new Date(coupon.validUntil)) throw new Error("This coupon has expired.");
  if (cartProductTotal < (coupon.minCartValue || 0))
    throw new Error(`Minimum order of ₹${coupon.minCartValue} required for this coupon`);
  if (coupon.maxTotalUses != null && coupon.usageCount >= coupon.maxTotalUses)
    throw new Error("This coupon has reached its maximum number of uses.");
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_COUPON = {
  couponId: "cpn_001",
  code: "SAVE20",
  discountType: "PERCENTAGE",
  discountValue: 20,
  maxDiscountCap: 200,
  minCartValue: 299,
  isActive: true,
  isArchived: false,
  isTest: false,
  isInternal: false,
  audience: "EVERYONE",
  scope: "PUBLIC",
  usageCount: 0,
  maxTotalUses: null,
  maxUsesPerUser: 1,
  validFrom: null,
  validUntil: null,
  assignedTo: [],
};

const FLAT_COUPON = {
  ...BASE_COUPON,
  couponId: "cpn_002",
  code: "FLAT100",
  discountType: "FLAT",
  discountValue: 100,
  maxDiscountCap: null,
  minCartValue: 499,
};

// ── 1. Discount calculation ───────────────────────────────────────────────────

describe("calculateDiscount", () => {
  test("PERCENTAGE: applies percentage and floors", () => {
    expect(calculateDiscount({ ...BASE_COUPON }, 1000)).toBe(200); // 20% of 1000 = 200, cap 200 ✓
  });

  test("PERCENTAGE: capped by maxDiscountCap", () => {
    expect(calculateDiscount({ ...BASE_COUPON }, 2000)).toBe(200); // 20% of 2000 = 400, capped at 200
  });

  test("PERCENTAGE: no cap — uses full percentage", () => {
    const c = { ...BASE_COUPON, maxDiscountCap: null };
    expect(calculateDiscount(c, 500)).toBe(100); // 20% of 500 = 100
  });

  test("FLAT: returns fixed amount", () => {
    expect(calculateDiscount(FLAT_COUPON, 1000)).toBe(100);
  });

  test("FLAT: never exceeds cart total", () => {
    const c = { ...FLAT_COUPON, discountValue: 600 };
    expect(calculateDiscount(c, 500)).toBe(500); // capped at cartTotal
  });

  test("INTERNAL_TEST: always returns 0 (payment controller sets ₹1 total)", () => {
    const c = { ...BASE_COUPON, discountType: "INTERNAL_TEST" };
    expect(calculateDiscount(c, 5000)).toBe(0);
  });
});

// ── 2. Razorpay amount — prepaid ─────────────────────────────────────────────

describe("Razorpay amount — PREPAID", () => {
  test("no coupon: subtotal + shipping × 100 paise", () => {
    expect(getRazorpayAmountPaise({ subtotal: 349, shipping: 78, discount: 0, isInternalTest: false, paymentMethod: "PREPAID" }))
      .toBe(42700); // 427 × 100
  });

  test("PERCENTAGE coupon applied: (subtotal + shipping - discount) × 100", () => {
    // 20% of 1000 = 200, cap 200 → discount 200
    expect(getRazorpayAmountPaise({ subtotal: 1000, shipping: 100, discount: 200, isInternalTest: false, paymentMethod: "PREPAID" }))
      .toBe(90000); // 900 × 100
  });

  test("FLAT coupon applied", () => {
    expect(getRazorpayAmountPaise({ subtotal: 800, shipping: 79, discount: 100, isInternalTest: false, paymentMethod: "PREPAID" }))
      .toBe(77900); // 779 × 100
  });

  test("formula floors at 0 if discount exceeds subtotal+shipping (calculateDiscount prevents this in practice)", () => {
    // In real flow: calculateDiscount caps discount at cartProductTotal (100), so this scenario can't happen.
    // This test verifies the formula itself is safe: max(100+79-500, 0) = 0 → 0 paise
    expect(getRazorpayAmountPaise({ subtotal: 100, shipping: 79, discount: 500, isInternalTest: false, paymentMethod: "PREPAID" }))
      .toBe(0);
  });

  test("INTERNAL_TEST coupon: Razorpay amount is ₹1 = 100 paise", () => {
    expect(getRazorpayAmountPaise({ subtotal: 5000, shipping: 79, discount: 0, isInternalTest: true, paymentMethod: "PREPAID" }))
      .toBe(100);
  });
});

// ── 3. Razorpay amount — COD ──────────────────────────────────────────────────

describe("Razorpay amount — COD (advance = 2× shipping)", () => {
  test("no coupon: COD advance = 2 × shipping × 100", () => {
    // shipping = 78 → advance = 156, finalAmount = 349+78 = 427, min(156,427)=156
    expect(getRazorpayAmountPaise({ subtotal: 349, shipping: 78, discount: 0, isInternalTest: false, paymentMethod: "COD" }))
      .toBe(15600); // 156 × 100
  });

  test("coupon applied — COD advance uses discounted finalAmount", () => {
    // subtotal=1000, shipping=100, discount=200 → finalAmount=900
    // COD advance = min(2×100, 900) = min(200,900) = 200
    expect(getRazorpayAmountPaise({ subtotal: 1000, shipping: 100, discount: 200, isInternalTest: false, paymentMethod: "COD" }))
      .toBe(20000); // 200 × 100
  });

  test("COD advance capped at finalAmount when shipping is very high", () => {
    // shipping=300, finalAmount=50 → advance = min(600,50) = 50
    expect(getRazorpayAmountPaise({ subtotal: 100, shipping: 300, discount: 350, isInternalTest: false, paymentMethod: "COD" }))
      .toBe(5000); // max(100+300-350,0)=50 → min(600,50)=50 × 100
  });

  test("INTERNAL_TEST + COD: advance is min(2×shipping, 1) = 1 paise edge (floors to 1)", () => {
    // finalAmount=1, shipping=79 → advance = min(158, 1) = 1
    expect(getRazorpayAmountPaise({ subtotal: 5000, shipping: 79, discount: 0, isInternalTest: true, paymentMethod: "COD" }))
      .toBe(100); // 1 × 100 — Razorpay minimum is 1 rupee
  });
});

// ── 4. validateCouponSync — active/inactive/test/internal checks ──────────────

describe("validateCouponSync — basic coupon state", () => {
  test("valid active PUBLIC/EVERYONE coupon passes for both guest and member", () => {
    expect(() => validateCouponSync({ coupon: BASE_COUPON, cartProductTotal: 500, isLoggedIn: false })).not.toThrow();
    expect(() => validateCouponSync({ coupon: BASE_COUPON, cartProductTotal: 500, isLoggedIn: true })).not.toThrow();
  });

  test("inactive coupon rejected", () => {
    const c = { ...BASE_COUPON, isActive: false };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: true }))
      .toThrow("not currently active");
  });

  test("isTest coupon rejected for storefront (non-INTERNAL_TEST)", () => {
    const c = { ...BASE_COUPON, isTest: true };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: true }))
      .toThrow("Invalid or inactive coupon");
  });

  test("paused coupon (isActive=false) rejected even if not expired", () => {
    const c = { ...BASE_COUPON, isActive: false, validUntil: null };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: true }))
      .toThrow("not currently active");
  });

  test("INTERNAL_TEST + isTest passes for TARGETED coupon (admin test order flow)", () => {
    const c = { ...BASE_COUPON, isTest: true, isInternal: true, discountType: "INTERNAL_TEST", scope: "TARGETED" };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: true })).not.toThrow();
  });

  test("INTERNAL_TEST on PUBLIC scope rejected (security: ₹1 order for everyone is a risk)", () => {
    const c = { ...BASE_COUPON, isTest: true, isInternal: true, discountType: "INTERNAL_TEST", scope: "PUBLIC" };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: true }))
      .toThrow("restricted");
  });

  test("isInternal=true but discountType is not INTERNAL_TEST → data corruption → rejected", () => {
    const c = { ...BASE_COUPON, isInternal: true, discountType: "PERCENTAGE" };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: true }))
      .toThrow("Invalid or inactive coupon");
  });
});

// ── 5. validateCouponSync — MEMBERS_ONLY audience ────────────────────────────

describe("validateCouponSync — MEMBERS_ONLY audience", () => {
  const memberCoupon = { ...BASE_COUPON, audience: "MEMBERS_ONLY" };

  test("MEMBERS_ONLY rejected for guest (isLoggedIn=false)", () => {
    expect(() => validateCouponSync({ coupon: memberCoupon, cartProductTotal: 500, isLoggedIn: false }))
      .toThrow("registered members");
  });

  test("MEMBERS_ONLY accepted for logged-in user", () => {
    expect(() => validateCouponSync({ coupon: memberCoupon, cartProductTotal: 500, isLoggedIn: true }))
      .not.toThrow();
  });

  test("EVERYONE audience accepted for guest", () => {
    const c = { ...BASE_COUPON, audience: "EVERYONE" };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: false })).not.toThrow();
  });

  test("no audience field (old coupon) accepted for guest — backward compat", () => {
    const c = { ...BASE_COUPON };
    delete c.audience; // simulate old coupon without the field
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: false })).not.toThrow();
  });
});

// ── 6. validateCouponSync — expiry / validity window ────────────────────────

describe("validateCouponSync — validity window", () => {
  test("expired coupon rejected", () => {
    const c = { ...BASE_COUPON, validUntil: new Date(Date.now() - 86400000).toISOString() }; // yesterday
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: true }))
      .toThrow("expired");
  });

  test("not-yet-started coupon rejected", () => {
    const c = { ...BASE_COUPON, validFrom: new Date(Date.now() + 86400000).toISOString() }; // tomorrow
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: true }))
      .toThrow("not valid yet");
  });

  test("coupon within validity window passes", () => {
    const c = {
      ...BASE_COUPON,
      validFrom: new Date(Date.now() - 86400000).toISOString(),  // yesterday
      validUntil: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: true })).not.toThrow();
  });

  test("null validFrom and validUntil means no time restriction", () => {
    const c = { ...BASE_COUPON, validFrom: null, validUntil: null };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: true })).not.toThrow();
  });
});

// ── 7. validateCouponSync — min cart value ───────────────────────────────────

describe("validateCouponSync — minimum cart value", () => {
  test("cart below minimum rejected", () => {
    expect(() => validateCouponSync({ coupon: BASE_COUPON, cartProductTotal: 100, isLoggedIn: true }))
      .toThrow("Minimum order of ₹299 required");
  });

  test("cart exactly at minimum accepted", () => {
    expect(() => validateCouponSync({ coupon: BASE_COUPON, cartProductTotal: 299, isLoggedIn: true })).not.toThrow();
  });

  test("cart above minimum accepted", () => {
    expect(() => validateCouponSync({ coupon: BASE_COUPON, cartProductTotal: 1000, isLoggedIn: true })).not.toThrow();
  });

  test("no minimum (minCartValue=0) accepts any cart value", () => {
    const c = { ...BASE_COUPON, minCartValue: 0 };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 1, isLoggedIn: true })).not.toThrow();
  });
});

// ── 8. validateCouponSync — global usage cap ─────────────────────────────────

describe("validateCouponSync — global usage cap", () => {
  test("coupon at max uses rejected", () => {
    const c = { ...BASE_COUPON, maxTotalUses: 100, usageCount: 100 };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: true }))
      .toThrow("maximum number of uses");
  });

  test("coupon one below cap accepted", () => {
    const c = { ...BASE_COUPON, maxTotalUses: 100, usageCount: 99 };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: true })).not.toThrow();
  });

  test("null maxTotalUses means unlimited", () => {
    const c = { ...BASE_COUPON, maxTotalUses: null, usageCount: 999999 };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 500, isLoggedIn: true })).not.toThrow();
  });
});

// ── 9. Identity normalizers ───────────────────────────────────────────────────

describe("normalizeMobile", () => {
  test("strips country code +91", () => expect(normalizeMobile("+919712345678")).toBe("9712345678"));
  test("strips 91 prefix", () => expect(normalizeMobile("919712345678")).toBe("9712345678"));
  test("10-digit already clean", () => expect(normalizeMobile("9712345678")).toBe("9712345678"));
  test("null returns null", () => expect(normalizeMobile(null)).toBeNull());
  test("short number returns null", () => expect(normalizeMobile("12345")).toBeNull());
  test("strips spaces and dashes", () => expect(normalizeMobile("97 1234-5678")).toBe("9712345678"));
});

describe("normalizeEmail", () => {
  test("lowercases and trims", () => expect(normalizeEmail("  USER@EXAMPLE.COM  ")).toBe("user@example.com"));
  test("null returns null", () => expect(normalizeEmail(null)).toBeNull());
  test("no @ symbol returns null", () => expect(normalizeEmail("notanemail")).toBeNull());
  test("valid email passes through", () => expect(normalizeEmail("test@urbannook.in")).toBe("test@urbannook.in"));
});

// ── 10. End-to-end scenarios (discount + Razorpay amount together) ─────────────

describe("Full checkout scenarios — discount + Razorpay amount", () => {
  const SHIPPING = 79;

  test("Logged-in, PERCENTAGE coupon, PREPAID: correct Razorpay amount", () => {
    const subtotal = 1000;
    const coupon = BASE_COUPON; // 20% off, cap ₹200
    validateCouponSync({ coupon, cartProductTotal: subtotal, isLoggedIn: true });
    const discount = calculateDiscount(coupon, subtotal); // 200
    const paise = getRazorpayAmountPaise({ subtotal, shipping: SHIPPING, discount, isInternalTest: false, paymentMethod: "PREPAID" });
    expect(discount).toBe(200);
    expect(paise).toBe((1000 + 79 - 200) * 100); // 879 × 100
  });

  test("Logged-in, FLAT coupon, PREPAID: correct Razorpay amount", () => {
    const subtotal = 800;
    validateCouponSync({ coupon: FLAT_COUPON, cartProductTotal: subtotal, isLoggedIn: true });
    const discount = calculateDiscount(FLAT_COUPON, subtotal); // 100
    const paise = getRazorpayAmountPaise({ subtotal, shipping: SHIPPING, discount, isInternalTest: false, paymentMethod: "PREPAID" });
    expect(discount).toBe(100);
    expect(paise).toBe((800 + 79 - 100) * 100); // 779 × 100
  });

  test("Logged-in, PERCENTAGE coupon, COD: advance = min(2×shipping, discountedTotal)", () => {
    const subtotal = 1000;
    validateCouponSync({ coupon: BASE_COUPON, cartProductTotal: subtotal, isLoggedIn: true });
    const discount = calculateDiscount(BASE_COUPON, subtotal); // 200
    const paise = getRazorpayAmountPaise({ subtotal, shipping: SHIPPING, discount, isInternalTest: false, paymentMethod: "COD" });
    // finalAmount = 1000+79-200 = 879, advance = min(2×79, 879) = min(158,879) = 158
    expect(paise).toBe(158 * 100);
  });

  test("Guest, EVERYONE coupon, PREPAID: same discount and amount as logged-in", () => {
    const subtotal = 1000;
    validateCouponSync({ coupon: BASE_COUPON, cartProductTotal: subtotal, isLoggedIn: false }); // guest passes
    const discount = calculateDiscount(BASE_COUPON, subtotal);
    const paise = getRazorpayAmountPaise({ subtotal, shipping: SHIPPING, discount, isInternalTest: false, paymentMethod: "PREPAID" });
    expect(discount).toBe(200);
    expect(paise).toBe((1000 + 79 - 200) * 100);
  });

  test("Guest, EVERYONE coupon, COD: same advance as logged-in", () => {
    const subtotal = 1000;
    validateCouponSync({ coupon: BASE_COUPON, cartProductTotal: subtotal, isLoggedIn: false });
    const discount = calculateDiscount(BASE_COUPON, subtotal);
    const paise = getRazorpayAmountPaise({ subtotal, shipping: SHIPPING, discount, isInternalTest: false, paymentMethod: "COD" });
    expect(paise).toBe(158 * 100); // same as logged-in COD test above
  });

  test("Guest blocked from MEMBERS_ONLY coupon — cannot reach Razorpay", () => {
    const c = { ...BASE_COUPON, audience: "MEMBERS_ONLY" };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 1000, isLoggedIn: false }))
      .toThrow("registered members");
  });

  test("No coupon, PREPAID: full amount charged", () => {
    const subtotal = 349;
    const paise = getRazorpayAmountPaise({ subtotal, shipping: 78, discount: 0, isInternalTest: false, paymentMethod: "PREPAID" });
    expect(paise).toBe(42700); // 427 × 100
  });

  test("No coupon, COD: advance = 2 × shipping", () => {
    const paise = getRazorpayAmountPaise({ subtotal: 349, shipping: 78, discount: 0, isInternalTest: false, paymentMethod: "COD" });
    expect(paise).toBe(15600); // 156 × 100
  });

  test("INTERNAL_TEST coupon, PREPAID: Razorpay gets ₹1 regardless of cart size", () => {
    const c = { ...BASE_COUPON, isTest: true, isInternal: true, discountType: "INTERNAL_TEST", scope: "TARGETED" };
    validateCouponSync({ coupon: c, cartProductTotal: 5000, isLoggedIn: true });
    const paise = getRazorpayAmountPaise({ subtotal: 5000, shipping: SHIPPING, discount: 0, isInternalTest: true, paymentMethod: "PREPAID" });
    expect(paise).toBe(100); // ₹1 = 100 paise
  });

  test("expired coupon blocked before Razorpay call — no wrong amount sent", () => {
    const c = { ...BASE_COUPON, validUntil: new Date(Date.now() - 86400000).toISOString() };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 1000, isLoggedIn: true }))
      .toThrow("expired");
    // If we reach here the controller would throw → Razorpay never called
  });

  test("min cart not met — blocked before Razorpay call", () => {
    expect(() => validateCouponSync({ coupon: BASE_COUPON, cartProductTotal: 100, isLoggedIn: true }))
      .toThrow("Minimum order");
  });

  test("global cap reached — blocked before Razorpay call", () => {
    const c = { ...BASE_COUPON, maxTotalUses: 50, usageCount: 50 };
    expect(() => validateCouponSync({ coupon: c, cartProductTotal: 1000, isLoggedIn: true }))
      .toThrow("maximum number of uses");
  });
});
