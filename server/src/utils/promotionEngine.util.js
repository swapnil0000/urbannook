import Promotion from "../model/promotion.model.js";
import PromotionUsage from "../model/promotionUsage.model.js";

/**
 * Promotion Engine V2 — the SINGLE evaluation authority for checkout's real
 * charge (as of 2026-10-08, dual-path/adapter double-evaluation retired from
 * the money path; as of 2026-10-09 the legacy-shaped adapter itself —
 * promotionToCartRule.adapter.js, cartRule.util.js, and every legacy-shaped
 * display surface that read it — was deleted entirely. There is exactly one
 * evaluation path left, this one, used by every caller: real checkout, the
 * cart/checkout preview, and the Display API).
 *
 * A promotion's `conditionTree` is a recursive AND/OR node:
 *   { op: "AND"|"OR", children: [conditionTree | leafCondition] }
 * A leaf condition has a `field` and whatever params that field needs — see
 * evaluateLeaf below for the full set. Cart-level context (subtotal, qty,
 * customer info, delivery address, per-product metadata) is passed in by the
 * caller as `cartContext` (see buildCartContext).
 */

export const getActivePromotions = async () => {
  const now = new Date();
  return Promotion.find({
    isActive: true,
    // gift_wrap_config is a non-discount config singleton stored in this
    // same collection (migrated off the legacy `offers` collection,
    // 2026-10-08) — it has no conditionTree/rewards and must never be
    // evaluated/matched as a real promotion.
    promotionType: { $ne: "gift_wrap_config" },
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  })
    // Deterministic ordering — without this, Mongo gives no guarantee for an
    // unsorted query, so a same-priority tie in resolveStacking's exclusive/
    // group resolution could silently pick a different winner across
    // requests/replica reads for identical cart contents (audit finding,
    // 2026-10-08). priority desc, then oldest-first, then _id as a final
    // tiebreak so the order is fully deterministic even for two promotions
    // created in the same millisecond.
    .sort({ priority: -1, createdAt: 1, _id: 1 })
    .lean();
};

/**
 * Courtesy pre-check (audit 2026-10-08, Critical Bug #5 partial fix) — a
 * promotion whose maxUsesTotal/maxUsesPerUser cap is ALREADY provably
 * exhausted (by the time checkout starts, not mid-race) is dropped from the
 * candidate list entirely, so it simply never matches this cart — same as
 * any other unmet condition. Previously these caps were only enforced AFTER
 * the discount was already baked into the charged amount (at
 * fulfilCapturedPayment, post-payment); a breaching order still got the
 * discount, only the usage counter was protected going forward. This does
 * NOT replace that atomic enforcement (still the only race-safe guard, kept
 * exactly as-is) — it's a non-atomic, read-then-filter courtesy check, same
 * category as assertVariantAvailable for stock: it closes the common,
 * non-race case (cap was already visibly hit before this checkout even
 * began) without pretending to solve concurrent-exhaustion races, which
 * need the full reservation-lifecycle work tracked separately.
 */
export async function excludeUsageExhaustedPromotions(promotions, { email, mobile } = {}) {
  const normEmail = email ? String(email).toLowerCase().trim() : null;
  const normMobile = mobile ? String(mobile).replace(/\D/g, "").slice(-10) : null;
  const kept = [];
  for (const p of promotions) {
    if (p.maxUsesTotal != null && p.usageCount >= p.maxUsesTotal) continue;
    if (p.maxUsesPerUser != null && (normEmail || normMobile)) {
      const priorUses = await PromotionUsage.countDocuments({
        promotionId: String(p._id),
        reversed: { $ne: true },
        $or: [
          ...(normEmail ? [{ email: normEmail }] : []),
          ...(normMobile ? [{ mobile: normMobile }] : []),
        ],
      });
      if (priorUses >= p.maxUsesPerUser) continue;
    }
    kept.push(p);
  }
  return kept;
}

// Structural scan (not condition evaluation) — does this promotion mention
// productId anywhere, as a condition ("product" leaf) or as a reward target
// (targetProductId / giftOptions[].productId / a targetScope matching this
// product's own category/subcategory/tag, or "all")? Used by the public
// /promotions/for-product/:productId endpoint to return the PDP-relevant
// subset without evaluating against a real cart — mirrors what
// freeShippingOffer.util.js's getBannerForProduct does for the legacy
// system (a structural "does this apply to this page" filter, not a
// live cart match). `productMeta` (this one product's own {category,
// subcategory, tags}) is only needed to resolve a targetScope reward —
// omit it and scope-based rewards simply won't count as relevant (safe
// default, same as every other caller that doesn't yet supply context it
// needs elsewhere in this file).
export function promotionReferencesProduct(promotion, productId, productMeta) {
  const id = String(productId);
  const walk = (node) => {
    if (!node) return false;
    if (node.op) return (node.children || []).some(walk);
    if (node.field === "product") return String(node.productId) === id;
    if (node.field === "productList") return (node.items || []).some((it) => String(it.productId) === id);
    return false;
  };
  if (walk(promotion.conditionTree)) return true;
  return (promotion.rewards || []).some((r) => {
    if (String(r.targetProductId) === id) return true;
    if ((r.giftOptions || []).some((g) => String(g.productId) === id)) return true;
    if (r.targetScope?.field) {
      if (r.targetScope.field === "all") return true;
      if (r.targetScope.field === "productList") return (r.targetScope.items || []).some((it) => String(it.productId) === id);
      if (!productMeta) return false;
      if (r.targetScope.field === "category") return productMeta.category === r.targetScope.value;
      if (r.targetScope.field === "subcategory") return productMeta.subcategory === r.targetScope.value;
      if (r.targetScope.field === "tag") return Array.isArray(productMeta.tags) && productMeta.tags.includes(r.targetScope.value);
    }
    return false;
  });
}

const quantityByProduct = (cartItems = []) => {
  const map = new Map();
  for (const item of cartItems) map.set(String(item.productId), (map.get(String(item.productId)) || 0) + (Number(item.quantity) || 0));
  return map;
};
export const variantKey = (productId, variantSku) => `${productId}::${variantSku}`;
const quantityByProductVariant = (cartItems = []) => {
  const map = new Map();
  for (const item of cartItems) {
    if (!item.variantSku) continue;
    const key = variantKey(String(item.productId), item.variantSku);
    map.set(key, (map.get(key) || 0) + (Number(item.quantity) || 0));
  }
  return map;
};

