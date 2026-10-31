import { describe, it, expect } from "@jest/globals";
import { buildOrderView, buildOrderSummary, buildTrackUrl, DEFAULT_TRACK_URL_TEMPLATE } from "../../services/orderView.service.js";

// Every payment / shipment / pricing state the customer can meet, from plain fixtures.
const NOW = new Date("2026-10-31T12:00:00.000Z");
const T = (d) => new Date(`2026-10-${d}T10:00:00.000Z`);

const line = (name, price, quantity = 1, extra = {}) => ({
  productId: `p-${name}`,
  productSnapshot: { productName: name, productImg: `${name}.jpg`, quantity, priceAtPurchase: price, shipping: "0", selectedVariant: "Black", ...extra },
});

// Prepaid, paid, one item ₹1,299 + delivery ₹149 = ₹1,448
const base = (over = {}) => ({
  orderId: "0192f0aa-1111-7aaa-8bbb-123456789abc",
  userId: "u1",
  userEmail: "a@example.com",
  status: "PAID",
  paymentMethod: "PREPAID",
  amount: 1448,
  createdAt: T("28"),
  items: [line("Katana", 1299, 1, { shipping: "149" })],
  payment: { razorpayOrderId: "order_X", razorpayPaymentId: "pay_ABCDEFGH12345678" },
  statusHistory: [{ status: "PAID", timestamp: T("28") }],
  shippingInfo: { amount: 149 },
  deliveryAddress: { fullName: "Aarav", mobileNumber: "9876543210", addressLine: "12 MG Road", city: "Bengaluru", state: "KA", pinCode: 560038 },
  ...over,
});
const ship = (over = {}) => ({ _id: "s1", sourceOrderId: "x", shipmentStatus: "IN_TRANSIT", awbNumber: "AWB123", courierCompany: "Delhivery", courierService: "Surface", trackingHistory: [], shipmentDirection: "FORWARD", ...over });
const view = (order, shipments = [], cases = []) => buildOrderView({ order, shipments, cases, now: NOW });
const sum = (v) => v.pricing.lines.reduce((s, l) => s + l.amount, 0);

describe("payment", () => {
  it("fully prepaid and captured: paid in full, nothing due", () => {
    const { payment: p } = view(base());
    expect(p).toMatchObject({ state: "PAID", label: "Payment successful", method: "PREPAID", orderTotal: 1448, amountPaid: 1448, amountDue: 0, netPaid: 1448 });
    expect(p.paymentRef).toBe("pay_ABCDEFGH12345678");
  });

  it("full COD (no advance): nothing paid, the whole total is due on delivery", () => {
    const { payment: p } = view(base({ paymentMethod: "COD", codDetails: { partialAmountPaid: 0, remainingAmount: 0 } }));
    expect(p).toMatchObject({ state: "COD_DUE", method: "COD", amountPaid: 0, amountDue: 1448, balanceOnDelivery: 1448 });
  });

  it("partial COD: ₹2,500 total, ₹500 advance captured → ₹2,000 on delivery, not ₹2,500 paid and not deducted twice", () => {
    const { payment: p } = view(base({ amount: 2500, paymentMethod: "COD", codDetails: { partialAmountPaid: 500, remainingAmount: 2000 } }));
    expect(p).toMatchObject({ state: "ADVANCE_PAID", method: "PARTIAL_COD", orderTotal: 2500, amountPaid: 500, amountDue: 2000, balanceOnDelivery: 2000 });
    expect(p.amountPaid + p.amountDue).toBe(p.orderTotal);
  });

  it("partial COD with the stored balance unset still shows total − advance", () => {
    const { payment: p } = view(base({ amount: 2500, paymentMethod: "COD", codDetails: { partialAmountPaid: 500, remainingAmount: 0 } }));
    expect(p.amountDue).toBe(2000);
  });

  it("advance not yet captured: pending, nothing paid, advance still required", () => {
    const v = view(base({ status: "CREATED", payment: { razorpayOrderId: "o" }, amount: 2500, paymentMethod: "COD", codDetails: { partialAmountPaid: 500, remainingAmount: 2000 } }));
    expect(v.payment).toMatchObject({ state: "PENDING", amountPaid: 0, amountDue: 2500, advanceRequired: 500 });
    expect(v.stage.code).toBe("PAYMENT_PENDING");
  });

  it("failed payment is never shown as paid", () => {
    const v = view(base({ status: "FAILED", payment: { razorpayOrderId: "o" } }));
    expect(v.payment).toMatchObject({ state: "FAILED", amountPaid: 0 });
    expect(v.stage.code).toBe("PAYMENT_FAILED");
  });

  it("PROCESSING without a payment id is unconfirmed; with one it is paid", () => {
    expect(view(base({ status: "PROCESSING", payment: { razorpayOrderId: "o" } })).payment.state).toBe("PENDING");
    expect(view(base({ status: "PROCESSING" })).payment.state).toBe("PAID");
  });

  it("cancelled before payment: nothing owed", () => {
    const v = view(base({ status: "CANCELLED", payment: { razorpayOrderId: "o" } }));
    expect(v.payment).toMatchObject({ state: "CANCELLED", amountPaid: 0, amountDue: 0 });
    expect(v.stage.code).toBe("CANCELLED");
  });
});

