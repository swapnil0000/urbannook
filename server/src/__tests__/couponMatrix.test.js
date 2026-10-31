import { describe, it, expect, jest, beforeAll } from "@jest/globals";

// One example coupon per kind, three different customers, six places a coupon can be met:
//   LIST     cart / pay-page coupon list
//   TYPE     typing the code (guest: lookup · signed-in: /coupon/apply)
//   PAY      creating the order (prepaid) — the server's own final check
//   COD      creating the order (cash on delivery) — must agree with PAY
//   SHEET    Razorpay Magic coupon sheet (callback the Razorpay modal calls)
//   MAPPLY   Razorpay Magic "apply code" (callback the Razorpay modal calls)
// The expected answer for every cell is written down below; the test fails with the list of cells that differ.
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
let Product, Coupon, CouponUsage, Cart, User, Order;
let guestCreateOrderController, razorpayCreateOrderController, applyCouponCodeService, getAllCouponCodeService;
let magicGetPromotionsController, magicApplyPromotionController;

const MEMBER = { userId: "u-1", email: "member@example.com", mobileNumber: 9876543210, verifiedMobile: 9123456780 };
const ACTORS = {
  G: { label: "guest (typed 9000000001)", guestInfo: { name: "G", email: "guest@example.com", mobile: "9000000001" } },
  T: { label: "guest (typed 9369463494)", guestInfo: { name: "T", email: "tgt@example.com", mobile: "9369463494" } },
  M: { label: "signed-in member", member: true },
};
const CART_VALUE = 1900; // 2 × ₹800 + 1 × ₹300
const PAST = new Date(Date.now() - 864e5), FUTURE = new Date(Date.now() + 864e5);

let n = 0;
const mk = (code, over = {}) =>
  Coupon.collection.insertOne({
    couponId: `c-${++n}`, code, discountType: "FLAT", discountValue: 200, minCartValue: 0,
    scope: "PUBLIC", audience: "EVERYONE", isActive: true, isArchived: false, isTest: false, isInternal: false, isHidden: false,
    usageCount: 0, maxUsesPerUser: 1, assignedTo: [], eligibleProductIds: [], ...over,
  });
const assigned = (identifier, type) => ({ identifierType: type, identifier, usedAt: null });

// code → [description, expected cells for G, T, M] — each is LIST TYPE PAY COD SHEET MAPPLY as Y/N
const Y = "YYYYYY", N = "NNNNNN";
const CASES = [
  ["PUB100",    "public, flat ₹200",                               {}, [Y, Y, Y]],
  ["PUBPCT",    "public, 10% capped ₹150",                         { discountType: "PERCENTAGE", discountValue: 10, maxDiscountCap: 150 }, [Y, Y, Y]],
  ["HIDDEN1",   "hidden (works only when typed)",                  { isHidden: true }, ["NYYYNY", "NYYYNY", "NYYYNY"]],
  ["MEMBERS1",  "members only",                                    { audience: "MEMBERS_ONLY" }, [N, N, Y]],
  ["TGTMOBILE", "assigned to mobile 9369463494",                   { scope: "TARGETED", assignedTo: [assigned("9369463494", "MOBILE")] }, [N, "NYYYYY", N]],
  ["TGTEMAIL",  "assigned to member@example.com",                  { scope: "TARGETED", assignedTo: [assigned("member@example.com", "EMAIL")] }, [N, N, Y]],
  ["TGTVERIF",  "assigned to the member's verified mobile",        { scope: "TARGETED", assignedTo: [assigned("9123456780", "MOBILE")] }, [N, N, Y]],
  ["TGTSOMEONE","assigned to somebody else",                       { scope: "TARGETED", assignedTo: [assigned("nobody@example.com", "EMAIL")] }, [N, N, N]],
  ["GATEDOK",   "needs a Pen Stand (in cart)",                     { eligibleProductIds: [PEN] }, [Y, Y, Y]],
  ["GATEDNO",   "needs a product that is not in the cart",         { eligibleProductIds: ["not-in-cart"] }, [N, N, N]],
  ["MIN3000",   "minimum cart ₹3000 (cart is ₹1900)",              { minCartValue: 3000 }, ["YNNNNN", "YNNNNN", "YNNNNN"]],
  ["EXPIRED",   "expired yesterday",                               { validUntil: PAST }, [N, N, N]],
  ["FUTURE",    "starts tomorrow",                                 { validFrom: FUTURE }, [N, N, N]],
  ["PAUSED",    "paused (isActive false)",                         { isActive: false }, [N, N, N]],
  ["SOLDOUT",   "all redemptions used",                            { maxTotalUses: 5, usageCount: 5 }, [N, N, N]],
  ["TESTING",   "testing mode (not made live)",                    { isTest: true }, [N, N, N]],
  ["ARCHIVED",  "archived",                                        { isArchived: true }, [N, N, N]],
  ["INTERNAL",  "team ₹1 test coupon for the member",              { discountType: "INTERNAL_TEST", discountValue: 0, scope: "TARGETED", isTest: true, isInternal: true, assignedTo: [assigned("member@example.com", "EMAIL")] }, [N, N, "NYYYNN"]],
  ["USEDALREADY", "per-customer limit 1, all three already used it", {}, ["YNNNNN", "YNNNNN", "NNNNNN"]],
];

