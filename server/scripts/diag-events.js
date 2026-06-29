/**
 * Diagnose first-party event capture: what's in the DB, by name and over time.
 * Read-only. Run: NODE_ENV=production node scripts/diag-events.js
 */
import mongoose from "mongoose";
import env from "../src/config/envConfigSetup.js";
import Event from "../src/model/event.model.js";

async function main() {
  await mongoose.connect(`${env.DB_URI}/${env.DB_NAME}`, {});

  const total = await Event.countDocuments({});
  const byName = await Event.aggregate([
    { $group: { _id: "$eventName", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const first = await Event.findOne({}).sort({ createdAt: 1 }).select({ createdAt: 1, eventName: 1 }).lean();
  const last = await Event.findOne({}).sort({ createdAt: -1 }).select({ createdAt: 1, eventName: 1 }).lean();

  const atcFirst = await Event.findOne({ eventName: "add_to_cart" }).sort({ createdAt: 1 }).select({ createdAt: 1 }).lean();
  const atcLast = await Event.findOne({ eventName: "add_to_cart" }).sort({ createdAt: -1 }).select({ createdAt: 1 }).lean();

  // add_to_cart per day (last 30 days)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const perDay = await Event.aggregate([
    { $match: { eventName: "add_to_cart", createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  console.log("\n═══════════════ EVENT DB DIAGNOSTIC ═══════════════");
  console.log(`Total events (all time)     : ${total}`);
  console.log(`Earliest event              : ${first ? first.createdAt.toISOString() + "  (" + first.eventName + ")" : "none"}`);
  console.log(`Latest event                : ${last ? last.createdAt.toISOString() + "  (" + last.eventName + ")" : "none"}`);
  console.log("\n── Events by name ──");
  byName.forEach((r) => console.log(`  ${String(r._id).padEnd(28)} ${r.count}`));
  console.log("\n── add_to_cart span ──");
  console.log(`  first add_to_cart : ${atcFirst ? atcFirst.createdAt.toISOString() : "NONE"}`);
  console.log(`  last  add_to_cart : ${atcLast ? atcLast.createdAt.toISOString() : "NONE"}`);
  console.log("\n── add_to_cart per day (last 30d) ──");
  if (!perDay.length) console.log("  (none)");
  perDay.forEach((r) => console.log(`  ${r._id}  ${r.count}`));
  console.log("═══════════════════════════════════════════════════\n");

  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e.message); try { await mongoose.disconnect(); } catch {} process.exit(1); });
