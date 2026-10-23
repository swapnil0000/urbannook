import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { getFreeShippingConfig } from "../utils/freeShippingOffer.util.js";

// Public: threshold + active flag only, used by the client to decide when
// to show "Free" instead of a shipping charge and how far the customer is
// from unlocking it (FreeShippingStrip.jsx). The old per-product/all-active
// "combo banner" endpoints (getBannerForProductController/
// getAllActiveBannersController) were deleted 2026-10-09 along with the rest
// of the legacy cart-rule/offers display stack — see freeShippingOffer.util.js.
const getFreeShippingConfigController = asyncHandler(async (_req, res) => {
  console.log(`[FreeShipping:HTTP] GET /free-shipping-offer`);
  const config = await getFreeShippingConfig();
  return res.status(200).json(new ApiRes(200, "OK", config, true));
});

export { getFreeShippingConfigController };
