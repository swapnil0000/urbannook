import { describe, it, expect, jest, beforeAll } from "@jest/globals";

// The customer order endpoints against the in-memory DB: ownership, no leaking of admin/courier data, batched archive reads.
jest.unstable_mockModule("../services/rp.payement.service.js", () => ({
  razorpayCreateOrderService: async () => ({ data: { id: "order_1" } }),
  razorpayFetchOrderService: async () => ({}),
  razorpayFetchOrderPaymentsService: async () => [],
}));

let Order, ShipmentRecord, ResolutionCase, Product;
let getOrderView, getOrderSummaries, getOrderRecommendations;

const ORDER_ID = "0192f0aa-1111-7aaa-8bbb-aaaaaaaaaaaa";
const mkOrder = (over = {}) => ({
  orderId: ORDER_ID, userId: "u1", userEmail: "a@example.com", status: "PAID", paymentMethod: "PREPAID", amount: 1448,
  items: [{ productId: "p1", productSnapshot: { productName: "Katana", productImg: "k.jpg", quantity: 1, priceAtPurchase: 1299, shipping: "149", selectedVariant: "Black" } }],
  payment: { razorpayOrderId: "order_X", razorpayPaymentId: "pay_1234567890" },
  statusHistory: [{ status: "PAID", timestamp: new Date() }],
  deliveryAddress: { fullName: "Aarav", pinCode: 560038, addressLine: "12 MG Road", city: "Bengaluru" },
  // admin-only data that must never reach the customer
  notes: "internal note", isPriority: true, autoPushLastError: "boom", financialSummary: { netProfit: 777 },
  createdAt: new Date(), updatedAt: new Date(),
  ...over,
});

const run = (ctrl, { userId = "u1", params = {} } = {}) =>
  new Promise((resolve, reject) => {
    const headers = {};
    const res = { set: (k, v) => { headers[k] = v; return res; }, status: () => res, json: (b) => { resolve({ body: b, headers }); return res; } };
    ctrl({ user: { userId }, params }, res, reject);
  });

beforeAll(async () => {
  ({ default: Order } = await import("../model/order.model.js"));
  ({ default: ShipmentRecord } = await import("../model/shipment.record.model.js"));
  ({ default: ResolutionCase } = await import("../model/resolution.case.model.js"));
  ({ default: Product } = await import("../model/product.model.js"));
  ({ getOrderView, getOrderSummaries, getOrderRecommendations } = await import("../controller/user.cart.controller.js"));
});

describe("GET order view", () => {
  it("returns the owner's order by our order id or by the Razorpay order id, never cached", async () => {
    await Order.collection.insertOne(mkOrder());
    const a = await run(getOrderView, { params: { orderId: ORDER_ID } });
    const b = await run(getOrderView, { params: { orderId: "order_X" } });
    expect(a.body.data.orderId).toBe(ORDER_ID);
    expect(b.body.data.orderId).toBe(ORDER_ID);
    expect(a.headers["Cache-Control"]).toMatch(/no-store/);
  });

  it("someone else's order is a 404 — same as an order that doesn't exist", async () => {
    await Order.collection.insertOne(mkOrder());
    await expect(run(getOrderView, { userId: "intruder", params: { orderId: ORDER_ID } })).rejects.toThrow(/not found/i);
    await expect(run(getOrderView, { params: { orderId: "nope" } })).rejects.toThrow(/not found/i);
  });

  it("a query-style id cannot be used to match other people's orders", async () => {
    await Order.collection.insertOne(mkOrder());
    await expect(run(getOrderView, { userId: "intruder", params: { orderId: { $ne: "x" } } })).rejects.toThrow();
  });

  it("carries shipments and refunds, and none of the admin / courier internals", async () => {
    await Order.collection.insertOne(mkOrder());
    await ShipmentRecord.collection.insertOne({
      sourceOrderId: ORDER_ID, shipmentStatus: "IN_TRANSIT", awbNumber: "AWB1", courierCompany: "Delhivery", shipmentDirection: "FORWARD",
      labelBase64: "SECRETLABEL", weight: 900, webparexCharge: { courierWeightCharge: 55 }, warehouseId: "wh-secret",
      trackingHistory: [{ scanStatus: "In Transit", scanLocation: "Pune", scanDateTime: new Date() }],
    });
    await ResolutionCase.collection.insertOne({
      orderId: ORDER_ID, caseType: "REFUND", status: "RESOLVED", assignedTo: "staff@urbannook.in", description: "customer was rude",
      refunds: [{ refundType: "PARTIAL", amount: 200, method: "RAZORPAY", status: "SUCCESS", approvedBy: "staff@urbannook.in", reason: "internal reason" }],
    });
    const { body } = await run(getOrderView, { params: { orderId: ORDER_ID } });
    const v = body.data;
    expect(v.shipments[0]).toMatchObject({ awb: "AWB1", courier: "Delhivery", stage: "in_transit" });
    expect(v.payment).toMatchObject({ state: "PARTIALLY_REFUNDED", refundedAmount: 200, netPaid: 1248 });
    const wire = JSON.stringify(body);
    for (const secret of ["SECRETLABEL", "wh-secret", "staff@urbannook.in", "internal reason", "customer was rude", "internal note", "777", "boom", "courierWeightCharge", "razorpaySignature"]) {
      expect(wire).not.toContain(secret);
    }
  });

  it("the tracking link follows SHIPMOZO_TRACK_URL and the shipment's current AWB (re-read on every open)", async () => {
    process.env.SHIPMOZO_TRACK_URL = "https://panel.shipmozo.com/track-order?uid=CONFIGURED&awb={awb}";
    await Order.collection.insertOne(mkOrder());
    await ShipmentRecord.collection.insertOne({ sourceOrderId: ORDER_ID, shipmentStatus: "IN_TRANSIT", awbNumber: "AWB-OLD", shipmentDirection: "FORWARD", trackingHistory: [] });
    const first = await run(getOrderView, { params: { orderId: ORDER_ID } });
    expect(first.body.data.actions.trackUrl).toBe("https://panel.shipmozo.com/track-order?uid=CONFIGURED&awb=AWB-OLD");
    // admin re-assigns the courier: the next open shows the new AWB with no cache in between
    await ShipmentRecord.collection.updateOne({ sourceOrderId: ORDER_ID }, { $set: { awbNumber: "AWB-NEW" } });
    const second = await run(getOrderView, { params: { orderId: ORDER_ID } });
    expect(second.body.data.actions).toMatchObject({ trackAwb: "AWB-NEW", trackUrl: "https://panel.shipmozo.com/track-order?uid=CONFIGURED&awb=AWB-NEW" });
    delete process.env.SHIPMOZO_TRACK_URL;
  });

  it("still renders when no tracking or refund data exists", async () => {
    await Order.collection.insertOne(mkOrder());
    const { body } = await run(getOrderView, { params: { orderId: ORDER_ID } });
    expect(body.data.shipments).toEqual([]);
    expect(body.data.stage.code).toBe("CONFIRMED");
  });
});