describe("refunds", () => {
  const refundCase = (refunds) => [{ caseType: "REFUND", status: "RESOLVED", refunds }];

  it("full refund of a cancelled order", () => {
    const v = view(base({ status: "CANCELLED" }), [], refundCase([{ amount: 1448, status: "SUCCESS", processedAt: T("30") }]));
    expect(v.payment).toMatchObject({ state: "REFUNDED", refundedAmount: 1448, netPaid: 0, amountDue: 0 });
    expect(v.stage.message).toMatch(/refund/i);
  });

  it("partial refund keeps the net paid amount", () => {
    const v = view(base(), [], refundCase([{ amount: 300, status: "SUCCESS" }]));
    expect(v.payment).toMatchObject({ state: "PARTIALLY_REFUNDED", refundedAmount: 300, netPaid: 1148 });
  });

  it("a requested/processing refund is NOT reported as refunded", () => {
    const v = view(base(), [], refundCase([{ amount: 1448, status: "PENDING" }]));
    expect(v.payment).toMatchObject({ state: "REFUND_PROCESSING", refundedAmount: 0, refundInProgressAmount: 1448, netPaid: 1448 });
  });

  it("a failed refund is not counted", () => {
    const v = view(base(), [], refundCase([{ amount: 1448, status: "FAILED" }]));
    expect(v.payment).toMatchObject({ state: "PAID", refundedAmount: 0, refundFailedAmount: 1448 });
  });

  it("falls back to the finance ledger when no refund case was logged", () => {
    const v = view(base({ financialSummary: { totalRefunds: -500 } }));
    expect(v.payment).toMatchObject({ state: "PARTIALLY_REFUNDED", refundedAmount: 500 });
  });

  it("COD refunds are measured against what was actually paid (the advance)", () => {
    const v = view(base({ status: "CANCELLED", amount: 2500, paymentMethod: "COD", codDetails: { partialAmountPaid: 500, remainingAmount: 2000 } }), [], refundCase([{ amount: 500, status: "SUCCESS" }]));
    expect(v.payment).toMatchObject({ state: "REFUNDED", refundedAmount: 500, netPaid: 0, amountDue: 0 });
  });
});

