import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ValidationError } from "../utils/errors.js";
import Product from "../model/product.model.js";
import {
  getActivePromotions,
  evaluatePromotions,
  buildCartContext,
  promotionReferencesProduct,
  evaluateConditionTree,
  variantKey,
  quantityForConditionLeaf,
  promotionCouponGateOk,
  applyBestPromotionDiscount,
  getDiscountCandidatesForItem,
} from "../utils/promotionEngine.util.js";
import { buildPromotionDisplayList } from "../services/promotionPresentation.service.js";
import { buildPromotionPricePreview } from "../services/promotionPricePreview.service.js";
import { describeGiftEntitlements } from "../services/giftClaims.service.js";

// Public: every currently active, in-date-range V2 promotion. Previously
// returned the RAW Promotion documents (full conditionTree, rewards,
// linkedCouponCode, maxUsesTotal/maxUsesPerUser, promotionGroup, etc.) to
// any unauthenticated caller — a genuine data leak (audit 2026-10-08,
// Critical Bug #8): a scraper could read out every active coupon code and
// every internal targeting rule. Now routed through the same
// presentation-layer sanitization the Display API already uses, with an
// empty cart context (no items) — only the fields the Universal Renderer
// contract exposes are returned. Still intentionally unauthenticated (admin/
// debug + a future anonymous PDP consumer, per the route file's original
// comment), just no longer leaking internal configuration.
const getActivePromotionsController = asyncHandler(async (_req, res) => {
  const promotions = await getActivePromotions();
  const ctx = buildCartContext([], {});
  const display = buildPromotionDisplayList(promotions, ctx, {});
  return res.status(200).json(new ApiRes(200, "OK", display, true));
});

// Public: the subset of active promotions that reference this product,
// either as a condition or as a reward target — a structural "does this
// apply to this page" filter, not a live cart evaluation (same pattern the
// now-deleted legacy getBannerForProductController used). Sanitized the
// same way as getActivePromotionsController above — see that comment for
// why.
const getPromotionsForProductController = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const all = await getActivePromotions();
  const { ctx } = await resolveItemsAndContext([{ productId, quantity: 1 }], { subtotal: 0 });
  const matching = all.filter((p) => promotionReferencesProduct(p, productId, ctx.productMeta.get(String(productId))));
  const display = buildPromotionDisplayList(matching, ctx, {});
  return res.status(200).json(new ApiRes(200, "OK", display, true));
});

// Shared by evaluatePromotionsController and the display/* endpoints below —
// resolves client items (variant known only by NAME) into engine-ready items
// (variant known by SKU) + the productMeta/subtotal context the condition
// tree needs. Client-supplied `subtotal` is trusted only for DISPLAY
// purposes (closer progress messages, e.g. "add ₹250 more") — checkout
// itself never reads anything from this controller, so there's no payment
//-amount trust boundary being crossed here; the real order total is always
// computed independently in rp.payment.controller.js.
async function resolveItemsAndContext(items, { subtotal, customerType, orderCount, deliveryAddress, couponCode } = {}) {
  if (!Array.isArray(items)) throw new ValidationError("items must be an array of { productId, quantity }");

  const productIds = [...new Set(items.map((i) => String(i.productId)))];
  const products = productIds.length
    ? await Product.find(
        { productId: { $in: productIds } },
        { productId: 1, price: 1, variantDetails: 1, productCategory: 1, productSubCategory: 1, tags: 1 },
      ).lean()
    : [];
  const productById = new Map(products.map((p) => [p.productId, p]));

  const skuByProductAndName = (productId, variantName) =>
    productById.get(String(productId))?.variantDetails?.find((v) => v.variantName === variantName)?.sku || "";

  const resolvedItems = items.map((item) => ({
    ...item,
    variantSku: item.selectedVariant ? skuByProductAndName(item.productId, item.selectedVariant) : "",
  }));

  const productMeta = new Map(
    products.map((p) => [p.productId, { category: p.productCategory, subcategory: p.productSubCategory, tags: p.tags || [] }]),
  );

  const ctx = buildCartContext(resolvedItems, {
    subtotal: Number(subtotal) || 0,
    productMeta,
    customerType,
    orderCount,
    deliveryAddress,
    // Optional — a coupon-linked promotion only previews as matched when the
    // caller tells us a coupon is actually applied (see
    // promotionCouponGateOk in promotionEngine.util.js). Not yet sent by
    // every client surface; omitted = that promotion simply won't show here,
    // same as any other display caller not yet supplying context it needs.
    appliedCouponCode: couponCode,
  });
  return { resolvedItems, ctx, productById };
}

// Public: evaluates the posted cart against every active V2 promotion:
// { items: [{productId, quantity, selectedVariant}] } — client only ever
// knows a variant by its NAME, this is the one place that resolves
// name -> sku (via a Product lookup) before calling into
// promotionEngine.util.js.
const evaluatePromotionsController = asyncHandler(async (req, res) => {
  const { items, couponCode } = req.body;
  // subtotal: 0 (display-only evaluation — the real subtotal is checkout's
  // job; conditions needing it just won't match here, "optimistic,
  // re-validated at order-creation" — same convention every display
  // surface in this file already uses).
  const { resolvedItems, ctx } = await resolveItemsAndContext(items, { subtotal: 0, couponCode });

  const activePromotions = await getActivePromotions();
  const result = evaluatePromotions(resolvedItems, ctx, activePromotions);

  // Map not JSON-serializable — flatten discountCandidatesByProduct to a
  // plain object.
  return res.status(200).json(
    new ApiRes(
      200,
      "OK",
      {
        // id+name only — NOT the raw matched Promotion documents (no
        // conditionTree/rewards/linkedCouponCode/usage caps). See the leak
        // fix comment on getActivePromotionsController above; this endpoint
        // had the same issue for whichever promotions happened to match.
        matchedPromotions: result.matchedPromotions.map((p) => ({ id: String(p._id), name: p.name })),
        discounts: Object.fromEntries(result.discountCandidatesByProduct.entries()),
        orderLevelDiscounts: result.orderLevelDiscounts,
        freeGifts: result.freeGifts,
        bundleRewards: result.bundleRewards,
        cheapestItemAdjustments: result.cheapestItemAdjustments,
        storeCreditGrants: result.storeCreditGrants,
        freeShipping: result.freeShipping,
      },
      true,
    ),
  );
});

// ── Display API (Phase 3) — fully display-ready. Frontend renders only;
// never interprets conditionTree/rewards/promotionType. Every promotion
// returned has already been through promotionPresentation.service.js. ────

