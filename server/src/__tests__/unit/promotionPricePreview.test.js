import { buildPromotionPricePreview } from "../../services/promotionPricePreview.service.js";

test("quotes exact variants and only discounted units using the checkout budget rules", () => {
  const products = new Map([["product", {
    productId: "product",
    variantDetails: [
      { variantName: "Red", sku: "RED", variantPrice: 100 },
      { variantName: "Blue", sku: "BLUE", variantPrice: 150 },
    ],
  }]]);
  const result = { discountCandidatesByProduct: new Map([["product", [
    { type: "percent_off_product", value: 10, variantSku: "RED", cap: 1, ruleId: "offer" },
  ]]]) };
  const quote = buildPromotionPricePreview([
    { productId: "product", selectedVariant: "Red", variantSku: "RED", quantity: 2 },
    { productId: "product", selectedVariant: "Blue", variantSku: "BLUE", quantity: 1 },
  ], products, result);

  expect(quote).toMatchObject({ subtotal: 350, discountedSubtotal: 340, savings: 10, savingsByPromotion: { offer: 10 } });
  expect(quote.lines[0]).toMatchObject({ discountedUnits: 1, originalLineTotal: 200, lineTotal: 190, promotionId: "offer" });
  expect(quote.lines[1]).toMatchObject({ discountedUnits: 0, originalLineTotal: 150, lineTotal: 150, promotionId: null });
});

test("sibling reward variants share one promotion quantity budget", () => {
  const products = new Map([["product", {
    productId: "product",
    variantDetails: [
      { variantName: "Red", sku: "RED", variantPrice: 100 },
      { variantName: "Blue", sku: "BLUE", variantPrice: 100 },
    ],
  }]]);
  const result = { discountCandidatesByProduct: new Map([["product", [
    { type: "percent_off_product", value: 50, variantSku: "RED", cap: 1, ruleId: "offer" },
    { type: "percent_off_product", value: 50, variantSku: "BLUE", cap: 1, ruleId: "offer" },
  ]]]) };
  const quote = buildPromotionPricePreview([
    { productId: "product", selectedVariant: "Red", variantSku: "RED", quantity: 1 },
    { productId: "product", selectedVariant: "Blue", variantSku: "BLUE", quantity: 1 },
  ], products, result);

  expect(quote).toMatchObject({ subtotal: 200, discountedSubtotal: 150, savings: 50, savingsByPromotion: { offer: 50 } });
  expect(quote.lines.map((line) => line.discountedUnits)).toEqual([1, 0]);
});