describe("shipping and tracking", () => {
  it("paid, no shipment: being prepared, no tracking, no invented dates", () => {
    const v = view(base());
    expect(v.stage.code).toBe("CONFIRMED");
    expect(v.shipments).toEqual([]);
    expect(v.actions.track).toBe(false);
    expect(v.timeline.map((s) => [s.key, s.state])).toEqual([["placed", "done"], ["confirmed", "done"], ["preparing", "current"], ["shipped", "upcoming"], ["out_for_delivery", "upcoming"], ["delivered", "upcoming"]]);
  });

  it("courier assigned but not picked up: still preparing, but the AWB is shown", () => {
    const v = view(base(), [ship({ shipmentStatus: "ASSIGNED" })]);
    expect(v.stage.code).toBe("CONFIRMED");
    expect(v.shipments[0]).toMatchObject({ stage: "preparing", awb: "AWB123", courier: "Delhivery" });
    expect(v.timeline.find((s) => s.key === "preparing").state).toBe("current");
    expect(v.timeline.find((s) => s.key === "shipped").state).toBe("upcoming");
  });

  it("in transit: shipped is done, only recorded timestamps are shown", () => {
    const v = view(base(), [ship({ dispatchConfirmedAt: T("29"), trackingHistory: [{ scanStatus: "In Transit", scanLocation: "Pune hub", scanDateTime: T("30") }], expectedDeliveryDate: T("31") })]);
    expect(v.stage.code).toBe("IN_TRANSIT");
    const steps = Object.fromEntries(v.timeline.map((s) => [s.key, s]));
    expect(steps.preparing.state).toBe("done");
    expect(steps.shipped).toMatchObject({ state: "done", at: T("29").toISOString() });
    expect(steps.out_for_delivery.state).toBe("current");
    expect(steps.delivered.at).toBeNull();
    expect(v.shipments[0].trackUrl).toContain("AWB123");
  });

  it("out for delivery", () => {
    const v = view(base(), [ship({ shipmentStatus: "OUT_FOR_DELIVERY", trackingHistory: [{ scanStatus: "Out for delivery", scanDateTime: T("31") }] })]);
    expect(v.stage.code).toBe("OUT_FOR_DELIVERY");
    expect(v.timeline.find((s) => s.key === "out_for_delivery")).toMatchObject({ state: "done", at: T("31").toISOString() });
  });

  it("delivered without an out-for-delivery scan: that step is not claimed", () => {
    const v = view(base({ status: "DELIVERED" }), [ship({ shipmentStatus: "DELIVERED", trackingHistory: [{ scanStatus: "Delivered", scanDateTime: T("31") }] })]);
    expect(v.stage.code).toBe("DELIVERED");
    expect(v.timeline.map((s) => s.key)).toEqual(["placed", "confirmed", "preparing", "shipped", "delivered"]);
    expect(v.timeline.every((s) => s.state === "done")).toBe(true);
  });

  it("delayed: past the courier's own expected date and not delivered", () => {
    const v = view(base(), [ship({ expectedDeliveryDate: T("25") })]);
    expect(v.shipments[0].isDelayed).toBe(true);
    expect(v.shipments[0].message).toMatch(/longer than expected/i);
  });

  it("an expected date in the future is not delayed", () => {
    expect(view(base(), [ship({ expectedDeliveryDate: new Date("2026-11-05") })]).shipments[0].isDelayed).toBe(false);
  });

  it("NDR / delivery exception: no false progress timeline, courier's reason shown", () => {
    const v = view(base(), [ship({ shipmentStatus: "EXCEPTION", trackingHistory: [{ scanStatus: "Undelivered", remarks: "Customer not available", scanDateTime: T("30") }] })]);
    expect(v.stage.code).toBe("EXCEPTION");
    expect(v.timeline).toBeNull();
    expect(v.shipments[0].detail).toBe("Customer not available");
  });

  it("RTO", () => {
    const v = view(base(), [ship({ shipmentStatus: "RTO_INITIATED" })]);
    expect(v.stage.code).toBe("RTO");
    expect(v.timeline).toBeNull();
  });

  it("COD delivery does not claim the balance was collected", () => {
    const v = view(base({ status: "DELIVERED", amount: 2500, paymentMethod: "COD", codDetails: { partialAmountPaid: 500, remainingAmount: 2000 } }), [ship({ shipmentStatus: "DELIVERED" })]);
    expect(v.payment).toMatchObject({ amountPaid: 500, amountDue: 2000 });
    expect(v.stage.message).toMatch(/payable to the courier/i);
  });

  it("two parcels: one delivered is NOT 'delivered'; items are attached only where the mapping was recorded", () => {
    const o = base({ items: [line("Katana", 1000), line("Stand", 299)] });
    const v = view(o, [ship({ _id: "a", shipmentStatus: "DELIVERED", itemIndexes: [0] }), ship({ _id: "b", awbNumber: "AWB2", shipmentStatus: "IN_TRANSIT", itemIndexes: [1] })]);
    expect(v.stage.code).toBe("PARTIALLY_DELIVERED");
    expect(v.shipments).toHaveLength(2);
    expect(v.shipments[0].items.map((i) => i.name)).toEqual(["Katana"]);
    expect(v.shipments[1].items.map((i) => i.name)).toEqual(["Stand"]);
    expect(v.timeline.find((s) => s.key === "delivered").state).not.toBe("done");
  });

  it("a shipment without item mapping carries no item list (the whole order)", () => {
    expect(view(base(), [ship()]).shipments[0].items).toBeNull();
  });

  it("return-pickup and cancelled shipments are not shown as the delivery", () => {
    const v = view(base(), [ship({ shipmentDirection: "RETURN" }), ship({ _id: "c", isCancelled: true, awbNumber: "OLD" }), ship({ _id: "d", awbNumber: "LIVE" })]);
    expect(v.shipments.map((s) => s.awb)).toEqual(["LIVE"]);
  });

  it("older order with only the order's own tracking info", () => {
    const v = view(base({ status: "SHIPPED", trackingInfo: { carrier: "Bluedart", trackingNumber: "BD9", estimatedDelivery: null } }));
    expect(v.shipments[0]).toMatchObject({ awb: "BD9", courier: "Bluedart", stage: "shipped" });
    expect(v.stage.code).toBe("IN_TRANSIT");
  });

  it("courier text is data: control characters stripped, length bounded, newest first, history capped", () => {
    const events = Array.from({ length: 50 }, (_, i) => ({ scanStatus: `Scan ${i}`, scanDateTime: new Date(Date.UTC(2026, 9, 1 + (i % 28), i)) }));
    events.push({ scanStatus: "<img src=x onerror=alert(1)>\u0000\n", remarks: "x".repeat(500), scanDateTime: new Date("2026-10-30T00:00:00Z") });
    const v = view(base(), [ship({ trackingHistory: events })]);
    expect(v.shipments[0].events.length).toBeLessThanOrEqual(30);
    expect(v.shipments[0].events.every((e) => e.remarks.length <= 200)).toBe(true);
    expect(JSON.stringify(v.shipments[0].events)).not.toMatch(/\\u0000/);
    const sorted = v.shipments[0].events.map((e) => e.at);
    expect([...sorted].sort().reverse()).toEqual(sorted);
  });

  it("never leaks courier internals", () => {
    const v = view(base(), [ship({ labelBase64: "SECRET", webparexCharge: { courierWeightCharge: 99 }, weight: 1000 })]);
    expect(JSON.stringify(v)).not.toMatch(/SECRET|webparex|courierWeightCharge/);
  });
});

