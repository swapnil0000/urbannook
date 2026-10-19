import { evaluatePromotions, buildCartContext } from "../../utils/promotionEngine.util.js";

/**
 * Regression tests for `free_product` reward quantity scaling — added
 * 2026-10-10 (audit finding A6). Before this, crossing a "buy N get 1 free"
 * promotion's condition multiple times (e.g. 4 qualifying units on a
 * "buy 2 get 1 free" rule) still only ever granted exactly 1 free unit,
 * hardcoded, regardless of the promotion's own repeat count or
 * `maxApplications`. The fix: `freeGifts` entries now carry a `quantity`
 * (the same `cap` product-level rewards already use), and
 * rp.payment.controller.js's gift-fulfillment loop creates that many units
 * instead of always 1.
 */

const productMeta = new Map();

function ctxFor(cartItems, subtotal) {
  return buildCartContext(cartItems, { subtotal, productMeta });
}

describe("free_product reward — quantity scales with the promotion's repeat count", () => {
  test("condition satisfied exactly once (2 qualifying units, 'buy 2 get 1 free') grants quantity 1 — unchanged baseline behavior", () => {
    const promo = {
      _id: "promo-b2g1",
      isActive: true,
      priority: 0,
      conditionTree: { field: "product", productId: "lamp-01", minQuantity: 2 },
      rewards: [{ type: "free_product", targetProductId: "stand-01" }],
    };
    const cartItems = [{ productId: "lamp-01", quantity: 2, variantSku: "" }];
    const ctx = ctxFor(cartItems, 2000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    expect(result.freeGifts).toHaveLength(1);
    expect(result.freeGifts[0].quantity).toBe(1);
  });

  test("condition satisfied TWICE (4 qualifying units, same 'buy 2 get 1 free' rule) grants quantity 2 — the actual fix", () => {
    const promo = {
      _id: "promo-b2g1-x2",
      isActive: true,
      priority: 0,
      conditionTree: { field: "product", productId: "lamp-01", minQuantity: 2 },
      rewards: [{ type: "free_product", targetProductId: "stand-01" }],
    };
    const cartItems = [{ productId: "lamp-01", quantity: 4, variantSku: "" }];
    const ctx = ctxFor(cartItems, 4000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    expect(result.freeGifts).toHaveLength(1);
    expect(result.freeGifts[0].quantity).toBe(2);
  });

  test("maxApplications clamps the free quantity even when the condition qualifies more times than that", () => {
    const promo = {
      _id: "promo-b2g1-capped",
      isActive: true,
      priority: 0,
      maxApplications: 1,
      conditionTree: { field: "product", productId: "lamp-01", minQuantity: 2 },
      rewards: [{ type: "free_product", targetProductId: "stand-01" }],
    };
    // Qualifies 3x over (6 units / 2 per group) but maxApplications caps it at 1.
    const cartItems = [{ productId: "lamp-01", quantity: 6, variantSku: "" }];
    const ctx = ctxFor(cartItems, 6000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    expect(result.freeGifts[0].quantity).toBe(1);
  });

  test("a free_product gift is dropped when a DIFFERENT, higher-priority promotion already won the discount on that exact product (audit fix, 2026-10-18)", () => {
    const discountPromo = {
      _id: "promo-discount-winner",
      isActive: true,
      priority: 10,
      stackable: false,
      conditionTree: { field: "product", productId: "stand-01", minQuantity: 1 },
      rewards: [{ type: "percent_off_product", targetProductId: "stand-01", value: 15 }],
    };
    const giftPromo = {
      _id: "promo-gift-loser",
      isActive: true,
      priority: 0,
      stackable: true,
      conditionTree: { field: "product", productId: "lamp-01", minQuantity: 1 },
      rewards: [{ type: "free_product", targetProductId: "stand-01" }],
    };
    const cartItems = [
      { productId: "stand-01", quantity: 1, variantSku: "" },
      { productId: "lamp-01", quantity: 1, variantSku: "" },
    ];
    const ctx = ctxFor(cartItems, 2000);
    const result = evaluatePromotions(cartItems, ctx, [discountPromo, giftPromo]);
    // The higher-priority discount promotion wins stand-01 outright — the
    // lower-priority promotion's free gift of that SAME product must not
    // also go through, or stand-01 would be both discounted AND free.
    expect(result.freeGifts).toHaveLength(0);
    expect(result.discountCandidatesByProduct.get("stand-01")[0].ruleId).toBe("promo-discount-winner");
  });

  test("a free_product gift survives when it targets a DIFFERENT product than any competing discount", () => {
    const discountPromo = {
      _id: "promo-discount-other",
      isActive: true,
      priority: 10,
      conditionTree: { field: "product", productId: "stand-01", minQuantity: 1 },
      rewards: [{ type: "percent_off_product", targetProductId: "stand-01", value: 15 }],
    };
    const giftPromo = {
      _id: "promo-gift-unrelated",
      isActive: true,
      priority: 0,
      conditionTree: { field: "product", productId: "lamp-01", minQuantity: 1 },
      rewards: [{ type: "free_product", targetProductId: "mug-01" }],
    };
    const cartItems = [
      { productId: "stand-01", quantity: 1, variantSku: "" },
      { productId: "lamp-01", quantity: 1, variantSku: "" },
    ];
    const ctx = ctxFor(cartItems, 2000);
    const result = evaluatePromotions(cartItems, ctx, [discountPromo, giftPromo]);
    expect(result.freeGifts).toHaveLength(1);
    expect(result.freeGifts[0].targetProductId).toBe("mug-01");
  });

  test("a non-product condition (e.g. cartSubtotal) has no natural repeat count — free quantity defaults to 1, not Infinity/NaN", () => {
    const promo = {
      _id: "promo-spend-get-gift",
      isActive: true,
      priority: 0,
      conditionTree: { field: "cartSubtotal", operator: "gte", value: 500 },
      rewards: [{ type: "free_product", targetProductId: "stand-01" }],
    };
    const cartItems = [{ productId: "lamp-01", quantity: 1, variantSku: "" }];
    const ctx = ctxFor(cartItems, 1000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    expect(result.freeGifts[0].quantity).toBe(1);
    expect(Number.isFinite(result.freeGifts[0].quantity)).toBe(true);
  });
});
