import { describe, it, expect, jest, beforeAll } from "@jest/globals";

// A Magic order's final money — Razorpay's shipping fee and any coupon picked
// in the Magic modal — must reach our DB for EVERY Magic order. It used to be
// synced only when the order had no address yet, so a customer whose address
// was known at order-create kept the pre-checkout amount (₹1,499 recorded,
// ₹1,648 paid). Razorpay is stubbed; the order and the code under test are real.
const rpOrders = {};
jest.unstable_mockModule("../services/rp.payement.service.js", () => ({
  razorpayCreateOrderService: async () => ({ data: { id: "order_x" } }),
  razorpayFetchOrderService: async (id) => { fetched.push(id); return rpOrders[id]; },
}));
jest.unstable_mockModule("../services/email.service.js", () => ({
  sendEmail: jest.fn(), sendEmailWithRetry: jest.fn(), sendOTP: jest.fn(), sendWelcomeEmail: jest.fn(),
  sendOrderConfirmation: jest.fn(async () => ({})), sendPaymentReceipt: jest.fn(async () => ({})),
  sendGuestAccountCreatedEmail: jest.fn(async () => ({})), sendOrderStatusUpdate: jest.fn(), sendEmailCommunityService: jest.fn(),
}));
const fetched = [];

let Order, fulfilCapturedPayment;
beforeAll(async () => {
  ({ default: Order } = await import("../model/order.model.js"));
  ({ fulfilCapturedPayment } = await import("../controller/rp.payment.controller.js"));
});

const address = { fullName: "Raj", mobileNumber: "9999999999", addressLine1: "1 Road", city: "Faridabad", state: "Haryana", pinCode: 121004 };
const seed = async (id, extra = {}) => {
  await Order.collection.insertOne({
    orderId: `o-${id}`, userId: "user_1", userEmail: "raj@example.com", isMagicOrder: true, status: "CREATED", paymentMethod: "PREPAID",
    amount: 1499, payment: { razorpayOrderId: `order_${id}` },
    items: [{ productId: "kat", productSnapshot: { productName: "Katana", quantity: 1, priceAtPurchase: 1499, productImg: "x.jpg" } }],
    coupon: { couponCodeId: null, couponCodeName: null, discountAmount: 0, isApplied: false },
    ...extra,
  });
  return Order.findOne({ orderId: `o-${id}` });
};
const pay = (id, rupees) => ({ id: `pay_${id}`, order_id: `order_${id}`, amount: rupees * 100, status: "captured", method: "upi" });

describe("Magic order: money synced from Razorpay", () => {
  it("records shipping and the paid amount when the address was known at order-create", async () => {
    rpOrders.order_known = { shipping_fee: 14900, promotions: [], customer_details: null };
    const order = await seed("known", { deliveryAddress: address });
    await fulfilCapturedPayment(order, pay("known", 1648)).catch(() => {});
    const o = await Order.findOne({ orderId: "o-known" }).lean();
    expect(o.amount).toBe(1648);
    expect(o.shippingInfo?.amount).toBe(149);
    expect(o.deliveryAddress.city).toBe("Faridabad"); // the known address is kept
  });

  it("records a coupon applied inside the Magic modal", async () => {
    rpOrders.order_coupon = { shipping_fee: 14900, promotions: [{ code: "UNDIWALI150", value: 15000, reference_id: "ref-1" }], customer_details: null };
    const order = await seed("coupon", { deliveryAddress: address });
    await fulfilCapturedPayment(order, pay("coupon", 1498)).catch(() => {});
    const o = await Order.findOne({ orderId: "o-coupon" }).lean();
    expect(o.amount).toBe(1498);
    expect(o.coupon).toMatchObject({ couponCodeName: "UNDIWALI150", discountAmount: 150, isApplied: true });
  });

  it("still fills the address when Magic collected it (unchanged path)", async () => {
    rpOrders.order_noaddr = {
      shipping_fee: 9900, promotions: [],
      customer_details: { email: "new@example.com", shipping_address: { name: "Asha", contact: "+919888888888", line1: "2 Lane", city: "Pune", state: "Maharashtra", zipcode: "411001", country: "in" } },
    };
    const order = await seed("noaddr");
    await fulfilCapturedPayment(order, pay("noaddr", 1598)).catch(() => {});
    const o = await Order.findOne({ orderId: "o-noaddr" }).lean();
    expect(o.amount).toBe(1598);
    expect(o.shippingInfo?.amount).toBe(99);
    expect(String(o.deliveryAddress?.pinCode)).toBe("411001");
  });

  it("does not fetch Razorpay again once the order is PAID", async () => {
    rpOrders.order_paid = { shipping_fee: 14900, promotions: [], customer_details: null };
    const order = await seed("paid", { deliveryAddress: address, status: "PAID", amount: 1648 });
    const before = fetched.length;
    await fulfilCapturedPayment(order, pay("paid", 1648)).catch(() => {});
    expect(fetched.slice(before)).not.toContain("order_paid");
  });
});
