import { getActivePromotionsAsCartRules } from "./promotionToCartRule.adapter.js";

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
  // Now reads the Promotion Engine V2 `promotions` collection, via
  // promotionToCartRule.adapter.js, instead of the legacy `offers` collection
  // (type: "cart_rule"). The adapter represents a Promotion in this exact
  // shape so every function below, and every caller of this one
  // (cartRule.controller.js, user.cart.service.js, rp.payment.controller.js,
  // every storefront client component), needed zero other changes.
  return getActivePromotionsAsCartRules();
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

// How many times this rule's FULL condition set is satisfied at once — e.g.
// a condition "1+ Katana" with 2 Katanas in cart satisfies it twice, so a
// reward on that rule should benefit up to 2 units, not just 1. Admin never
// sets this directly; it's entirely derived from the condition's own
// `minQuantity` against the real cart quantity — the single source of truth
// for "how many free/discounted units does this admin-configured rule
// actually grant right now" stays here, in the evaluation engine, not
// reimplemented per storefront display surface.
const ruleRepeatCount = (rule, qtyByProduct, qtyByProductVariant) => {
  if (!rule.conditions?.length) return 1;
  return Math.max(1, Math.min(...rule.conditions.map((cond) => {
    const have = cond.variantSku
      ? qtyByProductVariant.get(variantKey(String(cond.productId), cond.variantSku)) || 0
      : qtyByProduct.get(String(cond.productId)) || 0;
    return Math.floor(have / (cond.minQuantity || 1));
  })));
};

/**
 * Evaluates a cart against a set of active rules.
 *
 * @param {{productId: string, quantity: number, variantSku?: string}[]} cartItems
 * @returns {{
 *   matchedRules: object[],
 *   freeShipping: boolean,
 *   discountCandidatesByProduct: Map<string, {type: 'percent_off'|'flat_off', value: number, cap: number, variantSku?: string}[]>,
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
    const cap = ruleRepeatCount(rule, qtyByProduct, qtyByProductVariant);
    for (const effect of rule.effects) {
      if (effect.type !== "percent_off" && effect.type !== "flat_off") continue;
      const productId = String(effect.targetProductId);
      const list = discountCandidatesByProduct.get(productId) || [];
      list.push({
        type: effect.type,
        value: effect.value,
        // How many units of the TARGET this specific rule's current cart
        // state justifies discounting — see ruleRepeatCount above. Every
        // consumer (checkout's real charge, every storefront display
        // surface) reads this instead of assuming a fixed "1".
        cap,
        // Which rule granted this candidate — lets the checkout controller
        // share ONE cap across every SIBLING reward of the same rule (e.g.
        // "Exciting Offers": free single stand / 50%-off double / 50%-off
        // triple are 3 candidates, same rule, same product, different
        // variant). Without this tag each variant's candidate carried its
        // own untouched copy of `cap`, so a cart with one of EACH variant
        // could get every one of them discounted off a single trigger
        // product — see createRuleBudgetTracker in rp.payment.controller.js.
        ruleId: String(rule._id),
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
 * Tracks, for one evaluation (a real checkout OR a client-facing preview —
 * both must agree), how many units each RULE still has left to discount,
 * SHARED across every sibling candidate of that rule — e.g. "Exciting
 * Offers": free single stand / 50%-off double / 50%-off triple are 3
 * separate candidates targeting 3 different variants of the same product,
 * but all belong to ONE rule and must share ONE pool of units. Without
 * this, each variant's candidate carries its own untouched copy of the
 * rule's cap, so a cart with one of EACH variant gets every one of them
 * discounted off a single trigger product — confirmed on a real paid order
 * (double stand manually added at 50% off, single stand then auto-added
 * for free on top, same Katana "paying" for both).
 * Used by both rp.payment.controller.js (the real charge) and
 * cartRule.controller.js's evaluate endpoint (the PDP/cart preview) — same
 * function, so the price shown before checkout can never drift from what
 * checkout actually charges.
 */
export function createRuleBudgetTracker(discountCandidatesByProduct) {
  const budgets = new Map();
  for (const candidates of discountCandidatesByProduct.values()) {
    for (const c of candidates) {
      if (c.ruleId && !budgets.has(c.ruleId)) budgets.set(c.ruleId, c.cap);
    }
  }
  return budgets;
}

/**
 * Clamps each candidate's cap to its own rule's remaining shared budget
 * (see createRuleBudgetTracker), dropping any candidate whose rule is
 * already fully spent. A candidate with no ruleId (shouldn't happen post
 * evaluateCartRules/evaluatePromotions, but kept defensive) is left
 * unlimited rather than silently dropped. Feed the result into the
 * existing applyBestDiscount unchanged — this only narrows which
 * candidates it's allowed to see, never changes its math.
 */
export function withRuleBudget(candidates, budgets) {
  return candidates
    .map((c) => {
      if (!c.ruleId) return c;
      const remaining = budgets.has(c.ruleId) ? budgets.get(c.ruleId) : c.cap;
      return remaining > 0 ? { ...c, cap: Math.min(c.cap, remaining) } : null;
    })
    .filter(Boolean);
}

/**
 * Called after a line has actually been discounted, to spend down every
 * contributing rule's shared budget by however many units this line used.
 * Deliberately decrements EVERY ruleId present in `candidates` (not just
 * whichever one's price "won" applyBestDiscount's comparison) — the rare
 * case of two DIFFERENT rules both targeting the exact same product+variant
 * would close the losing rule's budget slightly earlier than strictly
 * necessary, which is the safe-direction error (never grants MORE discount
 * than intended; at worst a separate rule's budget is spent a little early).
 */
export function spendRuleBudget(candidates, budgets, unitsUsed) {
  for (const c of candidates) {
    if (!c.ruleId || !budgets.has(c.ruleId)) continue;
    budgets.set(c.ruleId, Math.max(0, budgets.get(c.ruleId) - unitsUsed));
  }
}

/**
 * How many units a cart line's matched candidates justify discounting —
 * the most generous applicable cap wins when more than one rule discounts
 * the same line, consistent with applyBestDiscount already picking the
 * best PRICE among candidates for that line. Callers normally pass
 * candidates already narrowed by withRuleBudget, so this naturally reflects
 * each rule's remaining shared budget too.
 */
export function applicableCap(candidates) {
  return Math.max(1, ...candidates.map((c) => c.cap ?? 1));
}

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