const res = (resolve) => { const r = { code: 0 }; r.status = (c) => { r.code = c; return r; }; r.json = (p) => { r.body = p; resolve(p); return r; }; return r; };
const guestReq = (actor, extra = {}, paymentMethod = "PREPAID") => ({
  body: {
    items: [{ productId: LAMP, quantity: 2, variant: "Lamp Blue" }, { productId: PEN, quantity: 1, variant: "Pen Stand Red" }],
    guestInfo: actor.guestInfo, deliveryAddress: { formattedAddress: "addr", pinCode: "560001" }, paymentMethod, ...extra,
  },
  headers: {}, ip: "1.1.1.1",
});
const runGuest = (actor, extra, pm) => new Promise((resolve, reject) => { guestCreateOrderController(guestReq(actor, extra, pm), res(resolve), reject); }).then((b) => b.data);
const memberReq = (paymentMethod = "PREPAID", extra = {}) => ({
  user: { userId: MEMBER.userId },
  body: {
    items: [{ productId: LAMP, quantity: 2, variant: "Lamp Blue" }, { productId: PEN, quantity: 1, variant: "Pen Stand Red" }],
    userEmail: MEMBER.email, senderMobile: "9876543210", deliveryAddress: { formattedAddress: "addr", pinCode: "560001" }, paymentMethod, ...extra,
  },
  headers: {}, ip: "1.1.1.1",
});
const runMember = (pm, extra) => new Promise((resolve, reject) => { razorpayCreateOrderController(memberReq(pm, extra), res(resolve), reject); }).then((b) => b.data);

const callMagic = (ctrl, payload, secret) => new Promise((resolve, reject) => {
  const req = { method: "POST", body: Buffer.from(JSON.stringify(payload)), headers: {}, query: { k: secret } };
  const r = { status() { return r; }, json(b) { resolve(b); return r; } };
  ctrl(req, r, reject);
});
const sheet = async (orderId, extra = {}) => (await callMagic(magicGetPromotionsController, { order_id: orderId, ...extra }, "get-secret")).promotions.map((p) => p.code);
const mapply = async (orderId, code, extra = {}) => !(await callMagic(magicApplyPromotionController, { order_id: orderId, code, ...extra }, "apply-secret")).failure_code;

const ok = async (fn) => { try { await fn(); return true; } catch { return false; } };
const yn = (b) => (b ? "Y" : "N");

