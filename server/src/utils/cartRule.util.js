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
  return CartRule.find({ isActive: true }).lean();
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
      list.push({
        type: effect.type,
        value: effect.value,
        // Falls back to 1 for rules written before this field existed, which
        // matches the intended semantics ("one discounted unit") rather than
        // silently discounting an unlimited quantity.
        maxDiscountedQuantity: effect.maxDiscountedQuantity ?? 1,
      });
      discountCandidatesByProduct.set(productId, list);
    }
  }

  return { matchedRules, freeShipping, discountCandidatesByProduct };
};

/**
 * The discounted price of a SINGLE unit under whichever candidate is best for
 * the customer — "best discount wins" when two rules both discount the same
 * item, decided by actual resulting price rather than a priority field.
 * Rounded to the nearest whole rupee (50% off ₹299 is ₹149.5 mathematically,
 * but INR pricing doesn't do paise) — this is the ONE place that rounding
 * happens, and every client-side display mirrors it exactly so the price shown
 * never drifts from what's actually charged.
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
 * Total rupees knocked off a cart LINE (one product × its quantity).
 *
 * The discount is capped to the winning candidate's `maxDiscountedQuantity`
 * (default 1), so "2+ Lamps => 50% off Pen Stand" discounts exactly ONE Pen
 * Stand: a second one is charged full price. For 2 × ₹299 Pen Stands that's
 * ₹598 − ₹149 = ₹449, not ₹300.
 *
 * Returned as a LINE-LEVEL rupee amount rather than a modified unit price
 * because a line whose first unit costs ₹150 and second costs ₹299 has no
 * single "unit price" — it can only be expressed as (unitPrice × qty) minus
 * this. Both the order total and every client display are built that way.
 */
export const computeLineDiscount = (unitPrice, quantity, candidates = []) => {
  if (!candidates.length) return 0;
  const price = Number(unitPrice) || 0;
  const qty = Number(quantity) || 0;
  if (price <= 0 || qty <= 0) return 0;

  // Pick the winning candidate by resulting unit price, then honour ITS cap —
  // the cap belongs to the rule that actually won, not to some other rule.
  let best = null;
  let bestUnitPrice = Infinity;
  for (const c of candidates) {
    const discounted =
      c.type === "percent_off"
        ? price * (1 - Number(c.value) / 100)
        : c.type === "flat_off"
          ? price - Number(c.value)
          : price;
    const finalUnit = Math.round(Math.max(discounted, 0));
    if (finalUnit < bestUnitPrice) {
      bestUnitPrice = finalUnit;
      best = c;
    }
  }
  if (!best || bestUnitPrice >= price) return 0;

  const discountedUnits = Math.min(qty, Math.max(Number(best.maxDiscountedQuantity) || 1, 1));
  return (price - bestUnitPrice) * discountedUnits;
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