// A promotion is relevant to the CURRENT cart if either: its conditionTree
// mentions a product actually in the cart (or a reward targets one), or it
// has no product-specific condition at all (pure cart/order-wide rule, e.g.
// "spend ₹2000+" or "guest checkout only") — those apply regardless of
// which products are in the cart. Prevents showing a completely unrelated
// product-specific promotion (e.g. a different item's buy-get-free) in the
// cart/checkout display list.
function hasProductCondition(node) {
  if (!node) return false;
  if (node.op) return (node.children || []).some(hasProductCondition);
  return node.field === "product" || node.field === "productList";
}
// Deliberately CONDITION-only (unlike promotionReferencesProduct, which also
// matches reward targets — right for "does this promotion mention this
// product at all" on the PDP, wrong here: a cart containing only the FREE
// GIFT product shouldn't surface a promo whose actual trigger product isn't
// in the cart).
function conditionReferencesProduct(node, productId) {
  if (!node) return false;
  if (node.op) return (node.children || []).some((c) => conditionReferencesProduct(c, productId));
  if (node.field === "product") return String(node.productId) === String(productId);
  if (node.field === "productList") return (node.items || []).some((it) => String(it.productId) === String(productId));
  return false;
}
function isPromotionRelevantToCart(promotion, cartProductIds) {
  if (hasProductCondition(promotion.conditionTree)) {
    return cartProductIds.some((id) => conditionReferencesProduct(promotion.conditionTree, id));
  }
  return true;
}

function appliedPromotionIdsFromResult(result) {
  const winningDiscountIds = new Set(
    [...result.discountCandidatesByProduct.values()].flatMap((candidates) => candidates.map((candidate) => candidate.ruleId)),
  );
  return new Set(result.matchedPromotions
    .filter((promotion) => {
      const rewards = promotion.rewards || [];
      return !rewards.length || rewards.some((reward) => !["percent_off_product", "flat_off_product", "discounted_product"].includes(reward.type))
        || winningDiscountIds.has(String(promotion._id));
    })
    .map((promotion) => String(promotion._id)));
}

// ── "Add N more to unlock" recommendations (2026-10) ───────────────────────
// Powers the storefront's unlock bottom sheet: for a promotion that's close
// but not yet qualifying, resolve the SAME unmet leaf buildProgressText (in
// promotionPresentation.service.js) already found into real, in-stock
// catalog products the customer could add. Generic over product/category/
// subcategory/tag leaves — never hardcodes a specific offer/product. Kept in
// this controller (not the presentation service) because it needs DB reads;
// the presentation service is deliberately pure JSON-shaping with no I/O.

// Mirrors buildProgressText's own AND/OR walk (promotionPresentation.service.js)
// but returns the unmet LEAF itself instead of pre-rendered text, and only
// for leaf types that actually name products (product/category/subcategory/
// tag) — any other unmet leaf (cartSubtotal, geo, schedule, etc.) has no
// "which products" answer, so recommendations stay empty for those, same as
// progressText already does for its own "no safe guess" cases.
function findFirstUnmetProductLeaf(node, ctx) {
  if (!node) return null;
  if (node.op) {
    const children = node.children || [];
    // A NOT'd subtree has no sensible "add this product" recommendation —
    // the fix for an unmet NOT (the negated condition is currently TRUE) is
    // to have LESS of something, which this "add N more to unlock" surface
    // can never suggest. Treat the whole subtree as having no recommendable
    // leaf, same as any other non-product leaf type.
    if (node.op === "NOT") return null;
    if (node.op === "OR") {
      const metBranch = children.find((c) => evaluateConditionTree(c, ctx));
      if (metBranch) return null; // already qualifies via this branch
      return findFirstUnmetProductLeaf(children[0], ctx);
    }
    for (const child of children) {
      if (!evaluateConditionTree(child, ctx)) return findFirstUnmetProductLeaf(child, ctx);
    }
    return null;
  }
  if (evaluateConditionTree(node, ctx)) return null;
  return ["product", "category", "subcategory", "tag", "productList"].includes(node.field) ? node : null;
}

function findUnmetProductLeaves(node, ctx) {
  if (!node || evaluateConditionTree(node, ctx)) return [];
  if (!node.op) return ["product", "productList", "category", "subcategory", "tag"].includes(node.field) ? [node] : [];
  // Same reasoning as findFirstUnmetProductLeaf — a NOT's unmet leaf isn't
  // addable, so it contributes nothing here.
  if (node.op === "NOT") return [];
  return (node.children || []).flatMap((child) => findUnmetProductLeaves(child, ctx));
}

function unmetLeaves(node, ctx) {
  if (!node || evaluateConditionTree(node, ctx)) return [];
  if (!node.op) return [node];
  if (node.op === "NOT") return [];
  return (node.children || []).flatMap((child) => unmetLeaves(child, ctx));
}

function needsUnavailableCartContext(node) {
  if (!node) return false;
  if (node.op) return (node.children || []).some(needsUnavailableCartContext);
  return ["customerType", "orderCount", "pincode", "state", "country"].includes(node.field);
}

function didAddedItemAdvancePromotion(promotion, beforeCtx, afterCtx) {
  if (!beforeCtx || needsUnavailableCartContext(promotion.conditionTree)) return false;
  const beforeMet = evaluateConditionTree(promotion.conditionTree, beforeCtx);
  const afterMet = evaluateConditionTree(promotion.conditionTree, afterCtx);
  if (beforeMet) return false;
  if (afterMet) return true;
  return unmetLeaves(promotion.conditionTree, beforeCtx).some((leaf) => {
    if (!["gte", "eq", "between"].includes(leaf.operator || "gte")) return false;
    const before = quantityForConditionLeaf(leaf, beforeCtx)
      ?? (leaf.field === "cartSubtotal" ? beforeCtx.subtotal : leaf.field === "cartQuantity" ? beforeCtx.totalQty : null);
    const after = quantityForConditionLeaf(leaf, afterCtx)
      ?? (leaf.field === "cartSubtotal" ? afterCtx.subtotal : leaf.field === "cartQuantity" ? afterCtx.totalQty : null);
    const threshold = Number(["cartSubtotal", "cartQuantity"].includes(leaf.field) ? leaf.value : leaf.minQuantity ?? 1);
    return before != null && after != null && before < threshold && after > before;
  });
}

function contextBeforeAdd(resolvedItems, ctx, addedItem) {
  if (!addedItem?.productId || !Number.isFinite(Number(addedItem.quantity)) || Number(addedItem.quantity) <= 0) return null;
  const productId = String(addedItem.productId);
  const selectedVariant = addedItem.selectedVariant && addedItem.selectedVariant !== "N/A" ? addedItem.selectedVariant : "";
  const index = resolvedItems.findIndex((item) => String(item.productId) === productId && (item.selectedVariant || "") === selectedVariant);
  if (index < 0 || Number(resolvedItems[index].quantity) < Number(addedItem.quantity)) return null;
  const before = resolvedItems.map((item, i) => i === index
    ? { ...item, quantity: Number(item.quantity) - Number(addedItem.quantity) }
    : item).filter((item) => Number(item.quantity) > 0);
  return buildCartContext(before, {
    subtotal: Number(addedItem.previousSubtotal) || 0,
    productMeta: ctx.productMeta,
    appliedCouponCode: ctx.appliedCouponCode,
  });
}

function cardAdvancesLeaf(card, leaf, ctx) {
  const before = quantityForConditionLeaf(leaf, ctx);
  if (before == null || !["gte", "eq", "between"].includes(leaf.operator || "gte")) return false;
  const next = {
    ...ctx,
    qtyByProduct: new Map(ctx.qtyByProduct),
    qtyByProductVariant: new Map(ctx.qtyByProductVariant),
  };
  next.qtyByProduct.set(card.productId, (next.qtyByProduct.get(card.productId) || 0) + 1);
  if (card.sku) {
    const key = variantKey(card.productId, card.sku);
    next.qtyByProductVariant.set(key, (next.qtyByProductVariant.get(key) || 0) + 1);
  }
  const after = quantityForConditionLeaf(leaf, next);
  return before < Number(leaf.minQuantity ?? 1) && after > before;
}

