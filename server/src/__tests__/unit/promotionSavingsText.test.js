import { buildCartContext } from "../../utils/promotionEngine.util.js";
import { buildPromotionDisplayModel } from "../../services/promotionPresentation.service.js";

/**
 * Regression test for savingsText on "alternative reward" promotions —
 * multiple reward lines, each naming its OWN distinct product+variant
 * target (e.g. "Exciting Offers": add the Single stand, get 100% off it;
 * add the Double, get 50% off IT instead; add the Triple, get 50% off
 * IT instead" — the customer picks ONE, never all three at once (see
 * "choose your reward item" in the unlock sheet). The old behavior joined
 * every reward's text with " + " ("100% off + 50% off + 50% off"), which
 * read as all three discounts applying to the same cart simultaneously —
 * reported as misleading/wrong info on the real storefront sheet.
 */

const STAND = "stand-01";
const SINGLE_SKU = "SINGLE";
const DOUBLE_SKU = "DOUBLE";
const TRIPLE_SKU = "TRIPLE";

function ctxFor(cartItems) {
  return buildCartContext(cartItems, { subtotal: 0, productMeta: new Map() });
}

describe("buildSavingsText (via buildPromotionDisplayModel) — alternative-reward promotions", () => {
  test("3 reward lines, each targeting a DIFFERENT variant of the same product, show 'Up to X% off' — not a misleading '+' join", () => {
    const promo = {
      _id: "promo-exciting-offers",
      name: "Exciting Offers",
      isActive: true,
      priority: 0,
      conditionTree: { field: "product", productId: "katana", minQuantity: 1 },
      rewards: [
        { type: "percent_off_product", value: 100, targetProductId: STAND, targetVariantSku: SINGLE_SKU },
        { type: "percent_off_product", value: 50, targetProductId: STAND, targetVariantSku: DOUBLE_SKU },
        { type: "percent_off_product", value: 50, targetProductId: STAND, targetVariantSku: TRIPLE_SKU },
      ],
    };
    const ctx = ctxFor([{ productId: "katana", quantity: 1, variantSku: "" }]);
    const model = buildPromotionDisplayModel(promo, ctx, { placement: "cart" });
    expect(model.savingsText).toBe("Up to 100% off");
    expect(model.savingsText).not.toContain("+"); // the actual bug — never re-introduce the additive join for this shape
  });

  test("a single reward (the normal, non-alternative case) is completely unaffected", () => {
    const promo = {
      _id: "promo-single",
      name: "Simple Discount",
      isActive: true,
      priority: 0,
      conditionTree: { field: "product", productId: "katana", minQuantity: 1 },
      rewards: [{ type: "percent_off_product", value: 20, targetProductId: STAND }],
    };
    const ctx = ctxFor([{ productId: "katana", quantity: 1, variantSku: "" }]);
    const model = buildPromotionDisplayModel(promo, ctx, { placement: "cart" });
    expect(model.savingsText).toBe("20% off");
  });

  test("genuinely different, UNRELATED reward lines (e.g. free shipping + an order-level discount) still join with '+' — they really do both apply", () => {
    const promo = {
      _id: "promo-combo",
      name: "Combo Deal",
      isActive: true,
      priority: 0,
      conditionTree: { field: "cartSubtotal", operator: "gte", value: 0 },
      rewards: [{ type: "free_shipping" }, { type: "percent_off_order", value: 10 }],
    };
    const ctx = ctxFor([{ productId: "katana", quantity: 1, variantSku: "" }]);
    const model = buildPromotionDisplayModel(promo, ctx, { placement: "cart" });
    expect(model.savingsText).toBe("Free shipping + 10% off");
  });

  test("flat ₹ alternative rewards show 'Up to ₹X off', not a % sign", () => {
    const promo = {
      _id: "promo-flat-alt",
      name: "Pick Your Stand",
      isActive: true,
      priority: 0,
      conditionTree: { field: "product", productId: "katana", minQuantity: 1 },
      rewards: [
        { type: "flat_off_product", value: 200, targetProductId: STAND, targetVariantSku: SINGLE_SKU },
        { type: "flat_off_product", value: 100, targetProductId: STAND, targetVariantSku: DOUBLE_SKU },
      ],
    };
    const ctx = ctxFor([{ productId: "katana", quantity: 1, variantSku: "" }]);
    const model = buildPromotionDisplayModel(promo, ctx, { placement: "cart" });
    expect(model.savingsText).toBe("Up to ₹200 off");
  });

  test("mixed reward types among alternative targets (e.g. a free gift among percent-off lines) falls back to a neutral phrase, not a wrong number", () => {
    const promo = {
      _id: "promo-mixed-alt",
      name: "Mixed Alt",
      isActive: true,
      priority: 0,
      conditionTree: { field: "product", productId: "katana", minQuantity: 1 },
      rewards: [
        { type: "free_product", targetProductId: STAND, targetVariantSku: SINGLE_SKU },
        { type: "percent_off_product", value: 50, targetProductId: STAND, targetVariantSku: DOUBLE_SKU },
      ],
    };
    const ctx = ctxFor([{ productId: "katana", quantity: 1, variantSku: "" }]);
    const model = buildPromotionDisplayModel(promo, ctx, { placement: "cart" });
    expect(model.savingsText).toBe("Choose your reward");
  });
});
