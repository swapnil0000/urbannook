/**
 * Revenue must be counted exactly once per order, no matter which writer wins
 * the race: the browser (Razorpay success handler) or the server (payment.captured
 * webhook). A regression here silently doubles reported revenue, which is why
 * this is pinned down rather than left to manual QA.
 */
import mongoose from "mongoose";
import Event from "../../model/event.model.js";
import { storeEvents } from "../../services/event.service.js";
import { recordServerPurchase } from "../../services/purchaseEvent.service.js";

const ORDER_ID = "01920000-aaaa-7000-8000-000000000001";

const fakeOrder = (overrides = {}) => ({
  orderId: ORDER_ID,
  userId: "user_123",
  amount: 1948,
  isGuestOrder: false,
  paymentMethod: "PREPAID",
  payment: { razorpayPaymentId: "pay_ABC123" },
  shippingInfo: { amount: 0 },
  coupon: { isApplied: false },
  metaTracking: { anonymousId: "anon_device_1", clientIp: "1.2.3.4", clientUserAgent: "UA" },
  items: [
    {
      productId: "PROD_1",
      productSnapshot: {
        productName: "Brake Caliper Lamp",
        quantity: 1,
        priceAtPurchase: 1649,
        selectedVariant: "BMW",
        productCategory: "Lamps",
      },
    },
    {
      productId: "PROD_2",
      productSnapshot: {
        productName: "Stationery Suit Pen Stand",
        quantity: 1,
        priceAtPurchase: 299,
        selectedVariant: "Lavender",
      },
    },
  ],
  ...overrides,
});

// What the browser queues via recordEvent() for the same order.
const browserPurchase = () => ({
  dedupeKey: `purchase:${ORDER_ID}`,
  eventName: "purchase",
  userId: "user_123",
  anonymousId: "anon_device_1",
  properties: { value: 1948, currency: "INR", source: "browser" },
  attribution: { channel: "google_organic" },
});

// Ensure the unique sparse index actually exists in the test DB.
beforeAll(async () => {
  await Event.syncIndexes();
});

describe("purchase event dedup (browser + webhook)", () => {
  test("browser first, then webhook → ONE row, server data wins", async () => {
    await storeEvents([browserPurchase()]);
    expect(await Event.countDocuments({ eventName: "purchase" })).toBe(1);

    await recordServerPurchase(fakeOrder());

    const rows = await Event.find({ eventName: "purchase" }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].properties.source).toBe("server_webhook");
    expect(rows[0].properties.transaction_id).toBe("pay_ABC123");
    expect(rows[0].properties.items).toHaveLength(2);
  });

  test("webhook first, then browser → ONE row, server data NOT overwritten", async () => {
    await recordServerPurchase(fakeOrder());
    await storeEvents([browserPurchase()]);

    const rows = await Event.find({ eventName: "purchase" }).lean();
    expect(rows).toHaveLength(1);
    // The thinner browser row must not clobber the authoritative one.
    expect(rows[0].properties.source).toBe("server_webhook");
    expect(rows[0].properties.items).toHaveLength(2);
  });

  test("webhook replayed twice (Razorpay retry) → still ONE row", async () => {
    await recordServerPurchase(fakeOrder());
    await recordServerPurchase(fakeOrder());
    await recordServerPurchase(fakeOrder());

    expect(await Event.countDocuments({ eventName: "purchase" })).toBe(1);
  });

  test("revenue sums once across both writers", async () => {
    await storeEvents([browserPurchase()]);
    await recordServerPurchase(fakeOrder());

    const purchases = await Event.find({ eventName: "purchase" }).lean();
    const revenue = purchases.reduce((s, e) => s + (Number(e.properties?.value) || 0), 0);
    expect(revenue).toBe(1948); // not 3896
  });

  test("two DIFFERENT orders are never collapsed", async () => {
    await recordServerPurchase(fakeOrder());
    await recordServerPurchase(fakeOrder({ orderId: "order-two", amount: 500 }));

    expect(await Event.countDocuments({ eventName: "purchase" })).toBe(2);
  });

  test("channel attribution is recovered from the device's earliest event", async () => {
    // A browsing event from the same device, carrying first-touch attribution.
    await storeEvents([
      {
        eventName: "view_item",
        anonymousId: "anon_device_1",
        properties: {},
        attribution: { channel: "google_organic", landing_referrer: "https://www.google.com/" },
      },
    ]);

    await recordServerPurchase(fakeOrder());

    const row = await Event.findOne({ eventName: "purchase" }).lean();
    // Without this the webhook purchase would land in the "unknown" bucket and
    // Google-organic revenue would read as zero.
    expect(row.attribution.channel).toBe("google_organic");
  });

  test("ordinary events without a dedupeKey are never deduplicated", async () => {
    const atc = () => ({
      eventName: "add_to_cart",
      anonymousId: "anon_device_1",
      properties: { value: 299 },
    });
    await storeEvents([atc(), atc(), atc()]);
    expect(await Event.countDocuments({ eventName: "add_to_cart" })).toBe(3);
  });

  test("a guest order with no device id still records exactly once", async () => {
    const guest = fakeOrder({ userId: "guest_x", isGuestOrder: true, metaTracking: {} });
    await recordServerPurchase(guest);
    await recordServerPurchase(guest);

    const rows = await Event.find({ eventName: "purchase" }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].properties.is_guest).toBe(true);
    expect(rows[0].anonymousId).toBe(`order_${ORDER_ID}`);
  });
});
