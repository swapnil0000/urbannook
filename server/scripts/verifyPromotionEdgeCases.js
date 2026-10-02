/**
 * verifyPromotionEdgeCases.js
 *
 * Picks 4 real, published, in-stock products from YOUR `products` collection
 * (read-only), creates a handful of clearly-tagged "[EDGE-TEST]" Promotion
 * documents covering the key edge cases of the cart_rule/banner pipeline,
 * then calls the EXACT same functions the storefront API calls
 * (getBannerForProduct, getFreeShippingConfig, getActiveCartRules +
 * evaluateCartRules) and prints exactly what each one returns — i.e. exactly
 * what will render on the PDP/cart/checkout BEFORE you open a browser.
 *
 * Writes test Promotion docs (tagged, easy to find/delete), reads Products
 * (never writes to Product), never touches `offers`.
 *
 * Run:
 *   NODE_ENV=staging node scripts/verifyPromotionEdgeCases.js
 *
 * Clean up the test promotions afterward (they stay until you remove them —
 * deliberately NOT auto-deleted, so you can see them render on the real
 * frontend first):
 *   NODE_ENV=staging CLEANUP=1 node scripts/verifyPromotionEdgeCases.js
 */
import "../src/config/envConfigSetup.js";
import mongoose from "mongoose";
import Product from "../src/model/product.model.js";
import Promotion from "../src/model/promotion.model.js";
import { getBannerForProduct, getFreeShippingConfig, getAllActiveBanners } from "../src/utils/freeShippingOffer.util.js";
import { getActiveCartRules, evaluateCartRules, getDiscountCandidatesForItem, applyBestDiscount } from "../src/utils/cartRule.util.js";

const TAG = "[EDGE-TEST]";

