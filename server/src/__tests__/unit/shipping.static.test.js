import { describe, it, expect } from "@jest/globals";
import { staticShippingCharge } from "../../services/shipping.service.js";

describe("static delivery charge", () => {
  it("₹99 under ₹1000", () => {
    expect(staticShippingCharge(0)).toBe(99);
    expect(staticShippingCharge(999)).toBe(99);
    expect(staticShippingCharge(999.99)).toBe(99);
  });
  it("₹149 from ₹1000, whatever the cart holds", () => {
    expect(staticShippingCharge(1000)).toBe(149);
    expect(staticShippingCharge(25000)).toBe(149);
  });
  it("garbage cart value falls back to ₹99", () => {
    expect(staticShippingCharge(undefined)).toBe(99);
    expect(staticShippingCharge(NaN)).toBe(99);
  });
});
