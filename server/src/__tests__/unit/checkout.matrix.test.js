/**
 * Checkout charge matrix — every path a customer can actually take.
 *
 *   who:      guest · logged-in · WhatsApp-login
 *   how:      COD · prepaid (old flow) · prepaid (Magic 1CC)
 *   coupon:   none · FLAT · PERCENTAGE (+cap) · INTERNAL_TEST
 *   extras:   free shipping · gift wrap
 *
 * These run against the real implementation — computeOrderCharge is what both
 * controllers call, and the Magic helpers are the ones that build the payload
 * Razorpay receives. No mirrored copies of the formula: a mirror passes happily
 * while production is broken, which is exactly how the Magic coupon bug lived.
 *
 * THE BUG THIS PINS DOWN: a Magic order was created with the discount removed
 * from `amount` but line_items still at full price. Razorpay bills what the
 * line items add up to, so an ordinary coupon silently vanished and an
 * INTERNAL_TEST ₹1 order charged the whole cart. Declaring the gap as a
 * Razorpay `promotion` did not fix it either — Razorpay accepts that array and
 * drops it (proven against the live API). So the discount has to be ON the
 * items, and `magicChargeSettles` below is that invariant.
 */

import { computeOrderCharge } from "../../utils/orderAmount.util.js";
import {
  buildMagicLineItems,
  lineItemsTotalPaise,
  discountMagicLineItems,
} from "../../services/magic.checkout.service.js";

/* ── Fixtures ──────────────────────────────────────────────────────────────
   A two-line cart: 2 × ₹899 lamp + 1 × ₹1,299 clock = ₹3,097 subtotal. */
const CART = [
  {
    productId: "prod_lamp",
    productSnapshot: { productName: "Moon Lamp", priceAtPurchase: 899, quantity: 2, selectedVariant: "Warm White" },
  },
  {
    productId: "prod_clock",
    productSnapshot: { productName: "Arc Clock", priceAtPurchase: 1299, quantity: 1, selectedVariant: "N/A" },
  },
];
const SUBTOTAL = 899 * 2 + 1299; // 3097
const SHIPPING = 179;

/**
 * Build the charge exactly as a controller would.
 *
 * `magic` mirrors the controllers' own shape: a Magic order carries no shipping
 * of its own (Razorpay adds it from the serviceability callback afterwards), so
 * both shipping figures are zero on that path.
 */
const charge = ({
  discount = 0,
  isInternalTestOrder = false,
  isMagic = false,
  paymentMethod = "PREPAID",
  freeShipping = false,
  giftWrapAmount = 0,
  subtotal = SUBTOTAL,
} = {}) =>
  computeOrderCharge({
    subtotal,
    giftWrapAmount,
    chargedShippingAmount: isMagic || freeShipping ? 0 : SHIPPING,
    realShippingAmount: isMagic ? 0 : SHIPPING,
    discountAmount: discount,
    isInternalTestOrder,
    isMagic,
    paymentMethod,
  });

/**
 * The whole point of the Magic payload: what Razorpay is told the items cost
 * IS what we are asking it to charge. Razorpay bills the line items, so any
 * gap between the two is money the customer pays that we did not intend.
 */
const magicChargeSettles = ({ discount = 0, isInternalTestOrder = false, giftWrapAmount = 0 } = {}) => {
  const c = charge({ discount, isInternalTestOrder, isMagic: true, giftWrapAmount });

  const lineItems = buildMagicLineItems(CART);
  if (giftWrapAmount > 0) {
    lineItems.push({
      type: "e-commerce",
      sku: "gift-wrap",
      price: giftWrapAmount * 100,
      offer_price: giftWrapAmount * 100,
      tax_amount: 0,
      quantity: 1,
      name: "Gift Wrap",
    });
  }
  const fullTotal = lineItemsTotalPaise(lineItems);
  const discounted = discountMagicLineItems(lineItems, c.razorpayChargeAmountPaise);

  return {
    charge: c,
    fullTotal,
    total: discounted.total,
    items: discounted.lineItems,
    settles: discounted.total === c.razorpayChargeAmountPaise,
  };
};

