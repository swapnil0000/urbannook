import Promotion from "../model/promotion.model.js";

/**
 * Adapter — represents active Promotion V2 documents in the legacy cart_rule
 * shape ({_id, name, isActive, conditions, effects}) that cartRule.util.js's
 * pure functions (evaluateCartRules, applyBestDiscount,
 * findClosestUnmatchedRule, findQuantityDiscountNudges, and
 * freeShippingOffer.util.js's getCartRuleDerivedBanners) already consume.
 *
 * WHY an adapter instead of rewriting those functions: this lets the data
 * source move from the `offers` collection to `promotions` with ZERO changes
 * to any consumer — cartRule.controller.js, user.cart.service.js,
 * rp.payment.controller.js (both order-creation paths), and every storefront
 * client component (ProductPageBanner.jsx, FreeShippingBanner.jsx,
 * MiniCartPreview.jsx, CartDrawer.jsx, CheckoutPage.jsx) keep working exactly
 * as they do today, reading the exact same shapes.
 *
 * Only a SUBSET of what Promotion can express maps onto cart_rule's shape:
 *   - conditionTree must reduce to a flat list of "product" leaves (a single
 *     leaf, or a top-level AND group of leaves — no OR, no nested groups, no
 *     non-product leaf types). This covers every promotion created via the
 *     legacy cart_rule editor AND every promotion migrated by
 *     seedPromotionsFromOffers.js (verified: all were flat product-AND
 *     trees).
 *   - every reward must be percent_off_product / flat_off_product /
 *     discounted_product / free_shipping (cart_rule's effect enum has no
 *     "free_product"/"gift_choice"/etc. equivalent — a "free gift" cart_rule
 *     effect was always modeled as 100%-off percent_off_product, which this
 *     maps correctly).
 * A promotion that doesn't fit (OR conditions, non-product conditions,
 * free_product/gift_choice/bundle_price/store_credit/etc. rewards) is simply
 * excluded from this adapter's output — it's NOT lost, it's still evaluated
 * by the full promotionEngine.util.js path in rp.payment.controller.js
 * exactly as before. This adapter only ever narrows, never duplicates
 * meaning: rp.payment.controller.js's existing merge logic already has
 * cart_rule's discount win priority per product line (a `continue` skip once
 * cart_rule has a candidate for that line — see the comment there), so a
 * promotion appearing in BOTH this adapter's output and the direct V2
 * evaluation still only ever has its discount applied ONCE.
 */

const REWARD_TO_EFFECT = { percent_off_product: "percent_off", flat_off_product: "flat_off", discounted_product: "flat_off", free_shipping: "free_shipping" };

function extractFlatProductConditions(conditionTree) {
  if (!conditionTree) return null;
  if (conditionTree.field === "product") {
    return [{ productId: conditionTree.productId, minQuantity: conditionTree.minQuantity || 1, ...(conditionTree.variantSku ? { variantSku: conditionTree.variantSku } : {}) }];
  }
  if (conditionTree.op === "AND" && Array.isArray(conditionTree.children)) {
    const leaves = [];
    for (const child of conditionTree.children) {
      if (child.op || child.field !== "product") return null; // nested group or non-product leaf — not representable
      leaves.push({ productId: child.productId, minQuantity: child.minQuantity || 1, ...(child.variantSku ? { variantSku: child.variantSku } : {}) });
    }
    return leaves.length ? leaves : null;
  }
  return null; // OR group, or any other shape — not representable
}

function extractEffects(rewards) {
  const effects = [];
  for (const r of rewards || []) {
    const type = REWARD_TO_EFFECT[r.type];
    if (!type) return null; // any unmappable reward disqualifies the whole promotion from this adapter
    const display = {
      ...(r.label ? { label: r.label } : {}),
      ...(r.description ? { description: r.description } : {}),
      ...(r.image ? { image: r.image } : {}),
    };
    effects.push(type === "free_shipping"
      ? { type, ...display }
      : { type, targetProductId: r.targetProductId, value: r.value, ...(r.targetVariantSku ? { targetVariantSku: r.targetVariantSku } : {}), ...display });
  }
  return effects.length ? effects : null;
}

/**
 * @returns {{_id, name, isActive, conditions, effects}[]} same shape
 *   Offer.find({type:"cart_rule"}) used to return.
 */
export async function getActivePromotionsAsCartRules() {
  // Sorted by priority DESC (higher priority first) — this is the ONLY
  // place that ordering gets established; everything downstream (banner
  // derivation's "first one wins" de-dup in ProductPageBanner.jsx, cart_rule
  // discount-candidate collection) just preserves whatever order it
  // receives, so admin's `priority` field on a Promotion had no effect on
  // which banner showed first until this sort existed. Ties (equal
  // priority) fall back to newest-first (createdAt desc) — an arbitrary but
  // stable tiebreak, better than Mongo's default insertion-order behavior
  // which could silently change across re-indexing/replication.
  const promotions = await Promotion.find({
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: new Date() } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: new Date() } }] },
    ],
  }).sort({ priority: -1, createdAt: -1 }).lean();

  const rules = [];
  for (const promo of promotions) {
    const conditions = extractFlatProductConditions(promo.conditionTree);
    if (!conditions) { console.log(`[PromotionAdapter] "${promo.name}" SKIPPED — conditionTree not flat-product-representable: ${JSON.stringify(promo.conditionTree)}`); continue; }
    const effects = extractEffects(promo.rewards);
    if (!effects) { console.log(`[PromotionAdapter] "${promo.name}" SKIPPED — rewards not cart_rule-representable: ${JSON.stringify(promo.rewards.map((r) => r.type))}`); continue; }
    rules.push({ _id: promo._id, name: promo.name, isActive: true, conditions, effects, placements: promo.placements || [] });
  }
  // console.log(`[PromotionAdapter] getActivePromotionsAsCartRules() → ${promotions.length} active promotion(s) total, ${rules.length} representable as cart rules`);
  return rules;
}
