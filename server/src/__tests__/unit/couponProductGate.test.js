import { couponProductGateOk, validateNewCoupon } from "../../services/coupon.code.service.js";

/**
 * Regression tests for Coupon.eligibleProductIds — added 2026-10-10 so a
 * coupon can be restricted to only apply while a specific product is in the
 * cart. These test the REAL functions from coupon.code.service.js (not a
 * mirrored copy) since the gate itself is the thing most worth getting
 * exactly right: a silent no-op here would mean a coupon an admin believes
 * is restricted actually isn't (the exact trap flagged in the 2026-10-10
 * capability audit).
 */

describe("couponProductGateOk — the gate itself", () => {
  test("no eligibleProductIds set (undefined) — always ok, matches today's behavior for every existing coupon", () => {
    expect(couponProductGateOk({}, [])).toBe(true);
    expect(couponProductGateOk({}, ["any-product"])).toBe(true);
  });

  test("empty eligibleProductIds array — always ok, same as unset", () => {
    expect(couponProductGateOk({ eligibleProductIds: [] }, ["some-product"])).toBe(true);
  });

  test("eligibleProductIds set, required product present — ok", () => {
    expect(couponProductGateOk({ eligibleProductIds: ["lamp-01"] }, ["lamp-01", "stand-02"])).toBe(true);
  });

  test("eligibleProductIds set, required product absent — rejected", () => {
    expect(couponProductGateOk({ eligibleProductIds: ["lamp-01"] }, ["stand-02"])).toBe(false);
    expect(couponProductGateOk({ eligibleProductIds: ["lamp-01"] }, [])).toBe(false);
  });

  test("ANY-one-present (OR) semantics when multiple eligibleProductIds are set", () => {
    const coupon = { eligibleProductIds: ["lamp-01", "stand-02"] };
    expect(couponProductGateOk(coupon, ["stand-02"])).toBe(true);
    expect(couponProductGateOk(coupon, ["something-else"])).toBe(false);
  });

  test("presence-only — quantity never enters the check (2 units is the same as 1 unit, same as 0 is just absent)", () => {
    // The function only ever receives a list of distinct productIds, never
    // quantities — this test documents that this is the ENTIRE interface,
    // so there is no way for a caller to accidentally make this scale with
    // quantity. Duplicated entries change nothing.
    const coupon = { eligibleProductIds: ["lamp-01"] };
    expect(couponProductGateOk(coupon, ["lamp-01", "lamp-01", "lamp-01"])).toBe(true);
  });
});

describe("validateNewCoupon — product gate wired into the real validation sequence", () => {
  const baseCoupon = {
    code: "LAMPDEAL",
    isActive: true,
    scope: "PUBLIC",
    audience: "EVERYONE",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minCartValue: 0,
    eligibleProductIds: ["lamp-01"],
  };

  test("rejects with a clear reason when the gated product is absent, even though every other rule passes", async () => {
    await expect(
      validateNewCoupon({
        coupon: baseCoupon,
        cartProductTotal: 500,
        cartProductIds: ["stand-02"],
        isLoggedIn: false,
      }),
    ).rejects.toThrow(/requires a specific product/i);
  });

  test("succeeds once the gated product is present (other rules still apply normally)", async () => {
    const discount = await validateNewCoupon({
      coupon: baseCoupon,
      cartProductTotal: 500,
      cartProductIds: ["lamp-01"],
      isLoggedIn: false,
    });
    expect(discount).toBe(50); // 10% of 500
  });

  test("an ungated coupon (no eligibleProductIds) is completely unaffected — cartProductIds can be empty/absent", async () => {
    const ungated = { ...baseCoupon, eligibleProductIds: [] };
    const discount = await validateNewCoupon({
      coupon: ungated,
      cartProductTotal: 500,
      isLoggedIn: false,
      // cartProductIds intentionally omitted — must not throw
    });
    expect(discount).toBe(50);
  });

  test("2 units of the qualifying product grants the same discount as 1 — never scaled by quantity", async () => {
    // cartProductIds is a list of DISTINCT productIds the caller already
    // dedupes before calling (every real call site does this) — quantity
    // literally never reaches this function, so there is nothing here that
    // could scale the discount by how many units are in the cart.
    const discountWithOne = await validateNewCoupon({
      coupon: baseCoupon,
      cartProductTotal: 500,
      cartProductIds: ["lamp-01"],
      isLoggedIn: false,
    });
    const discountWithDuplicateEntries = await validateNewCoupon({
      coupon: baseCoupon,
      cartProductTotal: 500,
      cartProductIds: ["lamp-01", "lamp-01"],
      isLoggedIn: false,
    });
    expect(discountWithDuplicateEntries).toBe(discountWithOne);
  });
});
