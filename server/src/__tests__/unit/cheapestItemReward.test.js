/**
 * Phase 5 (Admin Offer Control System) — activates cheapest_item_free/
 * cheapest_item_discount at real checkout. Before this, the engine already
 * produced `cheapestItemAdjustments` but nothing in rp.payment.controller.js
 * read it — a promotion using either type would look configured correctly
 * in the admin simulator and then simply grant nothing at the real order.
 *
 * Mocks mirror ruleBudget.sharedCap.test.js's exact pattern — importing
 * rp.payment.controller.js pulls in its full dependency graph, so its DB
 * model / service imports are mocked before the dynamic import below.
 */
import { jest } from "@jest/globals";

jest.unstable_mockModule("../../model/order.model.js", () => ({ default: {} }));
jest.unstable_mockModule("../../services/rp.payement.service.js", () => ({
  razorpayPaymentVerificationService: jest.fn(),
  razorpayCreateOrderService: jest.fn(),
  razorpayFetchOrderService: jest.fn(),
}));

const { applyCheapestItemAdjustment, applyCheapestItemReward } = await import("../../controller/rp.payment.controller.js");

function orderItem(productId, priceAtPurchase, quantity = 1, overrides = {}) {
  return { productId, variantSku: "", productSnapshot: { priceAtPurchase, quantity, productName: productId, ...overrides } };
}

describe("applyCheapestItemAdjustment — single-unit adjustment, remainder-line split", () => {
  test("mode free zeroes the unit price and flags isPromotionalGift", () => {
    const oi = orderItem("p1", 500, 1);
    const { amount, remainderLine } = applyCheapestItemAdjustment(oi, "free", undefined);
    expect(amount).toBe(500);
    expect(oi.productSnapshot.priceAtPurchase).toBe(0);
    expect(oi.productSnapshot.isPromotionalGift).toBe(true);
    expect(remainderLine).toBeNull();
  });

  test("mode discount reduces by the given percent", () => {
    const oi = orderItem("p1", 500, 1);
    const { amount } = applyCheapestItemAdjustment(oi, "discount", 20);
    expect(oi.productSnapshot.priceAtPurchase).toBe(400);
    expect(amount).toBe(100);
  });

  test("quantity > 1 splits off exactly ONE adjusted unit, remainder stays at full price", () => {
    const oi = orderItem("p1", 500, 3);
    const { remainderLine } = applyCheapestItemAdjustment(oi, "free", undefined);
    expect(oi.productSnapshot.quantity).toBe(1);
    expect(oi.productSnapshot.priceAtPurchase).toBe(0);
    expect(remainderLine).not.toBeNull();
    expect(remainderLine.productSnapshot.quantity).toBe(2);
    expect(remainderLine.productSnapshot.priceAtPurchase).toBe(500);
    expect(remainderLine.productSnapshot.isPromotionalGift).toBe(false);
  });
});

