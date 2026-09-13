import Offer from "../model/offer.model.js";

/**
 * Generic cart-promotion rule evaluator. Fully data-driven — no product IDs
 * or amounts are hardcoded here; every rule (which products/quantities
 * trigger it, what it grants) lives in the CartRule collection. This is the
 * single source of truth used both by the payment controller (real order
 * totals) and the client-facing evaluation endpoint (banner display) — see
 * server/src/controller/cartRule.controller.js — so the two can never
 * silently disagree the way the old combo-banner logic did across
 * rp.payment.controller.js / CheckoutPage.jsx / CartDrawer.jsx.
 *
 * @param {{productId: string, quantity: number}[]} cartItems
 */
export const getActiveCartRules = async () => {
  // Reads the unified `offers` collection (type: "cart_rule", written by the
  // admin panel's Offers page). Legacy `cartrules` collection is retired —
  // see UN-ADMIN-panel .../server/scripts/seedOffersFromLegacy.js for the
  // one-time backfill that must be run on any environment before this.
  return Offer.find({ type: "cart_rule", isActive: true }).lean();
};

const quantityByProduct = (cartItems = []) => {
  const map = new Map();
  for (const item of cartItems) {
    const id = String(item.productId);
    map.set(id, (map.get(id) || 0) + (Number(item.quantity) || 0));
  }
  return map;
};

// Same total, but keyed by product+variant — needed for a condition/effect
// scoped to one specific variant. Identified by SKU, not variant NAME — a
// product's variant names aren't guaranteed unique/stable (admins rename
// them, or two variants can share a display name), while `sku` is the one
// field this catalog actually treats as a variant's real identity. Callers
// (rp.payment.controller.js, cartRule.controller.js) are responsible for
// resolving whatever identifier they have (a variant NAME from the cart) to
// its `variantSku` before calling into this file — see those two files for
// how each does it. Key format must match exactly between here and every
// lookup site.
const variantKey = (productId, variantSku) => `${productId}::${variantSku}`;
const quantityByProductVariant = (cartItems = []) => {
  const map = new Map();
  for (const item of cartItems) {
    if (!item.variantSku) continue; // couldn't resolve a SKU for this line — can't match a variant-scoped condition
    const key = variantKey(String(item.productId), item.variantSku);
    map.set(key, (map.get(key) || 0) + (Number(item.quantity) || 0));
  }
  return map;
};

// A condition with no variantSku counts every variant of the product toward
// minQuantity — exactly the original (pre-variant-scoping) behavior. One
// WITH a variantSku only counts cart lines resolved to that exact SKU.
const ruleIsMatched = (rule, qtyByProduct, qtyByProductVariant) =>
  rule.conditions.every((cond) => {
    const have = cond.variantSku
      ? qtyByProductVariant.get(variantKey(String(cond.productId), cond.variantSku)) || 0
      : qtyByProduct.get(String(cond.productId)) || 0;
    return have >= cond.minQuantity;
  });

/**
 * Evaluates a cart against a set of active rules.
 *
 * @param {{productId: string, quantity: number, variantSku?: string}[]} cartItems
 * @returns {{
 *   matchedRules: object[],
 *   freeShipping: boolean,
 *   discountCandidatesByProduct: Map<string, {type: 'percent_off'|'flat_off', value: number, variantSku?: string}[]>,
 * }}
 */
export const evaluateCartRules = (cartItems, activeRules) => {
  const qtyByProduct = quantityByProduct(cartItems);
  const qtyByProductVariant = quantityByProductVariant(cartItems);
  const matchedRules = activeRules.filter((rule) => ruleIsMatched(rule, qtyByProduct, qtyByProductVariant));

  const freeShipping = matchedRules.some((rule) => rule.effects.some((e) => e.type === "free_shipping"));

  // Multiple matched rules can target the SAME product's discount — collect
  // every candidate per product; `applyBestDiscount` below picks whichever
  // actually yields the lowest price for the customer, rather than relying
  // on a priority field an admin would have to remember to set correctly.
  // A candidate optionally carries `variantSku` when the effect targeted one
  // specific variant — callers (getDiscountCandidatesForItem below) must
  // filter by the line item's resolved variantSku before using an
  // untagged-vs-tagged mix; an untagged candidate (no variantSku) still
  // applies to every variant, unchanged from before this field existed.
  const discountCandidatesByProduct = new Map();
  for (const rule of matchedRules) {
    for (const effect of rule.effects) {
      if (effect.type !== "percent_off" && effect.type !== "flat_off") continue;
      const productId = String(effect.targetProductId);
      const list = discountCandidatesByProduct.get(productId) || [];
      list.push({
        type: effect.type,
        value: effect.value,
        ...(effect.targetVariantSku ? { variantSku: effect.targetVariantSku } : {}),
      });
      discountCandidatesByProduct.set(productId, list);
    }
  }

  return { matchedRules, freeShipping, discountCandidatesByProduct };
};

