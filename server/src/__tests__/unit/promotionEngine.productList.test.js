import { evaluatePromotions, buildCartContext, applyBestPromotionDiscount, getDiscountCandidatesForItem, evaluateConditionTree } from "../../utils/promotionEngine.util.js";

/**
 * Regression tests for the `productList` condition leaf + its matching
 * `targetScope: { field: "productList" }` reward — an admin-picked SET of
 * SPECIFIC products/variants (not a whole category/subcategory/tag). Fully
 * generic: these tests use arbitrary product ids, never a named offer.
 */

function ctxFor(cartItems, subtotal = 0) {
  return buildCartContext(cartItems, { subtotal });
}

describe("productList condition leaf", () => {
  test("sums quantity across every listed product (units mode, default)", () => {
    const leaf = { field: "productList", items: [{ productId: "p1" }, { productId: "p2" }], minQuantity: 2, operator: "gte" };
    const ctx = ctxFor([{ productId: "p1", quantity: 1, variantSku: "" }, { productId: "p2", quantity: 1, variantSku: "" }]);
    expect(evaluateConditionTree(leaf, ctx)).toBe(true);
  });

  test("not met when the combined quantity across the list falls short", () => {
    const leaf = { field: "productList", items: [{ productId: "p1" }, { productId: "p2" }], minQuantity: 3, operator: "gte" };
    const ctx = ctxFor([{ productId: "p1", quantity: 1, variantSku: "" }, { productId: "p2", quantity: 1, variantSku: "" }]);
    expect(evaluateConditionTree(leaf, ctx)).toBe(false);
  });

  test("a list entry with a variantSku counts ONLY that exact variant", () => {
    const leaf = { field: "productList", items: [{ productId: "p1", variantSku: "SKU-A" }], minQuantity: 1 };
    const wrongVariant = ctxFor([{ productId: "p1", quantity: 5, variantSku: "SKU-B" }]);
    const rightVariant = ctxFor([{ productId: "p1", quantity: 1, variantSku: "SKU-A" }]);
    expect(evaluateConditionTree(leaf, wrongVariant)).toBe(false);
    expect(evaluateConditionTree(leaf, rightVariant)).toBe(true);
  });

  test("a list entry with NO variantSku counts any variant of that product", () => {
    const leaf = { field: "productList", items: [{ productId: "p1" }], minQuantity: 1 };
    const ctx = ctxFor([{ productId: "p1", quantity: 1, variantSku: "SKU-WHATEVER" }]);
    expect(evaluateConditionTree(leaf, ctx)).toBe(true);
  });

  test("countMode distinct counts how many DIFFERENT listed items are present, not total units", () => {
    const leaf = { field: "productList", items: [{ productId: "p1" }, { productId: "p2" }, { productId: "p3" }], minQuantity: 2, countMode: "distinct" };
    const twoUnitsSameProduct = ctxFor([{ productId: "p1", quantity: 2, variantSku: "" }]);
    const twoDifferentProducts = ctxFor([{ productId: "p1", quantity: 1, variantSku: "" }, { productId: "p2", quantity: 1, variantSku: "" }]);
    expect(evaluateConditionTree(leaf, twoUnitsSameProduct)).toBe(false);
    expect(evaluateConditionTree(leaf, twoDifferentProducts)).toBe(true);
  });

  test("a product NOT in the list never counts toward it", () => {
    const leaf = { field: "productList", items: [{ productId: "p1" }], minQuantity: 1 };
    const ctx = ctxFor([{ productId: "unrelated-product", quantity: 10, variantSku: "" }]);
    expect(evaluateConditionTree(leaf, ctx)).toBe(false);
  });
});

describe("targetScope productList reward — discounts only the listed products actually in cart", () => {
  const promo = {
    _id: "promo1",
    name: "Generic multi-item offer",
    isActive: true,
    priority: 0,
    conditionTree: { field: "productList", items: [{ productId: "p1" }, { productId: "p2" }], minQuantity: 2 },
    rewards: [{ type: "percent_off_product", targetScope: { field: "productList", items: [{ productId: "p1" }, { productId: "p2" }] }, value: 10 }],
  };

  test("discounts every listed product that's actually in the cart", () => {
    const ctx = ctxFor([{ productId: "p1", quantity: 1, variantSku: "" }, { productId: "p2", quantity: 1, variantSku: "" }], 0);
    const result = evaluatePromotions(
      [{ productId: "p1", quantity: 1, variantSku: "" }, { productId: "p2", quantity: 1, variantSku: "" }],
      ctx,
      [promo],
    );
    const p1 = getDiscountCandidatesForItem(result.discountCandidatesByProduct, "p1", "");
    const p2 = getDiscountCandidatesForItem(result.discountCandidatesByProduct, "p2", "");
    expect(applyBestPromotionDiscount(1000, p1)).toBe(900);
    expect(applyBestPromotionDiscount(1000, p2)).toBe(900);
  });

  test("never discounts a product that is NOT in the admin's list, even if it's in the cart", () => {
    const cartItems = [{ productId: "p1", quantity: 1, variantSku: "" }, { productId: "p2", quantity: 1, variantSku: "" }, { productId: "unrelated", quantity: 1, variantSku: "" }];
    const ctx = ctxFor(cartItems, 0);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    const unrelated = getDiscountCandidatesForItem(result.discountCandidatesByProduct, "unrelated", "");
    expect(unrelated).toHaveLength(0);
  });

  test("condition unmet (only 1 of the 2 required list items in cart) — no discount at all", () => {
    const cartItems = [{ productId: "p1", quantity: 1, variantSku: "" }];
    const ctx = ctxFor(cartItems, 0);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    expect(result.matchedPromotions).toHaveLength(0);
  });
});
