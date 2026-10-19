import { evaluateConditionTree, buildCartContext, evaluatePromotions } from "../../utils/promotionEngine.util.js";

/**
 * Phase 1 (2026-10-10, admin offer control system) — quantity operators
 * (gte/lte/eq/between) on product/category/subcategory/tag leaves, and
 * distinct-product-count vs summed-unit-count on taxonomy leaves. Both
 * default to the pre-Phase-1 behavior when absent (operator → "gte",
 * countMode → "units"), so every existing promotion is unaffected.
 */

const productMeta = new Map([
  ["lamp-red", { category: "Lamps", subcategory: "", tags: [] }],
  ["lamp-blue", { category: "Lamps", subcategory: "", tags: [] }],
  ["lamp-green", { category: "Lamps", subcategory: "", tags: [] }],
]);

function ctxFor(cartItems, subtotal = 0) {
  return buildCartContext(cartItems, { subtotal, productMeta });
}

describe("quantity operators on a product leaf", () => {
  const leaf = (operator, minQuantity, maxQuantity) => ({ field: "product", productId: "lamp-red", operator, minQuantity, maxQuantity });

  test("default (no operator) behaves exactly like explicit gte — backward compatible", () => {
    const ctx = ctxFor([{ productId: "lamp-red", quantity: 2, variantSku: "" }]);
    expect(evaluateConditionTree({ field: "product", productId: "lamp-red", minQuantity: 2 }, ctx)).toBe(true);
    expect(evaluateConditionTree({ field: "product", productId: "lamp-red", minQuantity: 3 }, ctx)).toBe(false);
  });

  test("lte", () => {
    const ctx2 = ctxFor([{ productId: "lamp-red", quantity: 2, variantSku: "" }]);
    expect(evaluateConditionTree(leaf("lte", 2), ctx2)).toBe(true);
    const ctx3 = ctxFor([{ productId: "lamp-red", quantity: 3, variantSku: "" }]);
    expect(evaluateConditionTree(leaf("lte", 2), ctx3)).toBe(false);
  });

  test("eq", () => {
    const ctx = ctxFor([{ productId: "lamp-red", quantity: 3, variantSku: "" }]);
    expect(evaluateConditionTree(leaf("eq", 3), ctx)).toBe(true);
    expect(evaluateConditionTree(leaf("eq", 2), ctx)).toBe(false);
  });

  test("between (inclusive both ends)", () => {
    const at2 = ctxFor([{ productId: "lamp-red", quantity: 2, variantSku: "" }]);
    const at4 = ctxFor([{ productId: "lamp-red", quantity: 4, variantSku: "" }]);
    const at5 = ctxFor([{ productId: "lamp-red", quantity: 5, variantSku: "" }]);
    const at1 = ctxFor([{ productId: "lamp-red", quantity: 1, variantSku: "" }]);
    expect(evaluateConditionTree(leaf("between", 2, 4), at2)).toBe(true);
    expect(evaluateConditionTree(leaf("between", 2, 4), at4)).toBe(true);
    expect(evaluateConditionTree(leaf("between", 2, 4), at5)).toBe(false);
    expect(evaluateConditionTree(leaf("between", 2, 4), at1)).toBe(false);
  });
});

describe("distinct-product-count vs summed-unit-count on a taxonomy leaf", () => {
  test("countMode absent/\"units\" sums quantity across matching products (pre-Phase-1 behavior)", () => {
    // 3 units of ONE product — satisfies "3+ units" but should NOT satisfy "3+ DIFFERENT products".
    const ctx = ctxFor([{ productId: "lamp-red", quantity: 3, variantSku: "" }]);
    expect(evaluateConditionTree({ field: "category", value: "Lamps", minQuantity: 3 }, ctx)).toBe(true);
  });

  test('countMode: "distinct" requires that many DIFFERENT products, not units', () => {
    const threeUnitsOneProduct = ctxFor([{ productId: "lamp-red", quantity: 3, variantSku: "" }]);
    expect(evaluateConditionTree({ field: "category", value: "Lamps", minQuantity: 3, countMode: "distinct" }, threeUnitsOneProduct)).toBe(false);

    const oneUnitEachOfThree = ctxFor([
      { productId: "lamp-red", quantity: 1, variantSku: "" },
      { productId: "lamp-blue", quantity: 1, variantSku: "" },
      { productId: "lamp-green", quantity: 1, variantSku: "" },
    ]);
    expect(evaluateConditionTree({ field: "category", value: "Lamps", minQuantity: 3, countMode: "distinct" }, oneUnitEachOfThree)).toBe(true);
  });
});

describe("promotionRepeatCount is operator-aware (only 'gte' scales the reward repeat count)", () => {
  test("a gte product condition still scales a percent_off_product reward's discounted quantity", () => {
    const promo = {
      _id: "promo-gte",
      isActive: true,
      priority: 0,
      conditionTree: { field: "product", productId: "lamp-red", minQuantity: 2 },
      rewards: [{ type: "percent_off_product", targetProductId: "lamp-red", value: 10 }],
    };
    const cartItems = [{ productId: "lamp-red", quantity: 4, variantSku: "" }];
    const ctx = ctxFor(cartItems, 4000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    const candidates = result.discountCandidatesByProduct.get("lamp-red");
    expect(candidates[0].cap).toBe(2); // floor(4/2)
  });

  test("an 'eq'/'between' product condition does NOT artificially multiply the reward's repeat count", () => {
    // Deliberately NOT "gte": an "eq"/"between" condition is a fixed-window
    // gate ("exactly 2" / "2 to 4"), not a repeatable unit the way "2+"
    // naturally is — so its repeat count must NOT be computed as
    // floor(have/minQuantity) (that formula only makes sense for "at
    // least N"). promotionRepeatCount correctly falls back to the same
    // "unbounded, let real cart quantity clamp it downstream" sentinel
    // every NON-product condition already used before Phase 1 existed —
    // this test confirms that fallback, not a literal cap value (checkout's
    // own `Math.min(realQtyInCart, cap)` is what actually bounds it, same
    // as it always has for any non-product-leaf promotion).
    const promo = {
      _id: "promo-eq",
      isActive: true,
      priority: 0,
      conditionTree: { field: "product", productId: "lamp-red", operator: "eq", minQuantity: 2 },
      rewards: [{ type: "percent_off_product", targetProductId: "lamp-red", value: 10 }],
    };
    const cartItems = [{ productId: "lamp-red", quantity: 2, variantSku: "" }];
    const ctx = ctxFor(cartItems, 2000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    const candidates = result.discountCandidatesByProduct.get("lamp-red");
    // Not floor(have/minQuantity) = floor(2/2) = 1 by coincidence here —
    // the real assertion is that it's the SAME unbounded sentinel a pure
    // non-product condition already produces, proving "eq" took the
    // non-scaling branch rather than silently being treated as "gte".
    expect(candidates[0].cap).toBe(Number.MAX_SAFE_INTEGER);
    // And checkout's own downstream clamp (Math.min(realCartQty, cap))
    // correctly bounds it to what's actually in the cart, same as every
    // other unbounded-cap case already relies on.
    expect(Math.min(cartItems[0].quantity, candidates[0].cap)).toBe(2);
  });
});
