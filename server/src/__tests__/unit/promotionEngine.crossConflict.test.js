import { jest } from "@jest/globals";
import {
  evaluatePromotions,
  buildCartContext,
  applyBestPromotionDiscount,
  getDiscountCandidatesForItem,
  evaluateConditionTree,
  createRuleBudgetTracker,
  withRuleBudget,
  spendRuleBudget,
  applicableCap,
} from "../../utils/promotionEngine.util.js";

/**
 * Regression test for the 2026-10-08 audit's Critical Bug #1: checkout used
 * to run TWO separate discount passes over the same `promotions` collection
 * (a legacy-shaped "cart_rule adapter" pass first, then this direct
 * evaluatePromotions pass second — skipping any line the first pass already
 * touched). Because the skip was presence-based, not price-based, a worse
 * adapter-representable promotion could win over a better V2-only one (an OR
 * condition, which the adapter cannot represent at all) with zero price
 * comparison between them.
 *
 * The fix removed the first pass from the real checkout path entirely —
 * every active promotion (adapter-representable or not) is now evaluated
 * ONCE, here, and competes in the same applyBestPromotionDiscount/
 * budget-tracking pass. This test reproduces the exact scenario from the
 * audit (10% adapter-representable vs 40% OR-conditioned V2-only, same
 * product) using the real production functions wired together the same way
 * rp.payment.controller.js's single discount loop does — not a mirrored
 * copy of the logic.
 */

const PRODUCT_ID = "prod-katana";
const UNIT_PRICE = 1000;

// Simple, flat-AND-of-one-product-leaf promotion — THIS SHAPE is what the
// legacy cart_rule adapter can represent (see promotionToCartRule.adapter.js's
// own REWARD_TO_EFFECT/extractFlatProductConditions gate).
const adapterRepresentablePromo = {
  _id: "promo-10pct",
  name: "10% off Katana (adapter-representable)",
  isActive: true,
  priority: 0,
  stackable: true,
  exclusive: false,
  promotionGroup: "",
  conditionTree: { op: "AND", children: [{ field: "product", productId: PRODUCT_ID, minQuantity: 1 }] },
  rewards: [{ type: "percent_off_product", targetProductId: PRODUCT_ID, value: 10 }],
};

// OR-conditioned promotion — the adapter's extractFlatProductConditions
// explicitly refuses to flatten an OR node, so this promotion NEVER appears
// in the legacy cart_rule adapter's output at all — only the direct engine
// (evaluatePromotions) ever sees it.
const v2OnlyPromo = {
  _id: "promo-40pct",
  name: "40% off Katana (V2-only, OR condition)",
  isActive: true,
  priority: 0,
  stackable: true,
  exclusive: false,
  promotionGroup: "",
  conditionTree: {
    op: "OR",
    children: [
      { field: "product", productId: PRODUCT_ID, minQuantity: 1 },
      { field: "product", productId: "some-other-product", minQuantity: 1 },
    ],
  },
  rewards: [{ type: "percent_off_product", targetProductId: PRODUCT_ID, value: 40 }],
};

function runConsolidatedDiscountPass(cartItems, activePromotions) {
  const ctx = buildCartContext(cartItems, { subtotal: cartItems.reduce((s, i) => s + i.quantity * UNIT_PRICE, 0) });
  const promotionResult = evaluatePromotions(cartItems, ctx, activePromotions);
  const ruleBudgets = createRuleBudgetTracker(promotionResult.discountCandidatesByProduct);

  const results = [];
  for (const item of cartItems) {
    const rawCandidates = getDiscountCandidatesForItem(promotionResult.discountCandidatesByProduct, item.productId, item.variantSku || "");
    const candidates = withRuleBudget(rawCandidates, ruleBudgets);
    if (!candidates?.length) { results.push({ productId: item.productId, discountedUnitPrice: UNIT_PRICE }); continue; }
    const discountedPrice = applyBestPromotionDiscount(UNIT_PRICE, candidates);
    const cap = applicableCap(candidates);
    const unitsUsed = Math.min(item.quantity, cap);
    spendRuleBudget(candidates, ruleBudgets, unitsUsed);
    results.push({ productId: item.productId, discountedUnitPrice: discountedPrice, cap });
  }
  return { promotionResult, results };
}

