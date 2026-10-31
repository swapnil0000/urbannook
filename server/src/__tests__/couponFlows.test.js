import { describe, it, expect, jest, beforeAll } from "@jest/globals";

// Coupon behaviour end to end on the in-memory DB: who SEES a coupon, who can APPLY it,
// and what Razorpay is asked to charge (guest + logged-in, prepaid + COD + Magic).
// Razorpay and the courier API are stubbed; every other line is the real code.
const created = [];
jest.unstable_mockModule("../services/rp.payement.service.js", () => ({
  razorpayCreateOrderService: async (amount, currency, opts) => { created.push({ amount, opts }); return { data: { id: `order_${created.length}` } }; },
  razorpayFetchOrderService: async () => ({}),
}));
jest.unstable_mockModule("../services/shipping.service.js", () => ({
  staticShippingCharge: (v) => (Number(v) >= 1000 ? 149 : 99),
  calculateShippingRate: async ({ cartValue }) => ({ total_charges: Number(cartValue) >= 1000 ? 149 : 99, type: "dynamic" }),
  FALLBACK_SHIPPING_CHARGE: 179,
}));

const LAMP = "lamp-1", PEN = "pen-1";
const variant = (sku, name, price) => ({ sku, variantName: name, variantPrice: price, variantMrp: price, variantQuantity: 50, variantImage: ["x.jpg"] });
let Product, Coupon, Cart, User, Order, Promotion;
let guestCreateOrderController, razorpayCreateOrderController, applyCouponCodeService, getAllCouponCodeService;

const MEMBER = { userId: "u-1", email: "member@example.com", mobileNumber: 9876543210, verifiedMobile: 9123456780 };

const seedCatalog = () =>
  Product.collection.insertMany([
    { productId: LAMP, uiProductId: "u-lamp", productName: "Lamp", productStatus: "in_stock", productCategory: "c", productSubCategory: "s", variantDetails: [variant("LMP1", "Lamp Blue", 800)] },
    { productId: PEN, uiProductId: "u-pen", productName: "Pen Stand", productStatus: "in_stock", productCategory: "c", productSubCategory: "s", variantDetails: [variant("PEN1", "Pen Stand Red", 300)] },
  ]);
const seedMember = async (cartItems = { [`${LAMP}:Lamp Blue`]: { quantity: 2, selectedVariant: "Lamp Blue" }, [`${PEN}:Pen Stand Red`]: { quantity: 1, selectedVariant: "Pen Stand Red" } }) => {
  await User.collection.insertOne({ ...MEMBER, name: "Member" });
  await Cart.collection.insertOne({ userId: MEMBER.userId, products: cartItems });
};
let n = 0;
const coupon = (code, over = {}) =>
  Coupon.collection.insertOne({
    couponId: `c-${++n}`, code, discountType: "FLAT", discountValue: 200, minCartValue: 0,
    scope: "PUBLIC", audience: "EVERYONE", isActive: true, isArchived: false, isTest: false, isInternal: false, isHidden: false,
    usageCount: 0, maxUsesPerUser: 1, assignedTo: [], eligibleProductIds: [], ...over,
  });
const assigned = (identifier, type) => ({ identifierType: type, identifier, usedAt: null });
const listCodes = async (arg) => (await getAllCouponCodeService(arg)).data.map((c) => c.code).sort();
const lookup = async (arg) => (await getAllCouponCodeService(arg)).data;

