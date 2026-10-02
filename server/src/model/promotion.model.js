import mongoose from "mongoose";

// Promotion Engine V2 — a NEW, SEPARATE collection ("promotions") that sits
// alongside the existing "offers" collection (offer.model.js) without
// touching it. Nothing in offer.model.js, cartRule.util.js, or the existing
// cart_rule/free_shipping/gift_wrap evaluation in rp.payment.controller.js
// changes because of this file — see promotionEngine.util.js for the
// separate evaluation path, merged additively at checkout.
//
// Mirrors UN-ADMIN-panel's server/models/promotion.model.js — same schema,
// same "promotions" collection. Admin owns writes; storefront only reads
// (plus writes PromotionUsage records — see promotionUsage.model.js).

// ── Condition tree — nested AND/OR groups ───────────────────────────────────
// A promotion's `conditionTree` is EITHER a group node ({ op, children })
// OR a leaf node (one of the `field` shapes below). Recursive, arbitrary
// depth. See promotionEngine.util.js's evaluateConditionTree for the
// evaluator. Using Mixed (not a strict recursive Mongoose schema) because
// Mongoose doesn't support true recursive schemas — validated at the
// application layer in the admin controller instead.
const conditionTreeSchema = new mongoose.Schema({}, { strict: false, _id: false });

const rewardSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "percent_off_order",
        "flat_off_order",
        "percent_off_product",
        "flat_off_product",
        "free_product",
        "gift_choice",
        "discounted_product",
        "free_shipping",
        "bundle_price",
        "cheapest_item_free",
        "cheapest_item_discount",
        "store_credit",
      ],
    },
    targetProductId: { type: String, trim: true },
    targetVariantSku: { type: String, trim: true, default: "" },
    // Optional per-reward display name — a promotion with multiple rewards
    // (e.g. one reward per stand variant: Single/Double/Triple Layer) used
    // to show the SAME promotion-level `name` for every one of them on the
    // storefront banner, which read as duplicated/confusing. Blank falls
    // back to the parent Promotion's `name`, same as before this field
    // existed — purely additive.
    label: { type: String, trim: true, default: "" },
    // Optional per-reward subtitle/body copy + a custom banner image.
    // Blank description shows nothing extra; blank image falls back to the
    // recommended product's own photo (see freeShippingOffer.util.js).
    description: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
    // gift_choice: customer picks exactly one of these in-cart. Each entry
    // silently skipped at evaluation time if OOS/deleted (see engine).
    giftOptions: {
      type: [{ productId: { type: String, trim: true }, variantSku: { type: String, trim: true, default: "" } }],
      default: undefined,
    },
    value: { type: Number, min: 0 }, // percent_off: 0-100; flat_off/discounted_product: rupees
    bundlePrice: { type: Number, min: 0 },
    storeCreditAmount: { type: Number, min: 0 },
  },
  { _id: false },
);

const promotionSchema = new mongoose.Schema(
  {
    // Mostly a UI/admin-form convenience (which fields the editor shows) —
    // the engine itself only ever evaluates conditionTree -> rewards,
    // uniformly, regardless of type.
    promotionType: {
      type: String,
      required: true,
      enum: [
        "order_discount",
        "product_discount",
        "category_promotion",
        "tiered_discount",
        "buy_x_get_y",
        "bundle",
        "free_gift",
        "coupon_promotion",
        "automatic",
      ],
      index: true,
    },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },

    // ── Stacking (spec's STACKING RULES section) ──────────────────────────
    stackable: { type: Boolean, default: true },
    // If true, no other promotion (V2 or, best-effort, legacy cart_rule) may
    // also apply to the same order.
    exclusive: { type: Boolean, default: false },
    priority: { type: Number, default: 0 }, // conflict tie-break, higher wins
    promotionGroup: { type: String, default: "", trim: true }, // same-group = mutually exclusive with each other
    maxPromotionsPerOrder: { type: Number, default: null },
    combinesWithCoupons: { type: Boolean, default: true },

    conditionTree: { type: conditionTreeSchema, required: true },
    rewards: { type: [rewardSchema], required: true },

    // Where this promotion is allowed to surface once a display API/UI reads
    // it (promotionPresentation.service.js). Defaults to all 8 so existing
    // promotions created before this field existed keep behaving as
    // "show everywhere relevant" rather than vanishing. Admin-controlled only
    // — nothing in the frontend may hardcode which surfaces show a promotion.
    placements: {
      type: [{
        type: String,
        enum: ["pdp", "plp", "cart", "mini_cart", "checkout", "order_confirmation", "order_details", "customer_account"],
      }],
      default: ["pdp", "plp", "cart", "mini_cart", "checkout", "order_confirmation", "order_details", "customer_account"],
    },

    // Buy-X-Get-Y repeat cap — null = unlimited (buy 6, get 3 free for a
    // "buy 2 get 1" rule with no cap; a cap of 1 means it only ever triggers
    // once per order no matter how many complete groups qualify).
    maxApplications: { type: Number, default: null },

    // ── Abuse-prevention limits (mirrors Coupon's existing pattern exactly:
    // couponcodes has maxTotalUses/maxUsesPerUser) ─────────────────────────
    maxUsesTotal: { type: Number, default: null },
    maxUsesPerUser: { type: Number, default: null },
    usageCount: { type: Number, default: 0 },

    // Optional — links this promotion to an existing coupon (per your ask
    // to connect the two systems in the admin UI). Purely a reference; the
    // couponcodes collection / coupon.controller.js / coupon.code.service.js
    // are completely untouched. Blank = this promotion has no linked coupon.
    linkedCouponCode: { type: String, default: "", trim: true, uppercase: true },
  },
  { timestamps: true },
);

promotionSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });
promotionSchema.index({ promotionGroup: 1 }, { sparse: true });

export default mongoose.model("Promotion", promotionSchema, "promotions");