describe("tracking link", () => {
  it("is built from the configured template with the shipment's own AWB (dynamic, encoded)", () => {
    const tpl = "https://panel.shipmozo.com/track-order?uid=U123&awb={awb}";
    const v = buildOrderView({ order: base(), shipments: [ship({ awbNumber: "31293317112722" })], now: NOW, trackUrlTemplate: tpl });
    expect(v.shipments[0].trackUrl).toBe("https://panel.shipmozo.com/track-order?uid=U123&awb=31293317112722");
    expect(v.actions).toMatchObject({ track: true, trackUrl: v.shipments[0].trackUrl, trackAwb: "31293317112722" });
    expect(buildTrackUrl(tpl, "A B&C")).toBe("https://panel.shipmozo.com/track-order?uid=U123&awb=A%20B%26C");
  });

  it("falls back to the default page when the template is missing, not https, or has no {awb}", () => {
    for (const bad of [undefined, "", "http://evil.test/?a={awb}", "javascript:alert({awb})", "https://x.test/no-placeholder"]) {
      expect(buildTrackUrl(bad, "AWB1")).toBe(DEFAULT_TRACK_URL_TEMPLATE.replace("{awb}", "AWB1"));
    }
  });

  it("no AWB, no link", () => {
    const v = view(base(), [ship({ awbNumber: null })]);
    expect(v.shipments[0].trackUrl).toBeNull();
    expect(v.actions).toMatchObject({ track: false, trackUrl: null, trackAwb: null });
  });

  it("a single parcel whose record has no AWB yet uses the order's synced tracking number", () => {
    const v = view(base({ trackingInfo: { trackingNumber: "SYNC999" } }), [ship({ awbNumber: null })]);
    expect(v.shipments[0].awb).toBe("SYNC999");
    expect(v.actions.trackAwb).toBe("SYNC999");
  });

  it("the record's own AWB wins over the order's (a re-pushed shipment shows the new number)", () => {
    const v = view(base({ trackingInfo: { trackingNumber: "OLD111" } }), [ship({ awbNumber: "NEW222" })]);
    expect(v.shipments[0].awb).toBe("NEW222");
  });

  it("with several parcels the main Track Order link is the first parcel's, and each parcel has its own", () => {
    const v = view(base({ items: [line("A", 1), line("B", 1)] }), [ship({ _id: "b", cloneSeq: 1, awbNumber: "B2" }), ship({ _id: "a", cloneSeq: 0, awbNumber: "A1" })]);
    expect(v.shipments.map((s) => s.awb)).toEqual(["A1", "B2"]);
    expect(v.actions.trackAwb).toBe("A1");
  });
});

