import Offer from "../model/offer.model.js";

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
 */
const getCartRuleDerivedBanners = async () => {
  const rules = await Offer.find({
    type: "cart_rule",
    isActive: true,
    "effects.type": "free_shipping",
  })
    .select("_id name conditions")
    .lean();

  // De-duped by source+recommended pair — two different rules mentioning the
  // exact same pair (e.g. one rule for "2+ Lamps" style stacking alongside
  // another for the plain combo) must not produce two identical carousel
  // slides for the same suggestion.
  const seenPairs = new Set();
  const banners = [];
  for (const rule of rules) {
    const conditions = rule.conditions || [];
    for (const source of conditions) {
      for (const other of conditions) {
        if (String(other.productId) === String(source.productId)) continue;
        const pairKey = `${source.productId}:${other.productId}`;
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        banners.push({
          sourceProductId: source.productId,
          recommendedProductId: other.productId,
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

/**
 * Merges admin-configured "Product Page Banners" with cart_rule-derived
 * banners (see getCartRuleDerivedBanners) into one list, de-duplicated by
 * source+recommended pair (an explicit admin banner for a pair wins over the
 * auto-derived one, since it may carry custom copy).
 */
const getAllBannersMerged = async () => {
  const offer = await getFreeShippingDoc("banners");
  const adminBanners = (offer?.banners || []).filter((b) => b.isActive);
  const ruleBanners = await getCartRuleDerivedBanners();

  const adminPairs = new Set(adminBanners.map((b) => `${b.sourceProductId}:${b.recommendedProductId}`));
  const dedupedRuleBanners = ruleBanners.filter(
    (b) => !adminPairs.has(`${b.sourceProductId}:${b.recommendedProductId}`),
  );
  return [...adminBanners, ...dedupedRuleBanners];
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
