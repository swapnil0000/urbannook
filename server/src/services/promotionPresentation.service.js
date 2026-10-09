import { evaluateConditionTree, promotionCouponGateOk } from "../utils/promotionEngine.util.js";

/**
 * Promotion Engine V2 — Presentation Layer (Phases 2, 4, 6, 7 of the
 * hardening spec).
 *
 * Converts raw `promotions` documents + cart context into a single,
 * stable, display-ready shape. The frontend (whenever it's built) must
 * never read conditionTree/rewards/promotionType directly, and must never
 * branch on reward.type — only on `displayType` from this layer. That's
 * the whole point: today's 5 checkout-functional reward types collapse
 * into a handful of `displayType`s, and tomorrow's new reward type just
 * gets a new `case` in buildDisplayType() below instead of a frontend
 * redesign — see "Universal Promotion Renderer CONTRACT" (Phase 4).
 *
 * Nothing here builds final UI (no JSX/HTML/CSS) — it only shapes JSON.
 *
 * ── Shape (Phase 2) ──────────────────────────────────────────────────────
 * {
 *   id, displayType, title, subtitle, badge, icon, priority, displayRank,
 *   savingsText, progressText, ctaText, applied, qualifying, placement,
 *   explanation,            // Phase 7 — why it did/didn't apply
 * }
 */

// ── Universal Renderer CONTRACT (Phase 4) ──────────────────────────────────
// Every reward type collapses into ONE of these display types. A frontend
// component switches on `displayType`, never on the raw reward.type, so a
// 13th reward type tomorrow only needs a new case here — not a new
// component contract or API version.
export const DISPLAY_TYPES = {
  DISCOUNT: "discount", // percent_off_product / flat_off_product / discounted_product / percent_off_order / flat_off_order
  FREE_GIFT: "free_gift", // free_product
  GIFT_CHOICE: "gift_choice", // gift_choice
  FREE_SHIPPING: "free_shipping", // free_shipping
  BUNDLE: "bundle", // bundle_price
  TIERED_DISCOUNT: "tiered_discount", // reserved — promotionType: "tiered_discount" (no reward type exists yet; see Phase 9 gap list)
  COUPON: "coupon", // promotionType: "coupon_promotion" / has linkedCouponCode
  PROMOTION: "promotion", // fallback — order-level / multi-reward / anything that doesn't cleanly map to one of the above
};

const REWARD_TYPE_TO_DISPLAY_TYPE = {
  percent_off_product: DISPLAY_TYPES.DISCOUNT,
  flat_off_product: DISPLAY_TYPES.DISCOUNT,
  discounted_product: DISPLAY_TYPES.DISCOUNT,
  percent_off_order: DISPLAY_TYPES.DISCOUNT,
  flat_off_order: DISPLAY_TYPES.DISCOUNT,
  free_product: DISPLAY_TYPES.FREE_GIFT,
  gift_choice: DISPLAY_TYPES.GIFT_CHOICE,
  free_shipping: DISPLAY_TYPES.FREE_SHIPPING,
  bundle_price: DISPLAY_TYPES.BUNDLE,
  cheapest_item_free: DISPLAY_TYPES.DISCOUNT,
  cheapest_item_discount: DISPLAY_TYPES.DISCOUNT,
  store_credit: DISPLAY_TYPES.PROMOTION,
};

const WORKING_REWARD_TYPES = ["percent_off_product", "flat_off_product", "discounted_product", "free_product", "free_shipping", "percent_off_order", "flat_off_order"];

function buildDisplayType(promotion) {
  if (promotion.linkedCouponCode) return DISPLAY_TYPES.COUPON;
  const types = new Set((promotion.rewards || []).map((r) => REWARD_TYPE_TO_DISPLAY_TYPE[r.type]).filter(Boolean));
  if (types.size === 1) return [...types][0];
  return DISPLAY_TYPES.PROMOTION; // multiple different reward kinds in one promotion — no single clean type
}

