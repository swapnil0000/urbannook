import { describe, it, expect, jest, beforeAll } from "@jest/globals";

// The courier API being down (timeouts / 5xx after every retry) must not show
// the checkout a 500: the quote falls back to the static ₹99/₹149, exactly as
// order create already did. Only "no courier serves this pincode" stops it.
const DOWN = "110001";
const UNSERVICEABLE = "999999";
jest.unstable_mockModule("../services/shipping.service.js", () => ({
  staticShippingCharge: (v) => (Number(v) >= 1000 ? 149 : 99),
  calculateShippingRate: async ({ pincode, cartValue }) => {
    if (String(pincode) === DOWN) throw new Error("connect ETIMEDOUT shipping-api.com");
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

let dynamicShippingCal, COD_FEE;
const res = (resolve) => { const r = { code: 0 }; r.status = (c) => { r.code = c; return r; }; r.json = (p) => { r.body = p; resolve(r); return r; }; return r; };
const quote = (pincode, paymentType, cartValue = 1600) => new Promise((resolve, reject) => {
  dynamicShippingCal({ body: { deliveryPinCode: Number(pincode), cartItems: [{ productId: "lamp-1", quant: 2, price: 800 }], cartValue, paymentType } }, res(resolve), reject);
});

beforeAll(async () => {
  ({ dynamicShippingCal } = await import("../controller/dynamic.shipping.controller.js"));
  ({ COD_FEE } = await import("../utils/orderAmount.util.js"));
});

describe("checkout shipping quote", () => {
  it("courier API down: 200 with the static rate, not a 500", async () => {
    const r = await quote(DOWN, "PREPAID");
    expect(r.code).toBe(200);
    expect(r.body.data).toMatchObject({ total_charges: 149, type: "standard", codFee: 0 });
    expect((await quote(DOWN, "PREPAID", 600)).body.data.total_charges).toBe(99);
  });

  it("courier API down on COD: static rate plus the COD fee, same as the order will charge", async () => {
    expect((await quote(DOWN, "COD")).body.data).toMatchObject({ total_charges: 149, codFee: COD_FEE });
  });

  it("an unserviceable pincode still stops checkout with the 400 and its message", async () => {
    const err = await quote(UNSERVICEABLE, "PREPAID").then(() => null, (e) => e);
    expect(err?.statusCode).toBe(400);
    expect(err.message).toContain(UNSERVICEABLE);
  });

  it("API up: the normal quote", async () => {
    expect((await quote("560001", "PREPAID")).body.data).toMatchObject({ total_charges: 149, type: "dynamic" });
  });
});