// Shapes one Product doc (+ optionally a specific variant) into the small,
// storefront-ready card shape the bottom sheet needs — never the raw
// product/variant document.
function toRecommendationCard(product, variant) {
  const v = variant || product.variantDetails?.find((candidate) =>
    candidate.variantOutOfStock !== true && (candidate.variantQuantity == null || Number(candidate.variantQuantity) > 0));
  if (!v) return null;
  const outOfStock = v.variantOutOfStock === true || (v.variantQuantity != null && Number(v.variantQuantity) <= 0);
  if (outOfStock) return null;
  return {
    productId: product.productId,
    productName: product.productName,
    variantName: v.variantName || null,
    sku: v.sku || null,
    price: v.variantPrice != null ? Number(v.variantPrice) : null,
    mrp: v.variantMrp != null ? Number(v.variantMrp) : null,
    image: v.variantImage?.[0] || product.productImg || null,
  };
}

function cardsForTarget(product, variantSku) {
  const variants = variantSku
    ? product.variantDetails?.filter((variant) => variant.sku === variantSku) || []
    : product.variantDetails || [];
  return variants.map((variant) => toRecommendationCard(product, variant)).filter(Boolean);
}

function benefitForReward(reward) {
  if (reward.type === "percent_off_product") return `${reward.value}% off`;
  if (["flat_off_product", "discounted_product"].includes(reward.type)) return `₹${Number(reward.value).toLocaleString("en-IN")} off`;
  return null;
}

function cardWithRewardPrice(card, reward) {
  const offerPrice = applyBestPromotionDiscount(card.price, [reward]);
  return {
    ...card,
    benefitText: benefitForReward(reward),
    ...(Number.isFinite(offerPrice) && offerPrice < card.price ? { offerPrice } : {}),
  };
}

function rewardTargetIsInCart(reward, ctx) {
  const productId = String(reward.targetProductId);
  return reward.targetVariantSku
    ? (ctx.qtyByProductVariant.get(variantKey(productId, reward.targetVariantSku)) || 0) > 0
    : (ctx.qtyByProduct.get(productId) || 0) > 0;
}

// A matched condition can still need the customer to add the product that
// receives the discount. Return only explicit admin-selected reward targets;
// broad category/all scopes have no finite set to offer in the sheet.
async function resolveMissingRewardTargets(promotion, ctx) {
  const discountRewards = (promotion.rewards || [])
    .filter((reward) => ["percent_off_product", "flat_off_product", "discounted_product"].includes(reward.type));
  const targets = discountRewards
    .flatMap((reward) => reward.targetProductId
      ? [{ productId: reward.targetProductId, variantSku: reward.targetVariantSku || "", reward }]
      : reward.targetScope?.field === "productList" ? (reward.targetScope.items || []).map((item) => ({ ...item, reward })) : [])
    .filter((target) => !rewardTargetIsInCart(target, ctx));
  const products = targets.length ? await Product.find(
    { productId: { $in: [...new Set(targets.map((target) => String(target.productId)))] }, productStatus: "in_stock", isPublished: { $ne: false } },
    PRODUCT_RECOMMENDATION_PROJECTION,
  ).lean() : [];
  const byId = new Map(products.map((product) => [String(product.productId), product]));
  const explicitCards = targets.flatMap((target) => {
    const product = byId.get(String(target.productId));
    if (!product) return [];
    return cardsForTarget(product, target.variantSku).map((card) => cardWithRewardPrice(card, target.reward));
  });
  const scopedCards = (await Promise.all(discountRewards
    .filter((reward) => ["category", "subcategory", "tag"].includes(reward.targetScope?.field))
    .map(async (reward) => {
      const scope = reward.targetScope;
      const query = { productStatus: "in_stock", isPublished: { $ne: false } };
      if (scope.field === "category") query.productCategory = scope.value;
      else if (scope.field === "subcategory") query.productSubCategory = scope.value;
      else query.tags = scope.value;
      const matches = await Product.find(query, PRODUCT_RECOMMENDATION_PROJECTION).limit(12).lean();
      return matches.flatMap((product) => cardsForTarget(product).map((card) => cardWithRewardPrice(card, reward)));
    }))).flat();
  return [...explicitCards, ...scopedCards]
    .filter((card, index, cards) => cards.findIndex((other) => other.productId === card.productId && other.sku === card.sku) === index)
    .slice(0, 6);
}

const PRODUCT_RECOMMENDATION_PROJECTION = "productId productName productImg productStatus variantDetails";

// Resolves a single unmet leaf into up to `limit` real, in-stock, purchasable
// recommendation cards — a "product" leaf resolves to that exact
// product/variant; category/subcategory/tag leaves resolve to a handful of
// real catalog matches (generic DB query, never a hardcoded list).
async function resolveRecommendationsForLeaf(leaf, { limit = 20 } = {}) {
  if (!leaf) return [];
  if (leaf.field === "product") {
    const product = await Product.findOne(
      { productId: leaf.productId, productStatus: "in_stock", isPublished: { $ne: false } },
      PRODUCT_RECOMMENDATION_PROJECTION,
    ).lean();
    if (!product) return [];
    return cardsForTarget(product, leaf.variantSku).slice(0, limit);
  }
  // An admin-picked list of specific products/variants — resolve each entry
  // directly (no catalog query beyond fetching exactly these productIds),
  // in the admin's own configured order.
  if (leaf.field === "productList") {
    const items = leaf.items || [];
    const productIds = [...new Set(items.map((it) => String(it.productId)))];
    if (!productIds.length) return [];
    const products = await Product.find(
      { productId: { $in: productIds }, productStatus: "in_stock", isPublished: { $ne: false } },
      PRODUCT_RECOMMENDATION_PROJECTION,
    ).lean();
    const byId = new Map(products.map((p) => [p.productId, p]));
    const cards = [];
    for (const it of items) {
      const product = byId.get(String(it.productId));
      if (!product) continue;
      cards.push(...cardsForTarget(product, it.variantSku));
    }
    return cards.slice(0, limit);
  }
  if (!["category", "subcategory", "tag"].includes(leaf.field)) return [];
  const query = { productStatus: "in_stock", isPublished: { $ne: false } };
  if (leaf.field === "category") query.productCategory = leaf.value;
  else if (leaf.field === "subcategory") query.productSubCategory = leaf.value;
  else query.tags = leaf.value;
  const products = await Product.find(query, PRODUCT_RECOMMENDATION_PROJECTION).limit(limit * 2).lean();
  const cards = products.map((p) => toRecommendationCard(p)).filter(Boolean);
  return cards.slice(0, limit);
}

