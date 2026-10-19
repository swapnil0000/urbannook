import { evaluatePromotions, buildCartContext, applyBestPromotionDiscount, getDiscountCandidatesForItem } from "../../utils/promotionEngine.util.js";

/**
 * Regression tests for `targetScope` (category/subcategory/tag/all) —
 * added 2026-10-10 so percent_off_product/flat_off_product/discounted_product
 * can target a SET of products (resolved against the live cart) instead of
 * one specific targetProductId. Covers the two real asks this generalizes:
 * "buy 2+ from category X, 10% off everything in category X" and
 * "X% off every product in the cart".
 */

const productMeta = new Map([
  ["lamp-red", { category: "Lamps", subcategory: "", tags: ["anime"] }],
  ["lamp-blue", { category: "Lamps", subcategory: "", tags: ["anime"] }],
  ["stand-01", { category: "Stands", subcategory: "", tags: [] }],
]);

function ctxFor(cartItems, subtotal) {
  return buildCartContext(cartItems, { subtotal, productMeta });
}

function discountFor(result, productId, unitPrice) {
  const candidates = getDiscountCandidatesForItem(result.discountCandidatesByProduct, productId, "");
  if (!candidates.length) return unitPrice;
  return applyBestPromotionDiscount(unitPrice, candidates);
}

describe("targetScope — category/subcategory/tag/all resolve against the live cart", () => {
  test("category scope discounts every matching product in the cart, leaves unrelated products untouched", () => {
    const promo = {
      _id: "promo-cat",
      isActive: true,
      priority: 0,
      stackable: true,
      conditionTree: { field: "category", value: "Lamps", minQuantity: 2 },
      rewards: [{ type: "percent_off_product", targetScope: { field: "category", value: "Lamps" }, value: 10 }],
    };
    const cartItems = [
      { productId: "lamp-red", quantity: 1, variantSku: "" },
      { productId: "lamp-blue", quantity: 1, variantSku: "" },
      { productId: "stand-01", quantity: 1, variantSku: "" },
    ];
    const ctx = ctxFor(cartItems, 3000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);

    expect(discountFor(result, "lamp-red", 1000)).toBe(900);
    expect(discountFor(result, "lamp-blue", 1000)).toBe(900);
    // Stand is NOT in category "Lamps" — must be completely untouched.
    expect(discountFor(result, "stand-01", 1000)).toBe(1000);
  });

  test('"all" scope discounts every product currently in the cart', () => {
    const promo = {
      _id: "promo-all",
      isActive: true,
      priority: 0,
      stackable: true,
      conditionTree: { field: "cartSubtotal", operator: "gte", value: 0 },
      rewards: [{ type: "percent_off_product", targetScope: { field: "all" }, value: 5 }],
    };
    const cartItems = [
      { productId: "lamp-red", quantity: 1, variantSku: "" },
      { productId: "stand-01", quantity: 1, variantSku: "" },
    ];
    const ctx = ctxFor(cartItems, 2000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);

    expect(discountFor(result, "lamp-red", 1000)).toBe(950);
    expect(discountFor(result, "stand-01", 1000)).toBe(950);
  });

  test("scoped reward always discounts the FULL live quantity — discountAllUnits has no bearing here", () => {
    const promo = {
      _id: "promo-cat-qty",
      isActive: true,
      priority: 0,
      stackable: true,
      conditionTree: { field: "category", value: "Lamps", minQuantity: 1 },
      rewards: [{ type: "flat_off_product", targetScope: { field: "category", value: "Lamps" }, value: 100 }],
    };
    const cartItems = [{ productId: "lamp-red", quantity: 3, variantSku: "" }];
    const ctx = ctxFor(cartItems, 3000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    const candidates = getDiscountCandidatesForItem(result.discountCandidatesByProduct, "lamp-red", "");
    expect(candidates[0].cap).toBe(3); // every unit currently in the cart, not just the trigger's repeat count
  });

  test("subcategory and tag scope resolve correctly too, and an unmatched scope value discounts nothing", () => {
    const tagPromo = {
      _id: "promo-tag",
      isActive: true,
      priority: 0,
      stackable: true,
      conditionTree: { field: "tag", value: "anime", minQuantity: 1 },
      rewards: [{ type: "percent_off_product", targetScope: { field: "tag", value: "anime" }, value: 20 }],
    };
    const noMatchPromo = {
      _id: "promo-no-match",
      isActive: true,
      priority: 0,
      stackable: true,
      conditionTree: { field: "cartSubtotal", operator: "gte", value: 0 },
      rewards: [{ type: "percent_off_product", targetScope: { field: "category", value: "Nonexistent" }, value: 50 }],
    };
    const cartItems = [{ productId: "lamp-red", quantity: 1, variantSku: "" }, { productId: "stand-01", quantity: 1, variantSku: "" }];
    const ctx = ctxFor(cartItems, 2000);
    const result = evaluatePromotions(cartItems, ctx, [tagPromo, noMatchPromo]);

    expect(discountFor(result, "lamp-red", 1000)).toBe(800); // tagged "anime"
    expect(discountFor(result, "stand-01", 1000)).toBe(1000); // not tagged, and category never matches
  });

  test("maxApplications still bounds a scoped reward's cap (audit fix, 2026-10-18 — previously ignored entirely for scoped rewards)", () => {
    const promo = {
      _id: "promo-cat-capped",
      isActive: true,
      priority: 0,
      stackable: true,
      conditionTree: { field: "category", value: "Lamps", minQuantity: 1 },
      rewards: [{ type: "percent_off_product", targetScope: { field: "category", value: "Lamps" }, value: 20 }],
      maxApplications: 1,
    };
    const cartItems = [
      { productId: "lamp-red", quantity: 1, variantSku: "" },
      { productId: "lamp-blue", quantity: 1, variantSku: "" },
    ];
    const ctx = ctxFor(cartItems, 2000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    const redCap = getDiscountCandidatesForItem(result.discountCandidatesByProduct, "lamp-red", "")[0].cap;
    const blueCap = getDiscountCandidatesForItem(result.discountCandidatesByProduct, "lamp-blue", "")[0].cap;
    // maxApplications: 1 must clamp EACH scoped candidate's cap to 1 unit —
    // not the full live quantity of every matching product.
    expect(redCap).toBe(1);
    expect(blueCap).toBe(1);
  });

  test("an explicit targetProductId reward is completely unaffected by targetScope's existence (backward compatible)", () => {
    const promo = {
      _id: "promo-single",
      isActive: true,
      priority: 0,
      stackable: true,
      conditionTree: { field: "product", productId: "lamp-red", minQuantity: 1 },
      rewards: [{ type: "percent_off_product", targetProductId: "lamp-red", value: 15 }],
    };
    const cartItems = [{ productId: "lamp-red", quantity: 1, variantSku: "" }, { productId: "lamp-blue", quantity: 1, variantSku: "" }];
    const ctx = ctxFor(cartItems, 2000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);

    expect(discountFor(result, "lamp-red", 1000)).toBe(850);
    // lamp-blue is the SAME category but this reward names one specific
    // product — must not spill over to it.
    expect(discountFor(result, "lamp-blue", 1000)).toBe(1000);
  });
});
