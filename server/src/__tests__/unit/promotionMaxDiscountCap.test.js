import {
  buildMaxDiscountAmountMap,
  clampCapToDiscountBudget,
  clampOrderDiscountToBudget,
} from "../../utils/promotionEngine.util.js";

/**
 * Regression tests for Phase 4 (Admin Offer Control System) —
 * Promotion.maxDiscountAmount: the max ₹ a single promotion can grant
 * across a whole order. These are focused unit tests on the pure clamp
 * helpers (the actual wiring into rp.payment.controller.js's per-item and
 * order-level discount loops is integration-level and harder to unit test
 * in isolation, but is a thin, direct pass-through of these functions).
 */

describe("buildMaxDiscountAmountMap", () => {
  test("maps promotionId -> maxDiscountAmount, defaulting to null when unset", () => {
    const map = buildMaxDiscountAmountMap([
      { _id: "p1", maxDiscountAmount: 100 },
      { _id: "p2" },
    ]);
    expect(map.get("p1")).toBe(100);
    expect(map.get("p2")).toBe(null);
  });

  test("handles an empty/undefined list without throwing", () => {
    expect(buildMaxDiscountAmountMap([]).size).toBe(0);
    expect(buildMaxDiscountAmountMap(undefined).size).toBe(0);
  });
});

describe("clampCapToDiscountBudget", () => {
  test("no-op when the promotion has no maxDiscountAmount set (every existing promotion today)", () => {
    const maxMap = new Map([["p1", null]]);
    const spent = new Map();
    expect(clampCapToDiscountBudget(5, 50, "p1", spent, maxMap)).toBe(5);
  });

  test("clamps the unit cap down to however many units the remaining budget affords", () => {
    const maxMap = new Map([["p1", 120]]); // ₹120 total budget
    const spent = new Map(); // nothing spent yet
    // perUnitDiscount = 50 → floor(120/50) = 2 affordable units, even though
    // the natural cap (from the condition) would allow 5.
    expect(clampCapToDiscountBudget(5, 50, "p1", spent, maxMap)).toBe(2);
  });

  test("accounts for what this promotion has already spent elsewhere in the same order", () => {
    const maxMap = new Map([["p1", 120]]);
    const spent = new Map([["p1", 100]]); // only ₹20 left
    // perUnitDiscount = 50 → floor(20/50) = 0 affordable units left.
    expect(clampCapToDiscountBudget(5, 50, "p1", spent, maxMap)).toBe(0);
  });

  test("never raises the cap above the natural cap even with a huge budget", () => {
    const maxMap = new Map([["p1", 100000]]);
    const spent = new Map();
    expect(clampCapToDiscountBudget(3, 10, "p1", spent, maxMap)).toBe(3);
  });
});

describe("clampOrderDiscountToBudget", () => {
  test("no-op when unset", () => {
    const maxMap = new Map([["p1", null]]);
    expect(clampOrderDiscountToBudget(500, "p1", new Map(), maxMap)).toBe(500);
  });

  test("clamps an order-level discount amount to the remaining budget", () => {
    const maxMap = new Map([["p1", 300]]);
    const spent = new Map([["p1", 250]]); // only ₹50 left
    expect(clampOrderDiscountToBudget(500, "p1", spent, maxMap)).toBe(50);
  });

  test("never goes negative when already fully spent", () => {
    const maxMap = new Map([["p1", 100]]);
    const spent = new Map([["p1", 150]]); // over-spent via a prior product-level discount
    expect(clampOrderDiscountToBudget(200, "p1", spent, maxMap)).toBe(0);
  });
});
