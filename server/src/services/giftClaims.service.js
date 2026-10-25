/**
 * Explicit free-gift claiming.
 *
 * A promotion that grants a free product (`free_product`) only creates an ENTITLEMENT. The
 * customer must claim it; only claimed, still-valid entitlements become ₹0 order lines.
 * Paid purchases are independent: a stand bought at full price and a stand claimed free are two
 * separate lines even for the same SKU.
 *
 * The engine (evaluatePromotions) is the single source of truth: an entitlement exists only if
 * the promotion's own conditions (and its admin priority / exclusivity / promotionGroup rules)
 * produced the gift for the CURRENT cart. Claims are therefore always re-validated against a fresh
 * evaluation — never trusted from the client.
 */

import { ValidationError } from "../utils/errors.js";

export const GIFT_CLAIM_ERROR = "GIFT_CLAIM_INVALID";

/** Stable id of one reward entitlement: promotion + product + variant. */
export const entitlementKey = (g) =>
  `${g.promotionId}:${g.targetProductId ?? g.productId}:${g.targetVariantSku ?? g.variantSku ?? ""}`;

/**
 * Entitlements the current cart is eligible for (what the customer could claim).
 * @param {object[]} freeGifts evaluatePromotions().freeGifts
 */
export function buildGiftEntitlements(freeGifts = []) {
  const byKey = new Map();
  for (const g of freeGifts) {
    if (!g?.targetProductId) continue; // gift_choice (pick one of N) is not claimable yet
    const key = entitlementKey(g);
    const prev = byKey.get(key);
    byKey.set(key, {
      key,
      promotionId: String(g.promotionId),
      name: g.name,
      targetProductId: g.targetProductId,
      targetVariantSku: g.targetVariantSku || "",
      quantity: Math.max(1, (prev?.quantity || 0) + (Number(g.quantity) || 1)),
    });
  }
  return [...byKey.values()];
}

/**
 * Validates what the customer asked to claim against the entitlements of the current cart.
 * - duplicates of the same entitlement are merged, then capped at the entitled quantity
 *   (so a repeated / double-submitted claim can never issue a gift twice);
 * - a claim with no matching entitlement (offer expired, cart changed, tampered) is rejected.
 * @param {{promotionId:string, productId:string, variantSku?:string, quantity?:number}[]} requested
 * @returns {{ valid: object[], rejected: {key:string, promotionId:string, productId:string, reason:string}[] }}
 */
export function validateGiftClaims(requested, freeGifts) {
  const entitlements = new Map(buildGiftEntitlements(freeGifts).map((e) => [e.key, e]));
  const wanted = new Map();
  for (const r of Array.isArray(requested) ? requested : []) {
    if (!r || !r.promotionId || !r.productId) continue;
    const key = entitlementKey({ promotionId: r.promotionId, productId: r.productId, variantSku: r.variantSku || "" });
    const qty = Math.max(1, Math.floor(Number(r.quantity) || 1));
    wanted.set(key, { ...(wanted.get(key) || { promotionId: String(r.promotionId), productId: r.productId, variantSku: r.variantSku || "" }), quantity: (wanted.get(key)?.quantity || 0) + qty });
  }

  const valid = [];
  const rejected = [];
  for (const [key, w] of wanted) {
    const e = entitlements.get(key);
    if (!e) {
      rejected.push({ key, promotionId: w.promotionId, productId: w.productId, reason: "NOT_ELIGIBLE" });
      continue;
    }
    valid.push({
      key,
      promotionId: e.promotionId,
      name: e.name,
      targetProductId: e.targetProductId,
      targetVariantSku: e.targetVariantSku,
      quantity: Math.min(w.quantity, e.quantity), // never more than entitled
    });
  }
  return { valid, rejected };
}

/** Which entitlements are claimed (and how many) vs still claimable — for the cart UI. */
export function describeGiftEntitlements(freeGifts, requestedClaims) {
  const { valid, rejected } = validateGiftClaims(requestedClaims, freeGifts);
  const claimedByKey = new Map(valid.map((v) => [v.key, v.quantity]));
  const entitlements = buildGiftEntitlements(freeGifts).map((e) => ({
    ...e,
    claimedQuantity: claimedByKey.get(e.key) || 0,
    status: (claimedByKey.get(e.key) || 0) >= e.quantity ? "claimed" : "claimable",
  }));
  return { entitlements, invalidClaims: rejected };
}

