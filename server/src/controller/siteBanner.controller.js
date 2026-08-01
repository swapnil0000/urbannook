import { ApiRes } from "../utils/index.js";
import SiteBanner from "../model/siteBanner.model.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

// Public: every currently-active, in-date-range banner. Route matching
// happens client-side (react-router's matchPath against routePatterns),
// same division of labor as getAllActiveBannersController for
// free-shipping banners.
const getActiveBannersController = asyncHandler(async (_req, res) => {
  const now = new Date();
  const banners = await SiteBanner.find({
    isActive: true,
    $and: [
      { $or: [{ startDate: null }, { startDate: { $lte: now } }] },
      { $or: [{ endDate: null }, { endDate: { $gte: now } }] },
    ],
  })
    .sort({ priority: -1 })
    .lean();

  return res.status(200).json(new ApiRes(200, "OK", banners, true));
});

export { getActiveBannersController };