describe("Order charge — one formula for every checkout", () => {
  // The guest and logged-in controllers both call computeOrderCharge with the
  // same shape. A WhatsApp-login customer is an ordinary logged-in user (their
  // account just carries a placeholder email), so their money maths must be
  // identical too — nothing in the charge depends on how they signed in.
  test("guest, logged-in and WhatsApp-login are charged identically", () => {
    const inputs = { discount: 300, paymentMethod: "PREPAID" };
    const guest = charge(inputs);
    const loggedIn = charge(inputs);
    const whatsapp = charge(inputs);

    expect(loggedIn).toEqual(guest);
    expect(whatsapp).toEqual(guest);
    expect(guest.finalAmount).toBe(SUBTOTAL + SHIPPING - 300);
  });

  describe("prepaid, old flow", () => {
    test("no coupon — subtotal plus shipping", () => {
      const c = charge();
      expect(c.finalAmount).toBe(SUBTOTAL + SHIPPING);
      expect(c.razorpayChargeAmountPaise).toBe((SUBTOTAL + SHIPPING) * 100);
      expect(c.isCOD).toBe(false);
    });

    test("free shipping removes only the customer-facing shipping", () => {
      expect(charge({ freeShipping: true }).finalAmount).toBe(SUBTOTAL);
    });

    test("gift wrap is added before the discount", () => {
      expect(charge({ giftWrapAmount: 99, discount: 200 }).finalAmount).toBe(
        SUBTOTAL + 99 + SHIPPING - 200,
      );
    });

    test("a discount larger than the cart never produces a negative charge", () => {
      const c = charge({ discount: 99999 });
      expect(c.finalAmount).toBe(0);
      expect(c.razorpayChargeAmountPaise).toBe(0);
    });

    test("INTERNAL_TEST coupon pins the order at ₹1", () => {
      const c = charge({ isInternalTestOrder: true, discount: SUBTOTAL + SHIPPING - 1 });
      expect(c.finalAmount).toBe(1);
      expect(c.razorpayChargeAmountPaise).toBe(100);
    });
  });

  describe("COD", () => {
    test("advance is 2x real shipping, remainder collected on delivery", () => {
      const c = charge({ paymentMethod: "COD" });
      expect(c.isCOD).toBe(true);
      expect(c.codPartialAmount).toBe(SHIPPING * 2);
      expect(c.codRemainingAmount).toBe(SUBTOTAL + SHIPPING - SHIPPING * 2);
      expect(c.razorpayChargeAmountPaise).toBe(SHIPPING * 2 * 100);
    });

    test("free shipping does NOT zero the COD advance", () => {
      // The advance is an RTO/fraud deposit, not a shipping fee — a free
      // shipping order that collected nothing upfront would lose that cover.
      const c = charge({ paymentMethod: "COD", freeShipping: true });
      expect(c.codPartialAmount).toBe(SHIPPING * 2);
      expect(c.finalAmount).toBe(SUBTOTAL);
    });

    test("advance is capped at the order value on a tiny order", () => {
      const c = charge({ subtotal: 200, paymentMethod: "COD", discount: 180 });
      // order = 200 + 179 - 180 = 199, and 2x179 = 358 would exceed it
      expect(c.finalAmount).toBe(199);
      expect(c.codPartialAmount).toBe(199);
      expect(c.codRemainingAmount).toBe(0);
    });

    test("INTERNAL_TEST on COD charges ₹1 upfront and nothing on delivery", () => {
      const c = charge({ paymentMethod: "COD", isInternalTestOrder: true });
      expect(c.finalAmount).toBe(1);
      expect(c.codPartialAmount).toBe(1);
      expect(c.codRemainingAmount).toBe(0);
    });
  });

  describe("Magic (1CC)", () => {
    test("is prepaid-only — a COD request on the Magic path is not treated as COD", () => {
      const c = charge({ isMagic: true, paymentMethod: "COD" });
      expect(c.isCOD).toBe(false);
      expect(c.codPartialAmount).toBe(0);
    });

    test("shipping stays out of the amount — Razorpay adds it from the callback", () => {
      expect(charge({ isMagic: true }).finalAmount).toBe(SUBTOTAL);
    });

    test("no coupon: line items are left exactly as they were", () => {
      const { total, fullTotal, settles, charge: c } = magicChargeSettles({ discount: 0 });
      expect(fullTotal).toBe(SUBTOTAL * 100);
      expect(total).toBe(SUBTOTAL * 100);
      expect(c.razorpayChargeAmountPaise).toBe(SUBTOTAL * 100);
      expect(settles).toBe(true);
    });

    test("REGRESSION — a cart coupon reaches Razorpay on the line items", () => {
      const { charge: c, total, settles } = magicChargeSettles({ discount: 500 });
      // Before the fix the amount went through at the full subtotal and the
      // ₹500 was simply gone. Declaring it as a promotion did not work either:
      // Razorpay drops the array and bills the items.
      expect(c.finalAmount).toBe(SUBTOTAL - 500);
      expect(total).toBe((SUBTOTAL - 500) * 100);
      expect(settles).toBe(true);
    });

    test("REGRESSION — INTERNAL_TEST is ₹1 on Magic too", () => {
      const { charge: c, total, settles } = magicChargeSettles({
        isInternalTestOrder: true,
        discount: SUBTOTAL - 1,
      });
      expect(c.razorpayChargeAmountPaise).toBe(100);
      expect(total).toBe(100);
      expect(settles).toBe(true);
    });

    test("the strike-through price is kept so the modal shows the saving", () => {
      const { items } = magicChargeSettles({ discount: 500 });
      items.forEach(function (li) {
        expect(li.offer_price).toBeLessThan(li.price);
      });
    });

    test("gift wrap is a line item and still settles against the charge", () => {
      const { fullTotal, total, settles, charge: c } = magicChargeSettles({ discount: 300, giftWrapAmount: 99 });
      expect(fullTotal).toBe((SUBTOTAL + 99) * 100);
      expect(c.finalAmount).toBe(SUBTOTAL + 99 - 300);
      expect(total).toBe((SUBTOTAL + 99 - 300) * 100);
      expect(settles).toBe(true);
    });

    test("a percentage coupon resolved to rupees settles exactly", () => {
      const tenPercentCapped = Math.min(Math.floor((SUBTOTAL * 10) / 100), 250); // cap ₹250
      const { settles, total } = magicChargeSettles({ discount: tenPercentCapped });
      expect(total).toBe((SUBTOTAL - tenPercentCapped) * 100);
      expect(settles).toBe(true);
    });
  });
});