/**
 * Filters a product's discount candidates down to the ones that actually
 * apply to ONE specific cart line — every untagged candidate (applies to
 * all variants) plus any tagged for exactly this line's resolved variantSku.
 * Centralizes the filter so every call site does the same one-line thing
 * instead of re-deriving this logic. When `variantSku` couldn't be resolved
 * (falsy), only untagged candidates match — never guess at a variant-scoped
 * discount.
 */
export const getDiscountCandidatesForItem = (discountCandidatesByProduct, productId, variantSku) => {
  const all = discountCandidatesByProduct.get(String(productId)) || [];
  return all.filter((c) => !c.variantSku || c.variantSku === variantSku);
};

/**
 * Applies whichever discount candidate for a product results in the LOWEST
 * price — "best discount for the customer wins" when two rules both discount
 * the same item, computed from actual resulting price rather than a
 * priority field. Rounded to the nearest whole rupee (e.g. 50% off ₹299 is
 * ₹149.5 mathematically, but INR pricing doesn't do paise in the UI) — this
 * is the ONE place that rounding happens; every client-side display mirrors
 * this exact same rounding so the price shown never drifts from what this
 * function (used for the real charged amount) actually produces.
 */
export const applyBestDiscount = (unitPrice, candidates = []) => {
  if (!candidates.length) return unitPrice;
  const price = Number(unitPrice) || 0;
  const results = candidates.map((c) => {
    if (c.type === "percent_off") return price * (1 - Number(c.value) / 100);
    if (c.type === "flat_off") return price - Number(c.value);
    return price;
  });
  return Math.round(Math.max(Math.min(...results), 0));
};

/**
 * For rules NOT yet matched, how much more (per unmet condition) is needed —
 * used to drive the banner's "closest rule" progress display. Scores each
 * unmatched rule by average completion ratio across its conditions (0-1) and
 * returns the single closest one, or null if every active rule is already
 * matched or there are none.
 */
export const findClosestUnmatchedRule = (cartItems, activeRules, matchedRuleIds) => {
  const qtyByProduct = quantityByProduct(cartItems);
  const qtyByProductVariant = quantityByProductVariant(cartItems);
  const matchedSet = new Set(matchedRuleIds.map(String));

  let best = null;
  let bestScore = -1;
  for (const rule of activeRules) {
    if (matchedSet.has(String(rule._id))) continue;
    const conditionProgress = rule.conditions.map((cond) => {
      const have = cond.variantSku
        ? qtyByProductVariant.get(variantKey(String(cond.productId), cond.variantSku)) || 0
        : qtyByProduct.get(String(cond.productId)) || 0;
      return {
        productId: cond.productId,
        variantSku: cond.variantSku || undefined,
        have,
        needed: cond.minQuantity,
        remaining: Math.max(cond.minQuantity - have, 0),
      };
    });
    const score =
      conditionProgress.reduce((sum, c) => sum + Math.min(c.have / c.needed, 1), 0) / conditionProgress.length;
    if (score > bestScore) {
      bestScore = score;
      best = { ruleId: rule._id, name: rule.name, effects: rule.effects, progress: score, conditions: conditionProgress };
    }
  }
  return best;
};

/**
 * "Buy N of this SAME product, get a lower unit price" nudges — a distinct
 * shape from the free-shipping combo banner (which needs a second,
 * different product to recommend). A quantity-discount rule has exactly one
 * condition, and its effect (percent_off/flat_off) targets that SAME
 * product — so there's nothing to "recommend", just "add N more of what's
 * already in your cart". Returns one entry per such rule where the customer
 * already has at least 1 unit in cart but hasn't reached minQuantity yet
 * (below that, showing "buy 5 more" on a product they haven't even touched
 * is a much weaker nudge than the free-shipping banner already covers via
 * PDP/product browsing).
 *
 * @param {{productId: string, quantity: number}[]} cartItems
 * @param {object[]} activeRules
 */
export const findQuantityDiscountNudges = (cartItems, activeRules) => {
  const qtyByProduct = quantityByProduct(cartItems);
  const qtyByProductVariant = quantityByProductVariant(cartItems);
  const nudges = [];

  for (const rule of activeRules) {
    const conditions = rule.conditions || [];
    if (conditions.length !== 1) continue;
    const condition = conditions[0];
    const effect = (rule.effects || []).find(
      (e) =>
        (e.type === "percent_off" || e.type === "flat_off") &&
        String(e.targetProductId) === String(condition.productId) &&
        (e.targetVariantSku || "") === (condition.variantSku || ""),
    );
    if (!effect) continue;

    const have = condition.variantSku
      ? qtyByProductVariant.get(variantKey(String(condition.productId), condition.variantSku)) || 0
      : qtyByProduct.get(String(condition.productId)) || 0;
    const remaining = Math.max(condition.minQuantity - have, 0);
    if (have <= 0 || remaining <= 0) continue;

    nudges.push({
      ruleId: rule._id,
      name: rule.name,
      productId: condition.productId,
      variantSku: condition.variantSku || undefined,
      have,
      needed: condition.minQuantity,
      remaining,
      effectType: effect.type,
      effectValue: effect.value,
    });
  }
  return nudges;
};
