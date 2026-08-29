/**
 * READ-ONLY health check for the coupon the Independence Day popup hands out.
 *
 * The campaign runs on an existing, admin-managed coupon (UNFLAT100 by
 * default), so there is deliberately no seed script here: this campaign must
 * never create or edit coupon documents. Writing to a live coupon from a script
 * would silently rewrite terms the admin panel owns — its discount, its
 * expiry, its visibility — with no audit trail. Change coupons in the admin
 * panel; use this only to confirm what the popup is about to promise.
 *
 * Checks the coupon exists, is redeemable, has redemptions left, and that its
 * real terms match what the popup renders before the visitor submits.
 *
 * Run: node scripts/verify-independence-coupon.js   (from the server/ directory)
 */
import mongoose from "mongoose";
import env from "../src/config/envConfigSetup.js";
import Coupon from "../src/model/coupon.model.js";
import independenceOffer from "../src/config/independenceOffer.config.js";

const IST = { timeZone: "Asia/Kolkata" };
let problems = 0;

const ok = (msg) => console.log(`  OK     ${msg}`);
const bad = (msg) => {
  problems += 1;
  console.log(`  ISSUE  ${msg}`);
};

async function main() {
  const host = String(env.DB_URI || "").split("@")[1]?.split("/")[0] || "(unknown)";
  console.log(`Database: ${host} / ${env.DB_NAME}  (read only)\n`);
  await mongoose.connect(`${env.DB_URI}/${env.DB_NAME}`, {});

  const code = independenceOffer.couponCode;
  const coupon = await Coupon.collection.findOne({ code });

  if (!coupon) {
    console.log(`  ISSUE  No coupon "${code}" in this database — the popup would hand out a dead code.`);
    console.log(`\nCreate it in the admin panel, or point INDEPENDENCE_COUPON_CODE at an existing one.\n`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Coupon "${coupon.code}" — ${coupon.title || "(untitled)"}`);
  console.log(
    `  ${coupon.discountType === "FLAT" ? `₹${coupon.discountValue} off` : `${coupon.discountValue}% off`}` +
      `${coupon.maxDiscountCap ? ` (cap ₹${coupon.maxDiscountCap})` : ""}` +
      `${coupon.minCartValue ? `, min cart ₹${coupon.minCartValue}` : ", no minimum"}\n`,
  );

  console.log("Redeemability");
  coupon.isActive ? ok("active") : bad("isActive is false — every claim will be rejected at checkout");
  !coupon.isArchived ? ok("not archived") : bad("archived");
  !coupon.isTest ? ok("not a test coupon") : bad("isTest is true — invisible to real shoppers");
  coupon.audience !== "MEMBERS_ONLY"
    ? ok("guests can redeem")
    : bad("MEMBERS_ONLY — logged-out visitors (most of this traffic) cannot redeem it");
  coupon.scope !== "TARGETED"
    ? ok("reachable by anyone with the code")
    : bad("TARGETED — only pre-assigned people can redeem it");

  const now = new Date();
  const from = coupon.validFrom ? new Date(coupon.validFrom) : null;
  const until = coupon.validUntil ? new Date(coupon.validUntil) : null;
  (!from || now >= from) && (!until || now <= until)
    ? ok(`window open${until ? ` until ${until.toLocaleString("en-IN", IST)}` : " (no end date)"}`)
    : bad(`outside its validity window (${from?.toLocaleString("en-IN", IST) || "no start"} → ${until?.toLocaleString("en-IN", IST) || "no end"})`);

  console.log("\nCapacity");
  if (coupon.maxTotalUses == null) {
    ok("no global usage cap");
  } else {
    const left = coupon.maxTotalUses - (coupon.usageCount || 0);
    if (left <= 0) bad(`EXHAUSTED — all ${coupon.maxTotalUses} redemptions used; codes handed out now are dead`);
    else if (left <= 25) bad(`only ${left} redemption(s) left of ${coupon.maxTotalUses} — raise maxTotalUses before promoting this`);
    else ok(`${left} of ${coupon.maxTotalUses} redemptions left`);
  }

  console.log("\nVisibility at checkout");
  coupon.isHidden
    ? console.log("  NOTE   isHidden — not listed in the checkout coupon list; only works if typed/pasted")
    : ok("listed in the checkout coupon list");

  console.log("\nDoes the popup's pre-submit copy match the coupon?");
  const mismatch = (label, shown, real) =>
    String(shown) === String(real)
      ? ok(`${label}: ${shown}`)
      : bad(`${label}: popup shows ${shown}, coupon is ${real}`);
  mismatch("discount type", independenceOffer.discountType, coupon.discountType);
  mismatch("discount value", independenceOffer.discountValue, coupon.discountValue);
  mismatch("minimum cart", independenceOffer.minCartValue, coupon.minCartValue || 0);

  console.log(
    problems === 0
      ? "\nAll good — the popup is safe to run on this coupon.\n"
      : `\n${problems} issue(s) above. Fix in the admin panel before running the campaign.\n`,
  );

  await mongoose.disconnect();
  process.exit(problems === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
