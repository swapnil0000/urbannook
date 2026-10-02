/**
 * mapStagingPromotionsToProd.js
 *
 * READ-ONLY on both databases — writes NOTHING anywhere. Connects to
 * staging AND production simultaneously (two independent connections, each
 * parsed from its own .env.staging / .env.production file — doesn't rely on
 * NODE_ENV since it needs both at once), reads every Promotion currently on
 * staging, and for every product/variant it references, looks up the
 * product by NAME on staging (to know what it's actually called) then finds
 * the matching product by that SAME name on production — swapping in
 * production's real productId/variant sku. Prints the resulting promotions
 * as clean, ready-to-paste JSON. Everything else (condition structure,
 * reward labels, placements, values) is carried over unchanged.
 *
 * Flags, loudly, any staging product that has no name-match on production —
 * never silently guesses or drops a reference.
 *
 * Run:
 *   node scripts/mapStagingPromotionsToProd.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const SERVER_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function loadEnvFile(filename) {
  const filePath = path.join(SERVER_ROOT, filename);
  if (!fs.existsSync(filePath)) throw new Error(`Missing ${filename} at ${filePath}`);
  return dotenv.parse(fs.readFileSync(filePath));
}

const stagingEnv = loadEnvFile(".env.staging");
const prodEnv = loadEnvFile(".env.production");

const promotionSchema = new mongoose.Schema({}, { strict: false });
const productSchema = new mongoose.Schema({}, { strict: false });

async function run() {
  const stagingConn = await mongoose.createConnection(`${stagingEnv.DB_URI}/${stagingEnv.DB_NAME}`).asPromise();
  const prodConn = await mongoose.createConnection(`${prodEnv.DB_URI}/${prodEnv.DB_NAME}`).asPromise();
  console.log(`Staging → ${stagingEnv.DB_NAME}\nProduction → ${prodEnv.DB_NAME}\n`);

  const StagingPromotion = stagingConn.model("Promotion", promotionSchema, "promotions");
  const StagingProduct = stagingConn.model("Product", productSchema, "products");
  const ProdProduct = prodConn.model("Product", productSchema, "products");

  const promotions = await StagingPromotion.find({}).lean();
  console.log(`Found ${promotions.length} promotion(s) on staging.\n`);

  // Collect every productId referenced anywhere (conditions + rewards).
  const referencedIds = new Set();
  const walkConditions = (node) => {
    if (!node) return;
    if (node.op) return (node.children || []).forEach(walkConditions);
    if (node.field === "product" && node.productId) referencedIds.add(node.productId);
  };
  for (const p of promotions) {
    walkConditions(p.conditionTree);
    for (const r of p.rewards || []) {
      if (r.targetProductId) referencedIds.add(r.targetProductId);
      for (const g of r.giftOptions || []) if (g.productId) referencedIds.add(g.productId);
    }
  }

  const stagingProducts = await StagingProduct.find({ productId: { $in: [...referencedIds] } }, { productId: 1, productName: 1, "variantDetails.variantName": 1, "variantDetails.sku": 1 }).lean();
  const stagingById = new Map(stagingProducts.map((p) => [p.productId, p]));

  const allProdProducts = await ProdProduct.find({}, { productId: 1, productName: 1, "variantDetails.variantName": 1, "variantDetails.sku": 1 }).lean();
  const prodByName = new Map(allProdProducts.map((p) => [p.productName, p]));

  console.log("=".repeat(70));
  console.log("ID MAPPING (staging → production)");
  console.log("=".repeat(70));
  const idMap = new Map(); // stagingProductId -> prodProductId
  const skuMap = new Map(); // `${stagingProductId}::${stagingSku}` -> prodSku
  const unmapped = [];
  for (const id of referencedIds) {
    const stagingProduct = stagingById.get(id);
    if (!stagingProduct) { unmapped.push(`productId ${id} (not found on staging itself — stale reference?)`); continue; }
    const prodProduct = prodByName.get(stagingProduct.productName);
    if (!prodProduct) { unmapped.push(`"${stagingProduct.productName}" (staging id ${id}) — NO MATCH on production by name`); continue; }
    idMap.set(id, prodProduct.productId);
    console.log(`  "${stagingProduct.productName}": ${id} → ${prodProduct.productId}`);
    for (const sv of stagingProduct.variantDetails || []) {
      const pv = (prodProduct.variantDetails || []).find((v) => v.variantName === sv.variantName);
      if (pv) {
        skuMap.set(`${id}::${sv.sku}`, pv.sku);
      } else if (sv.sku) {
        unmapped.push(`"${stagingProduct.productName}" variant "${sv.variantName}" (sku ${sv.sku}) — NO MATCHING VARIANT on production`);
      }
    }
  }
  if (unmapped.length) {
    console.log("\n⚠️  UNMAPPED (these promotions will have WRONG references below — fix manually):");
    for (const u of unmapped) console.log(`  - ${u}`);
  }

  const mapProductId = (id) => idMap.get(id) || id;
  const mapSku = (productId, sku) => (sku ? (skuMap.get(`${productId}::${sku}`) || sku) : sku);

  const remapConditionTree = (node) => {
    if (!node) return node;
    if (node.op) return { ...node, children: (node.children || []).map(remapConditionTree) };
    if (node.field === "product") {
      return { ...node, productId: mapProductId(node.productId), variantSku: mapSku(node.productId, node.variantSku) };
    }
    return node;
  };

  const remapped = promotions.map((p) => ({
    promotionType: p.promotionType,
    name: p.name,
    isActive: p.isActive,
    startsAt: p.startsAt ?? null,
    endsAt: p.endsAt ?? null,
    stackable: p.stackable !== false,
    exclusive: p.exclusive === true,
    priority: p.priority || 0,
    promotionGroup: p.promotionGroup || "",
    maxPromotionsPerOrder: p.maxPromotionsPerOrder ?? null,
    combinesWithCoupons: p.combinesWithCoupons !== false,
    conditionTree: remapConditionTree(p.conditionTree),
    rewards: (p.rewards || []).map((r) => ({
      type: r.type,
      ...(r.targetProductId ? { targetProductId: mapProductId(r.targetProductId), targetVariantSku: mapSku(r.targetProductId, r.targetVariantSku) } : {}),
      ...(r.value != null ? { value: r.value } : {}),
      ...(r.bundlePrice != null ? { bundlePrice: r.bundlePrice } : {}),
      ...(r.storeCreditAmount != null ? { storeCreditAmount: r.storeCreditAmount } : {}),
      ...(r.giftOptions ? { giftOptions: r.giftOptions.map((g) => ({ productId: mapProductId(g.productId), variantSku: mapSku(g.productId, g.variantSku) })) } : {}),
      label: r.label || "",
      description: r.description || "",
      image: r.image || "",
    })),
    placements: p.placements || ["pdp", "plp", "cart", "mini_cart", "checkout", "order_confirmation", "order_details", "customer_account"],
    maxApplications: p.maxApplications ?? null,
    maxUsesTotal: p.maxUsesTotal ?? null,
    maxUsesPerUser: p.maxUsesPerUser ?? null,
    usageCount: 0,
    linkedCouponCode: p.linkedCouponCode || "",
  }));

  console.log("\n" + "=".repeat(70));
  console.log("PRODUCTION-READY PROMOTIONS JSON (copy below — nothing written to any DB)");
  console.log("=".repeat(70) + "\n");
  console.log(JSON.stringify(remapped, null, 2));

  await stagingConn.close();
  await prodConn.close();
  process.exit(0);
}

run().catch((e) => { console.error("Failed:", e); process.exit(1); });