describe("applyCheapestItemReward — finds the cheapest CURRENT-price line, single winner, scope-aware", () => {
  const matchedPromotions = [{ _id: "promo-a", priority: 0, stackable: true, createdAt: new Date("2026-01-01") }];

  test("picks the cheapest line among mixed prices/quantities", () => {
    const orderItems = [orderItem("cheap", 100, 2), orderItem("mid", 300, 1), orderItem("expensive", 900, 5)];
    const promoDiscountByPromotionId = new Map();
    applyCheapestItemReward(orderItems, [{ promotionId: "promo-a", mode: "free" }], matchedPromotions, promoDiscountByPromotionId);
    expect(orderItems.find((oi) => oi.productId === "cheap").productSnapshot.isPromotionalGift).toBe(true);
    expect(orderItems.find((oi) => oi.productId === "mid").productSnapshot.priceAtPurchase).toBe(300);
    expect(orderItems.find((oi) => oi.productId === "expensive").productSnapshot.priceAtPurchase).toBe(900);
  });

  test("compares DISCOUNTED (current) prices, not list prices — a product-level discount already applied can make an otherwise-pricier item the actual cheapest", () => {
    // "mid" started at ₹300 but a product-level discount already reduced it
    // to ₹50 before this runs — it should now be picked as cheapest over
    // "cheap"'s own ₹100, even though ₹300 > ₹100 at list price.
    const orderItems = [orderItem("cheap", 100, 1), orderItem("mid", 50, 1)];
    const promoDiscountByPromotionId = new Map();
    applyCheapestItemReward(orderItems, [{ promotionId: "promo-a", mode: "free" }], matchedPromotions, promoDiscountByPromotionId);
    expect(orderItems.find((oi) => oi.productId === "mid").productSnapshot.isPromotionalGift).toBe(true);
    expect(orderItems.find((oi) => oi.productId === "cheap").productSnapshot.priceAtPurchase).toBe(100);
  });

  test("ties are broken deterministically — first in orderItems order wins", () => {
    const orderItems = [orderItem("first", 200, 1), orderItem("second", 200, 1)];
    const promoDiscountByPromotionId = new Map();
    applyCheapestItemReward(orderItems, [{ promotionId: "promo-a", mode: "free" }], matchedPromotions, promoDiscountByPromotionId);
    expect(orderItems[0].productSnapshot.isPromotionalGift).toBe(true);
    expect(orderItems[1].productSnapshot.isPromotionalGift).toBeFalsy();
  });

  test("only ONE cheapest-item adjustment applies even if multiple adjustments matched — highest priority wins", () => {
    const orderItems = [orderItem("cheap", 100, 1), orderItem("mid", 300, 1)];
    const matched = [
      { _id: "promo-low", priority: 0, stackable: true, createdAt: new Date("2026-01-01") },
      { _id: "promo-high", priority: 10, stackable: true, createdAt: new Date("2026-01-01") },
    ];
    const promoDiscountByPromotionId = new Map();
    applyCheapestItemReward(
      orderItems,
      [{ promotionId: "promo-low", mode: "discount", value: 10 }, { promotionId: "promo-high", mode: "free" }],
      matched, promoDiscountByPromotionId,
    );
    // Only the higher-priority promotion's adjustment (free) applies, not both.
    expect(orderItems.find((oi) => oi.productId === "cheap").productSnapshot.isPromotionalGift).toBe(true);
    expect(promoDiscountByPromotionId.get("promo-high")).toBe(100);
    expect(promoDiscountByPromotionId.has("promo-low")).toBe(false);
  });

  test("scopeProductIds narrows the candidate pool to just that scope", () => {
    const orderItems = [orderItem("cheap-out-of-scope", 50, 1), orderItem("pricier-in-scope", 400, 1)];
    const promoDiscountByPromotionId = new Map();
    applyCheapestItemReward(
      orderItems,
      [{ promotionId: "promo-a", mode: "free", scopeProductIds: ["pricier-in-scope"] }],
      matchedPromotions, promoDiscountByPromotionId,
    );
    // The globally-cheapest line is out of scope — the in-scope line wins instead.
    expect(orderItems.find((oi) => oi.productId === "pricier-in-scope").productSnapshot.isPromotionalGift).toBe(true);
    expect(orderItems.find((oi) => oi.productId === "cheap-out-of-scope").productSnapshot.priceAtPurchase).toBe(50);
  });

  test("a free_product gift line (already isPromotionalGift) never counts as a cheapest-item candidate", () => {
    const orderItems = [orderItem("already-gift", 0, 1, { isPromotionalGift: true }), orderItem("paid", 200, 1)];
    const promoDiscountByPromotionId = new Map();
    applyCheapestItemReward(orderItems, [{ promotionId: "promo-a", mode: "free" }], matchedPromotions, promoDiscountByPromotionId);
    expect(orderItems.find((oi) => oi.productId === "paid").productSnapshot.isPromotionalGift).toBe(true);
  });

  test("no-op when cheapestItemAdjustments is empty", () => {
    const orderItems = [orderItem("p1", 100, 1)];
    const promoDiscountByPromotionId = new Map();
    applyCheapestItemReward(orderItems, [], matchedPromotions, promoDiscountByPromotionId);
    expect(orderItems[0].productSnapshot.priceAtPurchase).toBe(100);
    expect(orderItems[0].productSnapshot.isPromotionalGift).toBeFalsy();
  });
});
