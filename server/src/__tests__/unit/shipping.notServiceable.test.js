import { describe, it, expect, jest, beforeAll } from "@jest/globals";

// The courier API answering "no courier for this pincode" must reach the
// customer as a 400 they can act on — as a plain Error it became a 500
// "Internal server error" at checkout.
let calls = 0;
jest.unstable_mockModule("axios", () => ({
  default: { post: async () => { calls++; return { data: { data: [] } }; } },
}));

let calculateShippingRate, isPincodeNotServiceable, Product;

beforeAll(async () => {
  ({ calculateShippingRate, isPincodeNotServiceable } = await import("../../services/shipping.service.js"));
  ({ default: Product } = await import("../../model/product.model.js"));
});

describe("pincode no courier serves", () => {
  it("throws a 400 tagged PINCODE_NOT_SERVICEABLE, without retrying", async () => {
    await Product.collection.insertOne({ productId: "p-1", weight: "500", dimensions: { length: 10, breadth: 10, height: 10 } });
    const err = await calculateShippingRate({
      pincode: "999999", cartItems: [{ productId: "p-1", quantity: 1, price: 800 }], cartValue: 800,
    }).then(() => null, (e) => e);
    expect(err?.statusCode).toBe(400);
    expect(isPincodeNotServiceable(err)).toBe(true);
    expect(err.message).toBe("Sorry, we don't deliver to pincode 999999 yet. Please use a different delivery address.");
    expect(calls).toBe(1);
  });

  it("other errors are not mistaken for it", () => {
    expect(isPincodeNotServiceable(new Error("Pincode not serviceable"))).toBe(false);
    expect(isPincodeNotServiceable(undefined)).toBe(false);
  });
});
