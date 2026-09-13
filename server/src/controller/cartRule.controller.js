import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ValidationError } from "../utils/errors.js";
import Product from "../model/product.model.js";
import {
  getActiveCartRules,
  evaluateCartRules,
  findClosestUnmatchedRule,
  findQuantityDiscountNudges,
} from "../utils/cartRule.util.js";

// Public: evaluates the posted cart (productId + quantity pairs — the client
// already has this from Redux, no need to trust/refetch a server-side cart
// here) against every active CartRule. This is the SAME evaluator function
// the payment controller uses for the real order total (see
// rp.payment.controller.js), so the banner/checkout UI can never silently
// disagree with what actually gets charged the way the old combo-banner
// logic did across three separate files.
//
// The client only ever knows a cart line's variant by its NAME
// (selectedVariant) — cartRule.util.js matches by SKU instead (variant
// names aren't guaranteed unique/stable). This controller is the ONE place
// that translates between the two, in both directions, so nothing else
// (the util, or any of the 4 frontend components reading `discounts`) needs
// to know SKUs exist at all:
//   request  → resolve each item's selectedVariant (name) to a variantSku
//              via a Product lookup, before calling into cartRule.util.js.
//   response → translate each discount candidate's variantSku back to the
//              variant NAME the client already filters by, using the same
//              lookup — so the client-side filter (`c.variantName ===
//              item.selectedVariant`) keeps working completely unchanged.
const evaluateCartRulesController = asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    throw new ValidationError("items must be an array of { productId, quantity }");
  }

  const productIds = [...new Set(items.map((i) => String(i.productId)))];
  const products = productIds.length
    ? await Product.find({ productId: { $in: productIds } }, { productId: 1, variantDetails: 1 }).lean()
    : [];
  const productById = new Map(products.map((p) => [p.productId, p]));

  const skuByProductAndName = (productId, variantName) =>
    productById.get(String(productId))?.variantDetails?.find((v) => v.variantName === variantName)?.sku || "";
  const nameByProductAndSku = (productId, sku) =>
    productById.get(String(productId))?.variantDetails?.find((v) => v.sku === sku)?.variantName || undefined;

  // Resolve name -> sku once per item; everything downstream (matching)
  // works in SKU terms.
  const resolvedItems = items.map((item) => ({
    ...item,
    variantSku: item.selectedVariant ? skuByProductAndName(item.productId, item.selectedVariant) : "",
  }));

  const activeRules = await getActiveCartRules();
  const result = evaluateCartRules(resolvedItems, activeRules);
  const matchedRuleIds = result.matchedRules.map((r) => r._id);
  const closestUnmatchedRule = findClosestUnmatchedRule(resolvedItems, activeRules, matchedRuleIds);
  const quantityNudges = findQuantityDiscountNudges(resolvedItems, activeRules);

  // discountCandidatesByProduct is a Map (not JSON-serialisable directly) —
  // flatten to a plain object of productId -> discount candidates for
  // display purposes (the payment controller does its own price lookup via
  // applyBestDiscount; this is just for the client to show "X% off").
  // Translate variantSku back to variantName here — see the file-level
  // comment above.
  const discounts = Object.fromEntries(
    Array.from(result.discountCandidatesByProduct.entries()).map(([productId, candidates]) => [
      productId,
      candidates.map((c) =>
        c.variantSku
          ? { type: c.type, value: c.value, variantName: nameByProductAndSku(productId, c.variantSku) }
          : { type: c.type, value: c.value },
      ),
    ]),
  );

  return res.status(200).json(
    new ApiRes(
      200,
      "OK",
      {
        freeShipping: result.freeShipping,
        matchedRuleIds,
        discounts,
        closestUnmatchedRule,
        quantityNudges,
      },
      true,
    ),
  );
});

export { evaluateCartRulesController };
