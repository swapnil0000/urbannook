// Adds reviews customers left on Google to the product pages, as approved
// product reviews (same model and S3 image path as reviews written on the site).
//
// Data: scripts/google-reviews/reviews.json (+ the photos next to it).
// Each entry has a stable `key`; it becomes the review's userId
// ("google:<key>"), so running the script twice never creates a duplicate.
//
// Dry run by default — prints what would be written, writes nothing:
//   infisical run --env=staging --path=/user/server -- env NODE_ENV=staging node scripts/add-google-reviews.js
// Write (staging first; prod only after Time Machine → Take snapshot now):
//   ... node scripts/add-google-reviews.js --apply
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.REVIEWS_DIR || path.join(here, "google-reviews");
const apply = process.argv.includes("--apply");

const { DB_URI, DB_NAME, NODE_ENV } = process.env;
if (!DB_URI || !DB_NAME) throw new Error("DB_URI / DB_NAME missing — run through infisical");
// Prod and staging never share data (AGENTS.md rule 7): the environment and the DB must agree.
const isProdDb = !/stag/i.test(DB_NAME);
if (isProdDb !== (NODE_ENV === "production")) {
  throw new Error(`NODE_ENV=${NODE_ENV} does not match DB_NAME=${DB_NAME} — refusing to run`);
}

// Imported after the checks: s3.utils reads env (bucket, prod/dev folder) at load.
const { uploadReviewImageToS3 } = await import("../src/utils/s3.utils.js");
const { default: ProductReview } = await import("../src/model/product.specific.testimonial.model.js");

const reviews = JSON.parse(fs.readFileSync(path.join(dataDir, "reviews.json"), "utf8"));
for (const r of reviews) {
  if (!r.key || !r.productId || !r.userName?.trim()) throw new Error(`entry ${r.key || "?"}: key, productId and userName are required`);
  if (!(r.rating >= 1 && r.rating <= 5)) throw new Error(`${r.key}: rating must be 1–5`);
  if (r.desc.length < 10 || r.desc.length > 500) throw new Error(`${r.key}: desc must be 10–500 characters (is ${r.desc.length})`);
  if ((r.images || []).length > 3) throw new Error(`${r.key}: at most 3 images`);
  for (const img of r.images || []) if (!fs.existsSync(path.join(dataDir, img))) throw new Error(`${r.key}: missing ${img}`);
}

await mongoose.connect(`${DB_URI}/${DB_NAME}`);
console.log(`${apply ? "APPLY" : "DRY RUN"} — ${DB_NAME} (${NODE_ENV})`);

for (const r of reviews) {
  const userId = `google:${r.key}`;
  const product = await mongoose.connection.db.collection("products").findOne({ productId: r.productId }, { projection: { productName: 1 } });
  if (!product) { console.log(`✗ ${r.key}: product ${r.productId} not in ${DB_NAME} — skipped`); continue; }
  if (await ProductReview.exists({ userId, productId: r.productId })) { console.log(`= ${r.key}: already added — skipped`); continue; }

  console.log(`+ ${r.key}: ${r.userName} ★${r.rating} on "${product.productName}", ${r.images?.length || 0} photo(s)`);
  if (!apply) continue;

  const imageUrls = [];
  for (const [i, img] of (r.images || []).entries()) {
    const buf = fs.readFileSync(path.join(dataDir, img));
    imageUrls.push(await uploadReviewImageToS3(buf, "image/jpeg", userId.replace(/[^a-z0-9-]/gi, "-"), i ? `${r.productId}-img${i}` : r.productId));
  }
  await ProductReview.create({
    productId: r.productId,
    userId,
    userName: r.userName.trim(),
    rating: r.rating,
    desc: r.desc,
    imageUrl: imageUrls[0] || null,
    imageUrls,
    isApproved: true,
  });
  console.log(`  ✓ saved, photos: ${imageUrls.join(", ") || "none"}`);
}

await mongoose.disconnect();
if (!apply) console.log("Nothing written. Add --apply to write.");
