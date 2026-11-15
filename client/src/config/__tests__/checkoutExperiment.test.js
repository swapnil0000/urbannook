import { describe, it, expect, vi, beforeEach } from "vitest";

// The arm must be stable per browser (a shopper flipping between Express and the
// steps mid-trial would poison both halves) and split the traffic evenly.
const features = { enableMagicCheckout: true };
let anonId = "a";
vi.mock("../env", () => ({ default: { features } }));
vi.mock("../../utils/analytics", () => ({ getAnonymousId: () => anonId }));

const { getCheckoutArm } = await import("../checkoutExperiment");

describe("getCheckoutArm", () => {
  beforeEach(() => { features.enableMagicCheckout = true; });

  it("gives the same browser the same arm every time", () => {
    anonId = "0192f0aa-1111-7aaa-8bbb-123456789abc";
    const first = getCheckoutArm();
    for (let i = 0; i < 5; i++) expect(getCheckoutArm()).toBe(first);
  });

  it("splits browsers roughly in half", () => {
    let magic = 0;
    for (let i = 0; i < 2000; i++) {
      anonId = crypto.randomUUID();
      if (getCheckoutArm() === "magic") magic++;
    }
    expect(magic).toBeGreaterThan(900);
    expect(magic).toBeLessThan(1100);
  });

  it("runs no trial when Magic is off in the build", () => {
    features.enableMagicCheckout = false;
    expect(getCheckoutArm()).toBeNull();
  });

  it("keeps Magic when there is no stable id to bucket on", () => {
    anonId = null;
    expect(getCheckoutArm()).toBe("magic");
  });
});
