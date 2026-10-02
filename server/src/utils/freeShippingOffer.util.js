import Product from "../model/product.model.js";
import Promotion from "../model/promotion.model.js";
import { getActivePromotionsAsCartRules } from "./promotionToCartRule.adapter.js";

/**
 * Returns { isActive, thresholdAmount } — the raw offer config. Used both for
 * client-side display (progress bar / "how far to unlock" copy) AND, since
 * rp.payment.controller.js compares subtotal >= thresholdAmount directly at
 * order-total time, as one of the real eligibility signals — free shipping
 * unlocks if EITHER the combo-pair rule (isFreeShippingEligible below), a
 * generic cart rule, OR the plain cart-value threshold is met.
 */
// Now reads the Promotion Engine V2 `promotions` collection instead of the
// legacy `offers` singleton's thresholdAmount/isActive fields — the
// cart-value-threshold free_shipping Promotion (see
// scripts/seedPromotionsFromOffers.js's freeShippingToPromotion mapping:
// conditionTree { field: "cartSubtotal", operator: "gte", value }, reward
// free_shipping). The admin's own `banners[]` on the legacy singleton
// (isFreeShippingEligible/getCartRuleDerivedBanners below) are a DELIBERATE,
// scoped exception that still reads `offers` — only the threshold number
// itself moved. Picks whichever such Promotion exists (there should be
// exactly one, same "singleton" expectation as before); if none exists,
// defaults to off — same as an admin never having configured one.
export const getFreeShippingConfig = async () => {
  const promo = await Promotion.findOne({
    "rewards.type": "free_shipping",
    "conditionTree.field": "cartSubtotal",
  }).select("isActive conditionTree").lean();
  const result = {
    isActive: promo?.isActive ?? false,
    thresholdAmount: promo?.conditionTree?.value ?? 0,
  };
  console.log(`[FreeShipping:config] promo found=${!!promo} name="${promo?.name || "none"}" → ${JSON.stringify(result)}`);
  return result;
};

/**
 * Free shipping is unlocked when the cart satisfies any active,
 * Promotion-backed cart_rule combo whose effects grant free_shipping (see
 * getCartRuleDerivedBanners below for how a combo's "source"/"recommended"
 * products are derived from a rule's conditions). This now fully reduces to
 * the exact same evaluation cartRuleResult.freeShipping already performs in
 * rp.payment.controller.js — kept as its own function (rather than deleted)
 * only because rp.payment.controller.js still calls it as one of the 4 OR'd
 * eligibility signals; it is otherwise redundant with cartRuleResult but
 * harmless to also check (same underlying data, same answer).
 *
 * No longer reads `offers` at all — every signal here is Promotion-sourced.
 *
 * @param {string[]} cartProductIds product IDs currently in the cart/order
 */
export const isFreeShippingEligible = async (cartProductIds = []) => {
  const rules = await getActivePromotionsAsCartRules();
  const ids = new Set((cartProductIds || []).map((id) => String(id)));
  const eligible = rules.some(
    (rule) =>
      (rule.effects || []).some((e) => e.type === "free_shipping") &&
      (rule.conditions || []).every((c) => ids.has(String(c.productId))),
  );
  console.log(
    `[FreeShipping] cartIds=[${[...ids].join(",")}] → eligible=${eligible}`,
  );
  return eligible;
};

