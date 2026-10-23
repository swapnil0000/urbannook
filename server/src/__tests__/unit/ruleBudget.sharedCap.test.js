/**
 * Regression test for the shared-rule-budget fix in rp.payment.controller.js.
 *
 * Bug this guards against (confirmed on a real PAID order): a promotion like
 * "Exciting Offers" (condition: 1+ Katana; rewards: Single Stand FREE,
 * Double Stand 50% off, Triple Stand 50% off) used to let EVERY one of its
 * sibling reward lines apply independently, each with its own untouched
 * copy of the rule's cap — so a customer who added the Single stand (free)
 * and SEPARATELY the Double stand (50% off) got BOTH discounted off a
 * single Katana, when only ONE stand (any variant) should ever benefit.
 *
 * Ported 2026-10-09 from the legacy cart_rule-shaped version of this same
 * test (cartRule.util.js/evaluateCartRules were deleted entirely — checkout
 * now evaluates ONLY Promotion Engine V2) onto the real exported helpers
 * (evaluatePromotions, buildCartContext, applyBestPromotionDiscount,
 * createRuleBudgetTracker, withRuleBudget, spendRuleBudget, applicableCap,
 * capDiscountedQuantity) against the exact same "Exciting Offers" shape,
 * now expressed as a Promotion conditionTree+rewards document. Same 5 cases,
 * same assertions, same protection — just the real system, not a deleted one.
 */
import { jest } from "@jest/globals";

jest.unstable_mockModule("../../model/order.model.js", () => ({ default: {} }));
jest.unstable_mockModule("../../services/rp.payement.service.js", () => ({
  razorpayPaymentVerificationService: jest.fn(),
  razorpayCreateOrderService: jest.fn(),
  razorpayFetchOrderService: jest.fn(),
}));

const {
  evaluatePromotions,
  buildCartContext,
  applyBestPromotionDiscount,
  getDiscountCandidatesForItem,
  createRuleBudgetTracker,
  withRuleBudget,
  spendRuleBudget,
  applicableCap,
} = await import("../../utils/promotionEngine.util.js");
const { capDiscountedQuantity } = await import("../../controller/rp.payment.controller.js");

const KATANA = "0893c4fd-3020-4fa0-9529-9c12044931fb";
const STAND = "85fefd4b-4312-48ac-bf81-5662504db252";
const SINGLE_SKU = "ANIKSTSGLS";
const DOUBLE_SKU = "ANIKSTDBLS";
const TRIPLE_SKU = "ANIKSTTRIS";

// Same promotion, now in real conditionTree+rewards shape.
const EXCITING_OFFERS_PROMO = {
  _id: "promo-exciting-offers",
  name: "Exciting Offers",
  isActive: true,
  conditionTree: { field: "product", productId: KATANA, minQuantity: 1 },
  rewards: [
    { type: "percent_off_product", value: 100, targetProductId: STAND, targetVariantSku: SINGLE_SKU },
    { type: "percent_off_product", value: 50, targetProductId: STAND, targetVariantSku: DOUBLE_SKU },
    { type: "percent_off_product", value: 50, targetProductId: STAND, targetVariantSku: TRIPLE_SKU },
  ],
};

// Mirrors the real controller's per-item loop exactly (same functions, same
// order of operations) so this test proves the actual checkout behavior,
// not just the standalone helpers in isolation.
function applyDiscounts(orderItems, activePromotions) {
  const cartItems = orderItems.map((oi) => ({ productId: oi.productId, quantity: oi.productSnapshot.quantity, variantSku: oi.variantSku }));
  const ctx = buildCartContext(cartItems, { subtotal: orderItems.reduce((s, i) => s + i.productSnapshot.priceAtPurchase * i.productSnapshot.quantity, 0) });
  const { discountCandidatesByProduct } = evaluatePromotions(cartItems, ctx, activePromotions);
  const ruleBudgets = createRuleBudgetTracker(discountCandidatesByProduct);
  const extraLines = [];
  for (const oi of orderItems) {
    const rawCandidates = getDiscountCandidatesForItem(discountCandidatesByProduct, oi.productId, oi.variantSku);
    const candidates = withRuleBudget(rawCandidates, ruleBudgets);
    if (candidates?.length) {
      const fullPrice = oi.productSnapshot.priceAtPurchase;
      const discountedPrice = applyBestPromotionDiscount(fullPrice, candidates);
      const cap = applicableCap(candidates);
      const unitsUsed = Math.min(oi.productSnapshot.quantity, cap);
      const remainderLine = capDiscountedQuantity(oi, fullPrice, discountedPrice, cap);
      spendRuleBudget(candidates, ruleBudgets, unitsUsed);
      if (remainderLine) extraLines.push(remainderLine);
    }
  }
  return [...orderItems, ...extraLines];
}