describe("Cross-engine discount conflict — consolidated single-pass evaluation", () => {
  test("a V2-only (OR-conditioned) 40% promotion wins over an adapter-representable 10% promotion on the same line", () => {
    const cartItems = [{ productId: PRODUCT_ID, quantity: 1, variantSku: "" }];
    const { results } = runConsolidatedDiscountPass(cartItems, [adapterRepresentablePromo, v2OnlyPromo]);
    const line = results.find((r) => r.productId === PRODUCT_ID);
    // Best price wins: 1000 * (1-0.40) = 600, NOT 1000 * (1-0.10) = 900.
    expect(line.discountedUnitPrice).toBe(600);
  });

  test("with only the adapter-representable promotion active, its own discount still applies correctly", () => {
    const cartItems = [{ productId: PRODUCT_ID, quantity: 1, variantSku: "" }];
    const { results } = runConsolidatedDiscountPass(cartItems, [adapterRepresentablePromo]);
    const line = results.find((r) => r.productId === PRODUCT_ID);
    expect(line.discountedUnitPrice).toBe(900);
  });

  test("the SAME unit never gets double-discounted — only one candidate's price is used, not summed", () => {
    const cartItems = [{ productId: PRODUCT_ID, quantity: 1, variantSku: "" }];
    const { results } = runConsolidatedDiscountPass(cartItems, [adapterRepresentablePromo, v2OnlyPromo]);
    const line = results.find((r) => r.productId === PRODUCT_ID);
    // If both discounts were wrongly summed (10% + 40%), price would be 500.
    expect(line.discountedUnitPrice).not.toBe(500);
    expect(line.discountedUnitPrice).toBeGreaterThanOrEqual(0);
  });

  test("evaluatePromotions matches BOTH promotions for this cart (sanity check that the V2-only promo really is seen)", () => {
    const cartItems = [{ productId: PRODUCT_ID, quantity: 1, variantSku: "" }];
    const ctx = buildCartContext(cartItems, { subtotal: UNIT_PRICE });
    const { matchedPromotions } = evaluatePromotions(cartItems, ctx, [adapterRepresentablePromo, v2OnlyPromo]);
    const ids = matchedPromotions.map((p) => p._id);
    expect(ids).toEqual(expect.arrayContaining(["promo-10pct", "promo-40pct"]));
  });
});

// Note: the legacy cart-rule adapter (promotionToCartRule.adapter.js) this
// describe block originally also tested was deleted entirely 2026-10-09
// along with the rest of the legacy display stack — the "cross-engine"
// scenario above is kept because it's still a real property of the ONE
// remaining engine (two differently-shaped conditionTrees on the same
// product, best price wins), it just no longer involves an actual second
// engine/adapter.

describe("excludeUsageExhaustedPromotions — courtesy pre-check (audit Critical Bug #5, partial fix)", () => {
  test("a promotion with maxUsesTotal already reached is excluded entirely", async () => {
    const { excludeUsageExhaustedPromotions } = await import("../../utils/promotionEngine.util.js");
    const promos = [
      { _id: "p1", maxUsesTotal: 5, usageCount: 5, maxUsesPerUser: null },
      { _id: "p2", maxUsesTotal: 5, usageCount: 3, maxUsesPerUser: null },
      { _id: "p3", maxUsesTotal: null, usageCount: 0, maxUsesPerUser: null },
    ];
    const kept = await excludeUsageExhaustedPromotions(promos, {});
    expect(kept.map((p) => p._id)).toEqual(["p2", "p3"]);
  });

  test("a promotion with maxUsesPerUser already hit for this identity is excluded", async () => {
    const PromotionUsage = (await import("../../model/promotionUsage.model.js")).default;
    const { excludeUsageExhaustedPromotions } = await import("../../utils/promotionEngine.util.js");
    await PromotionUsage.create({
      promotionId: "promo-capped",
      promotionName: "test",
      orderId: "ORDER-1",
      email: "customer@example.com",
      mobile: "9876543210",
      reversed: false,
    });
    const promos = [{ _id: "promo-capped", maxUsesTotal: null, usageCount: 0, maxUsesPerUser: 1 }];
    const kept = await excludeUsageExhaustedPromotions(promos, { email: "customer@example.com" });
    expect(kept).toEqual([]);
  });

  test("a REVERSED prior usage does not count toward the per-user cap", async () => {
    const PromotionUsage = (await import("../../model/promotionUsage.model.js")).default;
    const { excludeUsageExhaustedPromotions } = await import("../../utils/promotionEngine.util.js");
    await PromotionUsage.create({
      promotionId: "promo-reversed",
      promotionName: "test",
      orderId: "ORDER-2",
      email: "another@example.com",
      reversed: true,
    });
    const promos = [{ _id: "promo-reversed", maxUsesTotal: null, usageCount: 0, maxUsesPerUser: 1 }];
    const kept = await excludeUsageExhaustedPromotions(promos, { email: "another@example.com" });
    expect(kept.map((p) => p._id)).toEqual(["promo-reversed"]);
  });
});

