import { evaluatePromotions, buildCartContext, getDiscountCandidatesForItem, applyBestPromotionDiscount } from "../../utils/promotionEngine.util.js";

/**
 * Phase 3 (Admin Offer Control System) — tiers: [{minQuantity, value}] on
 * percent_off_product/flat_off_product/discounted_product rewards, alongside
 * (not replacing) the flat `value` field. The applied value is resolved off
 * the PROMOTION'S OWN condition quantity (the same figure
 * promotionRepeatCount measures) — never cumulative/stacked, highest
 * qualifying tier wins.
 */

const productMeta = new Map([
  ["katana", { category: "Katana", subcategory: "", tags: [] }],
  ["stand-01", { category: "Stands", subcategory: "", tags: [] }],
]);

function ctxFor(cartItems, subtotal = 0) {
  return buildCartContext(cartItems, { subtotal, productMeta });
}

function discountedPriceFor(result, productId, unitPrice) {
  const candidates = getDiscountCandidatesForItem(result.discountCandidatesByProduct, productId, "");
  if (!candidates.length) return unitPrice;
  return applyBestPromotionDiscount(unitPrice, candidates);
}

function tieredPromo(tiers) {
  return {
    _id: "promo-tiered",
    isActive: true,
    priority: 0,
    conditionTree: { field: "product", productId: "katana", minQuantity: 1 },
    rewards: [{ type: "percent_off_product", targetProductId: "katana", tiers }],
  };
}

const TIERS = [{ minQuantity: 2, value: 10 }, { minQuantity: 4, value: 20 }];

describe("tiers — reward value resolved off the promotion's own condition quantity", () => {
  test("crossing tier 1 only (2 katanas) applies the tier-1 value", () => {
    const cartItems = [{ productId: "katana", quantity: 2, variantSku: "" }];
    const ctx = ctxFor(cartItems, 2000);
    const result = evaluatePromotions(cartItems, ctx, [tieredPromo(TIERS)]);
    expect(discountedPriceFor(result, "katana", 1000)).toBe(900); // 10% off
  });

  test("crossing tier 2 (4 katanas) applies the HIGHER tier-2 value, not tier-1 summed with it", () => {
    const cartItems = [{ productId: "katana", quantity: 4, variantSku: "" }];
    const ctx = ctxFor(cartItems, 4000);
    const result = evaluatePromotions(cartItems, ctx, [tieredPromo(TIERS)]);
    expect(discountedPriceFor(result, "katana", 1000)).toBe(800); // 20% off, not 10%+20%=30%
  });

  test("quantity BETWEEN tiers (3 katanas) applies the lower tier (last one actually crossed)", () => {
    const cartItems = [{ productId: "katana", quantity: 3, variantSku: "" }];
    const ctx = ctxFor(cartItems, 3000);
    const result = evaluatePromotions(cartItems, ctx, [tieredPromo(TIERS)]);
    expect(discountedPriceFor(result, "katana", 1000)).toBe(900); // still tier 1 (10%)
  });

  test("below the lowest tier (1 katana, condition itself still matches at minQuantity 1) falls back to the flat value field — absent here, so no discount applies", () => {
    const cartItems = [{ productId: "katana", quantity: 1, variantSku: "" }];
    const ctx = ctxFor(cartItems, 1000);
    const result = evaluatePromotions(cartItems, ctx, [tieredPromo(TIERS)]);
    // No tier crossed and no flat `value` set -> candidate pushed with
    // value undefined -> applyBestPromotionDiscount treats it as no discount.
    expect(discountedPriceFor(result, "katana", 1000)).toBe(1000);
  });

  test("below the lowest tier falls back to the flat `value` field when one IS set alongside tiers", () => {
    const promo = tieredPromo(TIERS);
    promo.rewards[0].value = 5; // flat fallback
    const cartItems = [{ productId: "katana", quantity: 1, variantSku: "" }];
    const ctx = ctxFor(cartItems, 1000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    expect(discountedPriceFor(result, "katana", 1000)).toBe(950); // 5% flat fallback
  });

  test("a reward with NO tiers behaves exactly as before (backward compatible)", () => {
    const promo = {
      _id: "promo-flat",
      isActive: true,
      priority: 0,
      conditionTree: { field: "product", productId: "katana", minQuantity: 1 },
      rewards: [{ type: "percent_off_product", targetProductId: "katana", value: 25 }],
    };
    const cartItems = [{ productId: "katana", quantity: 1, variantSku: "" }];
    const ctx = ctxFor(cartItems, 1000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    expect(discountedPriceFor(result, "katana", 1000)).toBe(750);
  });

  test("tiers combined with a SCOPED reward (targetScope) — tier resolved off the condition quantity, applied to every matched product in the scope", () => {
    const promo = {
      _id: "promo-tiered-scoped",
      isActive: true,
      priority: 0,
      conditionTree: { field: "product", productId: "katana", minQuantity: 1 },
      rewards: [{ type: "percent_off_product", targetScope: { field: "category", value: "Stands" }, tiers: TIERS }],
    };
    const cartItems = [{ productId: "katana", quantity: 4, variantSku: "" }, { productId: "stand-01", quantity: 1, variantSku: "" }];
    const ctx = ctxFor(cartItems, 5000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    // 4 katanas -> tier 2 (20%) -> applied to stand-01 (the scoped target).
    expect(discountedPriceFor(result, "stand-01", 1000)).toBe(800);
  });

  test("tiers combined with discountAllUnits is a no-op for discountAllUnits (tiers controls VALUE, discountAllUnits controls CAP — both independent, both still apply)", () => {
    const promo = {
      _id: "promo-tiered-all-units",
      isActive: true,
      priority: 0,
      conditionTree: { field: "product", productId: "katana", minQuantity: 2 },
      rewards: [{ type: "percent_off_product", targetProductId: "katana", tiers: TIERS, discountAllUnits: true }],
    };
    const cartItems = [{ productId: "katana", quantity: 4, variantSku: "" }];
    const ctx = ctxFor(cartItems, 4000);
    const result = evaluatePromotions(cartItems, ctx, [promo]);
    const candidates = getDiscountCandidatesForItem(result.discountCandidatesByProduct, "katana", "");
    expect(candidates[0].cap).toBe(4); // discountAllUnits: full live quantity, not floor(4/2)=2
    expect(discountedPriceFor(result, "katana", 1000)).toBe(800); // tier 2 (20%) value still applies
  });
});
