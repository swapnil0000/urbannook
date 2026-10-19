import { evaluateConditionTree, buildCartContext, evaluatePromotions, getDiscountCandidatesForItem } from "../../utils/promotionEngine.util.js";

/**
 * Phase 2 (Admin Offer Control System) — NOT in the condition tree, and
 * targetScope.excludeProductIds on a scoped reward. Two deliberately
 * distinct mechanisms per the design doc: NOT gates whether the promotion
 * matches AT ALL; excludeProductIds filters which resolved productIds a
 * scoped reward actually discounts.
 */

const productMeta = new Map([
  ["lamp-red", { category: "Lamps", subcategory: "", tags: [] }],
  ["lamp-blue", { category: "Lamps", subcategory: "", tags: [] }],
  ["stand-01", { category: "Stands", subcategory: "", tags: [] }],
]);

function ctxFor(cartItems, subtotal = 0) {
  return buildCartContext(cartItems, { subtotal, productMeta });
}

describe("NOT — inverts a wrapped condition's result", () => {
  test("NOT around a false leaf is true", () => {
    const node = { op: "NOT", children: [{ field: "product", productId: "stand-01", minQuantity: 1 }] };
    const ctx = ctxFor([{ productId: "lamp-red", quantity: 1, variantSku: "" }], 1000);
    expect(evaluateConditionTree(node, ctx)).toBe(true); // stand-01 NOT in cart -> leaf false -> NOT true
  });

  test("NOT around a true leaf is false", () => {
    const node = { op: "NOT", children: [{ field: "product", productId: "stand-01", minQuantity: 1 }] };
    const ctx = ctxFor([{ productId: "stand-01", quantity: 1, variantSku: "" }], 1000);
    expect(evaluateConditionTree(node, ctx)).toBe(false); // stand-01 IS in cart -> leaf true -> NOT false
  });

  test("NOT nested inside an AND group — 'has lamp-red AND does NOT have stand-01'", () => {
    const node = {
      op: "AND",
      children: [
        { field: "product", productId: "lamp-red", minQuantity: 1 },
        { op: "NOT", children: [{ field: "product", productId: "stand-01", minQuantity: 1 }] },
      ],
    };
    const bothInCart = ctxFor([{ productId: "lamp-red", quantity: 1, variantSku: "" }, { productId: "stand-01", quantity: 1, variantSku: "" }], 2000);
    const onlyLampInCart = ctxFor([{ productId: "lamp-red", quantity: 1, variantSku: "" }], 1000);
    expect(evaluateConditionTree(node, bothInCart)).toBe(false); // stand-01 present -> NOT fails -> AND fails
    expect(evaluateConditionTree(node, onlyLampInCart)).toBe(true);
  });

  test("a promotion with a NOT condition never recommends 'add more' via the recommendation surface — real end-to-end evaluatePromotions sanity check", () => {
    const promo = {
      _id: "promo-not",
      isActive: true,
      priority: 0,
      conditionTree: { op: "NOT", children: [{ field: "product", productId: "stand-01", minQuantity: 1 }] },
      rewards: [{ type: "percent_off_product", targetProductId: "lamp-red", value: 10 }],
    };
    // stand-01 absent -> NOT true -> promotion matches -> lamp-red discounted
    const ctx1 = ctxFor([{ productId: "lamp-red", quantity: 1, variantSku: "" }], 1000);
    const result1 = evaluatePromotions([{ productId: "lamp-red", quantity: 1, variantSku: "" }], ctx1, [promo]);
    expect(getDiscountCandidatesForItem(result1.discountCandidatesByProduct, "lamp-red", "")).toHaveLength(1);

    // stand-01 present -> NOT false -> promotion does NOT match
    const ctx2 = ctxFor([{ productId: "lamp-red", quantity: 1, variantSku: "" }, { productId: "stand-01", quantity: 1, variantSku: "" }], 2000);
    const result2 = evaluatePromotions(
      [{ productId: "lamp-red", quantity: 1, variantSku: "" }, { productId: "stand-01", quantity: 1, variantSku: "" }], ctx2, [promo],
    );
    expect(getDiscountCandidatesForItem(result2.discountCandidatesByProduct, "lamp-red", "")).toHaveLength(0);
  });
});

describe("targetScope.excludeProductIds — reward-level exclusion", () => {
  test("a scoped reward discounts every matching product EXCEPT the excluded ones", () => {
    const promo = {
      _id: "promo-cat-except",
      isActive: true,
      priority: 0,
      conditionTree: { field: "category", value: "Lamps", minQuantity: 1 },
      rewards: [{ type: "percent_off_product", targetScope: { field: "category", value: "Lamps", excludeProductIds: ["lamp-blue"] }, value: 15 }],
    };
    const cartItems = [
      { productId: "lamp-red", quantity: 1, variantSku: "" },
      { productId: "lamp-blue", quantity: 1, variantSku: "" },
    ];
    const ctx = ctxFor(cartItems, 2000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    expect(getDiscountCandidatesForItem(result.discountCandidatesByProduct, "lamp-red", "")).toHaveLength(1);
    expect(getDiscountCandidatesForItem(result.discountCandidatesByProduct, "lamp-blue", "")).toHaveLength(0);
  });

  test("excludeProductIds absent/empty is a no-op — every existing scoped reward unaffected", () => {
    const promo = {
      _id: "promo-cat-no-exclude",
      isActive: true,
      priority: 0,
      conditionTree: { field: "category", value: "Lamps", minQuantity: 1 },
      rewards: [{ type: "percent_off_product", targetScope: { field: "category", value: "Lamps" }, value: 15 }],
    };
    const cartItems = [{ productId: "lamp-red", quantity: 1, variantSku: "" }, { productId: "lamp-blue", quantity: 1, variantSku: "" }];
    const ctx = ctxFor(cartItems, 2000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    expect(getDiscountCandidatesForItem(result.discountCandidatesByProduct, "lamp-red", "")).toHaveLength(1);
    expect(getDiscountCandidatesForItem(result.discountCandidatesByProduct, "lamp-blue", "")).toHaveLength(1);
  });

  test("excludeProductIds also applies to an 'all' scope", () => {
    const promo = {
      _id: "promo-all-except",
      isActive: true,
      priority: 0,
      conditionTree: { field: "cartSubtotal", operator: "gte", value: 0 },
      rewards: [{ type: "flat_off_product", targetScope: { field: "all", excludeProductIds: ["stand-01"] }, value: 50 }],
    };
    const cartItems = [{ productId: "lamp-red", quantity: 1, variantSku: "" }, { productId: "stand-01", quantity: 1, variantSku: "" }];
    const ctx = ctxFor(cartItems, 2000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    expect(getDiscountCandidatesForItem(result.discountCandidatesByProduct, "lamp-red", "")).toHaveLength(1);
    expect(getDiscountCandidatesForItem(result.discountCandidatesByProduct, "stand-01", "")).toHaveLength(0);
  });
});
