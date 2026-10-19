/**
 * Combination matrix — every NEW offer-type mechanism (Phases 1-6: quantity
 * operators/countMode, NOT, excludeProductIds, tiers, maxDiscountAmount,
 * cheapest-item activation) tested TOGETHER, not just in isolation. Bugs
 * hide in the interactions, not each mechanism alone.
 */
import { jest } from "@jest/globals";

jest.unstable_mockModule("../../model/order.model.js", () => ({ default: {} }));
jest.unstable_mockModule("../../services/rp.payement.service.js", () => ({
  razorpayPaymentVerificationService: jest.fn(),
  razorpayCreateOrderService: jest.fn(),
  razorpayFetchOrderService: jest.fn(),
}));

const { evaluatePromotions, buildCartContext, getDiscountCandidatesForItem, applyBestPromotionDiscount, applicableCap, clampCapToDiscountBudget, buildMaxDiscountAmountMap } =
  await import("../../utils/promotionEngine.util.js");
const { applyCheapestItemReward } = await import("../../controller/rp.payment.controller.js");

const productMeta = new Map([
  ["katana", { category: "Katana", subcategory: "", tags: ["anime"] }],
  ["stand-cheap", { category: "Stands", subcategory: "", tags: [] }],
  ["stand-mid", { category: "Stands", subcategory: "", tags: [] }],
  ["stand-pricey", { category: "Stands", subcategory: "", tags: [] }],
]);

function ctxFor(cartItems, subtotal) {
  return buildCartContext(cartItems, { subtotal, productMeta });
}

function priceFor(result, productId, unitPrice) {
  const candidates = getDiscountCandidatesForItem(result.discountCandidatesByProduct, productId, "");
  if (!candidates.length) return unitPrice;
  return applyBestPromotionDiscount(unitPrice, candidates);
}

describe("Combination: NOT + tiers", () => {
  test("NOT gates the promotion; once gated-in, tiers still resolve off the (different) trigger quantity", () => {
    const promo = {
      _id: "p1", isActive: true, priority: 0,
      conditionTree: {
        op: "AND",
        children: [
          { field: "product", productId: "katana", minQuantity: 2 },
          { op: "NOT", children: [{ field: "product", productId: "stand-pricey", minQuantity: 1 }] },
        ],
      },
      rewards: [{ type: "percent_off_product", targetProductId: "stand-cheap", tiers: [{ minQuantity: 2, value: 10 }, { minQuantity: 4, value: 20 }] }],
    };
    // 4 katanas, no stand-pricey -> NOT true, AND true -> promo matches, tier 2 (20%) applies to stand-cheap.
    const cartA = [{ productId: "katana", quantity: 4, variantSku: "" }, { productId: "stand-cheap", quantity: 1, variantSku: "" }];
    const resA = evaluatePromotions(cartA, ctxFor(cartA, 5000), [promo]);
    expect(priceFor(resA, "stand-cheap", 1000)).toBe(800);

    // Same cart but WITH stand-pricey present -> NOT false -> promo doesn't match at all.
    const cartB = [...cartA, { productId: "stand-pricey", quantity: 1, variantSku: "" }];
    const resB = evaluatePromotions(cartB, ctxFor(cartB, 6000), [promo]);
    expect(priceFor(resB, "stand-cheap", 1000)).toBe(1000);
  });
});

describe("Combination: excludeProductIds + tiers on a scoped reward", () => {
  test("tier value applies to every matching product EXCEPT the excluded one", () => {
    const promo = {
      _id: "p2", isActive: true, priority: 0,
      conditionTree: { field: "product", productId: "katana", minQuantity: 1 },
      rewards: [{
        type: "percent_off_product",
        targetScope: { field: "category", value: "Stands", excludeProductIds: ["stand-pricey"] },
        tiers: [{ minQuantity: 2, value: 10 }, { minQuantity: 4, value: 20 }],
      }],
    };
    const cart = [
      { productId: "katana", quantity: 4, variantSku: "" },
      { productId: "stand-cheap", quantity: 1, variantSku: "" },
      { productId: "stand-pricey", quantity: 1, variantSku: "" },
    ];
    const result = evaluatePromotions(cart, ctxFor(cart, 6000), [promo]);
    expect(priceFor(result, "stand-cheap", 1000)).toBe(800); // tier 2 (20%), included
    expect(priceFor(result, "stand-pricey", 1000)).toBe(1000); // excluded — untouched
  });
});