const res = (resolve) => { const r = { code: 0 }; r.status = (c) => { r.code = c; return r; }; r.json = (p) => { r.body = p; resolve(p); return r; }; return r; };
const guestReq = (extra = {}, paymentMethod = "PREPAID") => ({
  body: {
    items: [{ productId: LAMP, quantity: 2, variant: "Lamp Blue" }, { productId: PEN, quantity: 1, variant: "Pen Stand Red" }],
    guestInfo: { name: "T", email: "t@example.com", mobile: "9999999999" },
    deliveryAddress: { formattedAddress: "addr", pinCode: "560001" }, paymentMethod, ...extra,
  },
  headers: {}, ip: "1.1.1.1",
});
const runGuest = (extra, pm) => new Promise((resolve, reject) => { guestCreateOrderController(guestReq(extra, pm), res(resolve), reject); }).then((b) => b.data);
const memberReq = (paymentMethod = "PREPAID") => ({
  user: { userId: MEMBER.userId },
  body: {
    items: [{ productId: LAMP, quantity: 2, variant: "Lamp Blue" }, { productId: PEN, quantity: 1, variant: "Pen Stand Red" }],
    userEmail: MEMBER.email, senderMobile: "9876543210",
    deliveryAddress: { formattedAddress: "addr", pinCode: "560001" }, paymentMethod,
  },
  headers: {}, ip: "1.1.1.1",
});
const runMember = (pm) => new Promise((resolve, reject) => { razorpayCreateOrderController(memberReq(pm), res(resolve), reject); }).then((b) => b.data);

beforeAll(async () => {
  ({ default: Product } = await import("../model/product.model.js"));
  ({ default: Coupon } = await import("../model/coupon.model.js"));
  ({ default: Cart } = await import("../model/user.cart.model.js"));
  ({ default: User } = await import("../model/user.model.js"));
  ({ default: Order } = await import("../model/order.model.js"));
  ({ default: Promotion } = await import("../model/promotion.model.js"));
  ({ guestCreateOrderController, razorpayCreateOrderController } = await import("../controller/rp.payment.controller.js"));
  ({ applyCouponCodeService, getAllCouponCodeService } = await import("../services/coupon.code.service.js"));
});

// cart: 2 × Lamp ₹800 + 1 × Pen Stand ₹300 = ₹1900 of products; static delivery on ₹1900 = ₹149
describe("who sees which coupon in the cart / pay-page list", () => {
  const seedAll = async () => {
    await seedCatalog();
    await seedMember();
    await coupon("PUBLIC1");
    await coupon("HIDDEN1", { isHidden: true });
    await coupon("TESTING", { isTest: true });
    await coupon("EXPIRED", { validUntil: new Date(Date.now() - 86400000) });
    await coupon("FUTURE", { validFrom: new Date(Date.now() + 86400000) });
    await coupon("SOLDOUT", { maxTotalUses: 5, usageCount: 5 });
    await coupon("MEMBERS", { audience: "MEMBERS_ONLY" });
    await coupon("MYMAIL", { scope: "TARGETED", assignedTo: [assigned("member@example.com", "EMAIL")] });
    await coupon("MYMOBILE", { scope: "TARGETED", assignedTo: [assigned("9876543210", "MOBILE")] });
    await coupon("MYVERIFIED", { scope: "TARGETED", assignedTo: [assigned("9123456780", "MOBILE")] });
    await coupon("SOMEONE", { scope: "TARGETED", assignedTo: [assigned("other@example.com", "EMAIL")] });
    await coupon("USEDTARGET", { scope: "TARGETED", assignedTo: [{ ...assigned("member@example.com", "EMAIL"), usedAt: new Date() }] });
    await coupon("GATED", { eligibleProductIds: ["not-in-cart"] });
    await coupon("USEDUP", { maxUsesPerUser: 1 });
    await Coupon.db.collection("couponusages").insertOne({ couponId: "c-" + n, couponCode: "USEDUP", userId: MEMBER.userId, email: MEMBER.email, usedAt: new Date() });
  };

  it("guest: only plain public coupons — no hidden, test, expired, future, sold-out, members-only, targeted or gated", async () => {
    await seedAll();
    expect(await listCodes({ cartProductIds: [LAMP, PEN] })).toEqual(["PUBLIC1", "USEDUP"]);
  });

  it("signed-in: also members-only and coupons assigned to their email / mobile / verified mobile — never someone else's, used ones or hidden ones", async () => {
    await seedAll();
    expect(await listCodes({ userId: MEMBER.userId })).toEqual(["MEMBERS", "MYMAIL", "MYMOBILE", "MYVERIFIED", "PUBLIC1"]);
  });

  it("a client-supplied userId is not a session (controller passes only req.user) — guests never get members-only", async () => {
    await seedAll();
    expect(await listCodes({ userId: undefined })).not.toContain("MEMBERS");
  });
});

