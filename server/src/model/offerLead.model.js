import mongoose from "mongoose";

/**
 * A visitor who handed over their mobile number to unlock a promo code.
 *
 * Deliberately campaign-scoped rather than Independence-Day-specific so the next
 * "give us your number for X% off" popup reuses this collection — pass a different
 * `campaign` and the same claim endpoint works unchanged.
 *
 * These rows are the WhatsApp retargeting list, so we keep the
 * attribution that came with the visitor: an Instagram-ad lead and an organic
 * lead should be tellable apart later without guesswork.
 */
const offerLeadSchema = new mongoose.Schema(
  {
    campaign: {
      type: String,
      required: [true, "Campaign is required"],
      trim: true,
      uppercase: true,
    },
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      trim: true,
      match: [/^[6-9]\d{9}$/, "Please provide a valid 10-digit mobile number"],
    },
    // The code handed back to this lead — stored so support can answer
    // "which code did I get?" without re-deriving it from campaign config.
    couponCode: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    // Coarse bucket derived on the client: instagram | facebook | google | direct | referral | ...
    source: {
      type: String,
      trim: true,
      maxlength: 40,
      default: null,
    },
    // First-touch attribution captured by utils/analytics.js captureAttribution().
    attribution: {
      utm_source: { type: String, trim: true, maxlength: 200, default: null },
      utm_medium: { type: String, trim: true, maxlength: 200, default: null },
      utm_campaign: { type: String, trim: true, maxlength: 200, default: null },
      utm_content: { type: String, trim: true, maxlength: 200, default: null },
      utm_term: { type: String, trim: true, maxlength: 200, default: null },
      fbclid: { type: String, trim: true, maxlength: 400, default: null },
      gclid: { type: String, trim: true, maxlength: 400, default: null },
      landing_referrer: { type: String, trim: true, maxlength: 400, default: null },
      landing_page: { type: String, trim: true, maxlength: 300, default: null },
    },
    // Page the popup was submitted from — tells us which landing pages convert.
    pagePath: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },
    // True for the Instagram / Facebook in-app webview, where checkout is known
    // to convert worse — useful when reading the funnel later.
    isInAppBrowser: {
      type: Boolean,
      default: false,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 400,
      default: null,
    },
    // Bumped every time the same number re-submits — a cheap intent signal.
    claimCount: {
      type: Number,
    },
    lastClaimedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// One lead per mobile per campaign — re-submits update the existing row.
//
// NOTE: an earlier revision of this model keyed on email and shipped a
// `campaign_1_email_1` unique index. It was never deployed, but any dev or
// staging database that ran the old code still carries it, and it will reject
// the second email-less insert as a duplicate null. Drop it there before use:
//   db.offerleads.dropIndex("campaign_1_email_1")
offerLeadSchema.index({ campaign: 1, mobile: 1 }, { unique: true });
// Export-by-recency for the retargeting list.
offerLeadSchema.index({ campaign: 1, createdAt: -1 });

const OfferLead = mongoose.model("OfferLead", offerLeadSchema);

export default OfferLead;
