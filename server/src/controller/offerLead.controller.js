import OfferLead from "../model/offerLead.model.js";
import Coupon from "../model/coupon.model.js";
import independenceOffer from "../config/independenceOffer.config.js";
import { ApiRes } from "../utils/index.js";
import { ValidationError } from "../utils/errors.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

const TAG = "[OfferLead]";

/**
 * Load the campaign's coupon.
 *
 * By couponId first — that is the one identifier the admin panel cannot change,
 * so renaming the code no longer detaches the campaign from its coupon. Falls
 * back to a code lookup for the case where the configured id is wrong.
 */
async function loadCampaignCoupon() {
  const { couponId, couponCode } = independenceOffer;

  if (couponId) {
    const byId = await Coupon.findOne({ couponId, isArchived: false }).lean();
    if (byId) return byId;
    console.warn(`${TAG} No coupon with couponId=${couponId} — falling back to code "${couponCode}"`);
  }

  return Coupon.findOne({ code: couponCode, isArchived: false }).lean();
}

/**
 * Terms to show the visitor.
 *
 * Read from the live coupon document so the popup can never advertise terms the
 * checkout won't honour. Falls back to campaign config only if the coupon
 * cannot be read at all — a missing coupon should not break the lead capture,
 * which is the part that actually has business value.
 */
async function resolveOfferTerms() {
  const coupon = await loadCampaignCoupon();

  if (!coupon) {
    console.warn(
      `${TAG} Campaign coupon not found (couponId=${independenceOffer.couponId}, ` +
        `code=${independenceOffer.couponCode}) — serving config defaults.`,
    );
    return {
      couponCode: independenceOffer.couponCode,
      discountType: independenceOffer.discountType,
      discountValue: independenceOffer.discountValue,
      maxDiscount: independenceOffer.maxDiscountCap,
      minCartValue: independenceOffer.minCartValue,
      validUntil: independenceOffer.validUntil,
      available: false,
    };
  }

  const code = coupon.code;

  if (!coupon.isActive) {
    console.warn(`${TAG} Coupon "${code}" exists but isActive=false — claims will fail at checkout`);
  }

  // This campaign runs on a coupon with a finite global cap, so a quiet
  // exhaustion would mean handing out codes that are already dead. Say so
  // loudly in the logs while there is still time to raise the ceiling.
  if (coupon.maxTotalUses != null) {
    const remaining = coupon.maxTotalUses - (coupon.usageCount || 0);
    if (remaining <= 0) {
      console.error(
        `${TAG} EXHAUSTED: "${code}" has used all ${coupon.maxTotalUses} redemptions. ` +
          `Every code handed out from here will be rejected at checkout. Raise maxTotalUses.`,
      );
    } else if (remaining <= 10) {
      console.warn(`${TAG} "${code}" has only ${remaining} redemption(s) left of ${coupon.maxTotalUses}.`);
    }
  }

  const now = new Date();
  const withinWindow =
    (!coupon.validFrom || now >= new Date(coupon.validFrom)) &&
    (!coupon.validUntil || now <= new Date(coupon.validUntil));
  const hasCapacity =
    coupon.maxTotalUses == null || (coupon.usageCount || 0) < coupon.maxTotalUses;

  return {
    couponCode: coupon.code,
    discountType: coupon.discountType ?? independenceOffer.discountType,
    discountValue: coupon.discountValue ?? independenceOffer.discountValue,
    maxDiscount: coupon.maxDiscountCap ?? independenceOffer.maxDiscountCap,
    minCartValue: coupon.minCartValue ?? independenceOffer.minCartValue,
    validUntil: coupon.validUntil ?? independenceOffer.validUntil,
    // Lets the storefront hide the offer rather than promote a code that would
    // be refused at checkout.
    available: !!coupon.isActive && !coupon.isTest && withinWindow && hasCapacity,
    // True when the coupon already appears in the checkout "Available coupons"
    // list. The promo banner suppresses itself in that case so the same offer
    // is not advertised twice on one screen; unhide/hide in admin and the
    // storefront follows without a code change.
    isListed: !coupon.isHidden,
  };
}