describe("items", () => {
  it("shows unit price × quantity = line total and the exact variant", () => {
    const v = view(base({ items: [line("Lamp", 800, 3, { selectedVariant: "Red", variantSku: "LMP-R" })], amount: 2400 }));
    expect(v.items[0]).toMatchObject({ quantity: 3, unitPaid: 800, lineTotal: 2400, variant: "Red", variantSku: "LMP-R" });
    expect(v.itemCount).toBe(3);
  });

  it("N/A variant is not shown", () => {
    expect(view(base({ items: [line("Lamp", 800, 1, { selectedVariant: "N/A" })] })).items[0].variant).toBeNull();
  });

  it("a promotional gift is labelled free, with its value only if the order recorded it", () => {
    const v = view(base({ items: [line("Katana", 1299), line("Mystery", 0, 1, { lineType: "FREE_GIFT", originalUnitPrice: 499 })] }));
    expect(v.items[1]).toMatchObject({ isFreeGift: true, giftValue: 499, unitOriginal: null, lineSavings: 0 });
    expect(v.pricing.freeGiftValue).toBe(499);
  });

  it("a gift whose list price was not recorded has no invented value", () => {
    const v = view(base({ items: [line("Katana", 1299), line("Mystery", 0, 1, { isPromotionalGift: true })] }));
    expect(v.items[1]).toMatchObject({ isFreeGift: true, giftValue: null });
  });

  it("a ₹0 line that is not flagged a gift is not called free", () => {
    expect(view(base({ items: [line("Odd", 0)] })).items[0].isFreeGift).toBe(false);
  });

  it("an item discount shows original → paid and the saving, from the order's own record", () => {
    const v = view(base({ items: [line("Stand", 199, 2, { originalUnitPrice: 399 })] }));
    expect(v.items[0]).toMatchObject({ unitOriginal: 399, unitPaid: 199, lineSavings: 400 });
  });

  it("missing image is null (the page shows a placeholder)", () => {
    expect(view(base({ items: [line("Lamp", 800, 1, { productImg: "" })] })).items[0].image).toBeNull();
  });
});

