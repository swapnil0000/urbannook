/**
 * Verify AddToCart counts against our first-party event DB.
 *
 * Answers:
 *   1. How many add_to_cart events did WE record? (one row per click)
 *   2. How many UNIQUE users (distinct device) actually added to cart?
 *   3. How many came from Instagram/Facebook ad traffic (fbclid present)?
 *   4. Are there double-tap bursts inflating the count? (same device + same
 *      product within 5 seconds = almost certainly a double/triple tap)
 *
 * Run from the server/ folder so it loads the same .env / DB as the app:
 *   node scripts/verify-add-to-cart.js                 # default: May 30 – Jun 28, 2026
 *   node scripts/verify-add-to-cart.js 2026-06-29 2026-06-29   # custom range (YYYY-MM-DD, inclusive)
 */

import mongoose from "mongoose";
import env from "../src/config/envConfigSetup.js";
import Event from "../src/model/event.model.js";

const DOUBLE_TAP_WINDOW_MS = 5000;

function parseArgs() {
  const [, , startArg, endArg] = process.argv;
  // Default window matches the Ads Manager screenshot: Last 30 days May 30 – Jun 28, 2026
  const start = startArg ? new Date(`${startArg}T00:00:00.000Z`) : new Date("2026-05-30T00:00:00.000Z");
  const end = endArg ? new Date(`${endArg}T23:59:59.999Z`) : new Date("2026-06-28T23:59:59.999Z");
  return { start, end };
}

function productIdOf(ev) {
  const items = ev.properties?.items;
  if (Array.isArray(items) && items.length) return items[0].item_id || items[0].id || "unknown";
  return ev.properties?.item_id || "unknown";
}

async function main() {
  const { start, end } = parseArgs();
  await mongoose.connect(`${env.DB_URI}/${env.DB_NAME}`, {});

  const match = { eventName: "add_to_cart", createdAt: { $gte: start, $lte: end } };

  const total = await Event.countDocuments(match);
  const uniqueDevices = (await Event.distinct("anonymousId", match)).filter(Boolean).length;
  const uniqueSessions = (await Event.distinct("sessionId", match)).filter(Boolean).length;
  const loggedInEvents = await Event.countDocuments({ ...match, userId: { $ne: null } });
  const fromAds = await Event.countDocuments({ ...match, "attribution.fbclid": { $exists: true, $ne: null } });

  // Pull all events to detect double-tap bursts (small volume — safe to load).
  const events = await Event.find(match)
    .select({ anonymousId: 1, createdAt: 1, "properties.items": 1, "properties.item_id": 1 })
    .sort({ anonymousId: 1, createdAt: 1 })
    .lean();

  let doubleTaps = 0;
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const cur = events[i];
    if (
      cur.anonymousId === prev.anonymousId &&
      productIdOf(cur) === productIdOf(prev) &&
      cur.createdAt - prev.createdAt <= DOUBLE_TAP_WINDOW_MS
    ) {
      doubleTaps++;
    }
  }

  const fmt = (d) => d.toISOString().slice(0, 10);
  const pct = (n) => (total ? ((n / total) * 100).toFixed(1) : "0.0");

  console.log("\n══════════════════════════════════════════════════════");
  console.log(`  AddToCart verification  (${fmt(start)} → ${fmt(end)})`);
  console.log("══════════════════════════════════════════════════════");
  console.log(`  Total add_to_cart events recorded : ${total}`);
  console.log(`  UNIQUE users (devices) who added  : ${uniqueDevices}   ← "how many users"`);
  console.log(`  Unique sessions                   : ${uniqueSessions}`);
  console.log(`  From Instagram/FB ads (fbclid)    : ${fromAds} (${pct(fromAds)}%)`);
  console.log(`  Logged-in user events             : ${loggedInEvents} (${pct(loggedInEvents)}%)`);
  console.log("  ─────────────────────────────────────────────────");
  console.log(`  Suspected double-tap events       : ${doubleTaps} (${pct(doubleTaps)}%)`);
  console.log(`  → clean (de-duped) add_to_cart    : ${total - doubleTaps}`);
  console.log("══════════════════════════════════════════════════════");
  console.log("  Compare 'clean' above with Ads Manager's 322.");
  console.log("  (Ads Manager only counts ad-attributed carts, so DB total ≥ 322 is normal.)\n");

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("verify-add-to-cart failed:", err.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