/**
 * Builds the read-only context every leaf condition evaluates against.
 * `productMeta`: Map<productId, {category, subcategory, tags: string[]}> —
 * caller resolves this from the live Product docs for whatever's in cart
 * (rp.payment.controller.js already loads the products for order-creation;
 * this just reuses category/subCategory/tags off the same docs).
 * `customerType`/`orderCount`/`deliveryAddress` default to "unknown" values
 * that simply never match a targeting condition that needs them, rather than
 * throwing — a promotion with a customer/geo condition just won't apply if
 * the caller didn't supply that context (e.g. PDP/cart display, which knows
 * the cart but not yet the delivery address).
 */
export const buildCartContext = (cartItems, { subtotal, productMeta, customerType, orderCount, deliveryAddress, appliedCouponCode } = {}) => ({
  qtyByProduct: quantityByProduct(cartItems),
  qtyByProductVariant: quantityByProductVariant(cartItems),
  subtotal: Number(subtotal) || 0,
  totalQty: cartItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0),
  productMeta: productMeta || new Map(),
  customerType: customerType || null, // "guest" | "registered"
  orderCount: orderCount != null ? Number(orderCount) : null,
  deliveryAddress: deliveryAddress || null, // { pincode, state, country }
  // The coupon code actually applied/entered on THIS cart/order, uppercased
  // to match how Promotion.linkedCouponCode is stored. null/"" = no coupon —
  // gates every promotion that has a linkedCouponCode (see
  // promotionRequiresUnmetCoupon below) so a coupon-linked promotion never
  // applies just because its cart conditions match; the coupon itself must
  // actually be entered.
  appliedCouponCode: appliedCouponCode ? String(appliedCouponCode).trim().toUpperCase() : null,
});

// A promotion with a `linkedCouponCode` is only allowed to match when the
// cart's actually-applied coupon is that exact code — otherwise it's
// evaluated as "automatic" (conditionTree-only) and a customer who never
// entered the coupon would get the reward for free. Before this,
// linkedCouponCode was purely cosmetic (only read for the admin card's
// label and the presentation layer's display-type choice) and every
// "coupon-linked" promotion silently behaved as fully automatic.
// Exported — promotionPresentation.service.js also needs this so a
// coupon-linked promotion's display-layer `qualifying` can't disagree with
// what real evaluation (evaluatePromotions, above) actually requires.
export const promotionCouponGateOk = (promotion, ctx) =>
  !promotion.linkedCouponCode || promotion.linkedCouponCode === ctx.appliedCouponCode;

// `maxValue` only matters for "between" (inclusive on both ends) — every
// other operator ignores it, so existing call sites that never pass it
// (cartSubtotal/cartQuantity/orderCount) are completely unaffected.
const compareOp = (have, operator, value, maxValue) => {
  if (operator === "lte") return have <= value;
  if (operator === "eq") return have === value;
  if (operator === "between") return have >= value && have <= Number(maxValue);
  return have >= value; // default "gte"
};

// Sum of cart quantity for items whose product carries the given
// category/subcategory/tag value.
const qtyMatchingTaxonomy = (ctx, field, value) => {
  let total = 0;
  for (const [productId, qty] of ctx.qtyByProduct.entries()) {
    const meta = ctx.productMeta.get(productId);
    if (!meta) continue;
    if (field === "category" && meta.category === value) total += qty;
    if (field === "subcategory" && meta.subcategory === value) total += qty;
    if (field === "tag" && Array.isArray(meta.tags) && meta.tags.includes(value)) total += qty;
  }
  return total;
};

// Count of DISTINCT products (qty > 0) carrying the given category/
// subcategory/tag value — "3 different products from category X", as
// opposed to qtyMatchingTaxonomy's "3 units, from however many products".
// Added 2026-10-10 (Phase 1, admin offer control system) — a leaf's
// `countMode: "distinct"` selects this; default/absent `countMode` keeps
// using qtyMatchingTaxonomy, so every existing promotion is unaffected.
const distinctMatchingTaxonomy = (ctx, field, value) => {
  let count = 0;
  for (const [productId, qty] of ctx.qtyByProduct.entries()) {
    if (qty <= 0) continue;
    const meta = ctx.productMeta.get(productId);
    if (!meta) continue;
    if (field === "category" && meta.category === value) count += 1;
    if (field === "subcategory" && meta.subcategory === value) count += 1;
    if (field === "tag" && Array.isArray(meta.tags) && meta.tags.includes(value)) count += 1;
  }
  return count;
};

// Sum of cart quantity across every entry in a `productList` leaf's own
// explicit `items: [{productId, variantSku?}]` array — an admin-picked SET
// of specific products/variants, as opposed to a whole category/subcategory/
// tag. An entry with a `variantSku` counts only that exact variant; an entry
// without one counts every variant of that product. Generic over any number
// of items, any mix of products — never assumes a specific offer shape.
const qtyMatchingProductList = (ctx, items) => {
  let total = 0;
  for (const it of items || []) {
    total += it.variantSku
      ? ctx.qtyByProductVariant.get(variantKey(String(it.productId), it.variantSku)) || 0
      : ctx.qtyByProduct.get(String(it.productId)) || 0;
  }
  return total;
};

// Count of DISTINCT list entries actually present (qty > 0) — "any 2
// DIFFERENT items from this list", mirroring distinctMatchingTaxonomy's
// units-vs-distinct distinction for category/subcategory/tag.
const distinctMatchingProductList = (ctx, items) => {
  let count = 0;
  for (const it of items || []) {
    const have = it.variantSku
      ? ctx.qtyByProductVariant.get(variantKey(String(it.productId), it.variantSku)) || 0
      : ctx.qtyByProduct.get(String(it.productId)) || 0;
    if (have > 0) count += 1;
  }
  return count;
};

// The same quantity counters used by the authoritative leaf evaluator,
// exposed for the cart sheet's before/after progress check.
export function quantityForConditionLeaf(leaf, ctx) {
  if (leaf.field === "product") return leaf.variantSku
    ? ctx.qtyByProductVariant.get(variantKey(String(leaf.productId), leaf.variantSku)) || 0
    : ctx.qtyByProduct.get(String(leaf.productId)) || 0;
  if (leaf.field === "productList") return leaf.countMode === "distinct"
    ? distinctMatchingProductList(ctx, leaf.items) : qtyMatchingProductList(ctx, leaf.items);
  if (["category", "subcategory", "tag"].includes(leaf.field)) return leaf.countMode === "distinct"
    ? distinctMatchingTaxonomy(ctx, leaf.field, leaf.value) : qtyMatchingTaxonomy(ctx, leaf.field, leaf.value);
  return null;
}

