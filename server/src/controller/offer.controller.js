import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { getPublicOfferConfig } from "../utils/offer.util.js";

// Public: GET /offers/:type — generic reader for any simple singleton offer
// type registered in utils/offer.util.js (currently gift_wrap). Adding a new
// simple offer type later needs zero new routes/controllers — just one entry
// in that util's field/default maps.
const getOfferByTypeController = asyncHandler(async (req, res) => {
  const config = await getPublicOfferConfig(req.params.type);
  if (!config) return res.status(404).json(new ApiRes(404, "Unknown offer type", null, false));
  return res.status(200).json(new ApiRes(200, "OK", config, true));
});

export { getOfferByTypeController };