/**
 * Builds the ₹0 FREE_GIFT order lines for the gifts to issue.
 *
 * - The stock check counts what the same variant already has on the order (a paid line of the same SKU
 *   plus the gift) so a gift can never push the order past what is in stock.
 * - Explicit-claim mode: a claimed gift that cannot be issued (product gone, variant gone, out of stock)
 *   stops the order with GIFT_CLAIM_INVALID — it is never silently dropped and never turned into a charge.
 *   Legacy (automatic) mode keeps the old behaviour: log and skip.
 *
 * @param {object} p
 * @param {object[]} p.gifts            validated claims (or, legacy mode, the engine's freeGifts)
 * @param {object[]} p.products         products already loaded for the order
 * @param {object[]} p.orderItems       the order's existing (paid) lines
 * @param {boolean}  p.claimMode
 * @param {(id:string)=>Promise<object|null>} p.loadProduct
 * @param {(product:object, variantName:string, qty:number)=>void} p.assertAvailable  throws if not enough stock
 * @param {(gift:object, product:object, qty:number)=>void} [p.onIssued]
 */
export async function buildGiftOrderLines({ gifts, products, orderItems, claimMode, loadProduct, assertAvailable, onIssued }) {
  const lines = [];
  for (const gift of gifts || []) {
    if (!gift?.targetProductId) continue; // gift_choice (pick one of N) is not claimable yet
    try {
      const giftProduct = products.find((p) => p.productId === gift.targetProductId) || (await loadProduct(gift.targetProductId));
      if (!giftProduct) throw new Error("product not found / inactive");
      const giftVariant = gift.targetVariantSku
        ? giftProduct.variantDetails?.find((v) => v.sku === gift.targetVariantSku)
        : giftProduct.variantDetails?.[0];
      if (gift.targetVariantSku && !giftVariant) throw new Error("variant not found");
      const variantName = giftVariant?.variantName || "N/A";
      const qty = Math.max(1, Math.floor(Number(gift.quantity) || 1));
      const alreadyOrdered = [...orderItems, ...lines]
        .filter((oi) => oi.productId === giftProduct.productId && oi.productSnapshot.selectedVariant === variantName)
        .reduce((sum, oi) => sum + (Number(oi.productSnapshot.quantity) || 0), 0);
      assertAvailable(giftProduct, variantName, alreadyOrdered + qty);
      onIssued?.(gift, giftProduct, qty);
      lines.push({
        productId: giftProduct.productId,
        variantSku: giftVariant?.sku || "",
        productSnapshot: {
          quantity: qty,
          productImg: giftVariant?.variantImage?.[0] || giftProduct.productImg || "https://urbannook.in/assets/logo.webp",
          productName: giftProduct.productName,
          productCategory: giftProduct.productCategory,
          productSubCategory: giftProduct.productSubCategory,
          priceAtPurchase: 0,
          shipping: "0",
          selectedVariant: variantName,
          variantTitleTemplate: giftProduct.variantTitleTemplate || "",
          variantSku: giftVariant?.sku || "",
          isPromotionalGift: true,
          lineType: "FREE_GIFT",
          originalUnitPrice: Number(giftVariant?.variantPrice) || 0,
          giftPromotionId: String(gift.promotionId),
          giftEntitlementKey: entitlementKey(gift),
        },
      });
    } catch (err) {
      if (claimMode) {
        throw new ValidationError(
          "A free gift you claimed can no longer be added to your order. Please review your cart.",
          {
            code: GIFT_CLAIM_ERROR,
            rejected: [{ key: entitlementKey(gift), promotionId: String(gift.promotionId), productId: gift.targetProductId, reason: "UNAVAILABLE", detail: err.message }],
          },
        );
      }
      console.error(`[PromotionV2] free_product gift skipped (${gift.targetProductId}, promotion ${gift.promotionId}):`, err.message);
    }
  }
  return lines;
}