async function run() {
  const uri = process.env.DB_URI || process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME;
  await mongoose.connect(`${uri}/${dbName}`); // same convention as scripts/seed-promotions.js
  console.log(`Connected → ${dbName}\n`);

  if (process.env.CLEANUP === "1") {
    const result = await Promotion.deleteMany({ name: { $regex: `^\\${TAG}` } });
    console.log(`Deleted ${result.deletedCount} "${TAG}" promotion(s). Done.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  // Clean up any previous run's test promotions first — idempotent re-run.
  await Promotion.deleteMany({ name: { $regex: `^\\${TAG}` } });

  const products = await Product.find({ isPublished: true, productStatus: { $ne: "discontinued" } })
    .limit(4)
    .lean();
  if (products.length < 4) throw new Error(`Need at least 4 published products to run this, found ${products.length}.`);
  const [p1, p2, p3, p4] = products;
  const variantOf = (p) => p.variantDetails?.[0];
  console.log(`Using real products:\n  P1="${p1.productName}" (${p1.productId})\n  P2="${p2.productName}" (${p2.productId})\n  P3="${p3.productName}" (${p3.productId})\n  P4="${p4.productName}" (${p4.productId})\n`);

  const allPlacements = ["pdp", "plp", "cart", "mini_cart", "checkout", "order_confirmation", "order_details", "customer_account"];

  console.log("=".repeat(70));
  console.log("Creating test promotions...");
  console.log("=".repeat(70));

  await Promotion.create({
    promotionType: "automatic", name: `${TAG} 1: Buy P1, 30% off P2`, isActive: true,
    conditionTree: { field: "product", productId: p1.productId, minQuantity: 1 },
    rewards: [{ type: "percent_off_product", targetProductId: p2.productId, value: 30 }],
    placements: allPlacements,
  });

  await Promotion.create({
    promotionType: "automatic", name: `${TAG} 2: Buy P1, get P3 100% free`, isActive: true,
    conditionTree: { field: "product", productId: p1.productId, minQuantity: 1 },
    rewards: [{ type: "percent_off_product", targetProductId: p3.productId, value: 100, targetVariantSku: variantOf(p3)?.sku || "" }],
    placements: allPlacements,
  });

  await Promotion.create({
    promotionType: "automatic", name: `${TAG} 3: P2 + P4 combo free shipping`, isActive: true,
    conditionTree: { op: "AND", children: [{ field: "product", productId: p2.productId, minQuantity: 1 }, { field: "product", productId: p4.productId, minQuantity: 1 }] },
    rewards: [{ type: "free_shipping" }],
    placements: allPlacements,
  });

  await Promotion.create({
    promotionType: "automatic", name: `${TAG} 4: P1 → P4 checkout-only (should NOT show on PDP)`, isActive: true,
    conditionTree: { field: "product", productId: p1.productId, minQuantity: 2 },
    rewards: [{ type: "flat_off_product", targetProductId: p4.productId, value: 50 }],
    placements: ["checkout"], // deliberately NOT pdp/cart
  });

  await Promotion.create({
    promotionType: "automatic", name: `${TAG} 5: PAUSED — should not appear anywhere`, isActive: false,
    conditionTree: { field: "product", productId: p1.productId, minQuantity: 1 },
    rewards: [{ type: "percent_off_product", targetProductId: p2.productId, value: 10 }],
    placements: allPlacements,
  });

  console.log("Done.\n");

  console.log("=".repeat(70));
  console.log("What the PDP banner endpoint returns for each product");
  console.log("(this is EXACTLY what GET /free-shipping-offer/banner/:productId returns)");
  console.log("=".repeat(70));
  for (const [label, p] of [["P1", p1], ["P2", p2], ["P3", p3], ["P4", p4]]) {
    const banners = await getBannerForProduct(p.productId);
    console.log(`\n${label} ("${p.productName}") PDP banners: ${banners.length}`);
    for (const b of banners) {
      console.log(`   → recommends "${b.recommendedProductId}"${b.recommendedVariantName ? ` (variant: ${b.recommendedVariantName})` : ""} | text="${b.text}" | cta="${b.ctaLabel}"`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("Expected vs actual check");
  console.log("=".repeat(70));
  const check = (label, cond) => console.log(`  ${cond ? "✓" : "✗ MISMATCH"} ${label}`);

  const p1Banners = await getBannerForProduct(p1.productId);
  check("P1 shows a banner recommending P2 (30% off)", p1Banners.some((b) => b.recommendedProductId === p2.productId));
  check("P1 shows a banner recommending P3 (100% off / free)", p1Banners.some((b) => b.recommendedProductId === p3.productId));
  check("P1 does NOT show the paused (#5) promotion's effect", !p1Banners.some((b) => b.recommendedProductId === p2.productId && b.text.includes("PAUSED")));
  check("P1 does NOT show the checkout-only (#4) promotion as a PDP banner", !p1Banners.some((b) => b.recommendedProductId === p4.productId));

  const p2Banners = await getBannerForProduct(p2.productId);
  check("P2 shows a banner recommending P4 (combo free shipping)", p2Banners.some((b) => b.recommendedProductId === p4.productId));

  // Checkout-eligibility check for the placements-excluded promotion — must
  // STILL apply to the real charge despite being invisible on the PDP.
  const rules = await getActiveCartRules();
  const evalResult = evaluateCartRules([{ productId: p1.productId, quantity: 2 }, { productId: p4.productId, quantity: 1 }], rules);
  const candidates = getDiscountCandidatesForItem(evalResult.discountCandidatesByProduct, p4.productId, variantOf(p4)?.sku);
  const p4Price = variantOf(p4)?.variantPrice || 0;
  const p4FinalPrice = applyBestDiscount(p4Price, candidates);
  check(`Checkout-only promo #4 STILL discounts P4 at real checkout (₹${p4Price} → ₹${p4FinalPrice})`, p4FinalPrice < p4Price);

  const allBanners = await getAllActiveBanners();
  console.log(`\nAll active banners (cart/checkout view): ${allBanners.length} total`);

  console.log("\n" + "=".repeat(70));
  console.log(`Test promotions are tagged "${TAG}" — go look at P1/P2/P3/P4's real PDP pages now.`);
  console.log(`When done, clean up with: CLEANUP=1 node scripts/verifyPromotionEdgeCases.js`);
  console.log("=".repeat(70));

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => { console.error("Failed:", e); process.exit(1); });
