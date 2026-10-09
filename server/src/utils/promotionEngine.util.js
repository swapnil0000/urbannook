import Promotion from "../model/promotion.model.js";
import PromotionUsage from "../model/promotionUsage.model.js";

/**
 * Promotion Engine V2 — the SINGLE evaluation authority for checkout's real
 * charge (as of 2026-10-08; see rp.payment.controller.js's header comment on
 * the discount-application loop for why the previous dual-path/adapter
 * double-evaluation was retired from the money path). The legacy-shaped
 * adapter (promotionToCartRule.adapter.js) still exists and still reads this
 * exact same `promotions` collection — it is NOT removed, only no longer
 * ALSO evaluated a second time at checkout — and remains the correct path for
 * the legacy-shaped display surfaces (PDP/mini-cart banners) that still
 * expect its flattened shape.
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
// (targetProductId / giftOptions[].productId)? Used by the public
// /promotions/for-product/:productId endpoint to return the PDP-relevant
// subset without evaluating against a real cart — mirrors what
// freeShippingOffer.util.js's getBannerForProduct does for the legacy
// system (a structural "does this apply to this page" filter, not a
// live cart match).
export function promotionReferencesProduct(promotion, productId) {
  const id = String(productId);
  const walk = (node) => {
    if (!node) return false;
    if (node.op) return (node.children || []).some(walk);
    return node.field === "product" && String(node.productId) === id;
  };
  if (walk(promotion.conditionTree)) return true;
  return (promotion.rewards || []).some(
    (r) => String(r.targetProductId) === id || (r.giftOptions || []).some((g) => String(g.productId) === id),
  );
}

const quantityByProduct = (cartItems = []) => {
  const map = new Map();
  for (const item of cartItems) map.set(String(item.productId), (map.get(String(item.productId)) || 0) + (Number(item.quantity) || 0));
  return map;
};
const variantKey = (productId, variantSku) => `${productId}::${variantSku}`;
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

const compareOp = (have, operator, value) => {
  if (operator === "lte") return have <= value;
  if (operator === "eq") return have === value;
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

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const nowIST = () => new Date(Date.now() + IST_OFFSET_MS);

function evaluateLeaf(leaf, ctx) {
  switch (leaf.field) {
    case "product": {
      const have = leaf.variantSku
        ? ctx.qtyByProductVariant.get(variantKey(String(leaf.productId), leaf.variantSku)) || 0
        : ctx.qtyByProduct.get(String(leaf.productId)) || 0;
      return have >= (leaf.minQuantity || 1);
    }
    case "category":
    case "subcategory":
    case "tag":
      return qtyMatchingTaxonomy(ctx, leaf.field, leaf.value) >= (leaf.minQuantity || 1);
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
    return node.op === "OR"
      ? children.some((c) => evaluateConditionTree(c, ctx))
      : children.every((c) => evaluateConditionTree(c, ctx)); // default AND
  }
  return evaluateLeaf(node, ctx);
}

// Same rounding convention as cartRule.util.js's applyBestDiscount — kept as
// an independent copy (not imported) so this file never depends on the
// legacy util. See file header.
export const applyBestPromotionDiscount = (unitPrice, candidates = []) => {
  if (!candidates.length) return unitPrice;
  const price = Number(unitPrice) || 0;
  const results = candidates.map((c) => {
    if (c.type === "percent_off_product") return price * (1 - Number(c.value) / 100);
    if (c.type === "flat_off_product" || c.type === "discounted_product") return price - Number(c.value);
    return price;
  });
  return Math.round(Math.max(Math.min(...results), 0));
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
      return remaining > 0 ? { ...c, cap: Math.min(c.cap, remaining) } : null;
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
    budgets.set(c.ruleId, Math.max(0, budgets.get(c.ruleId) - unitsUsed));
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
export function applicableCap(candidates) {
  return Math.max(1, ...candidates.map((c) => c.cap ?? 1));
}

/**
 * Resolves which matched promotions actually stay active after exclusivity/
 * grouping rules. Full non-stackable per-product conflict resolution is a
 * later phase (see the plan) — this handles the two explicit, order-wide
 * rules that are unambiguous today: `exclusive` and `promotionGroup`.
 *
 * NOT handled here: `stackable` (audit 2026-10-08 Decision Register item —
 * its intended semantics relative to `exclusive`/`promotionGroup` were
 * ambiguous from the schema/code alone: does `stackable:false` mean "acts
 * like exclusive but without winning priority", "suppresses only OTHER
 * stackable:false promotions", or something else? Deliberately left
 * unimplemented rather than guessed — the field still persists on save
 * (admin can toggle it), it simply has no runtime effect yet, same as
 * before this audit. Needs an explicit product decision before wiring.
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
 *   freeGifts: {promotionId:string, name:string, targetProductId?:string, targetVariantSku?:string, giftOptions?:object[]}[],
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
    const childCounts = (node.children || []).map((c) => promotionRepeatCount(c, ctx));
    if (!childCounts.length) return Infinity;
    return node.op === "OR" ? Math.max(...childCounts) : Math.min(...childCounts);
  }
  if (node.field === "product") {
    const have = node.variantSku
      ? ctx.qtyByProductVariant.get(variantKey(String(node.productId), node.variantSku)) || 0
      : ctx.qtyByProduct.get(String(node.productId)) || 0;
    return Math.floor(have / (node.minQuantity || 1));
  }
  return Infinity; // non-product condition doesn't limit the repeat count
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
          const productId = String(reward.targetProductId);
          const list = discountCandidatesByProduct.get(productId) || [];
          // discountAllUnits: "buy N, get M% off EVERY qualifying unit" —
          // once the condition is met at all, the cap is the REAL cart
          // quantity of the target (not the condition's repeat count), so
          // e.g. "2+ of X" with 5 in cart discounts all 5, not floor(5/2)=2.
          // Scoped by variant when the reward itself targets one — same
          // identity rule as everywhere else (SKU, not name).
          const rewardCap = reward.discountAllUnits
            ? Math.max(1, reward.targetVariantSku
                ? (ctx.qtyByProductVariant.get(variantKey(productId, reward.targetVariantSku)) || 0)
                : (ctx.qtyByProduct.get(productId) || 0))
            : cap;
          // ruleId groups sibling reward lines of the SAME promotion so they
          // share one cap instead of each independently getting its own —
          // see createRuleBudgetTracker in rp.payment.controller.js and the
          // matching comment in cartRule.util.js's evaluateCartRules.
          list.push({ type: reward.type, value: reward.value, cap: rewardCap, ruleId: String(promo._id), ...(reward.targetVariantSku ? { variantSku: reward.targetVariantSku } : {}) });
          discountCandidatesByProduct.set(productId, list);
          break;
        }
        case "percent_off_order":
        case "flat_off_order":
          orderLevelDiscounts.push({ type: reward.type, value: reward.value, promotionId: String(promo._id) });
          break;
        case "free_product":
          freeGifts.push({ promotionId: String(promo._id), name: promo.name, targetProductId: reward.targetProductId, targetVariantSku: reward.targetVariantSku });
          break;
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
          cheapestItemAdjustments.push({ promotionId: String(promo._id), mode: "free" });
          break;
        case "cheapest_item_discount":
          cheapestItemAdjustments.push({ promotionId: String(promo._id), mode: "discount", value: reward.value });
          break;
        case "store_credit":
          storeCreditGrants.push({ promotionId: String(promo._id), amount: reward.storeCreditAmount || 0 });
          break;
        default:
          break;
      }
    }
  }

  return { matchedPromotions: matched, discountCandidatesByProduct, orderLevelDiscounts, freeGifts, bundleRewards, cheapestItemAdjustments, storeCreditGrants, freeShipping };
};

export const getDiscountCandidatesForItem = (discountCandidatesByProduct, productId, variantSku) => {
  const all = discountCandidatesByProduct.get(String(productId)) || [];
  return all.filter((c) => !c.variantSku || c.variantSku === variantSku);
};
