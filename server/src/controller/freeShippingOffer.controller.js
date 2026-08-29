import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import {
  getFreeShippingConfig,
  getBannerForProduct,
  getAllActiveBanners,
} from "../utils/freeShippingOffer.util.js";

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
  const banner = await getBannerForProduct(productId);
  return res.status(200).json(new ApiRes(200, "OK", banner, true));
});

// Public: all active banners across every product. Used on checkout (which
// isn't tied to a single product page) to find a banner matching whatever's
// in the cart. Cart could contain items from multiple source products, each
// with its own banner — for now we only ever show ONE banner on checkout
// (first match, picked client-side), so this just returns the raw active
// list and lets the client decide. Revisit if/when multi-banner display on
// checkout is actually needed — see matching TODO comment in CheckoutPage.jsx.
const getAllActiveBannersController = asyncHandler(async (_req, res) => {
  const banners = await getAllActiveBanners();
  return res.status(200).json(new ApiRes(200, "OK", banners, true));
});

export { getFreeShippingConfigController, getBannerForProductController, getAllActiveBannersController };