/**
 * GET /offer/campaign — public, read-only.
 *
 * The storefront asks for the offer's terms instead of hardcoding them, so a
 * rename or a re-price in the admin panel shows up on the next page load with
 * no rebuild and no redeploy.
 */
const getCampaignController = asyncHandler(async (req, res) => {
  const terms = await resolveOfferTerms();
  // Short cache: long enough to spare the DB on a traffic spike, short enough
  // that an admin edit appears almost immediately.
  res.set("Cache-Control", "public, max-age=60");
  return res
    .status(200)
    .json(new ApiRes(200, "independenceCampaign", terms, true));
});

/**
 * POST /offer/claim — public.
 *
 * Records the lead and hands back the promo code. Idempotent by (campaign, mobile):
 * a repeat submit updates the row and returns the same code rather than erroring,
 * because from the visitor's side "I already gave you this" should still unlock
 * the discount, not show a failure.
 */
const claimOfferController = asyncHandler(async (req, res) => {
  const { mobile, campaign, source, pagePath, isInAppBrowser, attribution } = req.body;

  const campaignId = campaign || independenceOffer.campaign;
  // Joi already guarantees exactly 10 digits, but strip defensively so the
  // dedupe key always matches the stored value — and so it lines up with the
  // coupon engine's own normalizeMobile() when it enforces one use per customer.
  const normalizedMobile = String(mobile).replace(/\D/g, "").slice(-10);

  // Only gate on the campaign's own window — a request arriving after the offer
  // closed should not silently collect a lead for a code that no longer works.
  if (campaignId === independenceOffer.campaign) {
    const now = new Date();
    if (now > new Date(independenceOffer.validUntil)) {
      throw new ValidationError("This offer has ended. Watch this space for the next one!");
    }
  }

  const terms = await resolveOfferTerms();

  const update = {
    $set: {
      couponCode: terms.couponCode,
      source: source || null,
      pagePath: pagePath || null,
      isInAppBrowser: !!isInAppBrowser,
      userAgent: (req.headers["user-agent"] || "").slice(0, 400) || null,
      lastClaimedAt: new Date(),
      ...(attribution && Object.keys(attribution).length
        ? { attribution }
        : {}),
    },
    $inc: { claimCount: 1 },
  };

  let lead;
  try {
    lead = await OfferLead.findOneAndUpdate(
      { campaign: campaignId, mobile: normalizedMobile },
      update,
      // No setDefaultsOnInsert: every meaningful field is written explicitly in
      // $set above, and letting Mongoose add $setOnInsert defaults for
      // `attribution.*` subpaths while $set writes the whole `attribution`
      // object is exactly the shape Mongo rejects as a path conflict.
      { upsert: true, new: true, runValidators: true },
    );
  } catch (err) {
    // Two submits landing at once both miss the upsert and one loses the unique
    // index race. The row exists now, so retry the same update as a plain write.
    if (err?.code === 11000) {
      lead = await OfferLead.findOneAndUpdate(
        { campaign: campaignId, mobile: normalizedMobile },
        update,
        { new: true, runValidators: true },
      );
    } else {
      throw err;
    }
  }

  const isRepeatClaim = (lead?.claimCount || 1) > 1;

  console.log(
    `${TAG} ${isRepeatClaim ? "Repeat" : "New"} claim — campaign=${campaignId} ` +
      `mobile=${normalizedMobile} source=${source || "-"} code=${terms.couponCode}`,
  );

  return res.status(200).json(
    new ApiRes(
      200,
      isRepeatClaim
        ? "You've already unlocked this offer — here's your code again 🎉"
        : "Your Independence Day discount is unlocked 🎉",
      { ...terms, alreadyClaimed: isRepeatClaim },
      true,
    ),
  );
});

export { claimOfferController, getCampaignController };
