import { describe, it, expect } from "@jest/globals";
import { evaluatePromotions, buildCartContext } from "../utils/promotionEngine.util.js";
import {
  buildGiftEntitlements,
  validateGiftClaims,
  describeGiftEntitlements,
  entitlementKey,
} from "../services/giftClaims.service.js";

// Real shapes used by the katana ladder (conditions use exact counts; the three share one promotionGroup).
const WOOD = "wood";
const LED = "led";
const STAND = "stand";
const KEY = "key";
const list = (n) => ({
  op: "AND",
  children: [{ field: "productList", items: [{ productId: WOOD, variantSku: "" }, { productId: LED, variantSku: "" }], minQuantity: n, operator: "eq", countMode: "units" }],
});
const gift = (_id, name, n, priority, productId, sku) => ({
  _id, name, promotionType: "automatic", isActive: true, startsAt: null, endsAt: null,
  stackable: true, exclusive: false, priority, promotionGroup: "katana-stand-ladder",
  conditionTree: list(n),
  rewards: [{ type: "free_product", targetProductId: productId, targetVariantSku: sku, value: 100 }],
  placements: ["cart"],
});
const PROMOS = [
  gift("p-triple", "Triple Stand", 3, 7, STAND, "TRI"),
  gift("p-dual", "Dual Stand", 2, 6, STAND, "DBL"),
  gift("p-mystery", "Mystery", 1, 5, KEY, "KEY1"),
];

const evalCart = (cart, promos = PROMOS) => {
  const items = cart.map(([productId, quantity, variantSku = ""]) => ({ productId, quantity, variantSku }));
  const productMeta = new Map(items.map((i) => [i.productId, { category: "c", subcategory: "s", tags: [] }]));
  const ctx = buildCartContext(items, { subtotal: 0, productMeta });
  return evaluatePromotions(items, ctx, promos);
};
const claim = (promotionId, productId, variantSku, quantity) => ({ promotionId, productId, variantSku, quantity });

describe("gift entitlements", () => {
  it("2 katanas → only the Dual stand is claimable", () => {
    const e = buildGiftEntitlements(evalCart([[WOOD, 2]]).freeGifts);
    expect(e.map((x) => x.promotionId)).toEqual(["p-dual"]);
    expect(e[0]).toMatchObject({ targetProductId: STAND, targetVariantSku: "DBL", quantity: 1 });
  });

  it("3 katanas → only the Triple stand (the group makes the offers mutually exclusive)", () => {
    const e = buildGiftEntitlements(evalCart([[WOOD, 2], [LED, 1]]).freeGifts);
    expect(e.map((x) => x.promotionId)).toEqual(["p-triple"]);
  });

  it("1 katana → Mystery only; 4 katanas → nothing", () => {
    expect(buildGiftEntitlements(evalCart([[LED, 1]]).freeGifts).map((x) => x.promotionId)).toEqual(["p-mystery"]);
    expect(buildGiftEntitlements(evalCart([[WOOD, 2], [LED, 2]]).freeGifts)).toEqual([]);
  });

  it("a paid stand in the cart never changes what is claimable (paid purchases are independent)", () => {
    const e = buildGiftEntitlements(evalCart([[WOOD, 2], [STAND, 1, "TRI"]]).freeGifts);
    expect(e.map((x) => x.promotionId)).toEqual(["p-dual"]);
  });
});