beforeAll(async () => {
  process.env.MAGIC_CHECKOUT_ENABLED = "true";
  process.env.MAGIC_GET_PROMO_SECRET = "get-secret";
  process.env.MAGIC_APPLY_PROMO_SECRET = "apply-secret";
  delete process.env.MAGIC_CHECKOUT_GUESTS_ONLY;
  ({ default: Product } = await import("../model/product.model.js"));
  ({ default: Coupon } = await import("../model/coupon.model.js"));
  ({ default: CouponUsage } = await import("../model/couponUsage.model.js"));
  ({ default: Cart } = await import("../model/user.cart.model.js"));
  ({ default: User } = await import("../model/user.model.js"));
  ({ default: Order } = await import("../model/order.model.js"));
  ({ guestCreateOrderController, razorpayCreateOrderController } = await import("../controller/rp.payment.controller.js"));
  ({ applyCouponCodeService, getAllCouponCodeService } = await import("../services/coupon.code.service.js"));
  ({ magicGetPromotionsController, magicApplyPromotionController } = await import("../controller/magic.checkout.controller.js"));
});

const seedWorld = async () => {
  await Product.collection.insertMany([
    { productId: LAMP, uiProductId: "u-lamp", productName: "Lamp", productStatus: "in_stock", productCategory: "c", productSubCategory: "s", variantDetails: [variant("LMP1", "Lamp Blue", 800)] },
    { productId: PEN, uiProductId: "u-pen", productName: "Pen Stand", productStatus: "in_stock", productCategory: "c", productSubCategory: "s", variantDetails: [variant("PEN1", "Pen Stand Red", 300)] },
  ]);
  await User.collection.insertOne({ ...MEMBER, name: "Member" });
  await Cart.collection.insertOne({ userId: MEMBER.userId, products: { [`${LAMP}:Lamp Blue`]: { quantity: 2, selectedVariant: "Lamp Blue" }, [`${PEN}:Pen Stand Red`]: { quantity: 1, selectedVariant: "Pen Stand Red" } } });
  for (const [code, , over] of CASES) await mk(code, over);
  const used = await Coupon.collection.findOne({ code: "USEDALREADY" });
  for (const who of [{ email: "guest@example.com", mobile: "9000000001" }, { email: "tgt@example.com", mobile: "9369463494" }, { email: MEMBER.email, mobile: "9876543210", userId: MEMBER.userId }]) {
    await CouponUsage.collection.insertOne({ couponId: used.couponId, couponCode: "USEDALREADY", orderId: `o-${who.mobile}`, ...who, discountAmount: 200, usedAt: new Date() });
  }
};

// Every actor gets an order that is already sitting in Razorpay's Magic modal (no coupon on it).
const openMagicOrders = async () => {
  const ids = {};
  for (const [key, actor] of Object.entries(ACTORS)) {
    if (actor.member) {
      await applyCouponCodeService({ userId: MEMBER.userId, couponCodeName: "" }); // stores the cart quote
      ids[key] = (await runMember("PREPAID", { magic: true })).orderId;
    } else {
      ids[key] = (await runGuest(actor, { magic: true })).orderId;
    }
  }
  return ids;
};

const measure = async (key, actor, code, magicOrderId) => {
  const list = actor.member
    ? await getAllCouponCodeService({ userId: MEMBER.userId })
    : await getAllCouponCodeService({ cartProductIds: [LAMP, PEN] });
  const LIST = list.data.some((c) => c.code === code);

  let TYPE, PAY, COD;
  if (actor.member) {
    TYPE = await ok(() => applyCouponCodeService({ userId: MEMBER.userId, couponCodeName: code }));
    PAY = TYPE && (await ok(() => runMember("PREPAID")));
    COD = TYPE && (await ok(() => runMember("COD")));
    await applyCouponCodeService({ userId: MEMBER.userId, couponCodeName: "" });
  } else {
    const found = (await getAllCouponCodeService({ code, email: actor.guestInfo.email, mobile: actor.guestInfo.mobile, cartProductIds: [LAMP, PEN] })).data[0];
    // the checkout page itself also refuses a coupon whose minimum the cart does not reach (CouponInput.jsx)
    TYPE = !!found && !found.membersOnly && !found.alreadyUsed && !found.productGateFailed && (found.minCartValue || 0) <= CART_VALUE;
    PAY = await ok(() => runGuest(actor, { couponCode: code }, "PREPAID"));
    COD = await ok(() => runGuest(actor, { couponCode: code }, "COD"));
  }

  const SHEET = (await sheet(magicOrderId)).includes(code);
  const MAPPLY = await mapply(magicOrderId, code);
  return [LIST, TYPE, PAY, COD, SHEET, MAPPLY].map(yn).join("");
};

