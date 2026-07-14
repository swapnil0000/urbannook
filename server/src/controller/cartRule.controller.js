import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { ValidationError } from "../utils/errors.js";
import { getActiveCartRules, evaluateCartRules, findClosestUnmatchedRule } from "../utils/cartRule.util.js";

// Public: evaluates the posted cart (productId + quantity pairs — the client
// already has this from Redux, no need to trust/refetch a server-side cart
// here) against every active CartRule. This is the SAME evaluator function
// the payment controller uses for the real order total (see
// rp.payment.controller.js), so the banner/checkout UI can never silently
// disagree with what actually gets charged the way the old combo-banner
// logic did across three separate files.
const evaluateCartRulesController = asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    throw new ValidationError("items must be an array of { productId, quantity }");
  }

  const activeRules = await getActiveCartRules();
  const result = evaluateCartRules(items, activeRules);
  const matchedRuleIds = result.matchedRules.map((r) => r._id);
  const closestUnmatchedRule = findClosestUnmatchedRule(items, activeRules, matchedRuleIds);

  // discountCandidatesByProduct is a Map (not JSON-serialisable directly) —
  // flatten to a plain object of productId -> best resulting discount info
  // for display purposes (the payment controller does its own price lookup
  // via applyBestDiscount; this is just for the client to show "X% off").
  const discounts = Object.fromEntries(
    Array.from(result.discountCandidatesByProduct.entries()).map(([productId, candidates]) => [
      productId,
      candidates,
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
      },
      true,
    ),
  );
});

export { evaluateCartRulesController };