describe("discountMagicLineItems", () => {
  const items = (spec) =>
    spec.map(function (x, i) {
      return {
        type: "e-commerce",
        sku: "sku" + i,
        price: x.p,
        offer_price: x.p,
        tax_amount: 0,
        quantity: x.q,
        name: "Item " + i,
      };
    });

  test("no discount leaves the items untouched", () => {
    const li = items([{ p: 50000, q: 2 }, { p: 30000, q: 1 }]);
    const out = discountMagicLineItems(li, 130000);
    expect(out.total).toBe(130000);
    expect(out.lineItems).toBe(li);
  });

  test("never scales items UP to reach a bigger target", () => {
    const li = items([{ p: 50000, q: 1 }]);
    const out = discountMagicLineItems(li, 90000);
    expect(out.total).toBe(50000);
  });

  test("hits the target exactly when an item has quantity 1", () => {
    // ₹3697 of goods down to ₹1 — the internal test case, where rounding
    // leaves the most to redistribute.
    const li = items([{ p: 89900, q: 2 }, { p: 129900, q: 1 }]);
    const out = discountMagicLineItems(li, 100);
    expect(out.total).toBe(100);
  });

  test("an ordinary coupon lands exactly on the rupee", () => {
    const li = items([{ p: 89900, q: 2 }, { p: 129900, q: 1 }]);
    const out = discountMagicLineItems(li, 309700 - 50000);
    expect(out.total).toBe(259700);
  });

  test("reports the total it actually reached, never the one it was asked for", () => {
    // Every quantity above 1, so a stray paisa cannot be placed anywhere.
    const li = items([{ p: 333, q: 3 }, { p: 333, q: 3 }]);
    const out = discountMagicLineItems(li, 1001);
    expect(out.total).toBeLessThanOrEqual(1001);
    expect(out.total).toBe(
      out.lineItems.reduce(function (s, x) { return s + x.offer_price * x.quantity; }, 0),
    );
  });

  test("no item is ever priced above its own strike-through price", () => {
    const li = items([{ p: 10000, q: 1 }, { p: 20000, q: 1 }]);
    const out = discountMagicLineItems(li, 29999);
    out.lineItems.forEach(function (x) {
      expect(x.offer_price).toBeLessThanOrEqual(x.price);
    });
  });
});
