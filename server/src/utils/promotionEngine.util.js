import Promotion from "../model/promotion.model.js";

/**
 * Promotion Engine V2 — evaluation engine for the NEW `promotions` collection.
 * Deliberately independent of cartRule.util.js: never imports from it, never
 * mutates its collection, never changes its behavior. Called ADDITIONALLY,
 * alongside the existing getActiveCartRules()/evaluateCartRules() call in
 * rp.payment.controller.js — see the comment there for the merge point.
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
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  }).lean();
};

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
export const buildCartContext = (cartItems, { subtotal, productMeta, customerType, orderCount, deliveryAddress } = {}) => ({
  qtyByProduct: quantityByProduct(cartItems),
  qtyByProductVariant: quantityByProductVariant(cartItems),
  subtotal: Number(subtotal) || 0,
  totalQty: cartItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0),
  productMeta: productMeta || new Map(),
  customerType: customerType || null, // "guest" | "registered"
  orderCount: orderCount != null ? Number(orderCount) : null,
  deliveryAddress: deliveryAddress || null, // { pincode, state, country }
});

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

/**
 * Resolves which matched promotions actually stay active after exclusivity/
 * grouping rules. Full non-stackable per-product conflict resolution is a
 * later phase (see the plan) — this handles the two explicit, order-wide
 * rules that are unambiguous today: `exclusive` and `promotionGroup`.
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

export const evaluatePromotions = (cartItems, ctx, activePromotions) => {
  const matched = resolveStacking(
    activePromotions.filter((p) => evaluateConditionTree(p.conditionTree, ctx)),
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
    const cap = Math.max(1, Number.isFinite(rawCap) ? rawCap : Number.MAX_SAFE_INTEGER);
    for (const reward of promo.rewards || []) {
      switch (reward.type) {
        case "percent_off_product":
        case "flat_off_product":
        case "discounted_product": {
          const productId = String(reward.targetProductId);
          const list = discountCandidatesByProduct.get(productId) || [];
          // ruleId groups sibling reward lines of the SAME promotion so they
          // share one cap instead of each independently getting its own —
          // see createRuleBudgetTracker in rp.payment.controller.js and the
          // matching comment in cartRule.util.js's evaluateCartRules.
          list.push({ type: reward.type, value: reward.value, cap, ruleId: String(promo._id), ...(reward.targetVariantSku ? { variantSku: reward.targetVariantSku } : {}) });
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
