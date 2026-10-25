import { describe, it, expect, jest, beforeAll } from "@jest/globals";
import mongoose from "mongoose";

// What Razorpay is asked to charge must equal what the cart shows after a product-level promotion.
const created = [];
jest.unstable_mockModule("../services/rp.payement.service.js", () => ({
  razorpayCreateOrderService: async (amount, currency, opts) => { created.push({ amount, opts }); return { data: { id: `order_${created.length}` } }; },
  razorpayFetchOrderService: async () => ({}),
}));
jest.unstable_mockModule("../services/shipping.service.js", () => ({
  // same rule as the real service (static ₹99 under ₹1000, ₹149 from ₹1000); the courier API itself is not called
  staticShippingCharge: (v) => (Number(v) >= 1000 ? 149 : 99),
  calculateShippingRate: async ({ cartValue }) => ({ total_charges: Number(cartValue) >= 1000 ? 149 : 99, type: "dynamic" }),
  FALLBACK_SHIPPING_CHARGE: 179,
}));

const LAMP = "lamp-1", PEN = "pen-1";
const variant = (sku, name, price) => ({ sku, variantName: name, variantPrice: price, variantMrp: price, variantQuantity: 50, variantImage: ["x.jpg"] });
let guestCreateOrderController, Product, Promotion;

const seed = async (reward) => {
  await Product.collection.insertMany([
    { productId: LAMP, uiProductId: "u-lamp", productName: "Lamp", productStatus: "in_stock", productCategory: "c", productSubCategory: "s", variantDetails: [variant("LMP1", "Lamp Blue", 800)] },
    { productId: PEN, uiProductId: "u-pen", productName: "Pen Stand", productStatus: "in_stock", productCategory: "c", productSubCategory: "s", variantDetails: [variant("PEN1", "Pen Stand Red", 300)] },
  ]);
  await Promotion.collection.insertOne({
    name: "2 Lamps + Pen Stand", promotionType: "automatic", isActive: true, startsAt: null, endsAt: null, stackable: true, exclusive: false, priority: 1, promotionGroup: "",
    conditionTree: { op: "AND", children: [{ field: "productList", items: [{ productId: LAMP, variantSku: "" }], minQuantity: 2, operator: "gte", countMode: "units" }] },
    rewards: [reward], placements: ["cart", "checkout"],
  });
};
const res = (resolve) => { const r = { code: 0 }; r.status = (c) => { r.code = c; return r; }; r.json = (p) => { r.body = p; resolve(p); return r; }; return r; };
const guest = (magic) => ({
  body: {
    items: [{ productId: LAMP, quantity: 2, variant: "Lamp Blue" }, { productId: PEN, quantity: 1, variant: "Pen Stand Red" }],
    guestInfo: { name: "T", email: "t@example.com", mobile: "9999999999" },
    deliveryAddress: { formattedAddress: "addr", pinCode: "560001" }, paymentMethod: "PREPAID", ...(magic ? { magic: true } : {}),
  },
  headers: {}, ip: "1.1.1.1",
});
const run = (magic) => new Promise((resolve, reject) => { guestCreateOrderController(guest(magic), res(resolve), reject); }).then((b) => b.data);

beforeAll(async () => {
  ({ guestCreateOrderController } = await import("../controller/rp.payment.controller.js"));
  ({ default: Product } = await import("../model/product.model.js"));
  ({ default: Promotion } = await import("../model/promotion.model.js"));
});

describe("product-level promotion reaches the Razorpay charge", () => {
  for (const [label, reward] of [
    ["flat ₹150 off Pen Stand", { type: "flat_off_product", targetProductId: PEN, targetVariantSku: "PEN1", value: 150 }],
    ["flat ₹150 off Pen Stand (no variant SKU)", { type: "flat_off_product", targetProductId: PEN, value: 150 }],
    ["Pen Stand priced ₹150", { type: "discounted_product", targetProductId: PEN, targetVariantSku: "PEN1", value: 150 }],
    ["50% off Pen Stand", { type: "percent_off_product", targetProductId: PEN, targetVariantSku: "PEN1", value: 50 }],
  ]) {
    it(`prepaid: ${label}`, async () => {
      await seed(reward);
      const d = await run(false);
      // 800*2 + 150 (discounted pen) + static shipping ₹149 (cart ≥ ₹1000)
      expect(d.amount).toBe((1600 + 150 + 149) * 100);
    });
    it(`magic: ${label}`, async () => {
      process.env.MAGIC_CHECKOUT_ENABLED = "true";
      await seed(reward);
      const d = await run(true);
      expect(d.amount).toBe((1600 + 150) * 100);
    });
  }
});