// Resolves the promotion's own reward target(s) into the same card shape —
// so the sheet can show "unlock THIS" distinctly from "add THESE to
// qualify". Only reward types with an explicit single targetProductId are
// resolvable this way; a category-wide scoped reward applies to whatever's
// already in cart (nothing new to picture) and gift_choice has several
// options (shown via its own existing savingsText/badge, not a single card).
async function resolveRewardCard(promotion) {
  const reward = (promotion.rewards || []).find((r) => r.targetProductId);
  if (!reward) return null;
  const product = await Product.findOne(
    { productId: reward.targetProductId, productStatus: "in_stock", isPublished: { $ne: false } },
    PRODUCT_RECOMMENDATION_PROJECTION,
  ).lean();
  if (!product) return null;
  const variant = reward.targetVariantSku ? product.variantDetails?.find((v) => v.sku === reward.targetVariantSku) : null;
  if (reward.targetVariantSku && !variant) return null;
  const card = toRecommendationCard(product, variant);
  if (!card) return null;
  return { ...cardWithRewardPrice(card, reward), rewardType: reward.type, rewardValue: reward.value ?? null };
}

// Mutates `display` in place, attaching `recommendedProducts`/`rewardProduct`
// to every entry that's actionable (not yet qualifying, but close enough
// that progressText already names a concrete next step) — skips everything
// else so an already-qualifying or structurally-unreachable promotion never
// pays for extra product lookups.
async function attachRecommendations(display, promotionsById, ctx) {
  await Promise.all(
    display.map(async (entry) => {
      if (entry.qualifying || !entry.progressText || !entry.fullyFunctional) {
        entry.recommendedProducts = [];
        entry.rewardProduct = null;
        if (entry.rewardTargetPending && entry.fullyFunctional) {
          const promotion = promotionsById.get(entry.id);
          if (promotion) {
            entry.recommendedProducts = await resolveMissingRewardTargets(promotion, ctx);
          }
        }
        return;
      }
      const promotion = promotionsById.get(entry.id);
      if (!promotion) { entry.recommendedProducts = []; entry.rewardProduct = null; return; }
      if (!promotionCouponGateOk(promotion, ctx) || needsUnavailableCartContext(promotion.conditionTree)) {
        entry.recommendedProducts = [];
        entry.rewardProduct = null;
        return;
      }
      const leaves = findUnmetProductLeaves(promotion.conditionTree, ctx);
      const [cardsByLeaf, rewardProduct] = await Promise.all([
        Promise.all(leaves.map((leaf) => resolveRecommendationsForLeaf(leaf))),
        resolveRewardCard(promotion),
      ]);
      entry.recommendedProducts = cardsByLeaf.flatMap((cards, index) =>
        cards.filter((card) => cardAdvancesLeaf(card, leaves[index], ctx)))
        .filter((card, index, cards) => cards.findIndex((other) => other.productId === card.productId && other.sku === card.sku) === index)
        .slice(0, 20);
      if (leaves.length > 1 && entry.recommendedProducts.length) entry.progressText = "Add eligible products to move closer to this offer.";
      entry.rewardProduct = rewardProduct;
    }),
  );
  return display;
}

// GET /promotions/display/product/:id — PDP. Structural filter (like
// getPromotionsForProductController) + "pdp" placement gate, run through the
// presentation layer against a 1-item hypothetical cart (qty 1) so
// progressText/qualifying reflect "if you add just this product".
const getProductDisplayController = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const all = await getActivePromotions();
  const { ctx } = await resolveItemsAndContext([{ productId, quantity: 1 }], { subtotal: 0 });
  const relevant = all.filter(
    (p) => promotionReferencesProduct(p, productId, ctx.productMeta.get(String(productId))) && (p.placements || []).includes("pdp"),
  );
  const display = buildPromotionDisplayList(relevant, ctx, { placement: "pdp" });
  return res.status(200).json(new ApiRes(200, "OK", { promotions: display }, true));
});

// POST /promotions/display/cart — Cart/Mini-cart. Body: { items, placement?
// } where placement is "cart" (default) or "mini_cart" — same data, just a
// different placements-field gate, since admin can choose to show a
// promotion in one but not the other.
// Entitlements + display info for the claim card / cart line. The customer-facing name and image are the
// admin's own reward label and image (never the real product when the admin left the image blank, so a
// "Mystery Gift" stays a mystery); the real product id / SKU / list price travel separately for the cart line.
async function buildGiftPayload(freeGifts, requestedClaims, allPromotions) {
  const { entitlements, invalidClaims } = describeGiftEntitlements(freeGifts, requestedClaims);
  const productIds = [...new Set(entitlements.map((e) => e.targetProductId))];
  const products = productIds.length ? await Product.find({ productId: { $in: productIds } }, { productId: 1, productName: 1, variantDetails: 1 }).lean() : [];
  const promoById = new Map(allPromotions.map((p) => [String(p._id), p]));
  const strip = (t) => String(t || "").replace(/\s*[—-]\s*FREE\s*$/i, "").trim();
  return {
    entitlements: entitlements.map((e) => {
      const promo = promoById.get(e.promotionId);
      const reward = (promo?.rewards || []).find((r) => r.type === "free_product" && String(r.targetProductId) === String(e.targetProductId)) || {};
      const pr = products.find((p) => p.productId === e.targetProductId);
      const v = pr?.variantDetails?.find((x) => x.sku === e.targetVariantSku) || pr?.variantDetails?.[0];
      return {
        key: e.key,
        promotionId: e.promotionId,
        promotionName: promo?.name || e.name || "",
        name: strip(reward.label) || pr?.productName || "Free gift",
        image: reward.image || null,
        productId: e.targetProductId,
        variantSku: e.targetVariantSku,
        variantName: v?.variantName || null,
        originalPrice: Number(v?.variantPrice) || 0,
        quantity: e.quantity,
        claimedQuantity: e.claimedQuantity,
        status: e.status,
        // false when the gift variant is out of stock / too few left: the UI shows it as unavailable
        available: !!v && !(v.variantOutOfStock === true || v.isActive === false || (v.variantQuantity != null && Number(v.variantQuantity) < e.quantity)),
      };
    }),
    invalidClaims: invalidClaims.map((c) => ({ ...c, promotionName: promoById.get(c.promotionId)?.name || "" })),
  };
}

