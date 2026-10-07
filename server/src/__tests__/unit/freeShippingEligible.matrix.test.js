/**
 * Regression + combination matrix for isFreeShippingEligible
 * (utils/freeShippingOffer.util.js).
 *
 * Bug this guards against: the function used to check only PRODUCT
 * PRESENCE in the cart (ids.has(productId)), never comparing against a
 * condition's minQuantity or variantSku — so a "2+ Brake Caliper Lamps"
 * rule incorrectly unlocked free shipping with just 1 Lamp in the cart.
 *
 * getActivePromotionsAsCartRules() is mocked directly (no DB) — this is
 * NOT an integration test against real data; it exercises every realistic
 * condition shape an admin could configure, in isolation, so this one
 * function can never silently drift from the quantity/variant-aware
 * convention every other evaluator (cartRule.util.js, promotionEngine.util.js)
 * already follows.
 */
import { jest } from "@jest/globals";

const mockGetActivePromotionsAsCartRules = jest.fn();

jest.unstable_mockModule("../../utils/promotionToCartRule.adapter.js", () => ({
  getActivePromotionsAsCartRules: mockGetActivePromotionsAsCartRules,
}));
jest.unstable_mockModule("../../model/product.model.js", () => ({ default: {} }));
jest.unstable_mockModule("../../model/promotion.model.js", () => ({ default: {} }));

const { isFreeShippingEligible } = await import("../../utils/freeShippingOffer.util.js");

const LAMP = "019da690-729b-7428-8ae1-0273f030d2a8"; // same product from the real bug report
const PEN_STAND = "019cc7d5-43a9-7c24-a024-e724e6164115";
const STAND_DOUBLE_SKU = "ANIKSTDBLS";
const STAND_SINGLE_SKU = "ANIKSTDSGL";

const twoLampRule = {
  _id: "rule-2-lamps",
  name: "2+ Brake Caliper Lamps — Free Shipping",
  effects: [{ type: "free_shipping" }],
  conditions: [{ productId: LAMP, minQuantity: 2 }],
};

const comboRule = {
  _id: "rule-combo",
  name: "Lamp + Pen Stand Combo — Free Shipping",
  effects: [{ type: "free_shipping" }],
  conditions: [
    { productId: LAMP, minQuantity: 1 },
    { productId: PEN_STAND, minQuantity: 1 },
  ],
};

const variantScopedRule = {
  _id: "rule-variant",
  name: "2+ Double Stand (specific variant) — Free Shipping",
  effects: [{ type: "free_shipping" }],
  conditions: [{ productId: PEN_STAND, minQuantity: 2, variantSku: STAND_DOUBLE_SKU }],
};

const discountOnlyRule = {
  _id: "rule-discount-only",
  name: "50% off Lamp (no free shipping)",
  effects: [{ type: "percent_off", targetProductId: LAMP, value: 50 }],
  conditions: [{ productId: LAMP, minQuantity: 1 }],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("isFreeShippingEligible — quantity threshold", () => {
  test("below minQuantity (1 Lamp, needs 2) → NOT eligible — the exact reported bug", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([twoLampRule]);
    const eligible = await isFreeShippingEligible([{ productId: LAMP, quantity: 1 }]);
    expect(eligible).toBe(false);
  });

  test("exactly at minQuantity (2 Lamps) → eligible", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([twoLampRule]);
    const eligible = await isFreeShippingEligible([{ productId: LAMP, quantity: 2 }]);
    expect(eligible).toBe(true);
  });

  test("above minQuantity (3 Lamps) → eligible", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([twoLampRule]);
    const eligible = await isFreeShippingEligible([{ productId: LAMP, quantity: 3 }]);
    expect(eligible).toBe(true);
  });

  test("quantity split across multiple cart lines for the same product sums correctly (1+1=2)", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([twoLampRule]);
    const eligible = await isFreeShippingEligible([
      { productId: LAMP, quantity: 1 },
      { productId: LAMP, quantity: 1 },
    ]);
    expect(eligible).toBe(true);
  });

  test("empty cart → not eligible", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([twoLampRule]);
    expect(await isFreeShippingEligible([])).toBe(false);
  });

  test("wrong product entirely in cart → not eligible", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([twoLampRule]);
    const eligible = await isFreeShippingEligible([{ productId: PEN_STAND, quantity: 5 }]);
    expect(eligible).toBe(false);
  });

  test("no active rules at all → not eligible", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([]);
    const eligible = await isFreeShippingEligible([{ productId: LAMP, quantity: 10 }]);
    expect(eligible).toBe(false);
  });
});

describe("isFreeShippingEligible — multi-condition AND (combo rule)", () => {
  test("only one of two required products in cart → not eligible", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([comboRule]);
    const eligible = await isFreeShippingEligible([{ productId: LAMP, quantity: 1 }]);
    expect(eligible).toBe(false);
  });

  test("both required products present at their own minQuantity → eligible", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([comboRule]);
    const eligible = await isFreeShippingEligible([
      { productId: LAMP, quantity: 1 },
      { productId: PEN_STAND, quantity: 1 },
    ]);
    expect(eligible).toBe(true);
  });
});

describe("isFreeShippingEligible — variant-scoped condition", () => {
  test("required quantity met but on the WRONG variant → not eligible", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([variantScopedRule]);
    const eligible = await isFreeShippingEligible([
      { productId: PEN_STAND, quantity: 2, variantSku: STAND_SINGLE_SKU },
    ]);
    expect(eligible).toBe(false);
  });

  test("required quantity met on the correct variant → eligible", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([variantScopedRule]);
    const eligible = await isFreeShippingEligible([
      { productId: PEN_STAND, quantity: 2, variantSku: STAND_DOUBLE_SKU },
    ]);
    expect(eligible).toBe(true);
  });

  test("quantity split as 1 correct-variant + 1 other-variant does NOT satisfy a variant-scoped minQuantity:2", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([variantScopedRule]);
    const eligible = await isFreeShippingEligible([
      { productId: PEN_STAND, quantity: 1, variantSku: STAND_DOUBLE_SKU },
      { productId: PEN_STAND, quantity: 1, variantSku: STAND_SINGLE_SKU },
    ]);
    expect(eligible).toBe(false);
  });

  test("no variantSku resolved for the cart line against a variant-scoped rule → not eligible (never guess)", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([variantScopedRule]);
    const eligible = await isFreeShippingEligible([{ productId: PEN_STAND, quantity: 5 }]);
    expect(eligible).toBe(false);
  });
});

describe("isFreeShippingEligible — effect-type gating", () => {
  test("a rule matched on quantity but whose effect is NOT free_shipping never counts", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([discountOnlyRule]);
    const eligible = await isFreeShippingEligible([{ productId: LAMP, quantity: 5 }]);
    expect(eligible).toBe(false);
  });

  test("multiple active rules — only the free_shipping one needs to match", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([discountOnlyRule, twoLampRule]);
    const eligible = await isFreeShippingEligible([{ productId: LAMP, quantity: 2 }]);
    expect(eligible).toBe(true);
  });
});

describe("isFreeShippingEligible — backward-compatible bare-ID input", () => {
  test("a single bare productId string defaults to quantity 1 — below minQuantity:2, not eligible", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([twoLampRule]);
    expect(await isFreeShippingEligible([LAMP])).toBe(false);
  });

  test("the same bare productId repeated twice sums to quantity 2 — meets minQuantity:2, eligible", async () => {
    mockGetActivePromotionsAsCartRules.mockResolvedValue([twoLampRule]);
    expect(await isFreeShippingEligible([LAMP, LAMP])).toBe(true);
  });
});
