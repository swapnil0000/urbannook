import Offer from "../model/offer.model.js";
import CartRule from "../model/cartRule.model.js";

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
  // Preferring the new unified `offers` collection (type: "cart_rule",
  // written by the admin panel's Offers page). Falls back to the legacy
  // `cartrules` collection only when this environment/DB hasn't been seeded
  // into `offers` yet (see UN-ADMIN-panel .../server/scripts/seedOffersFromLegacy.js).
  // An empty ACTIVE result from `offers` is a legitimate "no rules configured"
  // state, not a migration signal — so we check for the presence of ANY
  // cart_rule doc (active or not) to distinguish "migrated, zero active rules"
  // from "not migrated yet, read the legacy collection instead".
  const migrated = await Offer.exists({ type: "cart_rule" });
  if (migrated) {
    const rules = await Offer.find({ type: "cart_rule", isActive: true }).lean();
    // console.log(`[CartRule][source] NEW offers collection — ${rules.length} active rule(s)`);
    return rules;
  }
  const rules = await CartRule.find({ isActive: true }).lean();
  // console.log(`[CartRule][source] LEGACY cartrules collection (no cart_rule doc found in offers — not migrated on this DB yet) — ${rules.length} active rule(s)`);
  return rules;
};

const quantityByProduct = (cartItems = []) => {
  const map = new Map();
  for (const item of cartItems) {
    const id = String(item.productId);
    map.set(id, (map.get(id) || 0) + (Number(item.quantity) || 0));
  }
  return map;
};

const ruleIsMatched = (rule, qtyByProduct) =>
  rule.conditions.every((cond) => (qtyByProduct.get(String(cond.productId)) || 0) >= cond.minQuantity);

/**
 * Evaluates a cart against a set of active rules.
 *
 * @returns {{
 *   matchedRules: object[],
 *   freeShipping: boolean,
 *   discountCandidatesByProduct: Map<string, {type: 'percent_off'|'flat_off', value: number}[]>,
 * }}
 */
export const evaluateCartRules = (cartItems, activeRules) => {
  const qtyByProduct = quantityByProduct(cartItems);
  const matchedRules = activeRules.filter((rule) => ruleIsMatched(rule, qtyByProduct));

  const freeShipping = matchedRules.some((rule) => rule.effects.some((e) => e.type === "free_shipping"));

  // Multiple matched rules can target the SAME product's discount — collect
  // every candidate per product; `applyBestDiscount` below picks whichever
  // actually yields the lowest price for the customer, rather than relying
  // on a priority field an admin would have to remember to set correctly.
  const discountCandidatesByProduct = new Map();
  for (const rule of matchedRules) {
    for (const effect of rule.effects) {
      if (effect.type !== "percent_off" && effect.type !== "flat_off") continue;
      const productId = String(effect.targetProductId);
      const list = discountCandidatesByProduct.get(productId) || [];
      list.push({ type: effect.type, value: effect.value });
      discountCandidatesByProduct.set(productId, list);
    }
  }

  return { matchedRules, freeShipping, discountCandidatesByProduct };
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
  const matchedSet = new Set(matchedRuleIds.map(String));

  let best = null;
  let bestScore = -1;
  for (const rule of activeRules) {
    if (matchedSet.has(String(rule._id))) continue;
    const conditionProgress = rule.conditions.map((cond) => {
      const have = qtyByProduct.get(String(cond.productId)) || 0;
      return {
        productId: cond.productId,
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