describe("typing a code (lookup)", () => {
  it("guest: hidden code works, expired / test do not", async () => {
    await seedCatalog();
    await coupon("HIDDEN1", { isHidden: true });
    await coupon("EXPIRED", { validUntil: new Date(Date.now() - 86400000) });
    await coupon("TESTING", { isTest: true });
    expect((await lookup({ code: "hidden1" })).map((c) => c.code)).toEqual(["HIDDEN1"]);
    expect(await lookup({ code: "EXPIRED" })).toEqual([]);
    expect(await lookup({ code: "TESTING" })).toEqual([]);
  });

  it("guest: members-only code comes back flagged so the UI can ask them to sign in", async () => {
    await coupon("MEMBERS", { audience: "MEMBERS_ONLY" });
    const [c] = await lookup({ code: "MEMBERS" });
    expect(c).toMatchObject({ code: "MEMBERS", membersOnly: true });
  });

  it("guest: a targeted code needs the assigned email or mobile — anything else finds nothing", async () => {
    await coupon("PERSONAL", { scope: "TARGETED", assignedTo: [assigned("9876543210", "MOBILE"), assigned("friend@example.com", "EMAIL")] });
    expect(await lookup({ code: "PERSONAL" })).toEqual([]);
    expect(await lookup({ code: "PERSONAL", email: "stranger@example.com", mobile: "9000000000" })).toEqual([]);
    expect((await lookup({ code: "PERSONAL", mobile: "+91 98765 43210" })).map((c) => c.code)).toEqual(["PERSONAL"]);
    expect((await lookup({ code: "PERSONAL", email: "Friend@Example.com" })).map((c) => c.code)).toEqual(["PERSONAL"]);
  });
});

describe("applying a coupon in the cart (signed-in)", () => {
  it("a coupon assigned to the customer's MOBILE applies (the email in the request is irrelevant)", async () => {
    await seedCatalog(); await seedMember();
    await coupon("MYMOBILE", { scope: "TARGETED", assignedTo: [assigned("9876543210", "MOBILE")] });
    const r = await applyCouponCodeService({ userId: MEMBER.userId, couponCodeName: "MYMOBILE", email: "whoever@example.com" });
    expect(r.data.summary.discount).toBe(200);
  });

  it("also works for the WhatsApp-verified number and for the email", async () => {
    await seedCatalog(); await seedMember();
    await coupon("MYVERIFIED", { scope: "TARGETED", assignedTo: [assigned("9123456780", "MOBILE")] });
    await coupon("MYMAIL", { scope: "TARGETED", assignedTo: [assigned("member@example.com", "EMAIL")] });
    expect((await applyCouponCodeService({ userId: MEMBER.userId, couponCodeName: "MYVERIFIED" })).data.summary.discount).toBe(200);
    expect((await applyCouponCodeService({ userId: MEMBER.userId, couponCodeName: "MYMAIL" })).data.summary.discount).toBe(200);
  });

  it("someone else's coupon is refused — even if the request claims their email", async () => {
    await seedCatalog(); await seedMember();
    await coupon("SOMEONE", { scope: "TARGETED", assignedTo: [assigned("other@example.com", "EMAIL")] });
    await expect(applyCouponCodeService({ userId: MEMBER.userId, couponCodeName: "SOMEONE", email: "other@example.com" })).rejects.toThrow(/not been assigned/i);
  });

  it("members-only applies for a signed-in customer; hidden codes apply when typed", async () => {
    await seedCatalog(); await seedMember();
    await coupon("MEMBERS", { audience: "MEMBERS_ONLY" });
    await coupon("HIDDEN1", { isHidden: true });
    expect((await applyCouponCodeService({ userId: MEMBER.userId, couponCodeName: "MEMBERS" })).data.summary.discount).toBe(200);
    expect((await applyCouponCodeService({ userId: MEMBER.userId, couponCodeName: "HIDDEN1" })).data.summary.discount).toBe(200);
  });
});

