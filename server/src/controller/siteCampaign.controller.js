import crypto from "crypto";
import mongoose from "mongoose";
import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import SiteCampaign from "../model/siteCampaign.model.js";
import Promotion from "../model/promotion.model.js";
import Product from "../model/product.model.js";

const inWindow = (startsAt, endsAt, now) =>
  (!startsAt || startsAt <= now) && (!endsAt || endsAt > now);

const ELEMENT_KEYS = ["lights", "diyas", "headerAccent", "torans", "rangoli", "sparkles", "fireworks", "countdown", "sectionAccents"];

// Lean reads skip schema defaults, so anything missing on an older document
// resolves here instead.
const resolveElements = (c) => Object.fromEntries(ELEMENT_KEYS.map((k) => [k, c.elements?.[k] !== false]));
const resolveLocations = (c) => {
  if (c.locations) {
    return { home: c.locations.home !== false, collection: c.locations.collection !== false, product: c.locations.product !== false, other: c.locations.other === true };
  }
  const all = c.pages === "all";
  return { home: true, collection: all, product: all, other: all };
};

const firstSellable = (p) =>
  (p.variantDetails || []).find(
    (v) => v.isActive !== false && !v.variantOutOfStock && !(v.variantQuantity != null && Number(v.variantQuantity) <= 0),
  ) || p.variantDetails?.[0] || null;

const toCard = (p) => {
  const v = firstSellable(p);
  if (!v) return null;
  return {
    productId: p.productId,
    name: p.productName,
    category: p.productCategory || "",
    image: v.variantImage?.[0] || "",
    price: Number(v.variantPrice || 0),
  };
};

// Admin-picked products first (in the admin's order), then products from the
// picked categories, de-duplicated and capped.
async function resolveGiftingItems(section) {
  const wanted = section.productIds || [];
  const cards = [];
  const seen = new Set();
  const push = (p) => {
    if (!p || seen.has(p.productId)) return;
    const card = toCard(p);
    if (card && card.price > 0) { seen.add(p.productId); cards.push(card); }
  };

  if (wanted.length) {
    const found = await Product.find({ productId: { $in: wanted }, productStatus: { $ne: "discontinued" } }).lean();
    const byId = new Map(found.map((p) => [p.productId, p]));
    wanted.forEach((id) => push(byId.get(id)));
  }
  if (cards.length < section.maxItems && (section.categories || []).length) {
    const found = await Product.find({ productCategory: { $in: section.categories }, productStatus: "in_stock" })
      .limit(section.maxItems * 2).lean();
    found.forEach(push);
  }
  return cards.slice(0, section.maxItems);
}

