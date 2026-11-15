import { describe, it, expect, jest, beforeAll, beforeEach } from "@jest/globals";

// The COD fee and the checkout trial across every way an order is placed:
// guest, signed-in (Google: real email; WhatsApp: placeholder email), the
// normal steps and Razorpay Magic, COD and prepaid, with and without admin
// free shipping. Razorpay and the courier API are stubbed; the rest is real.
const created = [];
jest.unstable_mockModule("../services/rp.payement.service.js", () => ({
  razorpayCreateOrderService: async (amount, currency, opts) => { created.push({ amount, opts }); return { data: { id: `order_${created.length}` } }; },
  razorpayFetchOrderService: async () => ({}),
}));
jest.unstable_mockModule("../services/shipping.service.js", () => ({
  staticShippingCharge: (v) => (Number(v) >= 1000 ? 149 : 99),
  calculateShippingRate: async ({ cartValue }) => ({ total_charges: Number(cartValue) >= 1000 ? 149 : 99, type: "dynamic" }),
  FALLBACK_SHIPPING_CHARGE: 179,
  isPincodeNotServiceable: (e) => e?.data?.code === "PINCODE_NOT_SERVICEABLE",
}));

const LAMP = "lamp-1";
const SHIP = 149; // 2 × ₹800 = ₹1600 → ₹149 band
const SUB = 1600;
const EXP = "magic_vs_standard_2026_11";
const GOOGLE = { userId: "u-google", email: "member@gmail.com" };
const WHATSAPP = { userId: "u-wa", email: "9876543210@wa.urbannook.in" };

let Product, Cart, User, Order, Promotion, COD_FEE;
let razorpayCreateOrderController, guestCreateOrderController, applyCouponCodeService, dynamicShippingCal, getCheckoutDisplayController;

const freeShippingOnLamp = () => Promotion.collection.insertOne({
  name: "Free shipping on lamp", promotionType: "automatic", isActive: true, startsAt: null, endsAt: null, stackable: true, exclusive: false, priority: 1, promotionGroup: "",
  conditionTree: { op: "AND", children: [{ field: "product", productId: LAMP, minQuantity: 1, variantSku: "" }] },
  rewards: [{ type: "free_shipping" }], placements: ["cart", "checkout"],
});
const seedMember = async (member) => {
  await User.collection.insertOne({ userId: member.userId, name: "Member", email: member.email, mobileNumber: 9876543210 });
  await Cart.collection.insertOne({ userId: member.userId, products: { [`${LAMP}:Lamp Blue`]: { quantity: 2, selectedVariant: "Lamp Blue" } } });
  await applyCouponCodeService({ userId: member.userId, couponCodeName: "" }); // stores the cart quote
};
const res = (resolve) => { const r = { code: 0 }; r.status = (c) => { r.code = c; return r; }; r.json = (p) => { r.body = p; resolve(p); return r; }; return r; };
const call = (controller, req) => new Promise((resolve, reject) => { controller(req, res(resolve), reject); }).then((b) => b.data);
const items = [{ productId: LAMP, quantity: 2, variant: "Lamp Blue" }];
const address = { formattedAddress: "12 MG Road", pinCode: "560001" };
const memberOrder = (member, body) => call(razorpayCreateOrderController, {
  user: { userId: member.userId },
  body: { items, senderMobile: "9876543210", userEmail: member.email, deliveryAddress: address, paymentMethod: "PREPAID", ...body },
  headers: {}, ip: "1.1.1.1",
});
const guestOrder = (body) => call(guestCreateOrderController, {
  body: { items, guestInfo: { name: "Guest", email: "guest@example.com", mobile: "9999999999" }, deliveryAddress: address, paymentMethod: "PREPAID", ...body },
  headers: {}, ip: "1.1.1.1",
});
const saved = (d) => Order.findOne({ orderId: d.orderId }).lean();
const arm = (a) => ({ checkoutExperiment: { name: EXP, arm: a } });

beforeAll(async () => {
  process.env.MAGIC_CHECKOUT_ENABLED = "true";
  delete process.env.MAGIC_CHECKOUT_GUESTS_ONLY;
  ({ default: Product } = await import("../model/product.model.js"));
  ({ default: Cart } = await import("../model/user.cart.model.js"));
  ({ default: User } = await import("../model/user.model.js"));
  ({ default: Order } = await import("../model/order.model.js"));
  ({ default: Promotion } = await import("../model/promotion.model.js"));
  ({ COD_FEE } = await import("../utils/orderAmount.util.js"));
  ({ razorpayCreateOrderController, guestCreateOrderController } = await import("../controller/rp.payment.controller.js"));
  ({ applyCouponCodeService } = await import("../services/coupon.code.service.js"));
  ({ dynamicShippingCal } = await import("../controller/dynamic.shipping.controller.js"));
  ({ getCheckoutDisplayController } = await import("../controller/promotion.controller.js"));
});