/**
 * A cart_rule-shaped Promotion whose condition names one product and whose
 * reward targets a DIFFERENT product (free_shipping OR a percent_off/
 * flat_off effect that happens to be 100%-off, i.e. a "free gift" modeled
 * the legacy way) already IS a combo: its `conditions` are the products that
 * must be in the cart, its effect's `targetProductId` is the one to suggest.
 *
 * FIXED 2026-10-02: this used to only derive a banner from a `free_shipping`
 * effect — a percent_off/flat_off effect (the ONLY way a "buy X get Y free/
 * discounted" combo could ever be modeled before Promotion V2 existed) was
 * silently excluded, and relied entirely on a SEPARATE hand-typed banner
 * entry in the old "Product Page Banners" admin screen (writing to the
 * `offers` free_shipping singleton's banners[]) to ever show as a PDP
 * suggestion card. Now that that hand-typed path is no longer read at all
 * (see freeShippingOffer.util.js's full Promotion cutover), a percent_off/
 * flat_off-effect combo had NO path left to become a banner — this is that
 * fix. Every effect type that targets a specific product (free_shipping
 * has none to target, so it still just uses the OTHER condition product as
 * before) now qualifies.
 *
 * For a 2-condition rule, each product becomes the "source" with the other
 * as "recommended" (works from either product's page). For an effect-based
 * rule (percent_off/flat_off), the condition's product is the "source" and
 * the effect's `targetProductId` is the "recommended" one — these are NOT
 * swapped (unlike the free_shipping case, which has no natural direction),
 * since a 100%-off-the-STAND rule should suggest the Stand on the Katana's
 * page, not the reverse.
 *
 * A condition's own `variantSku` (see utils/cartRule.util.js) carries
 * straight through as `sourceVariantSku`/`recommendedVariantSku` — so a
 * variant-scoped rule gets an equally variant-scoped banner, instead of
 * either being skipped or silently promising the discount for any variant.
 * `resolveBannerVariantNames` below translates these to names before the
 * banner ever reaches the client.
 */
// `placement` (optional): when given, only promotions whose `placements[]`
// includes it become banners — e.g. a promotion scoped to "checkout" only
// must NOT show as a PDP suggestion card, even though it's still fully
// active and still applies to the real charge (placements is a DISPLAY
// concern; eligibility/checkout evaluation in cartRule.util.js intentionally
// never filters by it — a promotion shouldn't stop actually discounting
// just because an admin unchecked where it's advertised).
const getCartRuleDerivedBanners = async (placement) => {
  const everyRule = await getActivePromotionsAsCartRules();
  const allRules = placement ? everyRule.filter((r) => (r.placements || []).includes(placement)) : everyRule;
  console.log(`[FreeShipping:banners] placement=${placement || "(any)"} — ${everyRule.length} active rule(s) total, ${allRules.length} placed here: [${allRules.map((r) => r.name).join(", ")}]`);

  const banners = [];
  const seenPairs = new Set();

  // FIXED: used to run as two separate loops — every free_shipping-effect
  // rule processed first, THEN every percent_off/flat_off-effect rule —
  // so a lower-priority free_shipping rule always ended up BEFORE a
  // higher-priority discount rule in the output, no matter what `priority`
  // said. `allRules` is already priority-sorted (see
  // promotionToCartRule.adapter.js); a SINGLE pass over it, handling
  // whichever effect type each rule has inline, is what makes the banner
  // order actually follow priority end-to-end instead of just within one
  // reward-type bucket.
  for (const rule of allRules) {
    const fsEffect = (rule.effects || []).find((e) => e.type === "free_shipping");
    const discountEffects = (rule.effects || []).filter((e) => (e.type === "percent_off" || e.type === "flat_off") && e.targetProductId);
    const conditions = rule.conditions || [];

    if (fsEffect) {
      // No natural "target" for free_shipping — every condition-product
      // pairs with every OTHER condition-product, all directions shown.
      for (const source of conditions) {
        for (const other of conditions) {
          if (String(other.productId) === String(source.productId)) continue;
          const pairKey = `${source.productId}:${source.variantSku || ""}:${other.productId}:${other.variantSku || ""}`;
          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);
          banners.push({
            sourceProductId: source.productId, recommendedProductId: other.productId,
            sourceVariantSku: source.variantSku || null, recommendedVariantSku: other.variantSku || null,
            text: fsEffect.label || rule.name || "Unlock Free Shipping",
            subtitle: fsEffect.description || "", image: fsEffect.image || "",
            ctaLabel: "Add to Cart", isActive: true, ruleId: rule._id,
          });
        }
      }
    }

    if (discountEffects.length) {
      // Directional: condition product(s) are the source, the effect's
      // targetProductId is the recommended one.
      for (const source of conditions) {
        for (const effect of discountEffects) {
          if (String(effect.targetProductId) === String(source.productId)) continue; // a rule discounting the SAME product it requires isn't a "combo" suggestion
          const pairKey = `${source.productId}:${source.variantSku || ""}:${effect.targetProductId}:${effect.targetVariantSku || ""}`;
          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);
          banners.push({
            sourceProductId: source.productId, recommendedProductId: effect.targetProductId,
            sourceVariantSku: source.variantSku || null, recommendedVariantSku: effect.targetVariantSku || null,
            text: effect.label || rule.name || "Special offer",
            subtitle: effect.description || "", image: effect.image || "",
            ctaLabel: "Add to Cart", isActive: true, ruleId: rule._id,
          });
        }
      }
    }
  }

  console.log(`[FreeShipping:banners] derived ${banners.length} banner(s): ${JSON.stringify(banners.map((b) => `${b.sourceProductId}->${b.recommendedProductId}`))}`);
  return banners;
};

