/**
 * Regression guard for the exact class of bug that caused checkout to show
 * "Free Shipping" while Razorpay still charged full shipping: the storefront
 * Product schema (server/src/model/product.model.js) didn't declare
 * `variantDetails.sku`, so Mongoose silently dropped it on every non-.lean()
 * read (rp.payment.controller.js's order creation) while a .lean() read
 * (cartRule.controller.js's eligibility check) kept it — two code paths
 * seeing different data for the same document.
 *
 * THE RULE FOR NEXT TIME: whenever the admin panel's product schema
 * (UN-ADMIN-panel/.../server/models/product.model.js) adds a field under
 * variantDetails that the storefront's own controllers need to read (price,
 * stock, sku, etc.), it MUST be declared in this file's schema too — add its
 * name to REQUIRED_VARIANT_FIELDS below so this test starts covering it.
 * A field only ever read through .lean() doesn't need this (lean bypasses
 * the schema entirely), but anything read via a plain `Product.find()` /
 * `.findOne()` (no .lean()) does, or it will be silently undefined exactly
 * like `sku` was.
 */
import Product from "../../model/product.model.js";

const REQUIRED_VARIANT_FIELDS = {
  variantName: "Default",
  sku: "TESTSKU1",
  variantPrice: 999,
  variantQuantity: 5,
  variantOutOfStock: false,
};

test("every declared variantDetails field survives a non-.lean() read (the exact bug's mechanism)", async () => {
  await Product.create({
    productName: "Schema Regression Probe",
    productId: "regression-probe-1",
    uiProductId: "regression-probe-1",
    productDes: "d",
    productCategory: "test",
    productStatus: "in_stock",
    isPublished: true,
    variantDetails: [REQUIRED_VARIANT_FIELDS],
  });

  const hydrated = await Product.findOne({ productId: "regression-probe-1" }); // NOT .lean() — the path that broke
  const variant = hydrated.variantDetails[0];
  for (const [field, expected] of Object.entries(REQUIRED_VARIANT_FIELDS)) {
    expect(variant[field]).toBe(expected);
  }
});

test("lean() and non-lean() reads of the same document agree on every variant field", async () => {
  await Product.create({
    productName: "Schema Regression Probe 2",
    productId: "regression-probe-2",
    uiProductId: "regression-probe-2",
    productDes: "d",
    productCategory: "test",
    productStatus: "in_stock",
    isPublished: true,
    variantDetails: [REQUIRED_VARIANT_FIELDS],
  });

  const lean = await Product.findOne({ productId: "regression-probe-2" }).lean();
  const hydrated = (await Product.findOne({ productId: "regression-probe-2" })).toObject();

  for (const field of Object.keys(REQUIRED_VARIANT_FIELDS)) {
    // If these ever disagree, some declared field is being coerced/stripped
    // differently between the two read styles used across the codebase —
    // exactly the discrepancy that caused the free-shipping bug.
    expect(hydrated.variantDetails[0][field]).toEqual(lean.variantDetails[0][field]);
  }
});

test("Product schema explicitly declares a `sku` path under variantDetails", () => {
  const path = Product.schema.path("variantDetails.0.sku") || Product.schema.path("variantDetails.sku");
  expect(path).toBeDefined();
});