describe("claim validation", () => {
  it("a valid claim is accepted with the entitled quantity", () => {
    const { valid, rejected } = validateGiftClaims([claim("p-dual", STAND, "DBL")], evalCart([[WOOD, 2]]).freeGifts);
    expect(rejected).toEqual([]);
    expect(valid).toHaveLength(1);
    expect(valid[0]).toMatchObject({ promotionId: "p-dual", targetProductId: STAND, targetVariantSku: "DBL", quantity: 1 });
  });

  it("no claim → nothing is issued (gifts are never automatic)", () => {
    expect(validateGiftClaims([], evalCart([[WOOD, 2]]).freeGifts).valid).toEqual([]);
    expect(validateGiftClaims(undefined, evalCart([[WOOD, 2]]).freeGifts).valid).toEqual([]);
  });

  it("duplicate / double-submitted claims never issue the gift twice", () => {
    const { valid } = validateGiftClaims(
      [claim("p-dual", STAND, "DBL", 1), claim("p-dual", STAND, "DBL", 1), claim("p-dual", STAND, "DBL", 5)],
      evalCart([[WOOD, 2]]).freeGifts,
    );
    expect(valid).toHaveLength(1);
    expect(valid[0].quantity).toBe(1);
  });

  it("a claim that stops being eligible after the cart changes is rejected, not converted", () => {
    // customer claimed the Dual stand with 2 katanas, then added a 3rd
    const { valid, rejected } = validateGiftClaims([claim("p-dual", STAND, "DBL")], evalCart([[WOOD, 2], [LED, 1]]).freeGifts);
    expect(valid).toEqual([]);
    expect(rejected).toEqual([expect.objectContaining({ promotionId: "p-dual", reason: "NOT_ELIGIBLE" })]);
  });

  it("reducing the quantity below the requirement rejects the claim", () => {
    const { rejected } = validateGiftClaims([claim("p-dual", STAND, "DBL")], evalCart([[WOOD, 1]]).freeGifts);
    expect(rejected).toHaveLength(1);
  });

  it("an expired / inactive promotion cannot be claimed", () => {
    const expired = PROMOS.map((p) => (p._id === "p-dual" ? { ...p, isActive: false } : p));
    const freeGifts = evalCart([[WOOD, 2]], expired.filter((p) => p.isActive)).freeGifts;
    expect(validateGiftClaims([claim("p-dual", STAND, "DBL")], freeGifts).rejected).toHaveLength(1);
  });

  it("a tampered claim (wrong product / SKU / promotion) is rejected", () => {
    const fg = evalCart([[WOOD, 2]]).freeGifts;
    expect(validateGiftClaims([claim("p-dual", STAND, "TRI")], fg).valid).toEqual([]);
    expect(validateGiftClaims([claim("p-dual", "other", "DBL")], fg).valid).toEqual([]);
    expect(validateGiftClaims([claim("p-triple", STAND, "DBL")], fg).valid).toEqual([]);
  });

  it("the same SKU can be a paid item and a claimed gift: the entitlement stays one unit", () => {
    // 2 katanas + a full-price Dual stand in the cart; the free Dual is still exactly one entitlement
    const fg = evalCart([[WOOD, 2], [STAND, 1, "DBL"]]).freeGifts;
    const e = buildGiftEntitlements(fg);
    expect(e).toHaveLength(1);
    expect(e[0].quantity).toBe(1);
    expect(validateGiftClaims([claim("p-dual", STAND, "DBL")], fg).valid).toHaveLength(1);
  });

  it("describe: claimable until claimed, then claimed; invalid claims are reported for the UI", () => {
    const fg = evalCart([[WOOD, 2]]).freeGifts;
    expect(describeGiftEntitlements(fg, []).entitlements[0].status).toBe("claimable");
    expect(describeGiftEntitlements(fg, [claim("p-dual", STAND, "DBL")]).entitlements[0].status).toBe("claimed");
    const bad = describeGiftEntitlements(fg, [claim("p-triple", STAND, "TRI")]);
    expect(bad.invalidClaims).toHaveLength(1);
    expect(entitlementKey({ promotionId: "a", targetProductId: "b", targetVariantSku: "c" })).toBe("a:b:c");
  });
});

// ── building the order's FREE_GIFT lines ──────────────────────────────────────
import { buildGiftOrderLines, GIFT_CLAIM_ERROR } from "../services/giftClaims.service.js";

