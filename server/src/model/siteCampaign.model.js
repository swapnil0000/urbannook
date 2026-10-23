import mongoose from "mongoose";

// Read-only mirror of the admin repo's server/models/siteCampaign.model.js —
// same schema, same "siteCampaigns" collection. Admin owns writes; the
// storefront only reads (see siteCampaign.controller.js). Keep both in sync.
const tickerMessageSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 140 },
    // "" = plain text, otherwise an in-site path ("/products?...") or https URL.
    linkUrl: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    // Optional per-message window, inside the campaign's own window.
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    // When set, the message only shows while THAT promotion is itself live
    // (active + inside its own dates) — so a "Free Shipping" line can never
    // outlive the free-shipping promotion it advertises.
    linkedPromotionId: { type: String, trim: true, default: "" },
  },
  { _id: true },
);

const siteCampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    themeKey: { type: String, enum: ["diwali"], default: "diwali" },
    isActive: { type: Boolean, default: true },
    // Both required: a campaign with no end would never auto-expire.
    // Stored as UTC instants; the admin UI enters/shows them in Asia/Kolkata.
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    // Each decoration/animation is its own switch.
    elements: {
      tickerMessages: { type: Boolean, default: true },
      lights: { type: Boolean, default: true },
      diyas: { type: Boolean, default: true },
      headerAccent: { type: Boolean, default: true },
      torans: { type: Boolean, default: true },
      rangoli: { type: Boolean, default: true },
      sparkles: { type: Boolean, default: true },
      fireworks: { type: Boolean, default: true },
      countdown: { type: Boolean, default: true },
      sectionAccents: { type: Boolean, default: true },
    },
    // Where decorations render. (`pages` is the legacy home/all switch — kept
    // so existing documents still resolve; the storefront prefers `locations`.)
    pages: { type: String, enum: ["home", "all"], default: "home" },
    locations: {
      home: { type: Boolean, default: true },
      collection: { type: Boolean, default: true },
      product: { type: Boolean, default: true },
      other: { type: Boolean, default: false },
    },
    // Master phone switch, plus whether the heavier effects (fireworks,
    // sparkles, rangoli) run on phones at all.
    showOnMobile: { type: Boolean, default: true },
    mobileEffects: { type: Boolean, default: false },
    countdownLabel: { type: String, trim: true, default: "Festive offers end in", maxlength: 60 },
    // Optional one-line promo strip on collection/product pages; when
    // linkedPromotionId is set the text only shows while that promotion is live.
    strip: {
      text: { type: String, trim: true, default: "", maxlength: 120 },
      linkedPromotionId: { type: String, trim: true, default: "" },
    },
    // Festive homepage sections, rendered in array order below Bestsellers.
    sections: {
      type: [new mongoose.Schema({
        type: { type: String, enum: ["gifting", "combos"], required: true },
        title: { type: String, trim: true, default: "", maxlength: 80 },
        subtitle: { type: String, trim: true, default: "", maxlength: 140 },
        isActive: { type: Boolean, default: true },
        // gifting only: admin-picked products first, then products from the
        // picked categories, capped at maxItems.
        productIds: { type: [String], default: [] },
        categories: { type: [String], default: [] },
        maxItems: { type: Number, default: 8, min: 2, max: 16 },
        // Section shows only while this promotion is live (and its name is
        // shown as the section's offer badge).
        linkedPromotionId: { type: String, trim: true, default: "" },
      }, { _id: true })],
      default: [],
    },
    // Unguessable key for the storefront preview link; never sent to the public.
    previewKey: { type: String, default: "" },
    messages: { type: [tickerMessageSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("SiteCampaign", siteCampaignSchema, "siteCampaigns");