describe("pricing", () => {
  it("plain order: items + delivery = total", () => {
    const v = view(base({ items: [line("Katana", 1299, 1, { shipping: "149" })] }));
    expect(sum(v)).toBe(1448);
    expect(v.pricing).toMatchObject({ itemsSubtotal: 1299, shippingCharged: 149, reconciles: true, totalSavings: null });
  });

  it("coupon is shown once, with its code, and the lines still add up", () => {
    const v = view(base({ amount: 1348, coupon: { isApplied: true, couponCodeName: "SAVE100", discountAmount: 100 } }));
    expect(v.pricing.lines.find((l) => l.key === "coupon")).toMatchObject({ amount: -100, detail: "SAVE100" });
    expect(sum(v)).toBe(1348);
    expect(v.pricing.totalSavings).toBe(100);
  });

  it("offer discount from the pre-offer snapshot: shown once, never double counted with the item prices", () => {
    // list ₹1,698 (Katana 1,299 + Stand 399) → Stand at 50% = 199 paid; items 1,498 + delivery 149 = 1,647
    const v = view(base({ amount: 1647, promotionGrossProductSubtotal: 1698, items: [line("Katana", 1299, 1, { shipping: "149" }), line("Stand", 199, 1, { shipping: "149" })], appliedPromotions: [{ name: "50% off Stand", rewardTypes: ["percent_off_product"], discountAmount: 200 }] }));
    expect(v.pricing).toMatchObject({ merchandiseOriginal: 1698, productSavings: 200, itemsSubtotal: 1498 });
    expect(v.pricing.lines.map((l) => [l.key, l.amount])).toEqual([["items", 1698], ["offer", -200], ["shipping", 149]]);
    expect(sum(v)).toBe(1647);
    expect(v.pricing.totalSavings).toBe(200);
  });

  it("offer + coupon + gift wrap together still add up exactly", () => {
    const v = view(base({ amount: 1647 - 100 + 150, promotionGrossProductSubtotal: 1698, items: [line("Katana", 1299, 1, { shipping: "149" }), line("Stand", 199, 1, { shipping: "149" })], coupon: { isApplied: true, couponCodeName: "SAVE100", discountAmount: 100 }, giftWrap: { selected: true, price: 150, quantity: 1, title: "Gift wrap" } }));
    expect(sum(v)).toBe(1697);
    expect(v.pricing.lines.map((l) => l.key)).toEqual(["items", "offer", "coupon", "giftWrap", "shipping"]);
  });

  it("free shipping: the real charge is struck through only because the order recorded the waiver", () => {
    const v = view(base({ amount: 1299, freeShippingUnlocked: true, shippingInfo: { amount: 149 }, items: [line("Katana", 1299, 1, { shipping: "0" })] }));
    const ship = v.pricing.lines.find((l) => l.key === "shipping");
    expect(ship).toMatchObject({ amount: 0, free: true, original: 149 });
    expect(v.pricing.totalSavings).toBe(149);
  });

  it("zero delivery with no recorded waiver is just free, no invented original charge", () => {
    const v = view(base({ amount: 1299, shippingInfo: { amount: 0 }, items: [line("Katana", 1299, 1, { shipping: "0" })] }));
    expect(v.pricing.lines.find((l) => l.key === "shipping")).toMatchObject({ amount: 0, free: true, original: null });
  });

  it("Magic order: delivery is the fee Razorpay added", () => {
    const v = view(base({ isMagicOrder: true, amount: 1398, items: [line("Katana", 1299, 1, { shipping: "0" })], shippingInfo: { amount: 99 } }));
    expect(v.pricing.shippingCharged).toBe(99);
    expect(sum(v)).toBe(1398);
  });

  it("an old order whose parts don't add up shows the total as recorded plus one honest line", () => {
    const v = view(base({ amount: 1000, items: [line("Katana", 1299, 1, { shipping: "0" })], shippingInfo: { amount: 0 } }));
    expect(v.pricing.total).toBe(1000);
    expect(sum(v)).toBe(1000);
    expect(v.pricing.lines.find((l) => l.key === "orderOffer")).toMatchObject({ label: "Other discount", amount: -299 });
  });

  it("an unexplained surplus is labelled as such, not hidden", () => {
    const v = view(base({ amount: 1500, items: [line("Katana", 1299, 1, { shipping: "0" })], shippingInfo: { amount: 0 } }));
    expect(v.pricing.lines.find((l) => l.key === "adjustment")).toMatchObject({ label: "Other charges", amount: 201 });
    expect(sum(v)).toBe(1500);
  });

  it("no ₹0 discount rows when nothing was discounted", () => {
    const keys = view(base()).pricing.lines.map((l) => l.key);
    expect(keys).toEqual(["items", "shipping"]);
  });

  it("the total is the order's recorded amount, never recomputed from the items", () => {
    expect(view(base({ amount: 1448, items: [line("Katana", 9999, 1, { shipping: "149" })] })).pricing.total).toBe(1448);
  });
});