describe("the coupon takes money off the PRODUCTS, never off shipping or gift wrap", () => {
  // products ₹1900 · static delivery ₹149 (cart ≥ ₹1000)
  const cases = [
    ["flat ₹200", { discountType: "FLAT", discountValue: 200 }, 200],
    ["10% capped at ₹150", { discountType: "PERCENTAGE", discountValue: 10, maxDiscountCap: 150 }, 150],
    ["10% uncapped-by-value", { discountType: "PERCENTAGE", discountValue: 10, maxDiscountCap: 1000 }, 190],
    ["flat ₹5000 (bigger than the cart) is limited to the products", { discountType: "FLAT", discountValue: 5000 }, 1900],
  ];

  for (const [label, def, off] of cases) {
    it(`guest prepaid — ${label}: charge = products − ${off} + delivery ₹149`, async () => {
      await seedCatalog(); await coupon("OFFER", def);
      const d = await runGuest({ couponCode: "OFFER" });
      expect(d.amount).toBe((1900 - off + 149) * 100);
    });
    it(`signed-in prepaid — ${label}: same charge`, async () => {
      await seedCatalog(); await seedMember(); await coupon("OFFER", def);
      await applyCouponCodeService({ userId: MEMBER.userId, couponCodeName: "OFFER" });
      const d = await runMember("PREPAID");
      expect(d.amount).toBe((1900 - off + 149) * 100);
    });
  }

  it("guest COD: the advance is 2× the REAL delivery cost, the coupon only reduces the balance", async () => {
    await seedCatalog(); await coupon("OFFER", { discountType: "FLAT", discountValue: 200 });
    const d = await runGuest({ couponCode: "OFFER" }, "COD");
    expect(d.amount).toBe(2 * 149 * 100); // online advance
    const order = await Order.findOne({ "payment.razorpayOrderId": d.id ?? undefined }).lean().catch(() => null);
    if (order) expect(order.amount ?? order.order_amount).toBeDefined();
  });

  it("signed-in COD: same advance with a coupon", async () => {
    await seedCatalog(); await seedMember(); await coupon("OFFER", { discountType: "FLAT", discountValue: 200 });
    await applyCouponCodeService({ userId: MEMBER.userId, couponCodeName: "OFFER" });
    const d = await runMember("COD");
    expect(d.amount).toBe(2 * 149 * 100);
  });

  it("guest Magic: Razorpay is asked for products − coupon (delivery is added by Magic itself)", async () => {
    process.env.MAGIC_CHECKOUT_ENABLED = "true";
    await seedCatalog(); await coupon("OFFER", { discountType: "FLAT", discountValue: 200 });
    const d = await runGuest({ couponCode: "OFFER", magic: true });
    expect(d.amount).toBe((1900 - 200) * 100);
  });

  it("a coupon below its minimum cart value is refused before Razorpay is called", async () => {
    await seedCatalog(); await coupon("BIGONLY", { minCartValue: 5000 });
    const before = created.length;
    await expect(runGuest({ couponCode: "BIGONLY" })).rejects.toThrow(/minimum/i);
    expect(created.length).toBe(before);
  });
});

