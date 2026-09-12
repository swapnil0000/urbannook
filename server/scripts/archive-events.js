/**
 * Archive + purge old `events` documents.
 *
 * Exports every Event with createdAt STRICTLY BEFORE the cutoff below into a
 * timestamped .jsonl file, then deletes those same documents from the collection.
 *
 * NOTE on dates: MongoDB always stores `createdAt` as a UTC instant (BSON Date).
 * "30 June 2025" is therefore ambiguous until we pick a timezone for the day
 * boundary. Our traffic is India, so the default cutoff is
 *   1 July 2025 00:00:00 IST  ==  2025-06-30T18:30:00.000Z
 * i.e. everything up to and including all of 30 June 2025 IST is archived.
 * Change CUTOFF_ISO to reuse this script for a different date.
 *
 * Run (from server/):
 *   NODE_ENV=production node scripts/archive-events.js          # export + delete
 *   NODE_ENV=production node scripts/archive-events.js --dry-run # export only, no delete
 */
import fs from "fs";
import path from "path";
import readline from "readline";
import mongoose from "mongoose";
import env from "../src/config/envConfigSetup.js";
import Event from "../src/model/event.model.js";

// ─── CHANGE THIS to move the cutoff. Value is the first instant to KEEP. ───
const CUTOFF_ISO = "2026-07-30T18:30:00.000Z"; // = 2026-07-01 00:00 IST
// Filter on this field (createdAt = server receive time, always set).
const DATE_FIELD = "createdAt";
// ─────────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH = 1000;

function askConfirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(question, (a) => { rl.close(); res(a.trim()); }));
}

async function main() {
  const cutoff = new Date(CUTOFF_ISO);
  if (isNaN(cutoff)) throw new Error(`Bad CUTOFF_ISO: ${CUTOFF_ISO}`);
  const filter = { [DATE_FIELD]: { $lt: cutoff } };

  await mongoose.connect(`${env.DB_URI}/${env.DB_NAME}`, {});

  const total = await Event.countDocuments({});
  const toArchive = await Event.countDocuments(filter);
  const oldest = await Event.findOne(filter).sort({ [DATE_FIELD]: 1 }).select({ [DATE_FIELD]: 1 }).lean();
  const newest = await Event.findOne(filter).sort({ [DATE_FIELD]: -1 }).select({ [DATE_FIELD]: 1 }).lean();

  console.log("\n═══════════ ARCHIVE EVENTS ═══════════");
  console.log(`DB / collection      : ${env.DB_NAME} / events`);
  console.log(`Date field           : ${DATE_FIELD}`);
  console.log(`Cutoff (keep >=)     : ${cutoff.toISOString()}`);
  console.log(`Total events in DB   : ${total}`);
  console.log(`Matching (< cutoff)  : ${toArchive}`);
  console.log(`  oldest match       : ${oldest ? oldest[DATE_FIELD].toISOString() : "none"}`);
  console.log(`  newest match       : ${newest ? newest[DATE_FIELD].toISOString() : "none"}`);
  console.log(`Mode                 : ${DRY_RUN ? "DRY RUN (export only)" : "EXPORT + DELETE"}`);
  console.log("══════════════════════════════════════\n");

  if (toArchive === 0) {
    console.log("Nothing to archive. Exiting.");
    await mongoose.disconnect();
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve("archives");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `events-before-${CUTOFF_ISO.slice(0, 10)}-${stamp}.jsonl`);

  // 1) Export — stream to .jsonl so memory stays flat.
  const ws = fs.createWriteStream(outFile, { flags: "w" });
  let written = 0;
  const cursor = Event.find(filter).sort({ _id: 1 }).lean().cursor({ batchSize: BATCH });
  for await (const doc of cursor) {
    ws.write(JSON.stringify(doc) + "\n");
    written++;
    if (written % 5000 === 0) console.log(`  exported ${written}/${toArchive}`);
  }
  await new Promise((res, rej) => ws.end((err) => (err ? rej(err) : res())));
  console.log(`\n✅ Exported ${written} docs → ${outFile}`);

  if (written !== toArchive) {
    console.warn(`⚠️  Exported count (${written}) != matched count (${toArchive}). NOT deleting. Investigate.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log("Dry run — skipping delete.");
    await mongoose.disconnect();
    return;
  }

  const ans = await askConfirm(`\nType "DELETE ${written}" to permanently remove these docs: `);
  if (ans !== `DELETE ${written}`) {
    console.log("Confirmation mismatch — aborting without delete. Archive file is kept.");
    await mongoose.disconnect();
    return;
  }

  const del = await Event.deleteMany(filter);
  console.log(`\n🗑️  Deleted ${del.deletedCount} docs.`);
  console.log(`Remaining events in DB: ${await Event.countDocuments({})}`);
  console.log(`Backup: ${outFile}`);

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("\n❌", e.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});


// to run NODE_ENV=production node scripts/archive-events.js --dry-run
// NODE_ENV=production node scripts/archive-events.js
// next type DELETE 61929
