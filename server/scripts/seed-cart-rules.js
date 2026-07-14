/**
 * Seeds example CartRule documents for the generic cart-promotion engine
 * (server/src/model/cartRule.model.js). Idempotent — upserts by `name`, so
 * running this more than once updates the same 3 documents rather than
 * duplicating them. NEVER deletes anything, here or elsewhere.
 *
 * Uses the real, live Brake Caliper Lamp / Stationery Suit Pen Stand product
 * IDs (same ones the existing FreeShippingOffer combo banner already uses)
 * so these rules are meaningful against the actual current catalog, not
 * placeholder IDs.
 *
 * Run: node scripts/seed-cart-rules.js   (from the server/ directory)
 */
import mongoose from "mongoose";
import env from "../src/config/envConfigSetup.js";
import CartRule from "../src/model/cartRule.model.js";

const LAMP_PRODUCT_ID = "019da690-729b-7428-8ae1-0273f030d2a8"; // Brake Caliper Lamp
const PEN_STAND_PRODUCT_ID = "019cc7d5-43a9-7c24-a024-e724e6164115"; // Stationery Suit Pen Stand

const RULES = [
  {
    name: "2+ Brake Caliper Lamps — Free Shipping",
    isActive: true,
    conditions: [{ productId: LAMP_PRODUCT_ID, minQuantity: 2 }],
    effects: [{ type: "free_shipping" }],
  },
  {
    name: "Lamp + Pen Stand Combo — Free Shipping",
    isActive: true,
    conditions: [
      { productId: LAMP_PRODUCT_ID, minQuantity: 1 },
      { productId: PEN_STAND_PRODUCT_ID, minQuantity: 1 },
    ],
    effects: [{ type: "free_shipping" }],
  },
  {
    name: "2+ Lamps — 50% Off Pen Stand",
    isActive: true,
    conditions: [{ productId: LAMP_PRODUCT_ID, minQuantity: 2 }],
    effects: [{ type: "percent_off", targetProductId: PEN_STAND_PRODUCT_ID, value: 50 }],
  },
];

async function main() {
  await mongoose.connect(`${env.DB_URI}/${env.DB_NAME}`, {});

  for (const rule of RULES) {
    const result = await CartRule.findOneAndUpdate(
      { name: rule.name },
      { $set: rule },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    console.log(`Upserted: "${result.name}" (${result._id})`);
  }

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