// Translates every banner's sourceVariantSku/recommendedVariantSku (SKU —
// the reliable identity, see utils/cartRule.util.js) into
// sourceVariantName/recommendedVariantName — the client only ever works
// with variant NAMEs (what a cart line's `selectedVariant` holds), so this
// is the one place that boundary gets crossed, exactly like
// controllers/cartRule.controller.js does for `discounts`. Raw SKUs never
// leave the server. A banner with no variant restriction is untouched
// (both name fields simply absent) — zero behavior change for every
// existing, unscoped banner.
async function resolveBannerVariantNames(banners) {
  const productIds = [
    ...new Set(
      banners.flatMap((b) => [
        b.sourceVariantSku ? b.sourceProductId : null,
        b.recommendedVariantSku ? b.recommendedProductId : null,
      ]).filter(Boolean).map(String),
    ),
  ];
  if (productIds.length === 0) return banners;

  const products = await Product.find({ productId: { $in: productIds } }, { productId: 1, variantDetails: 1 }).lean();
  const productById = new Map(products.map((p) => [p.productId, p]));
  const nameBySku = (productId, sku) =>
    productById.get(String(productId))?.variantDetails?.find((v) => v.sku === sku)?.variantName || undefined;

  return banners.map((b) => {
    if (!b.sourceVariantSku && !b.recommendedVariantSku) return b;
    const { sourceVariantSku, recommendedVariantSku, ...rest } = b;
    return {
      ...rest,
      ...(sourceVariantSku ? { sourceVariantName: nameBySku(b.sourceProductId, sourceVariantSku) } : {}),
      ...(recommendedVariantSku ? { recommendedVariantName: nameBySku(b.recommendedProductId, recommendedVariantSku) } : {}),
    };
  });
}

/**
 * Every active banner, entirely Promotion-derived (see
 * getCartRuleDerivedBanners) — the admin's old hand-typed "Product Page
 * Banners" (custom text/ctaLabel, stored on the legacy `offers` free_shipping
 * singleton) are no longer read here at all. Banner copy (`text`/`ctaLabel`)
 * is now always the Promotion's own name / a fixed "Add to Cart" label
 * (see getCartRuleDerivedBanners) — accepted as a known, intentional
 * downgrade from hand-written marketing copy, per explicit instruction.
 * Resolves any variant SKUs to names before returning — see
 * resolveBannerVariantNames.
 */
const getAllBannersMerged = async (placement) => {
  const banners = await getCartRuleDerivedBanners(placement);
  const resolved = await resolveBannerVariantNames(banners);
  console.log(`[FreeShipping:merged] placement=${placement || "(any)"} — ${resolved.length} banner(s) after variant-name resolution`);
  return resolved;
};

/**
 * ALL active (Promotion-derived) banners for a given product page — used by
 * getBannerForProductController. A product can have MULTIPLE suggestions
 * (carousel on the client) rather than just one.
 *
 * @param {string} productId
 */
export const getBannerForProduct = async (productId) => {
  const all = await getAllBannersMerged("pdp");
  const filtered = all.filter((b) => String(b.sourceProductId) === String(productId));
  console.log(`[FreeShipping:forProduct] productId=${productId} → ${filtered.length} banner(s): ${JSON.stringify(filtered.map((b) => b.text))}`);
  return filtered;
};

/**
 * All active (Promotion-derived) banners across every product — used by
 * getAllActiveBannersController (checkout/cart, which aren't tied to one
 * product).
 */
export const getAllActiveBanners = async () => {
  return getAllBannersMerged();
};