const getCartDisplayController = asyncHandler(async (req, res) => {
  const { items, placement = "cart", couponCode, addedItem } = req.body;
  // Home offer cards open the unlock sheet for specific promotions before
  // anything is in the cart; those promotions are included here even though no
  // product of theirs is in the (possibly empty) cart yet.
  const previewIds = new Set((Array.isArray(req.body.previewPromotionIds) ? req.body.previewPromotionIds : []).slice(0, 8).map(String));
  if (!["cart", "mini_cart"].includes(placement)) throw new ValidationError('placement must be "cart" or "mini_cart"');
  const cartItems = Array.isArray(items) ? items : [];
  const subtotal = Number(req.body.subtotal) || 0;

  const all = (await getActivePromotions()).filter((p) => p.maxUsesTotal == null || p.usageCount < p.maxUsesTotal);
  const cartProductIds = [...new Set(cartItems.map((i) => String(i.productId)))];
  const relevant = all.filter((p) => (p.placements || []).includes(placement)
    && (previewIds.has(String(p._id)) || isPromotionRelevantToCart(p, cartProductIds)));

  const { resolvedItems, ctx, productById } = await resolveItemsAndContext(cartItems, { subtotal, couponCode });
  const beforeCtx = contextBeforeAdd(resolvedItems, ctx, addedItem);
  const matchedResult = evaluatePromotions(resolvedItems, ctx, all);
  const pricing = buildPromotionPricePreview(resolvedItems, productById, matchedResult);
  const appliedPromotionIds = appliedPromotionIdsFromResult(matchedResult);

  const display = buildPromotionDisplayList(relevant, ctx, { placement, appliedPromotionIds });
  for (const entry of display) {
    const promotion = relevant.find((p) => String(p._id) === entry.id);
    entry.actionableForAdd = previewIds.has(entry.id) || Boolean(promotion && didAddedItemAdvancePromotion(promotion, beforeCtx, ctx));
  }
  // Recommendations power the "add more to unlock" bottom sheet — only
  // meaningful for the cart surface (checkout display stays text-only; by
  // then the customer is mid-payment-flow, not browsing to add products).
  const promotionsById = new Map(relevant.map((p) => [String(p._id), p]));
  await attachRecommendations(display, promotionsById, ctx);
  // "2 of 3 Katanas" — the noun for promotions whose progress is shown on its own
  // (the Phuljadi asks for them by id); one small lookup, only for those.
  const nounIds = display.filter((e) => previewIds.has(e.id) && e.progress && e.progress.mode !== "amount").map((e) => e.id);
  if (nounIds.length) {
    const productIds = new Set();
    nounIds.forEach((id) => conditionProductIds(promotionsById.get(id), true).forEach((pid) => productIds.add(pid)));
    const named = productIds.size ? await Product.find({ productId: { $in: [...productIds] } }, { productId: 1, productName: 1 }).lean() : [];
    const nameOf = new Map(named.map((p) => [p.productId, p.productName]));
    for (const e of display.filter((x) => nounIds.includes(x.id))) {
      // "Anime Kunai Collection" -> "Kunai", "Anime Wooden Katana" -> "Katana"
      const GENERIC = new Set(["collection", "set", "pack", "combo", "series", "kit", "range"]);
      const nounOf = (name) => {
        const words = String(name || "").trim().split(/\s+/).filter(Boolean);
        while (words.length > 1 && GENERIC.has(words[words.length - 1].toLowerCase())) words.pop();
        return words.pop() || "";
      };
      const lastWords = [...new Set(conditionProductIds(promotionsById.get(e.id), true).map((pid) => nounOf(nameOf.get(pid))).filter(Boolean))];
      e.progress.noun = lastWords.length === 1 ? lastWords[0] : "item";
    }
  }
  // Free gifts are CLAIMED by the customer, never auto-added: these are the entitlements the cart is
  // eligible for right now (after the admin's priority / exclusivity / group rules), which of them the
  // customer has claimed, and any earlier claim that is no longer valid (so the UI can tell them).
  const gifts = await buildGiftPayload(matchedResult.freeGifts, req.body.claimedGifts, all);
  return res.status(200).json(new ApiRes(200, "OK", { promotions: display, pricing, gifts: gifts.entitlements, invalidGiftClaims: gifts.invalidClaims }, true));
});

// POST /promotions/display/checkout — Checkout. Same as cart display but
// also accepts delivery/customer context so pincode/state/customerType/
// orderCount conditions can be evaluated for real (PDP/cart display never
// know this yet) — still display-only, never affects the actual charge
// (that stays rp.payment.controller.js's job, independently computed).
const getCheckoutDisplayController = asyncHandler(async (req, res) => {
  const { items, customerType, orderCount, deliveryAddress, couponCode } = req.body;
  const cartItems = Array.isArray(items) ? items : [];
  const subtotal = Number(req.body.subtotal) || 0;

  const all = await getActivePromotions();
  const cartProductIds = [...new Set(cartItems.map((i) => String(i.productId)))];
  const relevant = all.filter((p) => (p.placements || []).includes("checkout") && isPromotionRelevantToCart(p, cartProductIds));

  const { resolvedItems, ctx, productById } = await resolveItemsAndContext(cartItems, { subtotal, customerType, orderCount, deliveryAddress, couponCode });
  const matchedResult = evaluatePromotions(resolvedItems, ctx, all);
  const pricing = buildPromotionPricePreview(resolvedItems, productById, matchedResult);
  const appliedPromotionIds = appliedPromotionIdsFromResult(matchedResult);

  const display = buildPromotionDisplayList(relevant, ctx, { placement: "checkout", appliedPromotionIds });
  return res.status(200).json(new ApiRes(200, "OK", { promotions: display, pricing }, true));
});

// Which exact productIds a conditionTree names via "product" leaves —
// recursive over AND/OR groups, ignores every other leaf shape (category/
// cartSubtotal/etc. have no single product to extract). Used only to find
// the 2-product "buy A+B together" shape for the homepage combo card; has
// no bearing on real evaluation (evaluateConditionTree, unchanged).
function collectConditionProductIds(node) {
  const ids = new Set();
  const walk = (n) => {
    if (!n) return;
    if (n.op) { (n.children || []).forEach(walk); return; }
    if (n.field === "product" && n.productId) ids.add(String(n.productId));
  };
  walk(node);
  return [...ids];
}

// productId -> Set of variant SKUs a "product" leaf pins (empty = any variant).
function collectConditionSkus(node) {
  const map = new Map();
  const walk = (n) => {
    if (!n) return;
    if (n.op) { (n.children || []).forEach(walk); return; }
    if (n.field === "product" && n.productId) {
      const id = String(n.productId);
      if (!map.has(id)) map.set(id, new Set());
      if (n.variantSku) map.get(id).add(n.variantSku);
    }
  };
  walk(node);
  return map;
}

// ── Combo builder (home offer cards → "build your combo" sheet) ─────────────
// Turns the promotions behind a home card into slots the shopper fills with
// real variants. Everything comes from the admin-configured conditionTree and
// rewards; nothing is typed here. Prices shown by the sheet come from the cart
// pricing endpoint (the engine), these cards only carry catalog price / MRP.
const BUILDER_PRODUCT_PROJECTION = { productId: 1, productName: 1, productImg: 1, variantDetails: 1, productCategory: 1, productSubCategory: 1, tags: 1 };

function builderVariantCard(product, v) {
  const outOfStock = v.variantOutOfStock === true || v.isActive === false
    || (v.variantQuantity != null && Number(v.variantQuantity) <= 0);
  return {
    productId: product.productId,
    productName: product.productName,
    variantName: v.variantName || null,
    sku: v.sku || null,
    price: v.variantPrice != null ? Number(v.variantPrice) : null,
    mrp: v.variantMrp != null ? Number(v.variantMrp) : null,
    image: v.variantImage?.[0] || product.productImg || null,
    outOfStock,
  };
}