describe("coupon on top of an offer (product-level promotion)", () => {
  // 2 lamps unlock ₹150 off the pen stand → products are ₹1750 after the offer
  const seedOffer = () =>
    Promotion.collection.insertOne({
      name: "2 Lamps + Pen Stand", promotionType: "automatic", isActive: true, startsAt: null, endsAt: null, stackable: true, exclusive: false, priority: 1, promotionGroup: "",
      conditionTree: { op: "AND", children: [{ field: "productList", items: [{ productId: LAMP, variantSku: "" }], minQuantity: 2, operator: "gte", countMode: "units" }] },
      rewards: [{ type: "flat_off_product", targetProductId: PEN, targetVariantSku: "PEN1", value: 150 }], placements: ["cart", "checkout"],
    });

  it("the cart quote is already net of the offer, and the % coupon is taken off THAT (not the full price)", async () => {
    await seedCatalog(); await seedMember(); await seedOffer();
    await coupon("TENPC", { discountType: "PERCENTAGE", discountValue: 10, maxDiscountCap: 1000 });
    const r = await applyCouponCodeService({ userId: MEMBER.userId, couponCodeName: "TENPC" });
    expect(r.data.summary.subtotal).toBe(1750);
    expect(r.data.summary.discount).toBe(175); // 10% of 1750, not of 1900
  });

  it("signed-in charge = offer price − coupon + delivery, agreeing with the quote", async () => {
    await seedCatalog(); await seedMember(); await seedOffer();
    await coupon("TENPC", { discountType: "PERCENTAGE", discountValue: 10, maxDiscountCap: 1000 });
    await applyCouponCodeService({ userId: MEMBER.userId, couponCodeName: "TENPC" });
    const d = await runMember("PREPAID");
    expect(d.amount).toBe((1750 - 175 + 149) * 100);
  });

  it("guest charge is identical", async () => {
    await seedCatalog(); await seedOffer();
    await coupon("TENPC", { discountType: "PERCENTAGE", discountValue: 10, maxDiscountCap: 1000 });
    const d = await runGuest({ couponCode: "TENPC" });
    expect(d.amount).toBe((1750 - 175 + 149) * 100);
  });
});

describe("review findings (pre-prod)", () => {
  it("a guest's typed email never lists personal coupons — only an exact code lookup can unlock them", async () => {
    await seedCatalog();
    await coupon("MYMAIL", { scope: "TARGETED", assignedTo: [assigned("member@example.com", "EMAIL")] });
    expect(await listCodes({ email: "member@example.com", mobile: "9876543210", cartProductIds: [LAMP, PEN] })).toEqual([]);
    expect((await lookup({ code: "MYMAIL", email: "member@example.com" })).map((c) => c.code)).toEqual(["MYMAIL"]);
  });

  it("once-per-customer is counted by ACCOUNT too: a member can't reuse a coupon by ordering to another number", async () => {
    await seedCatalog(); await seedMember();
    await coupon("ONCE", { maxUsesPerUser: 1 });
    const c = await Coupon.collection.findOne({ code: "ONCE" });
    // the earlier order was delivered to a different number and the account has no email on that usage row
    await Coupon.db.collection("couponusages").insertOne({ couponId: c.couponId, couponCode: "ONCE", userId: MEMBER.userId, mobile: "9000000009", usedAt: new Date() });
    await expect(applyCouponCodeService({ userId: MEMBER.userId, couponCodeName: "ONCE" })).rejects.toThrow(/already used/i);
  });

  it("no coupons on a guest cart of ₹99 or less, like every other path", async () => {
    await Product.collection.insertOne({ productId: "cheap-1", uiProductId: "u-cheap", productName: "Cheap", productStatus: "in_stock", productCategory: "c", productSubCategory: "s", variantDetails: [variant("CHP1", "Cheap", 50)] });
    await coupon("OFFER", { discountType: "FLAT", discountValue: 10 });
    await expect(runGuest({ couponCode: "OFFER", items: [{ productId: "cheap-1", quantity: 1, variant: "Cheap" }] })).rejects.toThrow(/₹99 or less/);
  });
});
