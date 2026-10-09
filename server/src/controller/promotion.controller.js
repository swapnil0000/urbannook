import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ValidationError } from "../utils/errors.js";
import Product from "../model/product.model.js";
import {
  getActivePromotions,
  evaluatePromotions,
  buildCartContext,
  promotionReferencesProduct,
} from "../utils/promotionEngine.util.js";
import { buildPromotionDisplayList } from "../services/promotionPresentation.service.js";

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
// either as a condition or as a reward target — mirrors
// freeShippingOffer.controller.js's getBannerForProductController (a
// structural "does this apply to this page" filter, not a live cart
// evaluation). Sanitized the same way as getActivePromotionsController
// above — see that comment for why.
const getPromotionsForProductController = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const all = await getActivePromotions();
  const matching = all.filter((p) => promotionReferencesProduct(p, productId));
  const { ctx } = await resolveItemsAndContext([{ productId, quantity: 1 }], { subtotal: 0 });
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
        { productId: 1, variantDetails: 1, productCategory: 1, productSubCategory: 1, tags: 1 },
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
  return { resolvedItems, ctx };
}

// Public: evaluates the posted cart against every active V2 promotion — same
// request contract as POST /cart-rules/evaluate (evaluateCartRulesController
// in cartRule.controller.js): { items: [{productId, quantity, selectedVariant}] },
// client only ever knows a variant by its NAME, this is the one place that
// resolves name -> sku (via a Product lookup) before calling into
// promotionEngine.util.js, exactly like cartRule.controller.js already does
// for the legacy engine.
const evaluatePromotionsController = asyncHandler(async (req, res) => {
  const { items, couponCode } = req.body;
  // subtotal: 0 (display-only evaluation — the real subtotal, post any
  // legacy cart_rule discount, is checkout's job; conditions needing it
  // just won't match here, same "optimistic, re-validated at order-creation"
  // convention the legacy banner system already uses).
  const { resolvedItems, ctx } = await resolveItemsAndContext(items, { subtotal: 0, couponCode });

  const activePromotions = await getActivePromotions();
  const result = evaluatePromotions(resolvedItems, ctx, activePromotions);

  // Map not JSON-serializable — flatten discountCandidatesByProduct to a
  // plain object, same convention evaluateCartRulesController already uses
  // for the legacy engine's equivalent field.
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
  return node.field === "product";
}
// Deliberately CONDITION-only (unlike promotionReferencesProduct, which also
// matches reward targets — right for "does this promotion mention this
// product at all" on the PDP, wrong here: a cart containing only the FREE
// GIFT product shouldn't surface a promo whose actual trigger product isn't
// in the cart).
function conditionReferencesProduct(node, productId) {
  if (!node) return false;
  if (node.op) return (node.children || []).some((c) => conditionReferencesProduct(c, productId));
  return node.field === "product" && String(node.productId) === String(productId);
}
function isPromotionRelevantToCart(promotion, cartProductIds) {
  if (hasProductCondition(promotion.conditionTree)) {
    return cartProductIds.some((id) => conditionReferencesProduct(promotion.conditionTree, id));
  }
  return true;
}

// GET /promotions/display/product/:id — PDP. Structural filter (like
// getPromotionsForProductController) + "pdp" placement gate, run through the
// presentation layer against a 1-item hypothetical cart (qty 1) so
// progressText/qualifying reflect "if you add just this product".
const getProductDisplayController = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const all = await getActivePromotions();
  const relevant = all.filter((p) => promotionReferencesProduct(p, productId) && (p.placements || []).includes("pdp"));
  const { ctx } = await resolveItemsAndContext([{ productId, quantity: 1 }], { subtotal: 0 });
  const display = buildPromotionDisplayList(relevant, ctx, { placement: "pdp" });
  return res.status(200).json(new ApiRes(200, "OK", { promotions: display }, true));
});

// POST /promotions/display/cart — Cart/Mini-cart. Body: { items, placement?
// } where placement is "cart" (default) or "mini_cart" — same data, just a
// different placements-field gate, since admin can choose to show a
// promotion in one but not the other.
const getCartDisplayController = asyncHandler(async (req, res) => {
  const { items, placement = "cart", couponCode } = req.body;
  if (!["cart", "mini_cart"].includes(placement)) throw new ValidationError('placement must be "cart" or "mini_cart"');
  const cartItems = Array.isArray(items) ? items : [];
  const subtotal = Number(req.body.subtotal) || 0;

  const all = await getActivePromotions();
  const cartProductIds = [...new Set(cartItems.map((i) => String(i.productId)))];
  const relevant = all.filter((p) => (p.placements || []).includes(placement) && isPromotionRelevantToCart(p, cartProductIds));

  const { ctx } = await resolveItemsAndContext(cartItems, { subtotal, couponCode });
  const matchedResult = evaluatePromotions(cartItems.map((i) => ({ ...i, variantSku: "" })), ctx, all);
  const appliedPromotionIds = new Set(matchedResult.matchedPromotions.map((p) => String(p._id)));

  const display = buildPromotionDisplayList(relevant, ctx, { placement, appliedPromotionIds });
  return res.status(200).json(new ApiRes(200, "OK", { promotions: display }, true));
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

  const { ctx } = await resolveItemsAndContext(cartItems, { subtotal, customerType, orderCount, deliveryAddress, couponCode });
  const matchedResult = evaluatePromotions(cartItems.map((i) => ({ ...i, variantSku: "" })), ctx, all);
  const appliedPromotionIds = new Set(matchedResult.matchedPromotions.map((p) => String(p._id)));

  const display = buildPromotionDisplayList(relevant, ctx, { placement: "checkout", appliedPromotionIds });
  return res.status(200).json(new ApiRes(200, "OK", { promotions: display }, true));
});

export {
  getActivePromotionsController,
  getPromotionsForProductController,
  evaluatePromotionsController,
  getProductDisplayController,
  getCartDisplayController,
  getCheckoutDisplayController,
};
