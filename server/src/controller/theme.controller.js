import { ApiRes } from "../utils/index.js";
import ThemeConfig from "../model/theme.config.model.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";

// Public: current color tokens (light + dark) as set by the admin panel.
// Returns null if the admin hasn't opened /admin/theme yet — the client
// falls back to its own hardcoded defaults in that case.
const getThemeConfigController = asyncHandler(async (_req, res) => {
  const theme = await ThemeConfig.findOne().lean();
  return res.status(200).json(new ApiRes(200, "OK", theme, true));
});

export { getThemeConfigController };
