import { describe, it, expect, jest, beforeAll } from "@jest/globals";

// Bug: when a paid order sold a variant out, the storefront re-sorted the product's variants with a Mongoose write that
// silently dropped every admin-only variant field (variantMrp, variantDes, swatches, isActive) from ALL variants — so the
// shop card lost its struck-through MRP / "% off" and retired variants came back to life.
jest.unstable_mockModule("../services/rp.payement.service.js", () => ({
  razorpayCreateOrderService: async () => ({ data: { id: "order_1" } }),
  razorpayFetchOrderService: async () => ({}),
  razorpayFetchOrderPaymentsService: async () => [],
}));

let Product, decrementStockForOrder;
beforeAll(async () => {
  ({ default: Product } = await import("../model/product.model.js"));
  ({ decrementStockForOrder } = await import("../controller/rp.payment.controller.js"));
});

const variant = (name, over = {}) => ({
  variantName: name, sku: name.toUpperCase(), variantPrice: 1799, variantMrp: 2499, variantDes: `about ${name}`,
  variantSwatchType: "color", variantSwatchValue: "#112233", isActive: true, variantQuantity: 5, variantOutOfStock: false, variantImage: ["i.jpg"], ...over,
});
const order = (variantName) => ({ orderId: "o1", items: [{ productId: "p1", productSnapshot: { quantity: 1, selectedVariant: variantName } }] });

describe("stock decrement + OOS re-sort keeps every variant field", () => {
  it("MRP, description, swatch and isActive survive on ALL variants when one variant sells out and the order changes", async () => {
    await Product.collection.insertOne({
      productId: "p1", uiProductId: "u1", productName: "Katana", productStatus: "in_stock", productQuantity: 11,
      variantDetails: [variant("A", { variantQuantity: 1 }), variant("B", { isActive: false, variantMrp: 3000 }), variant("C", { variantQuantity: 5, variantMrp: 2799 })],
    });
    await decrementStockForOrder(order("A")); // A hits 0 → out of stock → re-sorted to the end

    const doc = await Product.collection.findOne({ productId: "p1" });
    expect(doc.variantDetails.map((v) => v.variantName)).toEqual(["B", "C", "A"]); // it really was re-sorted (the write that used to strip)
    const byName = Object.fromEntries(doc.variantDetails.map((v) => [v.variantName, v]));
    expect(byName.A).toMatchObject({ variantQuantity: 0, variantOutOfStock: true, variantMrp: 2499, variantDes: "about A", variantSwatchType: "color", variantSwatchValue: "#112233", isActive: true });
    expect(byName.B).toMatchObject({ variantMrp: 3000, isActive: false, variantDes: "about B" }); // a retired variant stays retired
    expect(byName.C).toMatchObject({ variantMrp: 2799, variantQuantity: 5 });
  });

  it("a hydrated read of the product also exposes the admin-only fields", async () => {
    await Product.collection.insertOne({ productId: "p2", uiProductId: "u2", productName: "Lamp", productStatus: "in_stock", variantDetails: [variant("A")] });
    const v = (await Product.findOne({ productId: "p2" })).toObject().variantDetails[0];
    expect(v).toMatchObject({ variantMrp: 2499, variantDes: "about A", isActive: true });
  });
});