describe("combinesWithCoupons — now actually enforced (audit fix)", () => {
  const automaticPromo = {
    _id: "promo-auto",
    name: "10% off Katana (automatic)",
    isActive: true,
    conditionTree: { field: "product", productId: PRODUCT_ID, minQuantity: 1 },
    rewards: [{ type: "percent_off_product", targetProductId: PRODUCT_ID, value: 10 }],
    combinesWithCoupons: false,
  };

  test("an automatic promotion with combinesWithCoupons:false is excluded once a coupon is applied", () => {
    const cartItems = [{ productId: PRODUCT_ID, quantity: 1, variantSku: "" }];
    const ctx = buildCartContext(cartItems, { subtotal: UNIT_PRICE, appliedCouponCode: "SAVE10" });
    const { matchedPromotions } = evaluatePromotions(cartItems, ctx, [automaticPromo]);
    expect(matchedPromotions).toEqual([]);
  });

  test("the same promotion matches fine when NO coupon is applied", () => {
    const cartItems = [{ productId: PRODUCT_ID, quantity: 1, variantSku: "" }];
    const ctx = buildCartContext(cartItems, { subtotal: UNIT_PRICE });
    const { matchedPromotions } = evaluatePromotions(cartItems, ctx, [automaticPromo]);
    expect(matchedPromotions.map((p) => p._id)).toEqual(["promo-auto"]);
  });

  test("a promotion's OWN linkedCouponCode always wins — combinesWithCoupons never blocks its own coupon", () => {
    const linked = { ...automaticPromo, _id: "promo-linked", linkedCouponCode: "SAVE10" };
    const cartItems = [{ productId: PRODUCT_ID, quantity: 1, variantSku: "" }];
    const ctx = buildCartContext(cartItems, { subtotal: UNIT_PRICE, appliedCouponCode: "SAVE10" });
    const { matchedPromotions } = evaluatePromotions(cartItems, ctx, [linked]);
    expect(matchedPromotions.map((p) => p._id)).toEqual(["promo-linked"]);
  });
});

describe("maxApplications — now actually enforced (audit fix)", () => {
  test("caps the repeat count even when the condition would naturally qualify more times", () => {
    const promo = {
      _id: "promo-capped-applications",
      name: "Buy 2 get 1 discounted, max 2 applications",
      isActive: true,
      conditionTree: { field: "product", productId: PRODUCT_ID, minQuantity: 2 },
      rewards: [{ type: "percent_off_product", targetProductId: PRODUCT_ID, value: 50 }],
      maxApplications: 2,
    };
    // 10 units in cart → condition naturally qualifies floor(10/2)=5 times,
    // but maxApplications=2 must clamp the cap to 2.
    const cartItems = [{ productId: PRODUCT_ID, quantity: 10, variantSku: "" }];
    const ctx = buildCartContext(cartItems, { subtotal: UNIT_PRICE * 10 });
    const { discountCandidatesByProduct } = evaluatePromotions(cartItems, ctx, [promo]);
    const candidates = discountCandidatesByProduct.get(PRODUCT_ID);
    expect(candidates[0].cap).toBe(2);
  });

  test("without maxApplications set, the cap is unclamped (unchanged behavior)", () => {
    const promo = {
      _id: "promo-uncapped",
      name: "Buy 2 get 1 discounted, no cap",
      isActive: true,
      conditionTree: { field: "product", productId: PRODUCT_ID, minQuantity: 2 },
      rewards: [{ type: "percent_off_product", targetProductId: PRODUCT_ID, value: 50 }],
    };
    const cartItems = [{ productId: PRODUCT_ID, quantity: 10, variantSku: "" }];
    const ctx = buildCartContext(cartItems, { subtotal: UNIT_PRICE * 10 });
    const { discountCandidatesByProduct } = evaluatePromotions(cartItems, ctx, [promo]);
    const candidates = discountCandidatesByProduct.get(PRODUCT_ID);
    expect(candidates[0].cap).toBe(5);
  });
});

