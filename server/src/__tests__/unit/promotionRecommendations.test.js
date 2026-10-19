import { buildCartContext } from "../../utils/promotionEngine.util.js";
import { findFirstUnmetProductLeaf, toRecommendationCard } from "../../controller/promotion.controller.js";

/**
 * Covers the generic (never-hardcoded) leaf-resolution logic behind the
 * storefront's "add more to unlock" bottom sheet: given a promotion's own
 * conditionTree + the live cart context, which single unmet leaf should
 * drive product recommendations — the same walk buildProgressText already
 * does in promotionPresentation.service.js, but returning the leaf itself.
 */

function ctxFor(cartItems, subtotal = 0) {
  return buildCartContext(cartItems, { subtotal });
}

describe("findFirstUnmetProductLeaf", () => {
  test("a single unmet product leaf is returned directly", () => {
    const tree = { field: "product", productId: "lamp-01", minQuantity: 2 };
    const ctx = ctxFor([{ productId: "lamp-01", quantity: 1, variantSku: "" }]);
    expect(findFirstUnmetProductLeaf(tree, ctx)).toEqual(tree);
  });

  test("an already-met leaf returns null — nothing to recommend", () => {
    const tree = { field: "product", productId: "lamp-01", minQuantity: 2 };
    const ctx = ctxFor([{ productId: "lamp-01", quantity: 2, variantSku: "" }]);
    expect(findFirstUnmetProductLeaf(tree, ctx)).toBeNull();
  });

  test("AND group returns the first unmet product leaf, skipping already-met siblings", () => {
    const tree = {
      op: "AND",
      children: [
        { field: "product", productId: "stand-01", minQuantity: 1 },
        { field: "product", productId: "katana-01", minQuantity: 2 },
      ],
    };
    const ctx = ctxFor([
      { productId: "stand-01", quantity: 1, variantSku: "" },
      { productId: "katana-01", quantity: 1, variantSku: "" },
    ]);
    expect(findFirstUnmetProductLeaf(tree, ctx)).toEqual(tree.children[1]);
  });

  test("OR group with one branch already met returns null — the customer already qualifies via that branch", () => {
    const tree = {
      op: "OR",
      children: [
        { field: "product", productId: "lamp-01", minQuantity: 1 },
        { field: "category", value: "Katanas", minQuantity: 2 },
      ],
    };
    const ctx = ctxFor([{ productId: "lamp-01", quantity: 1, variantSku: "" }]);
    expect(findFirstUnmetProductLeaf(tree, ctx)).toBeNull();
  });

  test("OR group with neither branch met returns the FIRST branch's leaf", () => {
    const tree = {
      op: "OR",
      children: [
        { field: "product", productId: "lamp-01", minQuantity: 2 },
        { field: "category", value: "Katanas", minQuantity: 2 },
      ],
    };
    const ctx = ctxFor([]);
    expect(findFirstUnmetProductLeaf(tree, ctx)).toEqual(tree.children[0]);
  });

  test("a non-product unmet leaf (cartSubtotal) is NOT returned — no safe product guess for it", () => {
    const tree = { field: "cartSubtotal", operator: "gte", value: 2000 };
    const ctx = ctxFor([], 500);
    expect(findFirstUnmetProductLeaf(tree, ctx)).toBeNull();
  });

  test("category/subcategory/tag leaves ARE returned when unmet", () => {
    const tree = { field: "category", value: "Katanas", minQuantity: 2, operator: "gte" };
    const ctx = ctxFor([]);
    expect(findFirstUnmetProductLeaf(tree, ctx)).toEqual(tree);
  });
});

describe("toRecommendationCard", () => {
  const baseProduct = { productId: "stand-01", productName: "Pen Stand", productImg: "https://example.com/stand.jpg" };

  test("resolves price/image/sku from the given (or first) variant", () => {
    const product = {
      ...baseProduct,
      variantDetails: [{ variantName: "Blue", sku: "STDBLU001", variantPrice: 299, variantMrp: 399, variantImage: ["https://example.com/blue.jpg"] }],
    };
    expect(toRecommendationCard(product)).toEqual({
      productId: "stand-01",
      productName: "Pen Stand",
      variantName: "Blue",
      sku: "STDBLU001",
      price: 299,
      mrp: 399,
      image: "https://example.com/blue.jpg",
    });
  });

  test("falls back to the product image when the variant has none", () => {
    const product = { ...baseProduct, variantDetails: [{ variantName: "Blue", sku: "STDBLU001", variantPrice: 299, variantImage: [] }] };
    expect(toRecommendationCard(product)?.image).toBe("https://example.com/stand.jpg");
  });

  test("an out-of-stock variant (manual flag) is never recommended", () => {
    const product = { ...baseProduct, variantDetails: [{ variantName: "Blue", sku: "STDBLU001", variantPrice: 299, variantOutOfStock: true }] };
    expect(toRecommendationCard(product)).toBeNull();
  });

  test("a tracked variant at zero quantity is never recommended", () => {
    const product = { ...baseProduct, variantDetails: [{ variantName: "Blue", sku: "STDBLU001", variantPrice: 299, variantQuantity: 0 }] };
    expect(toRecommendationCard(product)).toBeNull();
  });

  test("a product with no variants at all is never recommended", () => {
    expect(toRecommendationCard({ ...baseProduct, variantDetails: [] })).toBeNull();
  });
});