function formatRupees(n) {
  return `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
}

// ── Savings text (Phase 2) ─────────────────────────────────────────────────
function buildSavingsText(promotion) {
  const rewards = promotion.rewards || [];
  const parts = [];
  for (const r of rewards) {
    if (r.type === "percent_off_product" || r.type === "percent_off_order") parts.push(`${r.value}% off`);
    else if (r.type === "flat_off_product" || r.type === "flat_off_order" || r.type === "discounted_product") parts.push(`${formatRupees(r.value)} off`);
    else if (r.type === "free_product") parts.push("Free gift");
    else if (r.type === "gift_choice") parts.push("Free gift — your choice");
    else if (r.type === "free_shipping") parts.push("Free shipping");
    else if (r.type === "bundle_price") parts.push(`Bundle at ${formatRupees(r.bundlePrice)}`);
  }
  return parts.length ? parts.join(" + ") : "";
}

function buildBadge(promotion) {
  const types = new Set((promotion.rewards || []).map((r) => r.type));
  if (types.has("free_product") || types.has("gift_choice")) return "FREE GIFT";
  if (types.has("free_shipping")) return "FREE SHIPPING";
  if (types.has("percent_off_product") || types.has("percent_off_order")) {
    const pct = Math.max(...promotion.rewards.filter((r) => r.value != null).map((r) => r.value), 0);
    return pct > 0 ? `${pct}% OFF` : "OFFER";
  }
  return "OFFER";
}

function buildIcon(displayType) {
  // A stable icon KEY, not an actual icon/emoji/asset — the frontend owns
  // the icon set and maps this key to whatever it renders. Keeps icon
  // choice a frontend concern while still being backend-driven/stable.
  return {
    [DISPLAY_TYPES.DISCOUNT]: "tag",
    [DISPLAY_TYPES.FREE_GIFT]: "gift",
    [DISPLAY_TYPES.GIFT_CHOICE]: "gift",
    [DISPLAY_TYPES.FREE_SHIPPING]: "truck",
    [DISPLAY_TYPES.BUNDLE]: "package",
    [DISPLAY_TYPES.TIERED_DISCOUNT]: "layers",
    [DISPLAY_TYPES.COUPON]: "ticket",
    [DISPLAY_TYPES.PROMOTION]: "sparkles",
  }[displayType] || "sparkles";
}

function buildCtaText(promotion, { applied, qualifying, needsCoupon }) {
  if (applied) return "Applied";
  if (needsCoupon) return promotion.linkedCouponCode ? `Enter code ${promotion.linkedCouponCode}` : "Enter coupon code";
  if (qualifying) return "Add to cart";
  const hasGiftChoice = (promotion.rewards || []).some((r) => r.type === "gift_choice");
  return hasGiftChoice ? "Choose your gift" : "View offer";
}

// ── Explanation (Phase 7) — human-readable, user/support-safe. Never
// leaks internal field names/operators verbatim; describes each leaf in
// plain language and says met/not-met. ───────────────────────────────────
const TAXONOMY_LABEL = { category: "category", subcategory: "subcategory", tag: "tag" };

function describeLeaf(leaf, ctx) {
  const met = evaluateConditionTree(leaf, ctx);
  let text;
  switch (leaf.field) {
    case "product": {
      const have = leaf.variantSku
        ? ctx.qtyByProductVariant.get(`${leaf.productId}::${leaf.variantSku}`) || 0
        : ctx.qtyByProduct.get(String(leaf.productId)) || 0;
      text = `Needs ${leaf.minQuantity || 1}+ of product ${leaf.productId} in cart (have ${have}).`;
      break;
    }
    case "category":
    case "subcategory":
    case "tag":
      text = `Needs ${leaf.minQuantity || 1}+ item(s) from ${TAXONOMY_LABEL[leaf.field]} "${leaf.value}".`;
      break;
    case "cartSubtotal":
      text = `Needs cart subtotal ${leaf.operator} ${formatRupees(leaf.value)} (currently ${formatRupees(ctx.subtotal)}).`;
      break;
    case "cartQuantity":
      text = `Needs cart quantity ${leaf.operator} ${leaf.value} (currently ${ctx.totalQty}).`;
      break;
    case "customerType":
      text = `Needs customer type "${leaf.value}".`;
      break;
    case "orderCount":
      text = `Needs past order count ${leaf.operator} ${leaf.value}.`;
      break;
    case "pincode":
    case "state":
    case "country":
      text = `Needs delivery ${leaf.field} to match an eligible list.`;
      break;
    case "dayOfWeek":
      text = "Needs today to be an eligible day.";
      break;
    case "timeOfDay":
      text = `Needs current time between ${leaf.startHour}:00–${leaf.endHour}:00.`;
      break;
    default:
      text = "Unrecognized condition.";
  }
  return { met, text };
}

function explainConditionTree(node, ctx) {
  if (!node) return [{ met: true, text: "No conditions — always eligible." }];
  if (node.op) {
    const childExplanations = (node.children || []).map((c) => explainConditionTree(c, ctx)).flat();
    return childExplanations;
  }
  return [describeLeaf(node, ctx)];
}

// ── Progress messages (Phase 6) — "Add ₹250 more to unlock Free
// Shipping." Only computed for the two leaf types that have an obvious,
// safe-to-state numeric distance (cartSubtotal, product minQuantity).
// Anything else (taxonomy/geo/time/customerType) has no meaningful
// "how far away" message, so progressText stays null for those — no
// misleading guess. For an AND group, reports progress on the first
// unmet leaf (closest-to-complete isn't computable generically without
// weighting incomparable units like ₹ vs item count). For an OR group,
// picks whichever branch is already fully met, else the first branch's
// progress. ─────────────────────────────────────────────────────────────
function buildProgressText(conditionTree, ctx, rewardLabel) {
  const walk = (node) => {
    if (!node) return null;
    if (node.op) {
      const children = node.children || [];
      if (node.op === "OR") {
        const metBranch = children.find((c) => evaluateConditionTree(c, ctx));
        if (metBranch) return null; // already qualifies via this branch
        return walk(children[0]);
      }
      for (const child of children) {
        if (!evaluateConditionTree(child, ctx)) return walk(child);
      }
      return null;
    }
    if (evaluateConditionTree(node, ctx)) return null;
    if (node.field === "cartSubtotal" && node.operator === "gte") {
      const remaining = Number(node.value) - ctx.subtotal;
      if (remaining > 0) return `Add ${formatRupees(remaining)} more to unlock ${rewardLabel}.`;
    }
    if (node.field === "product") {
      const have = node.variantSku
        ? ctx.qtyByProductVariant.get(`${node.productId}::${node.variantSku}`) || 0
        : ctx.qtyByProduct.get(String(node.productId)) || 0;
      const remaining = (node.minQuantity || 1) - have;
      if (remaining > 0) return `Add ${remaining} more of this item to unlock ${rewardLabel}.`;
    }
    if (node.field === "cartQuantity" && node.operator === "gte") {
      const remaining = Number(node.value) - ctx.totalQty;
      if (remaining > 0) return `Add ${remaining} more item(s) to unlock ${rewardLabel}.`;
    }
    return null;
  };
  return walk(conditionTree);
}

function rewardLabelFor(promotion) {
  const types = new Set((promotion.rewards || []).map((r) => r.type));
  if (types.has("free_shipping")) return "Free Shipping";
  if (types.has("free_product") || types.has("gift_choice")) return "your free gift";
  return "this offer";
}

/**
 * Builds the display-ready model for ONE promotion.
 * @param {object} promotion - a lean Promotion document
 * @param {object} ctx - from buildCartContext()
 * @param {object} opts
 * @param {string} opts.placement - one of the 8 placement values; caller
 *   is responsible for having already filtered promotion.placements to
 *   include this value (see promotion.controller.js display endpoints) —
 *   kept here only to stamp it onto the output, never to re-derive it.
 * @param {Set<string>} [opts.appliedPromotionIds] - promotionIds that are
 *   ALREADY applied to the current cart/order (from a real evaluation
 *   result), to set `applied` accurately rather than re-deriving match
 *   state, which can differ from "applied" once stacking/exclusivity
 *   resolution has run.
 */
export function buildPromotionDisplayModel(promotion, ctx, { placement, appliedPromotionIds } = {}) {
  const id = String(promotion._id);
  const conditionMet = evaluateConditionTree(promotion.conditionTree, ctx);
  // A coupon-linked promotion's condition tree can be met while the coupon
  // itself hasn't been entered — real checkout (evaluatePromotions) refuses
  // to match in that case (promotionCouponGateOk), so this display layer
  // must agree, or a customer sees "qualifying" for a discount checkout
  // will not actually give them. See the audit's K.3 finding, fixed here.
  const couponOk = promotionCouponGateOk(promotion, ctx);
  const needsCoupon = Boolean(promotion.linkedCouponCode) && !couponOk;
  const hasNonWorkingReward = (promotion.rewards || []).some((r) => !WORKING_REWARD_TYPES.includes(r.type));
  const fullyFunctional = !hasNonWorkingReward;
  // A promotion checkout cannot honor must never be advertised as available
  // or eligible — force it to the same "not qualifying" state a customer
  // would see for any other unmet promotion, rather than showing a banner
  // for a reward that will silently do nothing at checkout.
  const qualifying = fullyFunctional && conditionMet && couponOk;
  const applied = fullyFunctional && (appliedPromotionIds ? appliedPromotionIds.has(id) : qualifying);
  const displayType = buildDisplayType(promotion);

  return {
    id,
    displayType,
    title: promotion.name,
    subtitle: buildSavingsText(promotion) || null,
    badge: buildBadge(promotion),
    icon: buildIcon(displayType),
    priority: promotion.priority || 0,
    displayRank: promotion.priority || 0, // alias kept distinct in the contract in case display ordering ever needs to diverge from stacking priority
    savingsText: buildSavingsText(promotion) || null,
    progressText: qualifying ? null : buildProgressText(promotion.conditionTree, ctx, rewardLabelFor(promotion)),
    ctaText: buildCtaText(promotion, { applied, qualifying, needsCoupon }),
    // The actual code to enter, ONLY surfaced once the customer still needs
    // it (condition met but coupon not yet applied) — never shown once
    // applied/not-yet-qualifying-on-conditions, so this isn't a blanket
    // coupon-code leak, just the actionable "type this in" moment.
    couponCodeToEnter: needsCoupon && conditionMet ? promotion.linkedCouponCode : null,
    applied,
    qualifying,
    placement: placement || null,
    explanation: explainConditionTree(promotion.conditionTree, ctx),
    // Not part of the Phase 2 shape, but necessary honesty: a promotion
    // using a reward type checkout doesn't apply yet must never be shown
    // as if it fully works — now also reflected in qualifying/applied above
    // (forced false), not just this advisory flag.
    fullyFunctional,
  };
}

/** Maps + sorts a list of promotions into display models, highest displayRank first. */
export function buildPromotionDisplayList(promotions, ctx, opts = {}) {
  return promotions
    .map((p) => buildPromotionDisplayModel(p, ctx, opts))
    .sort((a, b) => b.displayRank - a.displayRank);
}