// Slots a promotion's condition asks for. "N of a product list" → N slots that
// each accept any listed product; plain product leaves → N slots of that
// product. NOT subtrees only exclude things, so they add no slot.
function slotsFromCondition(tree) {
  const leaves = [];
  const lists = [];
  const walk = (n) => {
    if (!n || n.op === "NOT") return;
    if (n.op) { (n.op === "OR" ? (n.children || []).slice(0, 1) : n.children || []).forEach(walk); return; }
    if (n.field === "product" && n.productId) leaves.push({ id: String(n.productId), n: Math.max(1, Number(n.minQuantity) || 1) });
    if (n.field === "productList") lists.push({ ids: [...new Set((n.items || []).map((i) => String(i.productId)))], n: Math.max(1, Number(n.minQuantity) || 1) });
  };
  walk(tree);
  let slots = [];
  if (lists.length) slots = Array.from({ length: lists[0].n }, () => ({ productIds: lists[0].ids }));
  else leaves.forEach((l) => { for (let i = 0; i < l.n; i += 1) slots.push({ productIds: [l.id] }); });
  return slots.slice(0, 6);
}

function conditionProductIds(promo, conditionOnly = false) {
  const ids = new Set();
  const walk = (n) => {
    if (!n || n.op === "NOT") return;
    if (n.op) { (n.children || []).forEach(walk); return; }
    if (n.field === "product" && n.productId) ids.add(String(n.productId));
    if (n.field === "productList") (n.items || []).forEach((i) => ids.add(String(i.productId)));
  };
  walk(promo.conditionTree);
  if (!conditionOnly) (promo.rewards || []).forEach((r) => r.targetProductId && ids.add(String(r.targetProductId)));
  return [...ids];
}

// Live promotions that grant the same reward as `promo` (the wooden / LED /
// mixed variants of one ladder step), the card's own promotion first.
function relatedPromotionsFor(promo, all) {
  const rw = (promo.rewards || []).find((r) => r.targetProductId);
  // only a free-product ladder step has sibling combinations; discounts never borrow other offers
  if (!rw || rw.type !== "free_product") return [promo];
  const same = all.filter((p) => String(p._id) !== String(promo._id) && (p.placements || []).includes("cart")
    && (p.rewards || []).some((r) => r.targetProductId === rw.targetProductId && (r.targetVariantSku || "") === (rw.targetVariantSku || "")));
  return [promo, ...same];
}

function buildComboBuilder(promos, productMap, shortNameOf, hiddenRewardLabel) {
  const used = new Set();
  const combos = [];
  for (const promo of promos) {
    const slots = slotsFromCondition(promo.conditionTree);
    if (!slots.length) continue;
    const signature = slots.map((s) => [...s.productIds].sort().join("|")).join(",");
    if (used.has(signature)) continue;
    used.add(signature);
    const pinned = collectConditionSkus(promo.conditionTree);
    const slotOut = slots.map((slot) => ({
      options: slot.productIds.map((id) => ({
        productId: id,
        label: shortNameOf(id),
        cards: (productMap.get(id)?.variantDetails || [])
          .filter((v) => !pinned.get(id)?.size || pinned.get(id).has(v.sku))
          .map((v) => builderVariantCard(productMap.get(id), v)),
      })).filter((o) => o.cards.length),
    }));
    if (slotOut.some((s) => !s.options.length)) continue;

    const distinct = [...new Set(slots.flatMap((s) => s.productIds))];
    const allSingle = slots.every((s) => s.productIds.length === 1);
    let label;
    if (!allSingle) label = `Any ${slots.length}`;
    else if (distinct.length === 1) label = slots.length > 1 ? `${slots.length} × ${shortNameOf(distinct[0])}` : shortNameOf(distinct[0]);
    else label = slots.map((s) => shortNameOf(s.productIds[0])).join(" + ");

    const rw = (promo.rewards || [])[0] || {};
    const tp = rw.targetProductId ? productMap.get(String(rw.targetProductId)) : null;
    const tv = tp?.variantDetails?.find((v) => v.sku === rw.targetVariantSku) || tp?.variantDetails?.[0];
    const tImage = tv?.variantImage?.[0] || tp?.productImg || null;
    const strip = (t) => String(t || "").replace(/\s*[—-]\s*FREE\s*$/i, "").trim();
    // What the customer unlocks, straight from the promotion's own reward:
    // `badge` is the real badge text ("FREE", "₹79 OFF", "5% OFF"), `image` the reward product.
    let reward;
    if (rw.type === "free_product" && rw.targetProductId) {
      reward = hiddenRewardLabel
        ? { kind: "free", name: "Mystery Gift", worth: hiddenRewardLabel, image: null, badge: "FREE" }
        : { kind: "free", name: strip(rw.label) || tp?.productName || "Free gift", worth: tv?.variantPrice != null ? Number(tv.variantPrice) : null, image: tImage, badge: "FREE" };
    } else if (rw.type === "free_shipping") {
      reward = { kind: "shipping", name: rw.label || "Free shipping", worth: null, image: null, badge: "FREE" };
    } else if (rw.type === "cheapest_item_free") {
      reward = { kind: "cheapest", name: strip(rw.label) || "Lowest-priced item", worth: null, image: null, badge: "FREE" };
    } else if (["percent_off_product", "percent_off_order"].includes(rw.type)) {
      reward = { kind: "discount", name: strip(rw.label) || tp?.productName || "Discount", worth: null, image: tImage, badge: Number(rw.value) >= 100 ? "FREE" : `${rw.value}% OFF` };
    } else if (["flat_off_product", "discounted_product", "flat_off_order"].includes(rw.type)) {
      reward = { kind: "discount", name: strip(rw.label) || tp?.productName || "Discount", worth: null, image: tImage, badge: `₹${Number(rw.value).toLocaleString("en-IN")} OFF` };
    } else {
      reward = { kind: "discount", name: rw.label || "", worth: null, image: tImage, badge: "" };
    }
    combos.push({ promotionId: String(promo._id), label, description: rw.description || "", slots: slotOut, reward });
  }
  return combos;
}