// Shared by the live endpoint and the preview endpoint. `preview` skips every
// date/promotion gate so an admin sees what WOULD show.
async function buildPublicCampaign(campaign, now, { preview = false } = {}) {
  const linkedIds = [...new Set([
    ...(campaign.messages || []).map((m) => m.linkedPromotionId),
    ...(campaign.sections || []).map((s) => s.linkedPromotionId),
    campaign.strip?.linkedPromotionId,
    campaign.phuljadi?.enabled ? campaign.phuljadi.promotionId : "",
  ].filter((id) => id && mongoose.isValidObjectId(id)))];

  const liveLinked = linkedIds.length
    ? await Promotion.find({
        _id: { $in: linkedIds },
        isActive: true,
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      }).select("_id name").lean()
    : [];
  const liveById = new Map(liveLinked.map((p) => [String(p._id), p]));
  const promoOk = (id) => preview || !id || liveById.has(String(id));

  const elements = resolveElements(campaign);

  const messages = campaign.elements?.tickerMessages === false
    ? []
    : (campaign.messages || [])
        .filter((m) => m.isActive !== false)
        .filter((m) => preview || inWindow(m.startsAt, m.endsAt, now))
        .filter((m) => promoOk(m.linkedPromotionId))
        .map((m, i) => ({ id: String(m._id ?? `m${i}`), text: m.text, linkUrl: m.linkUrl || "" }));

  const sections = [];
  for (const [si, s] of (campaign.sections || []).entries()) {
    if (s.isActive === false || !promoOk(s.linkedPromotionId)) continue;
    const base = {
      id: String(s._id ?? `s${si}`),
      type: s.type,
      title: s.title || "",
      subtitle: s.subtitle || "",
      offerLabel: liveById.get(String(s.linkedPromotionId))?.name || "",
    };
    if (s.type === "gifting") {
      const items = await resolveGiftingItems({ ...s, maxItems: s.maxItems || 8 });
      if (items.length) sections.push({ ...base, items });
    } else {
      sections.push(base);
    }
  }

  // Phuljadi: only while its own promotion is live; otherwise the normal bar returns.
  const ph = campaign.phuljadi;
  const phuljadi = ph?.enabled === true && ph.promotionId && promoOk(ph.promotionId)
    ? {
        promotionId: String(ph.promotionId),
        intensity: ["low", "medium", "high"].includes(ph.intensity) ? ph.intensity : "medium",
        showOnMobile: ph.showOnMobile !== false,
        locations: { cart: ph.locations?.cart !== false, miniCart: ph.locations?.miniCart !== false, product: ph.locations?.product !== false },
      }
    : null;

  const stripText = campaign.strip?.text && promoOk(campaign.strip.linkedPromotionId) ? campaign.strip.text : "";

  return {
    id: String(campaign._id),
    themeKey: campaign.themeKey,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    elements,
    locations: resolveLocations(campaign),
    showOnMobile: campaign.showOnMobile !== false,
    mobileEffects: campaign.mobileEffects === true,
    countdownLabel: campaign.countdownLabel || "Festive offers end in",
    stripText,
    phuljadi,
    sections,
    messages,
    preview,
  };
}

// Public, read-only: GET /site-campaign/active.
//
// Eligibility is decided HERE, from the server clock, on every request — a
// campaign past its endsAt simply stops matching, so an expired theme stays
// gone after refresh/navigation/reopening no matter what any browser timer or
// cached bundle thinks. Never cached (Cloudflare doesn't cache /api, and this
// sets no-store itself). `serverTime` lets the client schedule an in-session
// expiry/countdown without trusting its own clock; convenience only.
const getActiveSiteCampaignController = asyncHandler(async (_req, res) => {
  const now = new Date();
  res.set("Cache-Control", "no-store");

  const campaign = await SiteCampaign.findOne({ isActive: true, startsAt: { $lte: now }, endsAt: { $gt: now } })
    .sort({ startsAt: -1 })
    .lean();

  if (!campaign) {
    return res.status(200).json(new ApiRes(200, "OK", { campaign: null, serverTime: now.toISOString() }, true));
  }
  return res.status(200).json(new ApiRes(200, "OK", { campaign: await buildPublicCampaign(campaign, now), serverTime: now.toISOString() }, true));
});

// GET /site-campaign/preview/:id?key=… — what an admin sees BEFORE publishing.
// Ignores dates/enabled/linked-promotion gates; protected by the campaign's
// own random previewKey (admin-only, never in the public payload), compared
// in constant time. The storefront only uses this for the browser that opened
// the preview link, and labels it "Preview".
const getSiteCampaignPreviewController = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const { id } = req.params;
  const key = String(req.query.key || "");
  const none = () => res.status(404).json(new ApiRes(404, "Not found", null, false));
  if (!mongoose.isValidObjectId(id) || !key) return none();

  const campaign = await SiteCampaign.findById(id).lean();
  if (!campaign?.previewKey) return none();
  const a = Buffer.from(campaign.previewKey);
  const b = Buffer.from(key);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return none();

  const now = new Date();
  return res.status(200).json(new ApiRes(200, "OK", { campaign: await buildPublicCampaign(campaign, now, { preview: true }), serverTime: now.toISOString() }, true));
});

export { getActiveSiteCampaignController, getSiteCampaignPreviewController };
