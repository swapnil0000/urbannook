import { ApiRes } from "../utils/index.js";
import FreeShippingOffer from "../model/freeShippingOffer.model.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { getFreeShippingConfig } from "../utils/freeShippingOffer.util.js";

// Public: threshold + active flag only, used by the client to decide when
// to show "Free" instead of a shipping charge and how far the customer is
// from unlocking it.
const getFreeShippingConfigController = asyncHandler(async (_req, res) => {
  const config = await getFreeShippingConfig();
  return res.status(200).json(new ApiRes(200, "OK", config, true));
});

// Public: active banner (if any) for a given product page. A product can
// have at most one active banner in practice, but we don't enforce that at
// the schema level — first match wins.
const getBannerForProductController = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const offer = await FreeShippingOffer.findOne(
    { isActive: true, "banners.sourceProductId": productId, "banners.isActive": true },
    { banners: { $elemMatch: { sourceProductId: productId, isActive: true } } },
  ).lean();

  const banner = offer?.banners?.[0] || null;
  return res.status(200).json(new ApiRes(200, "OK", banner, true));
});

export { getFreeShippingConfigController, getBannerForProductController };