const standProduct = (qty = null, extra = {}) => ({
  productId: STAND,
  productName: "Katana Display Stand",
  variantDetails: [
    { variantName: "Dual", sku: "DBL", variantPrice: 449, variantQuantity: qty, variantImage: ["dbl.webp"], ...extra },
    { variantName: "Triple", sku: "TRI", variantPrice: 649, variantQuantity: qty, variantImage: ["tri.webp"] },
  ],
});
const stock = (product, variantName, qty) => {
  const v = product.variantDetails.find((x) => x.variantName === variantName);
  if (v?.variantQuantity != null && qty > v.variantQuantity) throw new Error(`Only ${v.variantQuantity} left`);
  if (v?.variantOutOfStock) throw new Error("out of stock");
};
const dualGift = { promotionId: "p-dual", name: "Dual", targetProductId: STAND, targetVariantSku: "DBL", quantity: 1 };
const paid = (variantName, quantity) => ({ productId: STAND, variantSku: "", productSnapshot: { selectedVariant: variantName, quantity, priceAtPurchase: 449 } });

describe("FREE_GIFT order lines", () => {
  const build = (over = {}) => buildGiftOrderLines({
    gifts: [dualGift], products: [], orderItems: [], claimMode: true,
    loadProduct: async () => standProduct(), assertAvailable: stock, ...over,
  });

  it("creates one ₹0 FREE_GIFT line with the exact product, SKU, variant and list price", async () => {
    const [line] = await build();
    expect(line).toMatchObject({ productId: STAND, variantSku: "DBL" });
    expect(line.productSnapshot).toMatchObject({
      quantity: 1, priceAtPurchase: 0, originalUnitPrice: 449, selectedVariant: "Dual",
      lineType: "FREE_GIFT", isPromotionalGift: true, giftPromotionId: "p-dual", giftEntitlementKey: `p-dual:${STAND}:DBL`,
    });
  });

  it("a full-price stand of the same SKU stays a separate PAID line next to the gift", async () => {
    const orderItems = [paid("Dual", 1)];
    const lines = await build({ orderItems });
    expect(lines).toHaveLength(1);
    expect(lines[0].productSnapshot.lineType).toBe("FREE_GIFT");
    expect(orderItems).toHaveLength(1); // the paid line is untouched
  });

  it("stock counts the paid line + the gift together (no oversell)", async () => {
    await expect(build({ loadProduct: async () => standProduct(1), orderItems: [paid("Dual", 1)] }))
      .rejects.toMatchObject({ data: expect.objectContaining({ code: GIFT_CLAIM_ERROR }) });
    // enough for both
    const ok = await build({ loadProduct: async () => standProduct(2), orderItems: [paid("Dual", 1)] });
    expect(ok).toHaveLength(1);
  });

  it("a claimed gift that went out of stock stops the order (never dropped, never charged)", async () => {
    await expect(build({ loadProduct: async () => standProduct(0) })).rejects.toMatchObject({
      statusCode: 400, data: expect.objectContaining({ code: GIFT_CLAIM_ERROR, rejected: [expect.objectContaining({ reason: "UNAVAILABLE" })] }),
    });
  });

  it("a claimed gift whose product / variant disappeared stops the order", async () => {
    await expect(build({ loadProduct: async () => null })).rejects.toThrow();
    await expect(build({ gifts: [{ ...dualGift, targetVariantSku: "GONE" }] })).rejects.toThrow();
  });

  it("legacy (automatic) mode skips an unavailable gift instead of failing the order", async () => {
    const lines = await build({ claimMode: false, loadProduct: async () => standProduct(0) });
    expect(lines).toEqual([]);
  });

  it("quantity is a whole number ≥ 1 even for garbage input", async () => {
    const [line] = await build({ gifts: [{ ...dualGift, quantity: "2.7" }], loadProduct: async () => standProduct(10) });
    expect(line.productSnapshot.quantity).toBe(2);
    const [line2] = await build({ gifts: [{ ...dualGift, quantity: -4 }], loadProduct: async () => standProduct(10) });
    expect(line2.productSnapshot.quantity).toBe(1);
  });
});
