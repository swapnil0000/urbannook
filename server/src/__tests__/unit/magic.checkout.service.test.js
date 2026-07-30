import { jest } from "@jest/globals";
import crypto from "crypto";

// envConfigSetup just re-exports process.env, so set flags/secret BEFORE import.
process.env.MAGIC_CHECKOUT_ENABLED = "true";
process.env.MAGIC_CALLBACK_SECRET = "test_secret";

const {
  isMagicCheckoutEnabled,
  buildMagicLineItems,
  lineItemsTotalPaise,
  toRazorpayServiceableAddress,
  verifyMagicCallbackSignature,
  mapMagicShippingAddress,
  extractMagicShippingAddress,
} = await import("../../services/magic.checkout.service.js");

describe("magic.checkout.service", () => {
  describe("isMagicCheckoutEnabled", () => {
    it("reads the env flag", () => {
      expect(isMagicCheckoutEnabled()).toBe(true);
    });
  });

  describe("buildMagicLineItems", () => {
    const orderItems = [
      {
        productId: "P1",
        productSnapshot: {
          productName: "Brass Lamp",
          productImg: "https://cdn/x.webp",
          quantity: 2,
          priceAtPurchase: 3999, // rupees
          selectedVariant: "Gold",
          productSubCategory: "Lamps",
        },
      },
      {
        productId: "P2",
        productSnapshot: {
          productName: "Coaster",
          productImg: "https://cdn/y.webp",
          quantity: 1,
          priceAtPurchase: 499,
          selectedVariant: "N/A", // should be dropped
        },
      },
    ];

    it("maps snapshots to the Razorpay line_items schema in paise", () => {
      const items = buildMagicLineItems(orderItems);
      expect(items[0]).toMatchObject({
        type: "e-commerce",
        sku: "P1",
        variant_id: "Gold",
        price: 399900,
        offer_price: 399900,
        quantity: 2,
        name: "Brass Lamp",
        description: "Lamps",
        image_url: "https://cdn/x.webp",
      });
    });

    it("omits variant_id when the variant is N/A", () => {
      const items = buildMagicLineItems(orderItems);
      expect(items[1]).not.toHaveProperty("variant_id");
    });

    it("returns [] for empty/undefined input", () => {
      expect(buildMagicLineItems()).toEqual([]);
      expect(buildMagicLineItems([])).toEqual([]);
    });
  });

  describe("lineItemsTotalPaise", () => {
    it("sums offer_price × quantity", () => {
      const items = buildMagicLineItems([
        { productId: "P1", productSnapshot: { priceAtPurchase: 3999, quantity: 2 } },
        { productId: "P2", productSnapshot: { priceAtPurchase: 499, quantity: 1 } },
      ]);
      // 399900*2 + 49900*1
      expect(lineItemsTotalPaise(items)).toBe(849700);
    });
  });

  describe("toRazorpayServiceableAddress", () => {
    it("converts rupees to paise and forces COD off", () => {
      const out = toRazorpayServiceableAddress(
        { id: 0, zipcode: "560001", state: "KA", country: "in" },
        179,
        true,
      );
      expect(out).toEqual({
        id: 0,
        zipcode: "560001",
        state: "KA",
        country: "in",
        serviceable: true,
        shipping_fee: 17900,
        cod: false,
        cod_fee: 0,
      });
    });

    it("zeros the shipping fee when unserviceable", () => {
      const out = toRazorpayServiceableAddress({ id: 1, zipcode: "000000" }, 179, false);
      expect(out.serviceable).toBe(false);
      expect(out.shipping_fee).toBe(0);
    });
  });

  describe("verifyMagicCallbackSignature", () => {
    const body = Buffer.from(JSON.stringify({ order_id: "order_x", addresses: [] }));
    const sign = (b, secret = "test_secret") =>
      crypto.createHmac("sha256", secret).update(b).digest("hex");

    it("accepts a correctly signed body", () => {
      expect(verifyMagicCallbackSignature(body, sign(body))).toBe(true);
    });

    it("rejects a wrong signature", () => {
      expect(verifyMagicCallbackSignature(body, sign(body, "wrong"))).toBe(false);
    });

    it("rejects missing signature/body", () => {
      expect(verifyMagicCallbackSignature(body, undefined)).toBe(false);
      expect(verifyMagicCallbackSignature(undefined, sign(body))).toBe(false);
    });
  });

  describe("mapMagicShippingAddress", () => {
    it("maps 1CC shipping_address + customer to the deliveryAddress shape", () => {
      const out = mapMagicShippingAddress(
        {
          line1: "12 MG Road",
          line2: "Apt 4",
          zipcode: "560001",
          contact: "+919090909090",
          city: "Bengaluru",
          state: "Karnataka",
          landmark: "Near Metro",
        },
        { name: "Asha", contact: "+919090909090" },
      );
      expect(out).toMatchObject({
        fullName: "Asha",
        mobileNumber: "9090909090", // country code stripped
        addressLine: "12 MG Road, Apt 4",
        city: "Bengaluru",
        state: "Karnataka",
        pinCode: 560001, // numeric
        landmark: "Near Metro",
      });
      expect(out.deliveryAddressFull).toContain("560001");
    });

    it("returns null without a zipcode", () => {
      expect(mapMagicShippingAddress(null)).toBeNull();
      expect(mapMagicShippingAddress({ city: "X" })).toBeNull();
    });
  });

  describe("extractMagicShippingAddress", () => {
    it("reads the address from the order entity in a webhook payload", () => {
      const payload = {
        payload: {
          order: {
            entity: {
              shipping_address: { line1: "1", zipcode: "305001", city: "Ajmer", state: "Rajasthan" },
              customer_details: { name: "Test" },
            },
          },
        },
      };
      const out = extractMagicShippingAddress(payload);
      expect(out.pinCode).toBe(305001);
      expect(out.city).toBe("Ajmer");
    });

    it("returns null when no address is present", () => {
      expect(extractMagicShippingAddress({ payload: { payment: { entity: {} } } })).toBeNull();
    });
  });
});
