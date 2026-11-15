import { describe, it, expect, jest, beforeAll } from "@jest/globals";

// Two checkout failures that reached customers as 500 "Internal server error":
//  - a signed-in member on Express (Magic) checkout with no email in the
//    request (WhatsApp login) — the order save failed after the Razorpay order
//    already existed;
//  - a pincode no courier serves — a plain Error, so the handler sent a 500.
// Razorpay and the courier API are stubbed; every other line is the real code.
const created = [];
const UNSERVICEABLE = "999999";
jest.unstable_mockModule("../services/rp.payement.service.js", () => ({
  razorpayCreateOrderService: async (amount, currency, opts) => { created.push({ amount, opts }); return { data: { id: `order_${created.length}` } }; },
  razorpayFetchOrderService: async () => ({}),
}));
jest.unstable_mockModule("../services/shipping.service.js", () => ({
  staticShippingCharge: (v) => (Number(v) >= 1000 ? 149 : 99),
  calculateShippingRate: async ({ pincode, cartValue }) => {
    if (String(pincode) === UNSERVICEABLE) {
      const err = new Error(`Sorry, we don't deliver to pincode ${pincode} yet. Please use a different delivery address.`);
      Object.assign(err, { statusCode: 400, data: { code: "PINCODE_NOT_SERVICEABLE", pincode } });
      throw err;
    }
    return { total_charges: Number(cartValue) >= 1000 ? 149 : 99, type: "dynamic" };
  },
  FALLBACK_SHIPPING_CHARGE: 179,
  isPincodeNotServiceable: (e) => e?.data?.code === "PINCODE_NOT_SERVICEABLE",
}));

const LAMP = "lamp-1";
let Product, Cart, User, Order, razorpayCreateOrderController, applyCouponCodeService;

const seed = async (member) => {
  await Product.collection.insertOne({
    productId: LAMP, uiProductId: "u-lamp", productName: "Lamp", productStatus: "in_stock", productCategory: "c", productSubCategory: "s",
    variantDetails: [{ sku: "LMP1", variantName: "Lamp Blue", variantPrice: 800, variantMrp: 800, variantQuantity: 50, variantImage: ["x.jpg"] }],
  });
  await User.collection.insertOne({ userId: member.userId, name: "Member", email: member.email, mobileNumber: 9876543210 });
  await Cart.collection.insertOne({ userId: member.userId, products: { [`${LAMP}:Lamp Blue`]: { quantity: 2, selectedVariant: "Lamp Blue" } } });
  await applyCouponCodeService({ userId: member.userId, couponCodeName: "" }); // stores the cart quote
};
const res = (resolve) => { const r = { code: 0 }; r.status = (c) => { r.code = c; return r; }; r.json = (p) => { r.body = p; resolve(p); return r; }; return r; };
const order = (userId, body) => new Promise((resolve, reject) => {
  razorpayCreateOrderController({
    user: { userId },
    body: { items: [{ productId: LAMP, quantity: 2, variant: "Lamp Blue" }], paymentMethod: "PREPAID", ...body },
    headers: {}, ip: "1.1.1.1",
  }, res(resolve), reject);
}).then((b) => b.data);

beforeAll(async () => {
  process.env.MAGIC_CHECKOUT_ENABLED = "true";
  delete process.env.MAGIC_CHECKOUT_GUESTS_ONLY;
  ({ default: Product } = await import("../model/product.model.js"));
  ({ default: Cart } = await import("../model/user.cart.model.js"));
  ({ default: User } = await import("../model/user.model.js"));
  ({ default: Order } = await import("../model/order.model.js"));
  ({ razorpayCreateOrderController } = await import("../controller/rp.payment.controller.js"));
  ({ applyCouponCodeService } = await import("../services/coupon.code.service.js"));
});

describe("signed-in Express (Magic) checkout without an email in the request", () => {
  it("WhatsApp-login member: the order is created on the account's placeholder email", async () => {
    const wa = { userId: "u-wa", email: "9876543210@wa.urbannook.in" };
    await seed(wa);
    const d = await order(wa.userId, { magic: true, userEmail: "" });
    const saved = await Order.findOne({ orderId: d.orderId }).lean();
    expect(saved.userEmail).toBe(wa.email);
    expect(saved.isMagicOrder).toBe(true);
  });

  it("member with a real email: the account email is used", async () => {
    const m = { userId: "u-real", email: "member@example.com" };
    await seed(m);
    const d = await order(m.userId, { magic: true });
    expect((await Order.findOne({ orderId: d.orderId }).lean()).userEmail).toBe(m.email);
  });

  it("an email typed at checkout still wins", async () => {
    const m = { userId: "u-typed", email: "9876543210@wa.urbannook.in" };
    await seed(m);
    const d = await order(m.userId, { magic: true, userEmail: "typed@example.com" });
    expect((await Order.findOne({ orderId: d.orderId }).lean()).userEmail).toBe("typed@example.com");
  });
});

describe("pincode no courier serves", () => {
  it("is a 400 with a message the customer can act on, before any Razorpay order", async () => {
    const m = { userId: "u-pin", email: "member@example.com" };
    await seed(m);
    const before = created.length;
    const err = await order(m.userId, {
      userEmail: m.email, senderMobile: "9876543210",
      deliveryAddress: { formattedAddress: "addr", pinCode: UNSERVICEABLE },
    }).then(() => null, (e) => e);
    expect(err?.statusCode).toBe(400);
    expect(err.message).toContain(UNSERVICEABLE);
    expect(created.length).toBe(before);
    expect(await Order.countDocuments({ userId: m.userId })).toBe(0);
  });
});