// Shared by evaluateLeaf and promotionRepeatCount — a `product`/taxonomy
// leaf's quantity side, operator-aware (Phase 1). `countMode: "distinct"`
// only applies to category/subcategory/tag/productList (a single `product`
// leaf has nothing to "count distinctly" — it's already one specific product).
function leafQuantityMatch(leaf, have) {
  const operator = leaf.operator || "gte";
  return compareOp(have, operator, Number(leaf.minQuantity ?? 1), leaf.maxQuantity);
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const nowIST = () => new Date(Date.now() + IST_OFFSET_MS);

function evaluateLeaf(leaf, ctx) {
  switch (leaf.field) {
    case "product": {
      const have = leaf.variantSku
        ? ctx.qtyByProductVariant.get(variantKey(String(leaf.productId), leaf.variantSku)) || 0
        : ctx.qtyByProduct.get(String(leaf.productId)) || 0;
      return leafQuantityMatch(leaf, have);
    }
    case "category":
    case "subcategory":
    case "tag": {
      const have = leaf.countMode === "distinct"
        ? distinctMatchingTaxonomy(ctx, leaf.field, leaf.value)
        : qtyMatchingTaxonomy(ctx, leaf.field, leaf.value);
      return leafQuantityMatch(leaf, have);
    }
    // An admin-picked SET of specific products/variants — "any of these N
    // exact items", as opposed to a whole category/subcategory/tag. Same
    // quantity-operator/countMode mechanics as every other quantity leaf.
    case "productList": {
      const have = leaf.countMode === "distinct"
        ? distinctMatchingProductList(ctx, leaf.items)
        : qtyMatchingProductList(ctx, leaf.items);
      return leafQuantityMatch(leaf, have);
    }
    case "cartSubtotal":
      return compareOp(ctx.subtotal, leaf.operator, Number(leaf.value));
    case "cartQuantity":
      return compareOp(ctx.totalQty, leaf.operator, Number(leaf.value));
    case "customerType":
      return ctx.customerType != null && ctx.customerType === leaf.value;
    case "orderCount":
      return ctx.orderCount != null && compareOp(ctx.orderCount, leaf.operator, Number(leaf.value));
    case "pincode":
    case "state":
    case "country": {
      if (!ctx.deliveryAddress) return false;
      const have = ctx.deliveryAddress[leaf.field];
      const want = Array.isArray(leaf.value) ? leaf.value : [leaf.value];
      return have != null && want.includes(have);
    }
    case "dayOfWeek": {
      const day = nowIST().getDay();
      return Array.isArray(leaf.value) && leaf.value.includes(day);
    }
    case "timeOfDay": {
      const hour = nowIST().getHours();
      return hour >= Number(leaf.startHour) && hour < Number(leaf.endHour);
    }
    default:
      return false; // unknown field — never silently match
  }
}

export function evaluateConditionTree(node, ctx) {
  if (!node) return true; // no condition tree at all = unconditional promotion
  if (node.op) {
    const children = node.children || [];
    if (children.length === 0) return true;
    // NOT wraps exactly one child and inverts its result — admin's
    // "category-wide EXCEPT these products" ask at the condition level
    // (Admin Offer Control System, Phase 2). A missing child (malformed
    // tree) is treated as "nothing to negate" → true, same as an empty
    // AND/OR group above.
    if (node.op === "NOT") return children[0] ? !evaluateConditionTree(children[0], ctx) : true;
    return node.op === "OR"
      ? children.some((c) => evaluateConditionTree(c, ctx))
      : children.every((c) => evaluateConditionTree(c, ctx)); // default AND
  }
  return evaluateLeaf(node, ctx);
}

// Same rounding convention as cartRule.util.js's applyBestDiscount — kept as
// an independent copy (not imported) so this file never depends on the
// legacy util. See file header.
// Best discounted unit price before rounding (e.g. 50% of 399 = 199.5).
export const exactBestPromotionPrice = (unitPrice, candidates = []) => {
  const price = Number(unitPrice) || 0;
  if (!candidates.length) return price;
  const results = candidates.map((c) => {
    if (c.type === "percent_off_product") return price * (1 - Number(c.value) / 100);
    if (c.type === "flat_off_product" || c.type === "discounted_product") return price - Number(c.value);
    return price;
  });
  return Math.max(Math.min(...results), 0);
};

export const applyBestPromotionDiscount = (unitPrice, candidates = []) => {
  if (!candidates.length) return unitPrice;
  // fractions round in the customer's favour: 50% of 399 = 199.5 -> 199
  return Math.floor(exactBestPromotionPrice(unitPrice, candidates) + 1e-9);
};

// ── Shared cross-line budget tracking (moved from the now-deleted
// cartRule.util.js, 2026-10-09 — these four functions were never actually
// cart-rule-specific, they're generic per-promotion cap bookkeeping used by
// the real checkout charge AND the cart preview, so they live with the one
// remaining engine now.) ────────────────────────────────────────────────

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
 */
// Budget key for a reward line's own maxUnits limit (rule + variant).
const lineKey = (c) => `${c.ruleId}|${c.variantSku || ""}`;
const weightOf = (c) => Math.max(1, Number(c.unitWeight) || 1);

export function createRuleBudgetTracker(discountCandidatesByProduct) {
  const budgets = new Map();
  for (const candidates of discountCandidatesByProduct.values()) {
    for (const c of candidates) {
      if (c.ruleId && !budgets.has(c.ruleId)) budgets.set(c.ruleId, c.cap);
      if (c.ruleId && c.maxUnits != null && !budgets.has(lineKey(c))) budgets.set(lineKey(c), c.maxUnits);
    }
  }
  return budgets;
}

/**
 * Clamps each candidate's cap to its own rule's remaining shared budget
 * (see createRuleBudgetTracker), dropping any candidate whose rule is
 * already fully spent. A candidate with no ruleId (shouldn't happen, but
 * kept defensive) is left unlimited rather than silently dropped. Feed the
 * result into applyBestPromotionDiscount unchanged — this only narrows
 * which candidates it's allowed to see, never changes its math.
 */
export function withRuleBudget(candidates, budgets) {
  return candidates
    .map((c) => {
      if (!c.ruleId) return c;
      const remaining = budgets.has(c.ruleId) ? budgets.get(c.ruleId) : c.cap;
      // unitWeight: one unit uses that much of the shared budget (Triple = 3)
      let cap = Math.min(c.cap, Math.floor(remaining / weightOf(c)));
      if (c.maxUnits != null) cap = Math.min(cap, budgets.has(lineKey(c)) ? budgets.get(lineKey(c)) : c.maxUnits);
      // limitWhen: once the rule has discounted the named variant, this one is capped
      // (stand offers: with any Double, at most 1 Single - so 2D+1S / 1D+1S, never 1D+2S)
      if (c.limitWhen?.variantSku && (budgets.get(`${c.ruleId}|${c.limitWhen.variantSku}#used`) || 0) > 0) {
        cap = Math.min(cap, Number(c.limitWhen.maxUnits || 0) - (budgets.get(`${lineKey(c)}#used`) || 0));
      }
      return cap > 0 ? { ...c, cap } : null;
    })
    .filter(Boolean);
}

/**
 * Called after a line has actually been discounted, to spend down every
 * contributing rule's shared budget by however many units this line used.
 * Deliberately decrements EVERY ruleId present in `candidates` (not just
 * whichever one's price "won" applyBestPromotionDiscount's comparison) —
 * the rare case of two DIFFERENT rules both targeting the exact same
 * product+variant would close the losing rule's budget slightly earlier
 * than strictly necessary, which is the safe-direction error (never grants
 * MORE discount than intended; at worst a separate rule's budget is spent a
 * little early).
 */
export function spendRuleBudget(candidates, budgets, unitsUsed) {
  for (const c of candidates) {
    if (!c.ruleId || !budgets.has(c.ruleId)) continue;
    budgets.set(c.ruleId, Math.max(0, budgets.get(c.ruleId) - unitsUsed * weightOf(c)));
    if (c.maxUnits != null && budgets.has(lineKey(c))) budgets.set(lineKey(c), Math.max(0, budgets.get(lineKey(c)) - unitsUsed));
    budgets.set(`${lineKey(c)}#used`, (budgets.get(`${lineKey(c)}#used`) || 0) + unitsUsed);
  }
}

/**
 * How many units a cart line's matched candidates justify discounting —
 * the most generous applicable cap wins when more than one rule discounts
 * the same line, consistent with applyBestPromotionDiscount already picking
 * the best PRICE among candidates for that line. Callers normally pass
 * candidates already narrowed by withRuleBudget, so this naturally reflects
 * each rule's remaining shared budget too.
 */
/**
 * Splits one cart line (unitPrice x quantity) across the promotions whose
 * candidates touch it: the best-priced rule takes its units first (up to its
 * cap, already clamped by withRuleBudget), the next rule takes from what is
 * left, and so on. With a single rule this is exactly the old behaviour
 * (one segment: best price, min(quantity, cap) units).
 * Returns [{ ruleId, unitPrice, units, candidates }] - only discounting segments.
 */
export function allocateLineSegments(unitPrice, quantity, candidates = [], budgets = null) {
  const price = Number(unitPrice) || 0;
  const byRule = new Map();
  for (const c of candidates) {
    const k = c.ruleId || "";
    if (!byRule.has(k)) byRule.set(k, []);
    byRule.get(k).push(c);
  }
  const rules = [...byRule.entries()]
    .map(([ruleId, cands]) => ({ ruleId: ruleId || null, candidates: cands, unitPrice: applyBestPromotionDiscount(price, cands), cap: applicableCap(cands) }))
    .filter((r) => r.unitPrice < price)
    .sort((a, b) => a.unitPrice - b.unitPrice);
  let left = Number(quantity) || 0;
  const segments = [];
  for (const r of rules) {
    if (left <= 0) break;
    const units = Math.min(left, r.cap);
    if (units <= 0) continue;
    left -= units;
    segments.push({ ruleId: r.ruleId, unitPrice: r.unitPrice, units, candidates: r.candidates });
  }
  return segments;
}

/**
 * Order in which cart lines spend shared promotion budgets: most expensive
 * unit first, so the customer gets the biggest saving the rules allow and
 * the same cart always gets the same price, whatever order items were added.
 */
export function budgetSpendOrder(items, priceOf) {
  return items.map((item, index) => ({ item, index })).sort((a, b) => (Number(priceOf(b.item)) || 0) - (Number(priceOf(a.item)) || 0) || a.index - b.index);
}

export function applicableCap(candidates) {
  return Math.max(1, ...candidates.map((c) => c.cap ?? 1));
}

// ── Phase 4 — per-promotion ₹ discount cap (maxDiscountAmount) ────────────
// A promotion's reward math (percent/flat off, product- or order-level) has
// no ₹ amount available until checkout, where real unit prices are known —
// the engine itself only sees quantities/categories (buildCartContext has no
// price data). So the cap is enforced in the SAME checkout-controller loop
// that already tracks `promoDiscountByPromotionId` (the running ₹ total per
// promotion, built for usage reporting — audit 2026-10-10 finding A10),
// reusing that exact map rather than inventing a second running total.
// Extracted here (not left inline per flow) specifically so the
// authenticated and guest checkout flows — two independently-duplicated
// copies of this same loop — both enforce it identically; a cap mechanism
// that only one of the two flows applied would itself be a money leak.

/** One lookup built once per checkout from `evaluatePromotions`'s own `matchedPromotions` — promotionId → its maxDiscountAmount, or null for "unlimited" (the default, unchanged behavior). */
export function buildMaxDiscountAmountMap(matchedPromotions) {
  return new Map((matchedPromotions || []).map((p) => [String(p._id), p.maxDiscountAmount ?? null]));
}

/**
 * How many of this line's units can actually be discounted without pushing
 * the winning promotion's running ₹ total past its maxDiscountAmount. A
 * no-op (returns `naturalCap` unchanged) whenever the promotion has no cap
 * set, which is every existing promotion today.
 */
export function clampCapToDiscountBudget(naturalCap, perUnitDiscount, winningRuleId, promoDiscountByPromotionId, maxDiscountAmountByPromotionId) {
  if (!winningRuleId || !(perUnitDiscount > 0)) return naturalCap;
  const budget = maxDiscountAmountByPromotionId.get(winningRuleId);
  if (budget == null) return naturalCap;
  const spent = promoDiscountByPromotionId.get(winningRuleId) || 0;
  const remaining = Math.max(0, budget - spent);
  return Math.min(naturalCap, Math.floor(remaining / perUnitDiscount));
}

/** Same clamp as above, for a single order-level discount amount (percent_off_order/flat_off_order) rather than a per-unit product cap. */
export function clampOrderDiscountToBudget(amount, winningPromotionId, promoDiscountByPromotionId, maxDiscountAmountByPromotionId) {
  if (!winningPromotionId || !(amount > 0)) return amount;
  const budget = maxDiscountAmountByPromotionId.get(winningPromotionId);
  if (budget == null) return amount;
  const spent = promoDiscountByPromotionId.get(winningPromotionId) || 0;
  return Math.max(0, Math.min(amount, budget - spent));
}

/**
 * Resolves which matched promotions actually stay active after exclusivity/
 * grouping rules. Handles the two explicit, order-wide rules: `exclusive`
 * and `promotionGroup`. Per-PRODUCT conflict resolution (two different,
 * non-exclusive, non-grouped promotions both targeting the same product)
 * is a separate, narrower pass — see resolveProductWinners below,
 * which is where `stackable` actually gets enforced now (decided
 * 2026-10-10 — see that function's header for the full rationale).
 */
function resolveStacking(matched) {
  const exclusiveOnes = matched.filter((p) => p.exclusive);
  if (exclusiveOnes.length > 0) {
    exclusiveOnes.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return [exclusiveOnes[0]];
  }
  const byGroup = new Map();
  const ungrouped = [];
  for (const p of matched) {
    if (p.promotionGroup) {
      const cur = byGroup.get(p.promotionGroup);
      if (!cur || (p.priority || 0) > (cur.priority || 0)) byGroup.set(p.promotionGroup, p);
    } else {
      ungrouped.push(p);
    }
  }
  return [...ungrouped, ...byGroup.values()];
}

/**
 * @returns {{
 *   matchedPromotions: object[],
 *   discountCandidatesByProduct: Map<string, {type, value, variantSku?}[]>,
 *   orderLevelDiscounts: {type:'percent_off_order'|'flat_off_order', value:number, promotionId:string}[],
 *   freeGifts: {promotionId:string, name:string, targetProductId?:string, targetVariantSku?:string, quantity?:number, giftOptions?:object[]}[],
 *   bundleRewards: {promotionId:string, targetProductId:string, targetVariantSku?:string, bundlePrice:number}[],
 *   cheapestItemAdjustments: {promotionId:string, mode:'free'|'discount', value?:number}[],
 *   storeCreditGrants: {promotionId:string, amount:number}[],
 *   freeShipping: boolean,
 * }}
 */
// How many times a promotion's conditionTree is satisfied at once — e.g. a
// condition "1+ Katana" with 2 Katanas in cart satisfies it twice, so its
// reward should benefit up to 2 units, not just 1. AND takes the minimum
// across children (every branch must repeat together), OR takes the maximum
// (the best-satisfied branch sets the count). A non-product leaf
// (cartSubtotal/category/customerType/etc.) doesn't naturally repeat, so it
// never LIMITS the count — only "product" leaves do. Entirely derived from
// admin-configured minQuantity vs. the real cart — never guessed by a
// storefront display surface.
function promotionRepeatCount(node, ctx) {
  if (!node) return Infinity;
  if (node.op) {
    // A NOT'd subtree has no natural "how many times satisfied" notion —
    // same "doesn't limit the count" treatment every non-product leaf
    // already gets, not the negated child's own count (which would mean
    // something entirely different: how many times the UN-negated form
    // would have matched).
    if (node.op === "NOT") return Infinity;
    const childCounts = (node.children || []).map((c) => promotionRepeatCount(c, ctx));
    if (!childCounts.length) return Infinity;
    return node.op === "OR" ? Math.max(...childCounts) : Math.min(...childCounts);
  }
  if (node.field === "product") {
    // Only "gte" (the default, and every pre-Phase-1 promotion) has a
    // meaningful "how many times satisfied" notion — floor(have/minQuantity)
    // for "2+ of X" repeating every 2 units. lte/eq/between are fixed-window
    // gates (e.g. "exactly 3" or "between 2 and 4") that don't naturally
    // repeat — same "doesn't limit the count" treatment every non-product
    // leaf already gets, not a new exception.
    if ((node.operator || "gte") !== "gte") return Infinity;
    const have = node.variantSku
      ? ctx.qtyByProductVariant.get(variantKey(String(node.productId), node.variantSku)) || 0
      : ctx.qtyByProduct.get(String(node.productId)) || 0;
    return Math.floor(have / (node.minQuantity || 1));
  }
  return Infinity; // non-product condition doesn't limit the repeat count
}

// ── Phase 3 — quantity tiers (Admin Offer Control System) ─────────────────
// A reward's `tiers: [{minQuantity, value}]` resolves its applied value off
// the SAME live quantity figure promotionRepeatCount's own condition
// measures — NOT the reward target's quantity, since the condition and the
// reward target can legitimately be different products (e.g. "2+ of X"
// gating a tiered discount on Y). AND/OR take the min/max across children,
// same convention as promotionRepeatCount; a NOT'd or non-product
// condition has no meaningful quantity figure here (returns 0, so tiers
// never apply and resolveTierValue falls back to the flat `value` field).
function promotionTriggerQuantity(node, ctx) {
  // Infinity, NOT 0, for "this leaf/subtree has no quantity opinion" — same
  // identity-for-Math.min convention promotionRepeatCount already uses.
  // Returning 0 here would be WRONG: inside an AND group (e.g. "2+ Katana
  // AND cartSubtotal >= 1000", or "2+ Katana AND NOT stand-pricey" — both
  // completely ordinary condition shapes), Math.min would let that single
  // non-quantity sibling poison the whole group down to 0 regardless of the
  // other children's real quantities, silently breaking every tiered reward
  // on any promotion whose condition combines a product leaf with anything
  // else (confirmed via combination testing, 2026-10-19 — tiers resolved to
  // the flat-value fallback for EVERY such promotion shape before this fix).
  if (!node) return Infinity;
  if (node.op) {
    if (node.op === "NOT") return Infinity;
    const quantities = (node.children || []).map((c) => promotionTriggerQuantity(c, ctx));
    if (!quantities.length) return Infinity;
    return node.op === "OR" ? Math.max(...quantities) : Math.min(...quantities);
  }
  if (node.field === "product") {
    return node.variantSku
      ? ctx.qtyByProductVariant.get(variantKey(String(node.productId), node.variantSku)) || 0
      : ctx.qtyByProduct.get(String(node.productId)) || 0;
  }
  if (node.field === "productList") {
    return node.countMode === "distinct" ? distinctMatchingProductList(ctx, node.items) : qtyMatchingProductList(ctx, node.items);
  }
  if (["category", "subcategory", "tag"].includes(node.field)) {
    return node.countMode === "distinct" ? distinctMatchingTaxonomy(ctx, node.field, node.value) : qtyMatchingTaxonomy(ctx, node.field, node.value);
  }
  return Infinity; // non-quantity condition (cartSubtotal, geo, schedule, ...) — doesn't limit which tier applies
}

/**
 * Resolves a reward's effective value: whichever tier's minQuantity the
 * live trigger quantity has crossed (highest qualifying tier wins — never
 * cumulative/stacked across tiers), or the flat `value` field when `tiers`
 * is absent/empty/none crossed. Backward compatible by construction — a
 * reward with no `tiers` always returns its own `value` unchanged.
 */
export function resolveTierValue(reward, conditionTree, ctx) {
  // Admin validation always requires a real `value` even when tiers is set
  // (it's the documented fallback), so this path is normally unreachable —
  // guarded anyway so a malformed/API-written promotion degrades to "no
  // discount" instead of producing NaN through the price math.
  const safeFlatValue = Number.isFinite(reward.value) ? reward.value : 0;
  if (!Array.isArray(reward.tiers) || reward.tiers.length === 0) return safeFlatValue;
  const have = promotionTriggerQuantity(conditionTree, ctx);
  let applicable = null;
  for (const tier of reward.tiers) {
    if (have >= Number(tier.minQuantity) && (!applicable || Number(tier.minQuantity) > Number(applicable.minQuantity))) {
      applicable = tier;
    }
  }
  return applicable ? Number(applicable.value) : safeFlatValue;
}

// combinesWithCoupons (default true, audit 2026-10-08 fix — previously
// schema-only, never read anywhere): an AUTOMATIC promotion (no
// linkedCouponCode of its own) with combinesWithCoupons:false must not
// apply on top of a coupon the customer actually entered. Does NOT affect a
// promotion that has its OWN linkedCouponCode — that relationship is
// already fully gated by promotionCouponGateOk above, and setting both
// fields on the same promotion would be contradictory, so linkedCouponCode
// always wins this check.
const promotionCombinesWithCouponsOk = (promotion, ctx) =>
  promotion.combinesWithCoupons !== false || !ctx.appliedCouponCode || Boolean(promotion.linkedCouponCode);

// Which product(s) a percent_off_product/flat_off_product/discounted_product
// reward actually discounts. Two shapes, mutually exclusive (validated at
// write time, admin-side `validateRewards`):
//   - `targetProductId` (+ optional `targetVariantSku`) — ONE specific
//     product, exactly as before this function existed. Every pre-existing
//     promotion keeps working unchanged.
//   - `targetScope: { field: "category"|"subcategory"|"tag"|"all", value? }`
//     — resolves to every DISTINCT product currently in the cart matching
//     that taxonomy value ("all" = every product in the cart, no filter).
//     This is what "X% off everything in category Y" / "X% off the whole
//     order's products" actually are — a reward whose target is a SET,
//     resolved against the live cart, reusing the exact same taxonomy
//     vocabulary conditionTree leaves already use. A product only ever
//     enters the set if it's actually in the cart — there is no "discount a
//     product that isn't there" case to handle.
function resolveRewardTargetProductIds(reward, ctx) {
  if (reward.targetProductId) return [String(reward.targetProductId)];
  const scope = reward.targetScope;
  if (!scope || !scope.field) return [];
  const cartProductIds = [...ctx.qtyByProduct.keys()];
  // Reward-level exclusion (Admin Offer Control System, Phase 2) — distinct
  // from condition-level NOT (which gates whether the promotion matches at
  // all): this filters WHICH resolved productIds actually get the
  // discount, e.g. "10% off category X EXCEPT these 2 products". Applied
  // uniformly at the end so every scope.field below gets it for free,
  // rather than threading it into each branch separately.
  const excludeIds = new Set((scope.excludeProductIds || []).map(String));
  const applyExclusion = (ids) => (excludeIds.size ? ids.filter((pid) => !excludeIds.has(pid)) : ids);
  if (scope.field === "all") return applyExclusion(cartProductIds);
  if (scope.field === "productList") {
    const listIds = new Set((scope.items || []).map((it) => String(it.productId)));
    return applyExclusion(cartProductIds.filter((pid) => listIds.has(pid)));
  }
  if (!["category", "subcategory", "tag"].includes(scope.field)) return [];
  return applyExclusion(cartProductIds.filter((pid) => {
    const meta = ctx.productMeta.get(pid);
    if (!meta) return false;
    if (scope.field === "category") return meta.category === scope.value;
    if (scope.field === "subcategory") return meta.subcategory === scope.value;
    return Array.isArray(meta.tags) && meta.tags.includes(scope.value);
  }));
}

// True iff `candidate`'s own promotion should win a per-product conflict
// over the current `winner`'s promotion — see resolveProductWinners.
// Exported — rp.payment.controller.js's Phase 5 cheapest-item wiring reuses
// this exact tiebreak to pick ONE winning promotion when more than one
// cheapestItemAdjustments entry matched, instead of a second copy of the
// same priority/stackable/createdAt logic.
export function isBetterPromoForProduct(candidate, winner) {
  if (candidate.priority !== winner.priority) return candidate.priority > winner.priority;
  // Equal priority: a promotion explicitly marked non-stackable is saying
  // "don't let anything else touch this product" — that refusal should win
  // over a promotion that's fine sharing, rather than being silently
  // overridden by whichever happened to be best-priced.
  if (candidate.stackable !== winner.stackable) return !candidate.stackable;
  // Still tied: earliest-created wins — same deterministic tiebreak
  // getActivePromotions' own query sort already uses, so this never
  // depends on Map/array iteration order.
  return new Date(candidate.createdAt || 0) < new Date(winner.createdAt || 0);
}

/**
 * Enforces "only one promotion ever discounts/gifts a given product" —
 * decided 2026-10-10 (previously left unimplemented, see resolveStacking's
 * prior header comment). If two or more DIFFERENT matched promotions both
 * have a reward touching the same product — a product-level discount
 * (explicit targetProductId, or targetScope resolving to it) OR a
 * free_product gift naming it — only the single BEST promotion's claim on
 * that product survives, chosen by (highest priority, then stackable:false
 * beats stackable:true, then earliest-created as a final deterministic
 * tiebreak). This is what makes `stackable`/`priority` real, enforced rules
 * instead of admin-only labels, and it's a strict single-winner choice
 * (never compounds two discounts on one product) deliberately — compounding
 * would multiply the surface for a rounding/order-of-operations bug that
 * over-discounts, which is the one failure mode a discount engine can
 * never have.
 *
 * free_product and a product-level discount are different reward
 * mechanisms, but both can target the exact same product from two
 * different promotions — the winner contest has to run across BOTH
 * together, not just within discountCandidatesByProduct alone (audit
 * finding, 2026-10-18: a lower-priority promotion's free gift of a product
 * a higher-priority promotion was already discounting used to go through
 * untouched). `gift_choice` has no single target product (customer picks
 * from `giftOptions`) and is left untouched by this pass.
 *
 * Candidates from the SAME winning promotion (e.g. two reward rows in one
 * promotion both targeting this product) are untouched by this pass —
 * applyBestPromotionDiscount already picks the best among same-promotion
 * discount candidates exactly as before.
 */
function resolveProductWinners(discountCandidatesByProduct, freeGifts, promoMetaById) {
  const fallbackMeta = { priority: 0, stackable: true, createdAt: null };

  const ruleIdsByProduct = new Map();
  for (const [productId, candidates] of discountCandidatesByProduct.entries()) {
    ruleIdsByProduct.set(productId, new Set(candidates.map((c) => c.ruleId).filter(Boolean)));
  }
  for (const gift of freeGifts) {
    if (!gift.targetProductId) continue;
    const set = ruleIdsByProduct.get(gift.targetProductId) || new Set();
    set.add(gift.promotionId);
    ruleIdsByProduct.set(gift.targetProductId, set);
  }

  const winnerByProduct = new Map();
  for (const [productId, ruleIdSet] of ruleIdsByProduct.entries()) {
    const ruleIds = [...ruleIdSet];
    let winnerId = ruleIds[0];
    let winnerMeta = promoMetaById.get(winnerId) || fallbackMeta;
    for (const id of ruleIds.slice(1)) {
      const meta = promoMetaById.get(id) || fallbackMeta;
      if (isBetterPromoForProduct(meta, winnerMeta)) {
        winnerId = id;
        winnerMeta = meta;
      }
    }
    winnerByProduct.set(productId, winnerId);
  }

  // Exception (2026-11-01): promotions in DIFFERENT named groups (e.g.
  // "led-stand" and "wooden-stand") may share a product - each discounts
  // its own units only, up to its own cap/budget (allocateLineSegments).
  // Ungrouped or same-group promotions keep the single-winner rule above.
  for (const [productId, candidates] of discountCandidatesByProduct.entries()) {
    const winnerId = winnerByProduct.get(productId);
    if (winnerId == null || candidates.length <= 1) continue;
    const winnerGroup = (promoMetaById.get(winnerId) || fallbackMeta).group || "";
    discountCandidatesByProduct.set(productId, candidates.filter((c) => {
      if (c.ruleId === winnerId) return true;
      const g = (promoMetaById.get(c.ruleId) || fallbackMeta).group || "";
      return Boolean(winnerGroup && g && g !== winnerGroup);
    }));
  }

  return freeGifts.filter((gift) => {
    if (!gift.targetProductId) return true;
    const winnerId = winnerByProduct.get(gift.targetProductId);
    return winnerId == null || gift.promotionId === winnerId;
  });
}

export const evaluatePromotions = (cartItems, ctx, activePromotions) => {
  const matched = resolveStacking(
    activePromotions.filter(
      (p) => promotionCouponGateOk(p, ctx) && promotionCombinesWithCouponsOk(p, ctx) && evaluateConditionTree(p.conditionTree, ctx),
    ),
  );

  const discountCandidatesByProduct = new Map();
  const orderLevelDiscounts = [];
  const freeGifts = [];
  const bundleRewards = [];
  const cheapestItemAdjustments = [];
  const storeCreditGrants = [];
  let freeShipping = false;
  const promoMetaById = new Map(
    matched.map((p) => [String(p._id), { priority: p.priority || 0, stackable: p.stackable !== false, createdAt: p.createdAt || null, group: p.promotionGroup || "" }]),
  );

  for (const promo of matched) {
    // Clamped to a large finite sentinel — Infinity survives in-process but
    // serializes to `null` over JSON (res.json), which would silently break
    // every client reading `cap`. Math.min(realQtyInCart, cap) downstream
    // makes the exact clamp value irrelevant as long as it's "large enough".
    const rawCap = promotionRepeatCount(promo.conditionTree, ctx);
    let cap = Math.max(1, Number.isFinite(rawCap) ? rawCap : Number.MAX_SAFE_INTEGER);
    // maxApplications (audit 2026-10-08 fix — previously schema-only, never
    // read anywhere): "max repeats per order", clamping the condition's own
    // natural repeat count. E.g. a "buy 2 get 1 free/discounted" promotion
    // with maxApplications=2 caps out at 2 applications even if the cart
    // qualifies 5 times over.
    if (promo.maxApplications != null) cap = Math.min(cap, Math.max(1, promo.maxApplications));
    for (const reward of promo.rewards || []) {
      switch (reward.type) {
        case "percent_off_product":
        case "flat_off_product":
        case "discounted_product": {
          // A scoped reward (targetScope: category/subcategory/tag/all) has
          // no single "trigger product" to cap against — by definition it
          // means "every matching unit currently in the cart", so it always
          // uses the real cart quantity, same as discountAllUnits would for
          // a single-product reward. targetVariantSku only makes sense
          // paired with an explicit single targetProductId (validated
          // admin-side), so it's never read for a scoped reward.
          const isScoped = !reward.targetProductId && !!reward.targetScope;
          const targetProductIds = resolveRewardTargetProductIds(reward, ctx);
          // Phase 3 — resolved ONCE per reward (not per product): the tier
          // is determined by the promotion's own condition quantity, the
          // same for every product this reward line touches.
          const effectiveValue = resolveTierValue(reward, promo.conditionTree, ctx);
          for (const productId of targetProductIds) {
            const list = discountCandidatesByProduct.get(productId) || [];
            // discountAllUnits: "buy N, get M% off EVERY qualifying unit" —
            // once the condition is met at all, the cap is the REAL cart
            // quantity of the target (not the condition's repeat count), so
            // e.g. "2+ of X" with 5 in cart discounts all 5, not floor(5/2)=2.
            // Scoped by variant when the reward itself targets one — same
            // identity rule as everywhere else (SKU, not name).
            // Math.min with `cap` here (not a bare full-quantity grant) so an
            // explicit maxApplications still bounds a scoped reward — `cap`
            // already defaults to Number.MAX_SAFE_INTEGER when nothing
            // constrains it (no product leaf, no maxApplications), so this
            // is a no-op in that case and only takes effect when the admin
            // actually set a limit (audit finding, 2026-10-18: previously
            // ignored maxApplications entirely for scoped rewards).
            const rewardCap = isScoped
              ? Math.min(Math.max(1, ctx.qtyByProduct.get(productId) || 0), cap)
              : reward.discountAllUnits
                ? Math.max(1, reward.targetVariantSku
                    ? (ctx.qtyByProductVariant.get(variantKey(productId, reward.targetVariantSku)) || 0)
                    : (ctx.qtyByProduct.get(productId) || 0))
                : cap;
            // ruleId groups sibling reward lines of the SAME promotion so they
            // share one cap instead of each independently getting its own —
            // see createRuleBudgetTracker in rp.payment.controller.js and the
            // matching comment in cartRule.util.js's evaluateCartRules.
            list.push({ type: reward.type, value: effectiveValue, cap: rewardCap, ruleId: String(promo._id), ...(!isScoped && reward.targetVariantSku ? { variantSku: reward.targetVariantSku } : {}), ...(reward.unitWeight > 1 ? { unitWeight: reward.unitWeight } : {}), ...(reward.maxUnits != null ? { maxUnits: reward.maxUnits } : {}), ...(reward.limitWhen?.variantSku ? { limitWhen: { variantSku: reward.limitWhen.variantSku, maxUnits: reward.limitWhen.maxUnits } } : {}) });
            discountCandidatesByProduct.set(productId, list);
          }
          break;
        }
        case "percent_off_order":
        case "flat_off_order":
          orderLevelDiscounts.push({ type: reward.type, value: reward.value, promotionId: String(promo._id) });
          break;
        case "free_product": {
          // Scales with the SAME repeat count (cap) product-level rewards
          // already use — "buy 2 get 1 free" crossed twice (4 qualifying
          // units) grants 2 free units, not a hardcoded 1 regardless of how
          // many times the condition is actually satisfied (audit
          // 2026-10-10, finding A6). maxApplications (already folded into
          // `cap` above) still clamps this the same way it clamps every
          // other reward.
          //
          // Guard: `cap` is Number.MAX_SAFE_INTEGER when the condition tree
          // has no product leaf at all (e.g. a pure cartSubtotal condition)
          // AND maxApplications is unset — that sentinel is safe for
          // product-level rewards because a downstream Math.min(realCartQty,
          // cap) always bounds it, but free_product creates BRAND NEW order
          // items with no existing cart quantity to clamp against. Without
          // this guard, "spend ₹500, get a free gift" would try to grant
          // ~9 quadrillion free units. Falls back to the sensible default
          // (grant it once) whenever nothing actually bounds the repeat
          // count.
          const freeGiftQuantity = cap === Number.MAX_SAFE_INTEGER ? 1 : cap;
          freeGifts.push({ promotionId: String(promo._id), name: promo.name, targetProductId: reward.targetProductId, targetVariantSku: reward.targetVariantSku, quantity: freeGiftQuantity, chooseVariant: reward.chooseVariant === true && !reward.targetVariantSku });
          break;
        }
        case "gift_choice":
          freeGifts.push({ promotionId: String(promo._id), name: promo.name, giftOptions: reward.giftOptions || [] });
          break;
        case "free_shipping":
          freeShipping = true;
          break;
        case "bundle_price":
          bundleRewards.push({ promotionId: String(promo._id), targetProductId: reward.targetProductId, targetVariantSku: reward.targetVariantSku, bundlePrice: reward.bundlePrice });
          break;
        case "cheapest_item_free":
        case "cheapest_item_discount": {
          // Phase 5 — optional targetScope narrows which order lines the
          // "cheapest" search considers (e.g. "cheapest item IN category X
          // free") — reuses the exact same scope-resolution Phase A built
          // for product-level discounts. Absent targetScope = whole order,
          // unchanged from before this field existed.
          const scopeProductIds = reward.targetScope ? resolveRewardTargetProductIds(reward, ctx) : null;
          cheapestItemAdjustments.push({
            promotionId: String(promo._id),
            mode: reward.type === "cheapest_item_free" ? "free" : "discount",
            value: reward.type === "cheapest_item_discount" ? reward.value : undefined,
            scopeProductIds,
          });
          break;
        }
        case "store_credit":
          storeCreditGrants.push({ promotionId: String(promo._id), amount: reward.storeCreditAmount || 0 });
          break;
        default:
          break;
      }
    }
  }

  const resolvedFreeGifts = resolveProductWinners(discountCandidatesByProduct, freeGifts, promoMetaById);

  return { matchedPromotions: matched, discountCandidatesByProduct, orderLevelDiscounts, freeGifts: resolvedFreeGifts, bundleRewards, cheapestItemAdjustments, storeCreditGrants, freeShipping };
};

export const getDiscountCandidatesForItem = (discountCandidatesByProduct, productId, variantSku) => {
  const all = discountCandidatesByProduct.get(String(productId)) || [];
  return all.filter((c) => !c.variantSku || c.variantSku === variantSku);
};