beforeEach(async () => {
  await Product.collection.insertOne({
    productId: LAMP, uiProductId: "u-lamp", productName: "Lamp", productStatus: "in_stock", productCategory: "c", productSubCategory: "s",
    variantDetails: [{ sku: "LMP1", variantName: "Lamp Blue", variantPrice: 800, variantMrp: 800, variantQuantity: 50, variantImage: ["x.jpg"] }],
  });
});

const expectCod = async (d, { fee = COD_FEE, ship = SHIP } = {}) => {
  const o = await saved(d);
  expect(o.paymentMethod).toBe("COD");
  expect(o.amount).toBe(SUB + ship + fee);
  expect(o.codDetails).toMatchObject({ codFee: fee, partialAmountPaid: SHIP * 2, remainingAmount: SUB + ship + fee - SHIP * 2 });
  expect(d.amount).toBe(SHIP * 2 * 100); // Razorpay takes only the advance
  expect(d.codDetails.codFee).toBe(fee);
  return o;
};
const expectPrepaid = async (d, { magic = false } = {}) => {
  const o = await saved(d);
  expect(o.paymentMethod).toBe("PREPAID");
  expect(o.isMagicOrder).toBe(magic);
  expect(o.codDetails?.codFee || 0).toBe(0);
  expect(o.amount).toBe(magic ? SUB : SUB + SHIP); // Magic: Razorpay adds shipping itself
  return o;
};

describe.each([["Google login", GOOGLE], ["WhatsApp login", WHATSAPP]])("signed in (%s)", (_label, member) => {
  beforeEach(() => seedMember(member));

  it("normal steps, COD: ₹49 fee on the total, collected on delivery; advance unchanged", async () => {
    const o = await expectCod(await memberOrder(member, { paymentMethod: "COD", ...arm("standard") }));
    expect(o.checkoutExperiment).toEqual({ name: EXP, arm: "standard" });
  });

  it("normal steps, prepaid: no fee", async () => {
    await expectPrepaid(await memberOrder(member, arm("standard")));
  });

  it("Magic (Express): no fee, arm recorded", async () => {
    const o = await expectPrepaid(await memberOrder(member, { magic: true, ...arm("magic") }), { magic: true });
    expect(o.checkoutExperiment).toEqual({ name: EXP, arm: "magic" });
  });

  it("Magic with paymentMethod COD sent anyway is still prepaid, no fee", async () => {
    await expectPrepaid(await memberOrder(member, { magic: true, paymentMethod: "COD" }), { magic: true });
  });

  it("COD with free shipping from a product promotion: no delivery charge and no COD fee", async () => {
    await freeShippingOnLamp();
    await applyCouponCodeService({ userId: member.userId, couponCodeName: "" });
    await expectCod(await memberOrder(member, { paymentMethod: "COD" }), { fee: 0, ship: 0 });
  });
});

describe("guest", () => {
  it("normal steps, COD: fee", async () => {
    const o = await expectCod(await guestOrder({ paymentMethod: "COD", ...arm("standard") }));
    expect(o.checkoutExperiment).toEqual({ name: EXP, arm: "standard" });
  });

  it("normal steps, prepaid: no fee", async () => {
    await expectPrepaid(await guestOrder({}));
  });

  it("Magic (Express): no fee", async () => {
    await expectPrepaid(await guestOrder({ magic: true, ...arm("magic") }), { magic: true });
  });

  it("COD with free shipping from a product promotion: no COD fee", async () => {
    await freeShippingOnLamp();
    await expectCod(await guestOrder({ paymentMethod: "COD" }), { fee: 0, ship: 0 });
  });
});

describe("the trial field cannot be abused", () => {
  for (const [label, value] of [
    ["unknown experiment", { name: "other", arm: "magic" }],
    ["unknown arm", { name: EXP, arm: "free-stuff" }],
    ["query operator instead of a string", { name: { $gt: "" }, arm: { $ne: null } }],
    ["a plain string", "magic"],
    ["null", null],
  ]) {
    it(`${label}: the order is placed and nothing is stored`, async () => {
      const o = await saved(await guestOrder({ paymentMethod: "COD", checkoutExperiment: value }));
      expect(o.checkoutExperiment).toBeUndefined();
      expect(o.codDetails.codFee).toBe(COD_FEE);
    });
  }
});

describe("what the checkout page reads", () => {
  const quote = (paymentType) => call(dynamicShippingCal, { body: { deliveryPinCode: 560001, cartItems: [{ productId: LAMP, quant: 2, price: 800 }], cartValue: SUB, paymentType } });

  it("the COD quote carries the fee, the prepaid quote does not", async () => {
    expect((await quote("COD")).codFee).toBe(COD_FEE);
    expect((await quote("PREPAID")).codFee).toBe(0);
    expect((await quote(undefined)).codFee).toBe(0);
  });

  it("the checkout promotions say when a promotion gives free shipping", async () => {
    const display = () => call(getCheckoutDisplayController, { body: { items: [{ productId: LAMP, quantity: 2, selectedVariant: "Lamp Blue" }], subtotal: SUB } });
    expect((await display()).freeShipping).toBe(false);
    await freeShippingOnLamp();
    expect((await display()).freeShipping).toBe(true);
  });
});