describe("customer, invoice and archive summary", () => {
  it("guest order shows the email captured at checkout", () => {
    const v = view(base({ isGuestOrder: true, guestInfo: { email: "g@example.com" }, userEmail: "ph@placeholder.invalid" }));
    expect(v.delivery.email).toBe("g@example.com");
  });

  it("Magic order whose address has not arrived yet says so", () => {
    expect(view(base({ deliveryAddress: {} })).delivery.addressPending).toBe(true);
  });

  it("invoice only when a paid order has a generated file", () => {
    expect(view(base()).invoice.available).toBe(false);
    expect(view(base({ invoiceData: { isGenerated: true, s3FileKey: "k" } })).invoice.available).toBe(true);
    expect(view(base({ status: "CANCELLED", invoiceData: { isGenerated: true, s3FileKey: "k" } })).invoice.available).toBe(false);
    expect(view(base({ status: "CREATED", payment: { razorpayOrderId: "o" }, invoiceData: { isGenerated: true, s3FileKey: "k" } })).invoice.available).toBe(false);
  });

  it("replacement / exchange cases surface as a short status", () => {
    const v = view(base(), [], [{ caseType: "REPLACEMENT", status: "IN_PROGRESS", replacements: [{ status: "SHIPPED" }], createdAt: T("30") }]);
    expect(v.resolutions).toEqual([{ type: "Replacement", status: "Shipped", at: T("30").toISOString() }]);
  });

  it("internal case details never reach the view", () => {
    const v = view(base(), [], [{ caseType: "REFUND", status: "RESOLVED", approvedBy: "admin@x.com", refunds: [{ amount: 10, status: "SUCCESS", approvedBy: "admin@x.com", reason: "internal" }] }]);
    expect(JSON.stringify(v)).not.toMatch(/admin@x\.com|internal/);
  });

  it("the archive row is light: no tracking history, no address", () => {
    const o = base({ items: [line("A", 1), line("B", 1), line("C", 1), line("D", 1), line("E", 1), line("F", 1)] });
    const s = buildOrderSummary(view(o, [ship({ trackingHistory: [{ scanStatus: "x", scanDateTime: T("30") }] })]));
    expect(s.preview).toHaveLength(4);
    expect(s.extraItems).toBe(2);
    expect(s.itemCount).toBe(6);
    expect(JSON.stringify(s)).not.toMatch(/events|addressLine|trackingHistory/);
    expect(s.stage.code).toBe("IN_TRANSIT");
  });

  it("a large multi-item order is summarised without loss of count", () => {
    const items = Array.from({ length: 30 }, (_, i) => line(`P${i}`, 10, 2));
    expect(view(base({ items, amount: 600 })).itemCount).toBe(60);
  });
});