const orderItem = (productId, variantSku, price, qty = 1) => ({
  productId,
  variantSku,
  productSnapshot: { priceAtPurchase: price, quantity: qty },
});

describe("Shared rule budget — sibling reward lines of the same promotion", () => {
  test("Single added FIRST (free), Double added SECOND → Double stays FULL PRICE (the exact reported bug)", () => {
    const items = [
      orderItem(KATANA, "", 2499),
      orderItem(STAND, SINGLE_SKU, 399), // added first
      orderItem(STAND, DOUBLE_SKU, 449), // added second
    ];
    const result = applyDiscounts(items, [EXCITING_OFFERS_PROMO]);
    const single = result.find((i) => i.variantSku === SINGLE_SKU);
    const double = result.find((i) => i.variantSku === DOUBLE_SKU);
    expect(single.productSnapshot.priceAtPurchase).toBe(0); // first in cart — gets the free reward
    expect(double.productSnapshot.priceAtPurchase).toBe(449); // budget exhausted — full price, NOT 50% off
  });

  test("ONLY Double added (no Single in cart) → Double still gets its own 50% off", () => {
    const items = [
      orderItem(KATANA, "", 2499),
      orderItem(STAND, DOUBLE_SKU, 449),
    ];
    const result = applyDiscounts(items, [EXCITING_OFFERS_PROMO]);
    const double = result.find((i) => i.variantSku === DOUBLE_SKU);
    expect(double.productSnapshot.priceAtPurchase).toBe(225); // 50% off 449, rounded
  });

  test("Double added FIRST (50% off), Single added SECOND → Single stays FULL PRICE (order-independent, not single-privileged)", () => {
    const items = [
      orderItem(KATANA, "", 2499),
      orderItem(STAND, DOUBLE_SKU, 449), // added first this time
      orderItem(STAND, SINGLE_SKU, 399), // added second
    ];
    const result = applyDiscounts(items, [EXCITING_OFFERS_PROMO]);
    const double = result.find((i) => i.variantSku === DOUBLE_SKU);
    const single = result.find((i) => i.variantSku === SINGLE_SKU);
    expect(double.productSnapshot.priceAtPurchase).toBe(225);
    expect(single.productSnapshot.priceAtPurchase).toBe(399); // full price — budget already spent
  });

  test("2 Katanas in cart → budget is 2, so BOTH Single and Double can be discounted", () => {
    const items = [
      orderItem(KATANA, "", 2499, 2),
      orderItem(STAND, SINGLE_SKU, 399),
      orderItem(STAND, DOUBLE_SKU, 449),
    ];
    const result = applyDiscounts(items, [EXCITING_OFFERS_PROMO]);
    const single = result.find((i) => i.variantSku === SINGLE_SKU);
    const double = result.find((i) => i.variantSku === DOUBLE_SKU);
    expect(single.productSnapshot.priceAtPurchase).toBe(0);
    expect(double.productSnapshot.priceAtPurchase).toBe(225);
  });

  test("no Katana in cart → neither stand is discounted at all", () => {
    const items = [
      orderItem(STAND, SINGLE_SKU, 399),
      orderItem(STAND, DOUBLE_SKU, 449),
    ];
    const result = applyDiscounts(items, [EXCITING_OFFERS_PROMO]);
    expect(result.find((i) => i.variantSku === SINGLE_SKU).productSnapshot.priceAtPurchase).toBe(399);
    expect(result.find((i) => i.variantSku === DOUBLE_SKU).productSnapshot.priceAtPurchase).toBe(449);
  });
});