describe("GET order summaries (Order Archive)", () => {
  it("lists only the customer's own orders as light rows, newest first", async () => {
    await Order.collection.insertMany([
      mkOrder({ orderId: "o-old", createdAt: new Date("2026-10-01"), payment: { razorpayOrderId: "r1", razorpayPaymentId: "pay_1" } }),
      mkOrder({ orderId: "o-new", createdAt: new Date("2026-10-20"), payment: { razorpayOrderId: "r2", razorpayPaymentId: "pay_2" } }),
      mkOrder({ orderId: "o-other", userId: "someone-else", payment: { razorpayOrderId: "r3", razorpayPaymentId: "pay_3" } }),
    ]);
    await ShipmentRecord.collection.insertOne({ sourceOrderId: "o-new", shipmentStatus: "DELIVERED", awbNumber: "A", shipmentDirection: "FORWARD", trackingHistory: [{ scanStatus: "Delivered", scanDateTime: new Date() }] });
    const { body } = await run(getOrderSummaries);
    expect(body.data.orders.map((o) => o.orderId)).toEqual(["o-new", "o-old"]);
    expect(body.data.orders[0].stage.code).toBe("DELIVERED");
    expect(body.data.orders[1].stage.code).toBe("CONFIRMED");
    expect(JSON.stringify(body)).not.toMatch(/trackingHistory|events|addressLine|labelBase64/);
  });
});

describe("GET recommendations", () => {
  const prod = (id, over = {}) => ({ productId: id, uiProductId: `u-${id}`, productName: id, isPublished: true, productStatus: "in_stock", recommendedProducts: [], variantDetails: [{ variantName: "x", variantPrice: 100 }], ...over });

  it("returns the admin-linked products minus what was bought, minus unavailable ones", async () => {
    await Order.collection.insertOne(mkOrder({ items: [{ productId: "p1", productSnapshot: { productName: "Katana", productImg: "k.jpg", quantity: 1, priceAtPurchase: 1, shipping: "0" } }] }));
    await Product.collection.insertMany([
      prod("p1", { recommendedProducts: ["stand", "p1", "gone", "hidden", "oos"] }),
      prod("stand"), prod("hidden", { isPublished: false }), prod("oos", { productStatus: "out_of_stock" }),
    ]);
    const { body } = await run(getOrderRecommendations, { params: { orderId: ORDER_ID } });
    expect(body.data.products.map((p) => p.productId)).toEqual(["stand"]);
  });

  it("is empty (not an error) when nothing is linked, and refuses another customer's order", async () => {
    await Order.collection.insertOne(mkOrder());
    await Product.collection.insertOne(prod("p1"));
    expect((await run(getOrderRecommendations, { params: { orderId: ORDER_ID } })).body.data.products).toEqual([]);
    await expect(run(getOrderRecommendations, { userId: "intruder", params: { orderId: ORDER_ID } })).rejects.toThrow(/not found/i);
  });
});