describe("coupon matrix — every kind of coupon × every kind of customer × every place it can be met", () => {
  it("matches the written-down expectation in every cell", async () => {
    await seedWorld();
    const magicIds = await openMagicOrders();

    const rows = [];
    const mismatches = [];
    for (const [code, what, , expected] of CASES) {
      const row = { code, what };
      ["G", "T", "M"].forEach((key, i) => { row[key] = null; row[`${key}_exp`] = expected[i]; });
      for (const [i, key] of ["G", "T", "M"].entries()) {
        const got = await measure(key, ACTORS[key], code, magicIds[key]);
        row[key] = got;
        if (got !== expected[i]) mismatches.push(`${code} · ${ACTORS[key].label}: got ${got} expected ${expected[i]}   [LIST TYPE PAY COD SHEET MAPPLY]`);
      }
      rows.push(row);
    }

    console.log(
      "\n[LIST TYPE PAY COD SHEET MAPPLY]  Y = works / is shown\n" +
        rows.map((r) => `${r.code.padEnd(12)} ${r.what.padEnd(48)} G:${r.G}  T:${r.T}  M:${r.M}`).join("\n"),
    );
    expect(mismatches).toEqual([]);
  });
});

describe("Razorpay Magic: whose number is used for coupons", () => {
  it("falls back to the number already captured on the order when Razorpay sends none", async () => {
    await seedWorld();
    const ids = await openMagicOrders();
    expect(await sheet(ids.T)).toContain("TGTMOBILE");
    expect(await sheet(ids.G)).not.toContain("TGTMOBILE");
  });

  it("uses the number typed in the Razorpay modal when the customer changes it", async () => {
    await seedWorld();
    const ids = await openMagicOrders();
    // G typed 9000000001 at checkout but changes the number in the modal to the assigned one → now sees the coupon
    expect(await sheet(ids.G, { contact: "+919369463494" })).toContain("TGTMOBILE");
    expect(await mapply(ids.G, "TGTMOBILE", { contact: "9369463494" })).toBe(true);
    // T changes away from the assigned number → loses it
    expect(await sheet(ids.T, { contact: "9000000009" })).not.toContain("TGTMOBILE");
    expect(await mapply(ids.T, "TGTMOBILE", { contact: "9000000009" })).toBe(false);
  });

  it("a signed-in customer keeps their account's coupons even if the modal shows another number", async () => {
    await seedWorld();
    const ids = await openMagicOrders();
    const list = await sheet(ids.M, { contact: "9000000009" });
    expect(list).toEqual(expect.arrayContaining(["TGTEMAIL", "TGTVERIF", "MEMBERS1"]));
    expect(list).not.toContain("TGTMOBILE");
  });
});

describe("no number anywhere → stays blank, nothing is guessed", () => {
  it("a Magic guest with no email/mobile on the order and none sent by Razorpay sees only coupons that need no identity", async () => {
    await seedWorld();
    const blank = { guestInfo: { name: "", email: "", mobile: "" } };
    const { orderId } = await runGuest(blank, { magic: true });
    const list = await sheet(orderId);
    expect(list).toEqual(expect.arrayContaining(["PUB100", "PUBPCT"]));
    for (const targeted of ["TGTMOBILE", "TGTEMAIL", "TGTVERIF", "MEMBERS1", "HIDDEN1"]) expect(list).not.toContain(targeted);
    // ...and a targeted code typed in the modal is refused until a number is known
    expect(await mapply(orderId, "TGTMOBILE")).toBe(false);
    // once Razorpay does send the assigned number, it works
    expect(await mapply(orderId, "TGTMOBILE", { contact: "9369463494" })).toBe(true);
  });
});
