import Offer from "../model/offer.model.js";
import Product from "../model/product.model.js";

/**
 * Fetches the free-shipping singleton doc from the unified `offers`
 * collection (type: "free_shipping", written by the admin panel's Offers
 * page). Legacy `freeshippingoffers` collection is retired — see
 * UN-ADMIN-panel .../server/scripts/seedOffersFromLegacy.js for the one-time
 * backfill that must be run on any environment before this.
 *
 * Internal — all reads of the free-shipping config/banners go through this
 * one function.
 *
 * @param {string} projection mongoose .select() string
 */
const getFreeShippingDoc = async (projection) => {
  return Offer.findOne({ type: "free_shipping" }).select(projection).lean();
};

/**
 * Returns { isActive, thresholdAmount } — the raw offer config. Used both for
 * client-side display (progress bar / "how far to unlock" copy) AND, since
 * rp.payment.controller.js compares subtotal >= thresholdAmount directly at
 * order-total time, as one of the real eligibility signals — free shipping
 * unlocks if EITHER the combo-pair rule (isFreeShippingEligible below), a
 * generic cart rule, OR the plain cart-value threshold is met.
 */
export const getFreeShippingConfig = async () => {
  const offer = await getFreeShippingDoc("isActive thresholdAmount");
  return {
    isActive: offer?.isActive ?? false,
    thresholdAmount: offer?.thresholdAmount ?? 0,
  };
};

/**
 * Free shipping is unlocked ONLY when the cart contains a configured offer
 * combo — i.e. both the `sourceProductId` and its `recommendedProductId`
 * from an active banner are present in the cart. This is NOT a cart-value
 * rule: adding some unrelated product that happens to be expensive must not
 * unlock free shipping. Each active banner is one combo; the cart qualifies
 * if it satisfies ANY of them.
 *
 * Deliberately independent of the parent offer doc's own `isActive` — that
 * flag is the cart-VALUE-threshold on/off switch only (see
 * getFreeShippingConfig above). Combo banners are a separate promo with
 * their own per-banner `isActive`, so admins can turn the threshold off
 * without silently killing an active combo (and vice versa).
 *
 * Reads ONLY the admin's own explicitly-configured banners (never the
 * cart_rule-derived ones below) — a derived banner just mirrors a cart_rule
 * that ALREADY grants free shipping via its own `effects` at checkout
 * (rp.payment.controller.js's cartRuleResult.freeShipping), so having this
 * function also count it would be redundant, not a gap.
 *
 * @param {string[]} cartProductIds product IDs currently in the cart/order
 */
export const isFreeShippingEligible = async (cartProductIds = []) => {
  const offer = await getFreeShippingDoc("banners");

  const ids = new Set((cartProductIds || []).map((id) => String(id)));
  const eligible = (offer?.banners || []).some(
    (b) =>
      b.isActive &&
      ids.has(String(b.sourceProductId)) &&
      ids.has(String(b.recommendedProductId)),
  );
  console.log(
    `[FreeShipping] cartIds=[${[...ids].join(",")}] → eligible=${eligible}`,
  );
  return eligible;
};

/**
 * A cart_rule created for free shipping (e.g. "Katana + Display Stand
 * Combo") already IS a combo: its `conditions` are the products that must
 * all be in the cart. Admins used to have to separately add the same combo
 * again under "Product Page Banners" just to get an on-page suggestion card
 * — easy to forget (exactly what happened with the Katana rule), and it
 * meant the same combo lived in two places that could drift apart.
 *
 * This derives banner-shaped entries directly from active free-shipping
 * cart_rules: for a 2-condition rule, each product becomes the "source" with
 * the other as "recommended" (so it works from either product's page). For
 * a rule with more than 2 conditions, every OTHER condition becomes its own
 * recommended entry for a given source — which is exactly what powers the
 * multi-suggestion carousel on the banner (see FreeShippingBanner.jsx).
 *
 * A condition's own `variantSku` (see utils/cartRule.util.js) carries
 * straight through as `sourceVariantSku`/`recommendedVariantSku` — so a
 * variant-scoped rule gets an equally variant-scoped banner, instead of
 * either being skipped or silently promising the discount for any variant.
 * `resolveBannerVariantNames` below translates these to names before the
 * banner ever reaches the client.
 */
const getCartRuleDerivedBanners = async () => {
  const rules = await Offer.find({
    type: "cart_rule",
    isActive: true,
    "effects.type": "free_shipping",
  })
    .select("_id name conditions")
    .lean();

  // De-duped by source+recommended+variant triple — two different rules
  // mentioning the exact same pair (e.g. one rule for "2+ Lamps" style
  // stacking alongside another for the plain combo) must not produce two
  // identical carousel slides for the same suggestion. Keyed with variant so
  // a whole-product rule and a variant-scoped rule for the same pair (a
  // legitimate, different combo) both survive.
  const seenPairs = new Set();
  const banners = [];
  for (const rule of rules) {
    const conditions = rule.conditions || [];
    for (const source of conditions) {
      for (const other of conditions) {
        if (String(other.productId) === String(source.productId)) continue;
        const pairKey = `${source.productId}:${source.variantSku || ""}:${other.productId}:${other.variantSku || ""}`;
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        banners.push({
          sourceProductId: source.productId,
          recommendedProductId: other.productId,
          sourceVariantSku: source.variantSku || null,
          recommendedVariantSku: other.variantSku || null,
          text: rule.name || "Unlock Free Shipping",
          ctaLabel: "Add to Cart",
          isActive: true,
          ruleId: rule._id,
        });
      }
    }
  }
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
 * Merges admin-configured "Product Page Banners" with cart_rule-derived
 * banners (see getCartRuleDerivedBanners) into one list, de-duplicated by
 * source+recommended pair (an explicit admin banner for a pair wins over the
 * auto-derived one, since it may carry custom copy), then resolves any
 * variant SKUs to names before returning — see resolveBannerVariantNames.
 */
const getAllBannersMerged = async () => {
  const offer = await getFreeShippingDoc("banners");
  const adminBanners = (offer?.banners || []).filter((b) => b.isActive);
  const ruleBanners = await getCartRuleDerivedBanners();

  const adminPairs = new Set(adminBanners.map((b) => `${b.sourceProductId}:${b.recommendedProductId}`));
  const dedupedRuleBanners = ruleBanners.filter(
    (b) => !adminPairs.has(`${b.sourceProductId}:${b.recommendedProductId}`),
  );
  return resolveBannerVariantNames([...adminBanners, ...dedupedRuleBanners]);
};

/**
 * ALL active banners (admin + cart_rule-derived) for a given product page —
 * used by getBannerForProductController. A product can now have MULTIPLE
 * suggestions (carousel on the client) rather than just one. Independent of
 * the parent doc's `isActive` — see isFreeShippingEligible above for why.
 *
 * @param {string} productId
 */
export const getBannerForProduct = async (productId) => {
  const all = await getAllBannersMerged();
  return all.filter((b) => String(b.sourceProductId) === String(productId));
};

/**
 * All active banners across every product — used by
 * getAllActiveBannersController (checkout/cart, which aren't tied to one
 * product). Independent of the parent doc's `isActive` — see
 * isFreeShippingEligible above for why.
 */
export const getAllActiveBanners = async () => {
  return getAllBannersMerged();
};