describe("Combination: maxDiscountAmount + tiers", () => {
  test("the controller-level ₹ cap clamps how many units get the TIER-resolved value, same composition as a flat value", () => {
    const promo = {
      _id: "p3", isActive: true, priority: 0,
      maxDiscountAmount: 150, // small budget
      conditionTree: { field: "product", productId: "katana", minQuantity: 4 },
      rewards: [{ type: "percent_off_product", targetProductId: "stand-cheap", tiers: [{ minQuantity: 4, value: 50 }], discountAllUnits: true }],
    };
    const cart = [{ productId: "katana", quantity: 4, variantSku: "" }, { productId: "stand-cheap", quantity: 3, variantSku: "" }];
    const result = evaluatePromotions(cart, ctxFor(cart, 5000), [promo]);
    const candidates = getDiscountCandidatesForItem(result.discountCandidatesByProduct, "stand-cheap", "");
    expect(candidates[0].value).toBe(50); // tier value resolved correctly by the engine
    expect(candidates[0].cap).toBe(3); // engine's own cap is unaware of ₹ budget — that's the controller's job

    // Mirror rp.payment.controller.js's exact per-item loop composition:
    // applicableCap(candidates) -> clampCapToDiscountBudget(..., perUnitDiscount from
    // the TIER-resolved price, ...). ₹500 saved/unit (50% of ₹1000), ₹150 budget ->
    // floor(150/500) = 0 affordable units, even though the engine's own cap said 3.
    const fullPrice = 1000;
    const discountedPrice = applyBestPromotionDiscount(fullPrice, candidates);
    const maxDiscountAmountByPromotionId = buildMaxDiscountAmountMap(result.matchedPromotions);
    const promoDiscountByPromotionId = new Map();
    const clampedCap = clampCapToDiscountBudget(
      applicableCap(candidates), fullPrice - discountedPrice, candidates[0].ruleId,
      promoDiscountByPromotionId, maxDiscountAmountByPromotionId,
    );
    expect(clampedCap).toBe(0); // the ₹150 budget overrides even a 50%-tier, discountAllUnits cap of 3
  });
});

describe("Combination: cheapest-item vs single-winner protection (fixed, 2026-10-19)", () => {
  test("a product that already has a winning product-level discount from promo A is NOT also eligible for promo B's cheapest-item reward", () => {
    const promoA = {
      _id: "promo-discount", isActive: true, priority: 10, stackable: false,
      conditionTree: { field: "product", productId: "stand-cheap", minQuantity: 1 },
      rewards: [{ type: "percent_off_product", targetProductId: "stand-cheap", value: 20 }],
    };
    const promoB = {
      _id: "promo-cheapest", isActive: true, priority: 0, stackable: true,
      conditionTree: { field: "cartSubtotal", operator: "gte", value: 0 },
      rewards: [{ type: "cheapest_item_free" }],
    };
    const cart = [
      { productId: "stand-cheap", quantity: 1, variantSku: "" },
      { productId: "stand-pricey", quantity: 1, variantSku: "" },
    ];
    const ctx = ctxFor(cart, 2000);
    const result = evaluatePromotions(cart, ctx, [promoA, promoB]);

    // Apply promo A's product-level discount the same way the real checkout
    // loop does, THEN run the Phase 5 cheapest-item pass on top — mirrors
    // the real order of operations in rp.payment.controller.js.
    const orderItems = [
      { productId: "stand-cheap", variantSku: "", productSnapshot: { priceAtPurchase: priceFor(result, "stand-cheap", 1000), quantity: 1, productName: "stand-cheap" } },
      { productId: "stand-pricey", variantSku: "", productSnapshot: { priceAtPurchase: priceFor(result, "stand-pricey", 1000), quantity: 1, productName: "stand-pricey" } },
    ];
    expect(orderItems[0].productSnapshot.priceAtPurchase).toBe(800); // promo A already applied 20% off

    const promoDiscountByPromotionId = new Map();
    applyCheapestItemReward(orderItems, result.cheapestItemAdjustments, result.matchedPromotions, promoDiscountByPromotionId, result.discountCandidatesByProduct, new Map());

    // stand-cheap already won promo A's discount — ineligible for promo B's
    // cheapest-item reward even though ₹800 < ₹1000. stand-pricey (the only
    // eligible candidate) gets it instead.
    expect(orderItems[0].productSnapshot.priceAtPurchase).toBe(800); // untouched by promo B
    expect(orderItems[0].productSnapshot.isPromotionalGift).toBeFalsy();
    expect(orderItems[1].productSnapshot.isPromotionalGift).toBe(true);
  });
});

