/**
 * Integration tests: real offers data (exported prod snapshot,
 * src/__tests__/fixtures/offers9c.json) run through the REAL cart-rule /
 * free-shipping engine (utils/cartRule.util.js, utils/freeShippingOffer.util.js)
 * against an in-memory Mongo (see __tests__/setup.js) — not a re-implemented
 * mirror. This is the regression suite for the bug where checkout displayed
 * "Free Shipping" but the Razorpay charge still included it: the "Katana +
 * Display Stand Combo" rule is scoped to one variant's SKU, and a non-.lean()
 * Product read used to silently drop `sku` (see product.schema.regression.test.js).
 *
 * Every active rule in the fixture is exercised for both its matching and
 * its non-matching edge (wrong variant, qty short by one, wrong product),
 * plus the inactive rule (must never fire) and the disabled threshold offer.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Offer from "../../model/offer.model.js";
import Product from "../../model/product.model.js";
import {
  getActiveCartRules,
  evaluateCartRules,
  getDiscountCandidatesForItem,
  applyBestDiscount,
  findQuantityDiscountNudges,
} from "../../utils/cartRule.util.js";
import { isFreeShippingEligible, getFreeShippingConfig } from "../../utils/freeShippingOffer.util.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Extended-JSON (mongoexport shape) → plain insertable docs ────────────────
function denormalize(value) {
  if (Array.isArray(value)) return value.map(denormalize);
  if (value && typeof value === "object") {
    if (typeof value.$oid === "string" && Object.keys(value).length === 1) return value.$oid;
    if (typeof value.$date === "string" && Object.keys(value).length === 1) return new Date(value.$date);
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = denormalize(v);
    return out;
  }
  return value;
}

const rawFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../fixtures/offers9c.json"), "utf8"),
);
const OFFERS_FIXTURE = denormalize(rawFixture);

// ── Catalog referenced by the fixture's productIds ────────────────────────
const LAMP = "019da690-729b-7428-8ae1-0273f030d2a8"; // "2+ Brake Caliper Lamps" / combo source
const PEN_STAND = "019cc7d5-43a9-7c24-a024-e724e6164115"; // combo recommended / discount target
const DISPLAY_STAND = "85fefd4b-4312-48ac-bf81-5662504db252"; // variant-scoped condition
const KATANA = "3e23e89b-16ad-42a1-8251-78bd047a84e9"; // any-variant condition ("")
const BULK_ITEM = "b36adc42-b08a-4273-bc8e-c670429ca1ed"; // "Buy 5 and Save More"

const DISPLAY_STAND_DOUBLE_SKU = "ANIKSTDBLS"; // matches the rule's condition
const DISPLAY_STAND_SINGLE_SKU = "ANIKSTDSGL"; // deliberately does NOT match
const KATANA_RENGOKU_SKU = "ANIKATRENS";

async function seedCatalog() {
  await Product.create([
    {
      productName: "Brake Caliper Lamp", productId: LAMP, uiProductId: "lamp-1",
      productDes: "d", productCategory: "lighting", productStatus: "in_stock", isPublished: true,
      variantDetails: [{ variantName: "Default", sku: "", variantPrice: 799 }],
    },
    {
      productName: "Pen Stand", productId: PEN_STAND, uiProductId: "pen-1",
      productDes: "d", productCategory: "desk", productStatus: "in_stock", isPublished: true,
      variantDetails: [{ variantName: "Default", sku: "", variantPrice: 499 }],
    },
    {
      productName: "Display Stand", productId: DISPLAY_STAND, uiProductId: "stand-1",
      productDes: "d", productCategory: "display", productStatus: "in_stock", isPublished: true,
      variantDetails: [
        { variantName: "Double Layer", sku: DISPLAY_STAND_DOUBLE_SKU, variantPrice: 1499 },
        { variantName: "Single Layer", sku: DISPLAY_STAND_SINGLE_SKU, variantPrice: 1299 },
      ],
    },
    {
      productName: "Katana", productId: KATANA, uiProductId: "katana-1",
      productDes: "d", productCategory: "decor", productStatus: "in_stock", isPublished: true,
      variantDetails: [{ variantName: "Rengoku", sku: KATANA_RENGOKU_SKU, variantPrice: 2499 }],
    },
    {
      productName: "Bulk Item", productId: BULK_ITEM, uiProductId: "bulk-1",
      productDes: "d", productCategory: "misc", productStatus: "in_stock", isPublished: true,
      variantDetails: [{ variantName: "Default", sku: "", variantPrice: 199 }],
    },
  ]);
}

// Resolves a cart's { productId, quantity, selectedVariant } lines to the
// { productId, quantity, variantSku } shape evaluateCartRules expects —
// mirrors cartRule.controller.js / rp.payment.controller.js's own
// name→SKU resolution against the REAL (hydrated, non-lean) Product docs,
// so a schema regression here fails this suite too.
async function resolveCartItems(lines) {
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const products = await Product.find({ productId: { $in: productIds } }); // NOT lean — matches order-creation path
  const byId = new Map(products.map((p) => [p.productId, p]));
  return lines.map((l) => {
    const product = byId.get(l.productId);
    const variant = product?.variantDetails?.find((v) => v.variantName === l.selectedVariant);
    return { productId: l.productId, quantity: l.quantity, variantSku: variant?.sku || "" };
  });
}

beforeEach(async () => {
  await Offer.insertMany(OFFERS_FIXTURE);
  await seedCatalog();
});

describe("offers9c fixture sanity", () => {
  test("fixture has exactly the offers we expect (catches silent export drift)", () => {
    expect(OFFERS_FIXTURE).toHaveLength(9);
    const byType = OFFERS_FIXTURE.reduce((m, o) => ((m[o.type] = (m[o.type] || 0) + 1), m), {});
    expect(byType).toEqual({ free_shipping: 1, cart_rule: 7, gift_wrap: 1 });
  });

  test("getActiveCartRules returns only isActive:true cart_rule docs (6 of 7)", async () => {
    const active = await getActiveCartRules();
    expect(active).toHaveLength(6);
    expect(active.map((r) => r.name)).not.toContain("2+ Katana — Free Shipping"); // isActive:false
  });
});

describe("2+ Brake Caliper Lamps — Free Shipping", () => {
  test("2 lamps → free shipping", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([{ productId: LAMP, quantity: 2 }]);
    const result = evaluateCartRules(items, rules);
    expect(result.freeShipping).toBe(true);
  });

  test("1 lamp (qty short by one) → NOT free shipping via this rule", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([{ productId: LAMP, quantity: 1 }]);
    const result = evaluateCartRules(items, rules);
    expect(result.freeShipping).toBe(false);
  });
});

describe("Lamp + Pen Stand Combo — Free Shipping", () => {
  test("1 of each → free shipping", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([
      { productId: LAMP, quantity: 1 },
      { productId: PEN_STAND, quantity: 1 },
    ]);
    expect(evaluateCartRules(items, rules).freeShipping).toBe(true);
  });

  test("pen stand only, no lamp → NOT free shipping", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([{ productId: PEN_STAND, quantity: 3 }]);
    expect(evaluateCartRules(items, rules).freeShipping).toBe(false);
  });
});

describe("2+ Lamps — 50% Off Pen Stand", () => {
  test("2 lamps + 1 pen stand → pen stand discounted to 50%, rounded", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([
      { productId: LAMP, quantity: 2 },
      { productId: PEN_STAND, quantity: 1 },
    ]);
    const result = evaluateCartRules(items, rules);
    const candidates = getDiscountCandidatesForItem(result.discountCandidatesByProduct, PEN_STAND, "");
    expect(applyBestDiscount(499, candidates)).toBe(250); // round(499*0.5) = round(249.5) = 250
  });

  test("1 lamp + 1 pen stand (qty short) → pen stand NOT discounted", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([
      { productId: LAMP, quantity: 1 },
      { productId: PEN_STAND, quantity: 1 },
    ]);
    const result = evaluateCartRules(items, rules);
    const candidates = getDiscountCandidatesForItem(result.discountCandidatesByProduct, PEN_STAND, "");
    expect(candidates).toHaveLength(0);
    expect(applyBestDiscount(499, candidates)).toBe(499);
  });
});

describe("Katana + Display Stand Combo — Free Shipping (variant-scoped — the reported bug)", () => {
  test("Katana (any variant) + Display Stand 'Double Layer' (matching SKU) → free shipping", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([
      { productId: KATANA, quantity: 1, selectedVariant: "Rengoku" },
      { productId: DISPLAY_STAND, quantity: 1, selectedVariant: "Double Layer" },
    ]);
    expect(evaluateCartRules(items, rules).freeShipping).toBe(true);
  });

  test("Katana + Display Stand 'Single Layer' (wrong SKU) → NOT free shipping", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([
      { productId: KATANA, quantity: 1, selectedVariant: "Rengoku" },
      { productId: DISPLAY_STAND, quantity: 1, selectedVariant: "Single Layer" },
    ]);
    expect(evaluateCartRules(items, rules).freeShipping).toBe(false);
  });

  test("regression guard: variantSku must actually resolve to a non-empty SKU for the matching variant", async () => {
    const items = await resolveCartItems([
      { productId: DISPLAY_STAND, quantity: 1, selectedVariant: "Double Layer" },
    ]);
    // If this is "" the Product read silently dropped `sku` again (the exact
    // production bug) and every variant-scoped rule below would false-negative.
    expect(items[0].variantSku).toBe(DISPLAY_STAND_DOUBLE_SKU);
  });
});

describe("Add any other (Katana + Lamp) — Free Shipping", () => {
  test("Katana + Lamp → free shipping", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([
      { productId: KATANA, quantity: 1, selectedVariant: "Rengoku" },
      { productId: LAMP, quantity: 1 },
    ]);
    expect(evaluateCartRules(items, rules).freeShipping).toBe(true);
  });

  test("Katana alone → NOT free shipping via this rule (falls back to no match)", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([{ productId: KATANA, quantity: 1, selectedVariant: "Rengoku" }]);
    expect(evaluateCartRules(items, rules).freeShipping).toBe(false);
  });
});

describe("Buy 5 and Save More", () => {
  test("5 units → 20% off, self-targeted, no free shipping side effect", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([{ productId: BULK_ITEM, quantity: 5 }]);
    const result = evaluateCartRules(items, rules);
    expect(result.freeShipping).toBe(false);
    const candidates = getDiscountCandidatesForItem(result.discountCandidatesByProduct, BULK_ITEM, "");
    expect(applyBestDiscount(199, candidates)).toBe(159); // round(199*0.8) = 159.2 → 159
  });

  test("4 units (qty short by one) → no discount", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([{ productId: BULK_ITEM, quantity: 4 }]);
    const result = evaluateCartRules(items, rules);
    const candidates = getDiscountCandidatesForItem(result.discountCandidatesByProduct, BULK_ITEM, "");
    expect(candidates).toHaveLength(0);
  });

  test("quantity nudge shown at 4 units, not at 0 or 5", async () => {
    const rules = await getActiveCartRules();
    const at4 = findQuantityDiscountNudges(await resolveCartItems([{ productId: BULK_ITEM, quantity: 4 }]), rules);
    expect(at4.some((n) => n.productId === BULK_ITEM)).toBe(true);
    const at5 = findQuantityDiscountNudges(await resolveCartItems([{ productId: BULK_ITEM, quantity: 5 }]), rules);
    expect(at5.some((n) => n.productId === BULK_ITEM)).toBe(false);
  });
});

describe("2+ Katana — Free Shipping (isActive:false — must NEVER fire)", () => {
  test("2 katanas → still NOT free shipping, rule is disabled", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([{ productId: KATANA, quantity: 2, selectedVariant: "Rengoku" }]);
    expect(evaluateCartRules(items, rules).freeShipping).toBe(false);
  });
});

describe("free_shipping doc — combo banner + threshold", () => {
  test("banner (Lamp→Pen Stand) eligible on product IDs alone, ignoring the parent doc's isActive:false", async () => {
    // isFreeShippingEligible is deliberately independent of the doc-level
    // isActive (that flag is only the cart-VALUE threshold switch) — see
    // freeShippingOffer.util.js. The banner itself is isActive:true.
    const eligible = await isFreeShippingEligible([LAMP, PEN_STAND]);
    expect(eligible).toBe(true);
  });

  test("only source product present → not eligible", async () => {
    const eligible = await isFreeShippingEligible([LAMP]);
    expect(eligible).toBe(false);
  });

  test("threshold is OFF in this fixture (isActive:false) — high-value cart still not threshold-eligible", async () => {
    const config = await getFreeShippingConfig();
    expect(config.isActive).toBe(false);
    expect(config.thresholdAmount).toBe(1700);
    const subtotal = 5000;
    const thresholdEligible = config.isActive && subtotal >= config.thresholdAmount;
    expect(thresholdEligible).toBe(false);
  });
});

// ── End-to-end: what actually reaches Razorpay ───────────────────────────────
// Mirrors the exact formula in rp.payment.controller.js (both the logged-in
// and guest paths use this identical arithmetic — see coupon.checkout.test.js
// for the same convention), but fed by the REAL evaluateCartRules/
// isFreeShippingEligible results above instead of a hand-picked boolean, so a
// regression in the matching logic surfaces here as a wrong rupee amount.
function computeRazorpayAmountPaise({ subtotal, giftWrapAmount = 0, freeShippingUnlocked, realShippingAmount, discountAmount = 0, isCOD = false }) {
  const chargedShippingAmount = freeShippingUnlocked ? 0 : realShippingAmount;
  const finalAmount = Math.max(subtotal + giftWrapAmount + chargedShippingAmount - discountAmount, 0);
  const codPartialAmount = isCOD ? Math.min(Math.ceil(realShippingAmount) * 2, Math.ceil(finalAmount)) : 0;
  const razorpayChargeAmount = isCOD ? codPartialAmount : finalAmount;
  return Math.ceil(razorpayChargeAmount) * 100;
}

describe("Razorpay charge amount — end to end with the real engine", () => {
  const REAL_SHIPPING = 89;

  test("Katana + Display Stand (correct variant), PREPAID → shipping excluded from charge", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([
      { productId: KATANA, quantity: 1, selectedVariant: "Rengoku" },
      { productId: DISPLAY_STAND, quantity: 1, selectedVariant: "Double Layer" },
    ]);
    const freeShippingUnlocked = evaluateCartRules(items, rules).freeShipping;
    expect(freeShippingUnlocked).toBe(true);
    const subtotal = 2499 + 1499;
    const paise = computeRazorpayAmountPaise({ subtotal, freeShippingUnlocked, realShippingAmount: REAL_SHIPPING });
    expect(paise).toBe(subtotal * 100); // shipping NOT added — this is the exact case that used to overcharge
  });

  test("Katana + Display Stand (WRONG variant), PREPAID → shipping correctly charged", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([
      { productId: KATANA, quantity: 1, selectedVariant: "Rengoku" },
      { productId: DISPLAY_STAND, quantity: 1, selectedVariant: "Single Layer" },
    ]);
    const freeShippingUnlocked = evaluateCartRules(items, rules).freeShipping;
    expect(freeShippingUnlocked).toBe(false);
    const subtotal = 2499 + 1299;
    const paise = computeRazorpayAmountPaise({ subtotal, freeShippingUnlocked, realShippingAmount: REAL_SHIPPING });
    expect(paise).toBe((subtotal + REAL_SHIPPING) * 100);
  });

  test("COD on a free-shipping order → still collects 2x real shipping as an RTO advance, not zero", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([{ productId: LAMP, quantity: 2 }]);
    const freeShippingUnlocked = evaluateCartRules(items, rules).freeShipping;
    expect(freeShippingUnlocked).toBe(true);
    const subtotal = 799 * 2;
    const paise = computeRazorpayAmountPaise({ subtotal, freeShippingUnlocked, realShippingAmount: REAL_SHIPPING, isCOD: true });
    expect(paise).toBe(Math.ceil(REAL_SHIPPING) * 2 * 100); // advance only, capped at finalAmount
  });

  test("no rule matched, no threshold → full shipping charged", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([{ productId: PEN_STAND, quantity: 1 }]);
    const freeShippingUnlocked = evaluateCartRules(items, rules).freeShipping;
    expect(freeShippingUnlocked).toBe(false);
    const paise = computeRazorpayAmountPaise({ subtotal: 499, freeShippingUnlocked, realShippingAmount: REAL_SHIPPING });
    expect(paise).toBe((499 + REAL_SHIPPING) * 100);
  });

  test("2 lamps + discounted pen stand, gift wrap on top — every component lands correctly", async () => {
    const rules = await getActiveCartRules();
    const items = await resolveCartItems([
      { productId: LAMP, quantity: 2 },
      { productId: PEN_STAND, quantity: 1 },
    ]);
    const result = evaluateCartRules(items, rules);
    expect(result.freeShipping).toBe(true);
    const penStandPrice = applyBestDiscount(499, getDiscountCandidatesForItem(result.discountCandidatesByProduct, PEN_STAND, ""));
    const subtotal = 799 * 2 + penStandPrice; // 799*2 + 250
    const paise = computeRazorpayAmountPaise({ subtotal, giftWrapAmount: 149, freeShippingUnlocked: true, realShippingAmount: REAL_SHIPPING });
    expect(paise).toBe((1598 + 250 + 149) * 100);
  });
});
