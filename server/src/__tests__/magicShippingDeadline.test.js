import { describe, it, expect, jest, beforeAll } from "@jest/globals";

// Razorpay Magic's serviceability callback must answer within its few-second
// window, or Magic goes on WITHOUT a shipping fee (21 of the first 116 Magic
// orders paid ₹0 delivery). The courier API is stubbed per pincode — slow,
// fast, unserviceable, failing — and every other line is the real code.
const SLOW = "111111", FAST = "122018", NOPE = "999999", BROKEN = "555555";
jest.unstable_mockModule("../services/shipping.service.js", () => ({
  staticShippingCharge: (v) => (Number(v) >= 1000 ? 149 : 99),
  calculateShippingRate: async ({ pincode, cartValue, maxRetries, requestTimeoutMs }) => {
    calls.push({ pincode, maxRetries, requestTimeoutMs });
    if (pincode === SLOW) return new Promise((resolve) => setTimeout(() => resolve({ total_charges: 1 }), 10_000).unref());
    if (pincode === NOPE) throw Object.assign(new Error("not serviceable"), { data: { code: "PINCODE_NOT_SERVICEABLE" } });
    if (pincode === BROKEN) throw new Error("ShipMozo 502");
    return { total_charges: Number(cartValue) >= 1000 ? 149 : 99, estimatedDays: 4 };
  },
  isPincodeNotServiceable: (e) => e?.data?.code === "PINCODE_NOT_SERVICEABLE",
  FALLBACK_SHIPPING_CHARGE: 179,
}));
const calls = [];

let Order, magicShippingInfoController;
beforeAll(async () => {
  process.env.MAGIC_SHIPPING_SECRET = "test-secret";
  ({ default: Order } = await import("../model/order.model.js"));
  ({ magicShippingInfoController } = await import("../controller/magic.checkout.controller.js"));
});

const seedOrder = (rpId, extra = {}) => Order.collection.insertOne({
  orderId: `o-${rpId}`, userId: "guest_1", isMagicOrder: true, status: "CREATED", amount: 1499,
  payment: { razorpayOrderId: `order_${rpId}` },
  items: [{ productId: "kat", productSnapshot: { productName: "Katana", quantity: 1, priceAtPurchase: 1499 } }],
  ...extra,
});

const callback = (rpId, zipcodes) => new Promise((resolve, reject) => {
  const req = {
    method: "POST", headers: {}, query: { k: "test-secret" },
    body: Buffer.from(JSON.stringify({ razorpay_order_id: rpId, addresses: zipcodes.map((z, i) => ({ id: String(i), zipcode: z, country: "in" })) })),
  };
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(body) { resolve({ status: this.statusCode, body }); return this; } };
  magicShippingInfoController(req, res, reject);
});

// The record is written after the answer goes out — give it a moment.
const quotesOf = async (rpId) => {
  for (let i = 0; i < 20; i++) {
    const o = await Order.findOne({ "payment.razorpayOrderId": `order_${rpId}` }).lean();
    if (o?.magicShippingQuotes?.length) return o.magicShippingQuotes;
    await new Promise((r) => setTimeout(r, 25));
  }
  return [];
};
const fees = (body) => body.addresses.map((a) => [a.serviceable, a.shipping_methods?.[0]?.shipping_fee ?? 0]);

describe("Magic shipping-info callback", () => {
  it("answers within 2 s with the fixed fee when ShipMozo is slow, and records why", async () => {
    await seedOrder("slow1");
    const t0 = Date.now();
    const { status, body } = await callback("slow1", [SLOW]);
    expect(Date.now() - t0).toBeLessThan(2100);
    expect(status).toBe(200);
    expect(fees(body)).toEqual([[true, 14900]]); // ₹149 in paise, never ₹0
    const [q] = await quotesOf("slow1");
    expect(q.addresses).toEqual([{ zipcode: SLOW, fee: 149, serviceable: true, source: "timeout" }]);
    expect(q.ms).toBeLessThan(2100);
    expect(calls.find((c) => c.pincode === SLOW)).toMatchObject({ maxRetries: 1 });
  });

  it("uses ShipMozo's answer when it is on time, blocks an unserviceable pincode, falls back on errors", async () => {
    await seedOrder("mix1");
    const { body } = await callback("mix1", [FAST, NOPE, BROKEN]);
    expect(fees(body)).toEqual([[true, 14900], [false, 0], [true, 14900]]);
    const [q] = await quotesOf("mix1");
    expect(q.addresses.map((a) => a.source)).toEqual(["shipmozo", "unserviceable", "error"]);
    expect(q.freeShipping).toBe(false);
  });

  it("still charges nothing when free shipping was unlocked at order-create", async () => {
    await seedOrder("free1", { freeShippingUnlocked: true });
    const { body } = await callback("free1", [SLOW]);
    expect(fees(body)).toEqual([[true, 0]]);
    const [q] = await quotesOf("free1");
    expect(q).toMatchObject({ freeShipping: true, addresses: [{ source: "timeout", fee: 0 }] });
  });

  it("keeps only the last 5 quotes on the order", async () => {
    await seedOrder("many1");
    for (let i = 0; i < 7; i++) await callback("many1", [FAST]);
    await new Promise((r) => setTimeout(r, 150));
    const o = await Order.findOne({ "payment.razorpayOrderId": "order_many1" }).lean();
    expect(o.magicShippingQuotes).toHaveLength(5);
  });
});
