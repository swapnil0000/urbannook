import {
  getDiscountCandidatesForItem,
  applyBestPromotionDiscount,
  createRuleBudgetTracker,
  withRuleBudget,
  spendRuleBudget,
  allocateLineSegments,
  budgetSpendOrder,
} from "../utils/promotionEngine.util.js";

// Display-only quote. Catalog prices and the same discount candidates/shared
// rule budgets used by checkout determine every number; checkout still
// calculates the final charge independently with its full customer context.
export function buildPromotionPricePreview(items, productById, promotionResult) {
  const budgets = createRuleBudgetTracker(promotionResult.discountCandidatesByProduct);
  let subtotal = 0;
  let discountedSubtotal = 0;
  const savingsByPromotion = {};

  const priceOfItem = (item) => {
    const product = productById.get(String(item.productId));
    const variant = item.selectedVariant
      ? product?.variantDetails?.find((v) => v.variantName === item.selectedVariant)
      : product?.variantDetails?.[0];
    return Number(variant?.variantPrice ?? product?.price);
  };
  // Lines spend shared budgets most-expensive first (budgetSpendOrder); output keeps cart order.
  const slots = [];
  for (const { item, index } of budgetSpendOrder(items, priceOfItem)) {
    const product = productById.get(String(item.productId));
    const variant = item.selectedVariant
      ? product?.variantDetails?.find((v) => v.variantName === item.selectedVariant)
      : product?.variantDetails?.[0];
    const price = Number(variant?.variantPrice ?? product?.price);
    const quantity = Number(item.quantity);
    if (!product || !Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity <= 0) continue;

    const candidates = withRuleBudget(
      getDiscountCandidatesForItem(promotionResult.discountCandidatesByProduct, item.productId, item.variantSku),
      budgets,
    );
    // one line may be split across promotions from different groups (allocateLineSegments)
    const segments = candidates.length ? allocateLineSegments(price, quantity, candidates, budgets) : [];
    const discountedUnits = segments.reduce((n, sg) => n + sg.units, 0);
    const discountedUnitPrice = segments.length ? segments[0].unitPrice : price;
    const originalLineTotal = price * quantity;
    const lineTotal = segments.reduce((t, sg) => t + sg.unitPrice * sg.units, 0) + price * (quantity - discountedUnits);
    const saving = originalLineTotal - lineTotal;
    for (const sg of segments) {
      const segSaving = (price - sg.unitPrice) * sg.units;
      if (sg.ruleId && segSaving > 0) savingsByPromotion[sg.ruleId] = (savingsByPromotion[sg.ruleId] || 0) + segSaving;
      spendRuleBudget(sg.candidates, budgets, sg.units);
    }
    const promotionId = segments[0]?.ruleId || null;
    subtotal += originalLineTotal;
    discountedSubtotal += lineTotal;
    slots[index] = {
      productId: String(item.productId),
      variantSku: item.variantSku || "",
      selectedVariant: item.selectedVariant || null,
      quantity,
      originalUnitPrice: price,
      discountedUnitPrice,
      discountedUnits,
      originalLineTotal,
      lineTotal,
      savings: saving,
      promotionId,
      // which offer discounted how many units (a line can be split, e.g. LED + Wooden stand offers)
      shares: segments.filter((sg) => sg.ruleId).map((sg) => ({ promotionId: sg.ruleId, units: sg.units, unitPrice: sg.unitPrice })),
    };
  }
  const lines = slots.filter(Boolean);

  // what each promotion can still discount ("ruleId" and "ruleId|sku" keys), for "pick one more"
  const budgetsLeft = Object.fromEntries(budgets);
  return { lines, subtotal, discountedSubtotal, savings: subtotal - discountedSubtotal, savingsByPromotion, budgetsLeft };
}
