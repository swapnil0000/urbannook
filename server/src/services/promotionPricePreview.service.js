import {
  getDiscountCandidatesForItem,
  applyBestPromotionDiscount,
  createRuleBudgetTracker,
  withRuleBudget,
  spendRuleBudget,
  applicableCap,
} from "../utils/promotionEngine.util.js";

// Display-only quote. Catalog prices and the same discount candidates/shared
// rule budgets used by checkout determine every number; checkout still
// calculates the final charge independently with its full customer context.
export function buildPromotionPricePreview(items, productById, promotionResult) {
  const budgets = createRuleBudgetTracker(promotionResult.discountCandidatesByProduct);
  const lines = [];
  let subtotal = 0;
  let discountedSubtotal = 0;
  const savingsByPromotion = {};

  for (const item of items) {
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
    const discountedUnitPrice = candidates.length ? applyBestPromotionDiscount(price, candidates) : price;
    const discountedUnits = candidates.length && discountedUnitPrice < price
      ? Math.min(quantity, applicableCap(candidates)) : 0;
    const originalLineTotal = price * quantity;
    const lineTotal = discountedUnitPrice * discountedUnits + price * (quantity - discountedUnits);
    const saving = originalLineTotal - lineTotal;
    const winningCandidate = discountedUnits && saving > 0
      ? candidates.find((candidate) => applyBestPromotionDiscount(price, [candidate]) === discountedUnitPrice)
      : null;
    const promotionId = winningCandidate?.ruleId || null;
    if (promotionId) savingsByPromotion[promotionId] = (savingsByPromotion[promotionId] || 0) + saving;
    if (discountedUnits) spendRuleBudget(candidates, budgets, discountedUnits);
    subtotal += originalLineTotal;
    discountedSubtotal += lineTotal;
    lines.push({
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
    });
  }

  return { lines, subtotal, discountedSubtotal, savings: subtotal - discountedSubtotal, savingsByPromotion };
}