describe("pincode/state/country conditions — now wired at checkout (audit fix)", () => {
  test("a pincode-gated promotion matches when buildCartContext is given the real delivery address", () => {
    const ctxWithAddress = buildCartContext([], { deliveryAddress: { pincode: "122003", state: "Haryana", country: "India" } });
    expect(evaluateConditionTree({ field: "pincode", value: ["122003", "110001"] }, ctxWithAddress)).toBe(true);

    const ctxWithoutAddress = buildCartContext([], {});
    expect(evaluateConditionTree({ field: "pincode", value: ["122003", "110001"] }, ctxWithoutAddress)).toBe(false);
  });

  test("a state-gated promotion matches/doesn't match correctly once deliveryAddress is supplied", () => {
    const ctx = buildCartContext([], { deliveryAddress: { pincode: "122003", state: "Haryana", country: "India" } });
    expect(evaluateConditionTree({ field: "state", value: ["Haryana"] }, ctx)).toBe(true);
    expect(evaluateConditionTree({ field: "state", value: ["Kerala"] }, ctx)).toBe(false);
  });

  test("orderCount condition matches once a real count is supplied via buildCartContext", () => {
    const ctx = buildCartContext([], { orderCount: 0 });
    expect(evaluateConditionTree({ field: "orderCount", operator: "eq", value: 0 }, ctx)).toBe(true);
    const ctxReturning = buildCartContext([], { orderCount: 3 });
    expect(evaluateConditionTree({ field: "orderCount", operator: "eq", value: 0 }, ctxReturning)).toBe(false);
  });
});

describe("gift_wrap_config migration (offers collection fully retired)", () => {
  test("a gift_wrap_config doc saves fine with NO conditionTree/rewards", async () => {
    const Promotion = (await import("../../model/promotion.model.js")).default;
    const gw = await Promotion.create({
      promotionType: "gift_wrap_config",
      name: "Gift Wrap",
      isActive: true,
      giftWrap: { price: 99, title: "T", note: "N", ctaLabel: "C" },
    });
    expect(gw._id).toBeDefined();
  });

  test("a REAL promotion (any other type) is still strictly rejected without conditionTree/rewards", async () => {
    const Promotion = (await import("../../model/promotion.model.js")).default;
    await expect(Promotion.create({ promotionType: "order_discount", name: "Should fail" })).rejects.toThrow(/conditionTree/);
  });

  test("getActivePromotions never returns a gift_wrap_config doc", async () => {
    const Promotion = (await import("../../model/promotion.model.js")).default;
    const { getActivePromotions } = await import("../../utils/promotionEngine.util.js");
    await Promotion.create({ promotionType: "gift_wrap_config", name: "Gift Wrap", isActive: true, giftWrap: { price: 1 } });
    const active = await getActivePromotions();
    expect(active.some((p) => p.promotionType === "gift_wrap_config")).toBe(false);
  });
});

describe("getActivePromotions — deterministic ordering", () => {
  test("query is sorted by priority desc, then createdAt asc, then _id — not left to Mongo's unspecified natural order", async () => {
    const { getActivePromotions } = await import("../../utils/promotionEngine.util.js");
    const Promotion = (await import("../../model/promotion.model.js")).default;
    const sortSpy = jest.fn().mockReturnThis();
    const findSpy = jest.spyOn(Promotion, "find").mockReturnValue({
      sort: sortSpy,
      lean: jest.fn().mockResolvedValue([]),
    });
    await getActivePromotions();
    expect(sortSpy).toHaveBeenCalledWith({ priority: -1, createdAt: 1, _id: 1 });
    findSpy.mockRestore();
  });
});