// Public: GET /promotions/display/home — homepage combo cards. Only
// promotions with placements including "home" AND whose conditionTree names
// exactly 2 distinct products (the "buy A+B together" shape — see
// PROMOTION_TEMPLATES' combo_free_shipping template in the admin repo for
// the same condition shape). For each, builds a hypothetical "exactly these
// 2 products, 1 each" cart and runs it through the SAME evaluatePromotions
// engine checkout uses — against every active promotion, not just this one,
// same "hypothetical cart" convention getProductDisplayController already
// uses for the PDP. mrp/price/save are the real, computed numbers; nothing
// here is typed in by the admin.
const getHomeDisplayController = asyncHandler(async (_req, res) => {
  const all = await getActivePromotions();

  // "reward" cards advertise a ladder offer ("Buy any 2 katana, get a Dual
  // Stand free") that has no fixed 2-product pair, so there is no combo price
  // to compute. They show the free item instead. The reward's own MRP is read
  // from the catalog (never typed) unless the admin chose a label (e.g. a
  // mystery gift that must not reveal which product it is).
  // Every home-placed promotion gets a tile. A plain "buy A + B" combo (exactly 2 products in the
  // condition, cardKind combo) keeps its computed combo card; anything else (ladders, single-product,
  // category / subcategory offers ...) is shown as an offer tile driven by its admin tag line.
  const isTwoProductCombo = (p) => p.homeCard?.cardKind !== "reward" && collectConditionProductIds(p.conditionTree).length === 2;
  const rewardPromos = all.filter((p) => (p.placements || []).includes("home") && !isTwoProductCombo(p));
  const rewardTargetIds = [...new Set(rewardPromos.flatMap((p) => (p.rewards || []).map((r) => r.targetProductId)).filter(Boolean))];
  const rewardProducts = rewardTargetIds.length
    ? await Product.find({ productId: { $in: rewardTargetIds } }, { productId: 1, variantDetails: 1 }).lean()
    : [];
  // The "choose" button opens a bottom sheet of the products behind each
  // admin-configured choice link (/products/<productId>) — resolved here, in
  // stock only, so the storefront never guesses what can be added.
  const choiceIdOf = (url) => String(url || "").match(/^\/products\/([^/?#]+)/)?.[1] || null;
  const choiceIds = [...new Set(rewardPromos.flatMap((p) => (p.homeCard?.ctaChoices || []).map((c) => choiceIdOf(c.url))).filter(Boolean))];
  const choiceProducts = choiceIds.length
    ? await Product.find({ productId: { $in: choiceIds }, productStatus: "in_stock", isPublished: { $ne: false } }, PRODUCT_RECOMMENDATION_PROJECTION).lean()
    : [];
  // Everything the combo-builder sheet needs, fetched once for all home cards.
  const comboCandidates = all.filter((p) => (p.placements || []).includes("home") && isTwoProductCombo(p));
  const builderIds = [...new Set([...rewardPromos, ...comboCandidates].flatMap((p) => relatedPromotionsFor(p, all).flatMap(conditionProductIds)))];
  const builderProducts = builderIds.length
    ? await Product.find({ productId: { $in: builderIds }, productStatus: "in_stock", isPublished: { $ne: false } }, BUILDER_PRODUCT_PROJECTION).lean()
    : [];
  const builderMap = new Map(builderProducts.map((p) => [p.productId, p]));
  const labelByProduct = new Map();
  rewardPromos.forEach((p) => (p.homeCard?.ctaChoices || []).forEach((c) => {
    const id = choiceIdOf(c.url);
    if (id && c.label) labelByProduct.set(id, String(c.label).replace(/\s*katana\s*$/i, "").trim() || c.label);
  }));
  const shortNameOf = (id) => labelByProduct.get(id) || builderMap.get(id)?.productName || "Item";

  // "Combo Savings {save}": the ₹ is the engine's own number for a typical cart of this offer
  // (first in-stock variant of each required item): this promotion's discount plus the price of
  // any free product it grants. Computed only when the admin's label asks for it.
  const homeSavingsFor = (promo, combos) => {
    const first = combos?.[0];
    if (!first) return 0;
    const lines = new Map();
    for (const slot of first.slots) {
      const card = slot.options[0]?.cards.find((c) => !c.outOfStock);
      if (!card) return 0;
      const k = `${card.productId}::${card.sku || ""}`;
      lines.set(k, { productId: card.productId, quantity: (lines.get(k)?.quantity || 0) + 1, variantSku: card.sku || "", selectedVariant: card.variantName || undefined, price: card.price });
    }
    const items = [...lines.values()];
    const productMeta = new Map(builderProducts.map((pr) => [pr.productId, { category: pr.productCategory, subcategory: pr.productSubCategory, tags: pr.tags || [] }]));
    const subtotal = items.reduce((sum, i) => sum + (Number(i.price) || 0) * i.quantity, 0);
    const ctx = buildCartContext(items, { subtotal, productMeta });
    const result = evaluatePromotions(items, ctx, all);
    const pricing = buildPromotionPricePreview(items, builderMap, result);
    let save = Number(pricing.savingsByPromotion?.[String(promo._id)]) || 0;
    for (const g of result.freeGifts.filter((x) => String(x.promotionId) === String(promo._id) && x.targetProductId)) {
      const gp = builderMap.get(String(g.targetProductId));
      const gv = gp?.variantDetails?.find((v) => v.sku === g.targetVariantSku) || gp?.variantDetails?.[0];
      save += (Number(gv?.variantPrice) || 0) * (Number(g.quantity) || 1);
    }
    return Math.round(save);
  };
  const benefitFor = (promo, label, combos) => {
    const text = String(label || "").trim();
    if (!text.includes("{save}")) return text;
    const save = homeSavingsFor(promo, combos);
    return save > 0 ? text.replace("{save}", `₹${save.toLocaleString("en-IN")}`) : "";
  };

  const rewardCards = rewardPromos.map((promo) => {
    const hc = promo.homeCard || {};
    const reward = (promo.rewards || []).find((r) => r.targetProductId);
    const product = reward && rewardProducts.find((p) => p.productId === reward.targetProductId);
    const variant = product?.variantDetails?.find((v) => v.sku === reward.targetVariantSku) || product?.variantDetails?.[0];
    return {
      id: promo._id,
      kind: "reward",
      // A ladder offer is covered by several promotions (wooden / LED / mixed),
      // so the card headline is the admin's own wording, not one promo's name.
      title: hc.subtitle?.trim() || promo.name,
      // the admin's tag line for the homepage tile (blank -> the promotion's own name); never generated here
      tagline: hc.subtitle?.trim() || promo.name,
      // image to use if the admin has not uploaded one: the first product the offer is about
      productImage: (() => {
        const id = conditionProductIds(promo)[0];
        const pr = id && builderMap.get(id);
        return pr?.variantDetails?.[0]?.variantImage?.[0] || pr?.productImg || null;
      })(),
      subtitle: "",
      badgeText: hc.badgeText || "",
      ctaLabel: hc.ctaLabel?.trim() || "Shop Now",
      bannerImage: hc.bannerImage || null,
      fallbackImages: null,
      badgeLabel: hc.badgeLabel || "",
      savingsLabel: hc.savingsLabel || "",
      rewardValue: hc.savingsLabel ? null : Number(variant?.variantPrice || 0) || null,
      freeGift: true,
      priority: promo.priority || 0,
      ctaAction: hc.ctaAction === "choose" && (hc.ctaChoices || []).length ? "choose" : hc.ctaAction === "link" && hc.ctaUrl ? "link" : "cart",
      ctaUrl: hc.ctaUrl || "",
      // every live promotion that grants the same reward (e.g. wooden / LED / mixed
      // variants of "Dual Stand Free") — the unlock sheet shows one row for each
      relatedPromotionIds: (() => {
        const rw = (promo.rewards || []).find((r) => r.targetProductId);
        const mine = String(promo._id);
        if (!rw) return [mine];
        const same = all
          .filter((p) => String(p._id) !== mine && (p.placements || []).includes("cart")
            && (p.rewards || []).some((r) => r.targetProductId === rw.targetProductId && (r.targetVariantSku || "") === (rw.targetVariantSku || "")))
          .map((p) => String(p._id));
        return [mine, ...same];
      })(),
      // the product page this tile opens: admin's primary product, else the first product in the condition
      primaryProductId: hc.primaryProductId || conditionProductIds(promo, true)[0] || null,
      builder: { combos: buildComboBuilder(relatedPromotionsFor(promo, all), builderMap, shortNameOf, hc.savingsLabel || "") },
      // benefit line under the tile title: the admin's own label ("{save}" is replaced with the real savings)
      benefit: benefitFor(promo, hc.savingsLabel, buildComboBuilder([promo], builderMap, shortNameOf, "")),
      ctaChoices: (hc.ctaChoices || []).map((c) => ({ label: c.label, url: c.url })),
      choices: (hc.ctaChoices || []).map((c) => {
        const product = choiceProducts.find((p) => p.productId === choiceIdOf(c.url));
        return { label: c.label, url: c.url, cards: product ? cardsForTarget(product, "") : [] };
      }),
      order: Number(hc.order) || 0,
      items: [],
    };
  });

  const candidates = all
    .filter((p) => (p.placements || []).includes("home") && isTwoProductCombo(p))
    .map((promo) => ({ promo, productIds: collectConditionProductIds(promo.conditionTree) }))
    .filter((c) => c.productIds.length === 2);

  if (candidates.length === 0) {
    return res.status(200).json(new ApiRes(200, "OK", { combos: rewardCards.sort((a, b) => a.order - b.order || b.priority - a.priority) }, true));
  }

  const allProductIds = [...new Set(candidates.flatMap((c) => c.productIds))];
  const products = await Product.find(
    { productId: { $in: allProductIds } },
    { productId: 1, productName: 1, productImg: 1, variantDetails: 1, productCategory: 1, productSubCategory: 1, tags: 1 },
  ).lean();
  const productById = new Map(products.map((p) => [p.productId, p]));
  const productMeta = new Map(
    products.map((p) => [p.productId, { category: p.productCategory, subcategory: p.productSubCategory, tags: p.tags || [] }]),
  );

  const firstActiveVariant = (product) =>
    (product?.variantDetails || []).find(
      (v) => v.isActive !== false && !v.variantOutOfStock && !(v.variantQuantity != null && Number(v.variantQuantity) <= 0),
    ) || product?.variantDetails?.[0] || null;

  const display = candidates
    .map(({ promo, productIds }) => {
      const items = productIds.map((id) => productById.get(id)).filter(Boolean);
      if (items.length !== 2) return null; // a referenced product was deleted/renamed since this promotion was saved
      const variants = items.map((p) => firstActiveVariant(p));
      if (variants.some((v) => !v)) return null; // every linked product needs a sellable variant

      const cartItems = items.map((p, i) => ({ productId: p.productId, quantity: 1, variantSku: variants[i].sku || "" }));
      const ctx = buildCartContext(cartItems, { subtotal: 0, productMeta });
      const result = evaluatePromotions(cartItems, ctx, all);

      const fullPrices = variants.map((v) => Number(v.variantPrice || 0));
      const discountedPrices = items.map((p, i) => {
        const raw = getDiscountCandidatesForItem(result.discountCandidatesByProduct, p.productId, variants[i].sku);
        return raw.length ? applyBestPromotionDiscount(fullPrices[i], raw) : fullPrices[i];
      });

      const mrp = fullPrices.reduce((s, n) => s + n, 0);
      const price = discountedPrices.reduce((s, n) => s + n, 0);
      const homeCard = promo.homeCard || {};
      // A combo's reward isn't always a ₹ price cut (free_shipping/
      // free_product give no product-level discount at all, so save would
      // be 0 and the storefront's "Save ₹X" pill would have nothing to
      // show) — surfaced here so the card can fall back to a "Free
      // Shipping"/"Free Gift" pill instead of silently showing no badge.
      // free_product.promotionId is matched against this promo specifically
      // (resolveProductWinners can drop it for another promo); freeShipping
      // is a flat flag because nothing else in this hypothetical 1-each
      // cart could plausibly grant it besides this promo's own reward.
      const grantsFreeProduct = result.freeGifts.some((g) => String(g.promotionId) === String(promo._id));

      return {
        id: promo._id,
        title: promo.name,
        tagline: homeCard.subtitle?.trim() || promo.name,
        benefit: benefitFor(promo, homeCard.savingsLabel, buildComboBuilder([promo], builderMap, shortNameOf, "")),
        subtitle: homeCard.subtitle?.trim() || items.map((p) => p.productName).join(" + "),
        badgeText: homeCard.badgeText || "",
        ctaLabel: homeCard.ctaLabel?.trim() || "Add to Cart",
        bannerImage: homeCard.bannerImage || null,
        // null when no bannerImage — storefront renders a 50/50 split of
        // these two images itself, never a hardcoded placeholder.
        fallbackImages: homeCard.bannerImage ? null : variants.map((v) => v.variantImage?.[0] || ""),
        mrp,
        price,
        save: Math.max(0, mrp - price),
        // Rounded from the computed numbers above — never typed by an admin.
        percentOff: mrp > 0 ? Math.round((Math.max(0, mrp - price) / mrp) * 100) : 0,
        freeShipping: result.freeShipping,
        freeGift: grantsFreeProduct,
        priority: promo.priority || 0,
        // Presentation-only choices from the admin's offer-card editor.
        badgeLabel: homeCard.badgeLabel || "",
        priceLabel: homeCard.priceLabel || "",
        savingsMode: homeCard.savingsMode || "amount",
        savingsLabel: homeCard.savingsLabel || "",
        ctaAction: homeCard.ctaAction === "link" && homeCard.ctaUrl ? "link" : "cart",
        ctaUrl: homeCard.ctaUrl || "",
        order: Number(homeCard.order) || 0,
        primaryProductId: homeCard.primaryProductId || productIds[0] || null,
        builder: { combos: buildComboBuilder([promo], builderMap, shortNameOf, "") },
        // Every in-stock variant the shopper may pick for each required product
        // (restricted to the SKU the promotion pins, if it pins one) — drives the
        // variant-selection bottom sheet. Admin-configured; nothing hardcoded.
        options: (() => {
          const pinned = collectConditionSkus(promo.conditionTree);
          return items.map((p) => {
            const skus = pinned.get(p.productId);
            const cards = (p.variantDetails || [])
              .filter((v) => !skus?.size || skus.has(v.sku))
              .map((v) => toRecommendationCard(p, v))
              .filter(Boolean);
            return { productId: p.productId, productName: p.productName, image: p.productImg || cards[0]?.image || null, cards };
          });
        })(),
        items: items.map((p, i) => ({
          productId: p.productId,
          productName: p.productName,
          variantName: variants[i].variantName || "",
          sku: variants[i].sku || "",
          price: discountedPrices[i],
          image: variants[i].variantImage?.[0] || "",
        })),
      };
    })
    .filter(Boolean)
    .concat(rewardCards)
    .sort((a, b) => a.order - b.order || b.priority - a.priority);

  return res.status(200).json(new ApiRes(200, "OK", { combos: display }, true));
});

export {
  getActivePromotionsController,
  getPromotionsForProductController,
  evaluatePromotionsController,
  getProductDisplayController,
  getCartDisplayController,
  getCheckoutDisplayController,
  getHomeDisplayController,
  // Pure, DB-free helpers — exported for unit testing.
  findFirstUnmetProductLeaf,
  didAddedItemAdvancePromotion,
  toRecommendationCard,
  resolveMissingRewardTargets,
};
