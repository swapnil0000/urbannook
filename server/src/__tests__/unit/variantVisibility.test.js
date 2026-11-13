import { sortVariantsOOSLast, withoutHiddenVariants, isVariantVisible } from "../../utils/variantSort.js";

describe("hidden (unpublished) variants", () => {
  test("sort puts hidden variants after in-stock and out-of-stock ones", () => {
    const sorted = sortVariantsOOSLast([
      { variantName: "Draft", isActive: false, variantQuantity: 3 },
      { variantName: "OOS", variantOutOfStock: true },
      { variantName: "A", variantQuantity: 2 },
    ]);
    expect(sorted.map((v) => v.variantName)).toEqual(["A", "OOS", "Draft"]);
  });

  test("withoutHiddenVariants drops isActive false and keeps the rest", () => {
    const p = { productId: "x", variantDetails: [{ variantName: "A" }, { variantName: "Draft", isActive: false }, { variantName: "B", isActive: true }] };
    expect(withoutHiddenVariants(p).variantDetails.map((v) => v.variantName)).toEqual(["A", "B"]);
    expect(p.variantDetails).toHaveLength(3); // input not mutated
  });

  test("passes through products without variants", () => {
    expect(withoutHiddenVariants({ productId: "y" })).toEqual({ productId: "y" });
    expect(withoutHiddenVariants(null)).toBeNull();
    expect(isVariantVisible(undefined)).toBe(false);
  });
});

describe("products with every variant hidden", () => {
  test("visibleProductsOnly drops them and hasNoVisibleVariants flags them", async () => {
    const { visibleProductsOnly, hasNoVisibleVariants, firstVisibleVariant } = await import("../../utils/variantSort.js");
    const allHidden = { productId: "h", variantDetails: [{ variantName: "D", isActive: false }] };
    const mixed = { productId: "m", variantDetails: [{ variantName: "D", isActive: false, variantPrice: 1 }, { variantName: "A", variantPrice: 999 }] };
    const noVariants = { productId: "n", variantDetails: [] };
    expect(hasNoVisibleVariants(allHidden)).toBe(true);
    expect(hasNoVisibleVariants(noVariants)).toBe(false);
    expect(visibleProductsOnly([allHidden, mixed, noVariants]).map((p) => p.productId)).toEqual(["m", "n"]);
    expect(firstVisibleVariant(mixed).variantPrice).toBe(999);
  });
});
