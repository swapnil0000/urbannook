import { couponUnlocksFreeShipping } from "../../utils/magicPromotions.util.js";

const promo = (over = {}) => ({
  _id: "p1",
  isActive: true,
  linkedCouponCode: "UNFREESHIPPING",
  combinesWithCoupons: true,
  priority: 0,
  stackable: false,
  conditionTree: { op: "AND", children: [{ field: "cartSubtotal", operator: "gte", value: 249 }] },
  rewards: [{ type: "free_shipping" }],
  ...over,
});
const items = [{ productId: "x", quantity: 1, variantSku: "" }];
const run = (promos, code, subtotal = 500) => couponUnlocksFreeShipping(promos, code, items, { subtotal, productMeta: new Map(), isGuest: true });

describe("couponUnlocksFreeShipping (Magic apply-promotion)", () => {
  test("the linked coupon unlocks free shipping when the cart condition holds", () => {
    expect(run([promo()], "UNFREESHIPPING")).toBe(true);
    expect(run([promo()], " unfreeshipping ")).toBe(true);
  });
  test("a different coupon does not", () => {
    expect(run([promo()], "WELCOME10")).toBe(false);
  });
  test("cart below the promotion's condition does not", () => {
    expect(run([promo()], "UNFREESHIPPING", 200)).toBe(false);
  });
  test("a linked promotion without a free_shipping reward does not", () => {
    expect(run([promo({ rewards: [{ type: "percent_off_order", value: 10 }] })], "UNFREESHIPPING")).toBe(false);
  });
  test("no promotions / no code", () => {
    expect(run([], "UNFREESHIPPING")).toBe(false);
    expect(run([promo()], "")).toBe(false);
  });
});