describe("Combination: maxDiscountAmount bounds a cheapest-item reward (fixed, 2026-10-19)", () => {
  test("a promotion with both maxDiscountAmount and cheapest_item_free skips the adjustment entirely when the budget can't cover the full value", () => {
    const orderItems = [{ productId: "stand-cheap", variantSku: "", productSnapshot: { priceAtPurchase: 1000, quantity: 1, productName: "stand-cheap" } }];
    const matchedPromotions = [{ _id: "promo-cap-cheapest", priority: 0, stackable: true, createdAt: null }];
    const promoDiscountByPromotionId = new Map();
    const maxDiscountAmountByPromotionId = new Map([["promo-cap-cheapest", 50]]); // tiny budget, item is worth ₹1000
    applyCheapestItemReward(
      orderItems, [{ promotionId: "promo-cap-cheapest", mode: "free" }], matchedPromotions,
      promoDiscountByPromotionId, new Map(), maxDiscountAmountByPromotionId,
    );
    expect(orderItems[0].productSnapshot.priceAtPurchase).toBe(1000); // skipped — budget can't cover it
    expect(promoDiscountByPromotionId.has("promo-cap-cheapest")).toBe(false);
  });

  test("grants normally when the budget DOES cover the full value", () => {
    const orderItems = [{ productId: "stand-cheap", variantSku: "", productSnapshot: { priceAtPurchase: 1000, quantity: 1, productName: "stand-cheap" } }];
    const matchedPromotions = [{ _id: "promo-cap-cheapest", priority: 0, stackable: true, createdAt: null }];
    const promoDiscountByPromotionId = new Map();
    const maxDiscountAmountByPromotionId = new Map([["promo-cap-cheapest", 5000]]);
    applyCheapestItemReward(
      orderItems, [{ promotionId: "promo-cap-cheapest", mode: "free" }], matchedPromotions,
      promoDiscountByPromotionId, new Map(), maxDiscountAmountByPromotionId,
    );
    expect(orderItems[0].productSnapshot.priceAtPurchase).toBe(0);
    expect(promoDiscountByPromotionId.get("promo-cap-cheapest")).toBe(1000);
  });
});

describe("Combination: productList scope + countMode distinct + tiers", () => {
  test("tier resolves off distinct-item count from an admin-picked list, applied to every listed item present", () => {
    const promo = {
      _id: "p5", isActive: true, priority: 0,
      conditionTree: {
        field: "productList",
        items: [{ productId: "stand-cheap" }, { productId: "stand-mid" }, { productId: "stand-pricey" }],
        minQuantity: 2, countMode: "distinct",
      },
      rewards: [{
        type: "percent_off_product",
        targetScope: { field: "productList", items: [{ productId: "stand-cheap" }, { productId: "stand-mid" }, { productId: "stand-pricey" }] },
        tiers: [{ minQuantity: 2, value: 10 }, { minQuantity: 3, value: 25 }],
      }],
    };
    // 2 distinct listed items present (stand-cheap, stand-mid) -> distinct count = 2 -> tier 1 (10%).
    const cart = [{ productId: "stand-cheap", quantity: 5, variantSku: "" }, { productId: "stand-mid", quantity: 1, variantSku: "" }];
    const result = evaluatePromotions(cart, ctxFor(cart, 3000), [promo]);
    expect(priceFor(result, "stand-cheap", 1000)).toBe(900);
    expect(priceFor(result, "stand-mid", 1000)).toBe(900);
  });
});

describe("Combination: priority/stackable winner resolution across a regular discount vs a scoped+tiered discount", () => {
  test("higher-priority flat single-product reward beats a lower-priority scoped+tiered reward on the SAME product", () => {
    const flatWinner = {
      _id: "promo-flat", isActive: true, priority: 10, stackable: false,
      conditionTree: { field: "product", productId: "stand-cheap", minQuantity: 1 },
      rewards: [{ type: "flat_off_product", targetProductId: "stand-cheap", value: 999 }],
    };
    const scopedLoser = {
      _id: "promo-scoped", isActive: true, priority: 0, stackable: true,
      conditionTree: { field: "product", productId: "katana", minQuantity: 2 },
      rewards: [{ type: "percent_off_product", targetScope: { field: "category", value: "Stands" }, tiers: [{ minQuantity: 2, value: 90 }] }],
    };
    const cart = [{ productId: "katana", quantity: 2, variantSku: "" }, { productId: "stand-cheap", quantity: 1, variantSku: "" }];
    const result = evaluatePromotions(cart, ctxFor(cart, 3000), [flatWinner, scopedLoser]);
    const candidates = getDiscountCandidatesForItem(result.discountCandidatesByProduct, "stand-cheap", "");
    expect(candidates).toHaveLength(1);
    expect(candidates[0].ruleId).toBe("promo-flat"); // higher priority wins, not the 90% tiered one
  });
});
