import { ApiRes } from "../utils/index.js";
import SeoPage from "../model/seoPage.model.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import { apiCache } from "../module/cache.manager.module.js";
import { normalizeSeoPath } from "../utils/seoPath.js";

const PUBLIC_FIELDS =
  "-_id urlPath metaTitle metaDescription canonicalUrl robots ogTitle ogDescription ogImage introContent faqs customJsonLd updatedAt";

// GET /seo?path=/category/anime — admin SEO overrides for one storefront URL,
// or data:null when there are none (the page then keeps its own SEO).
// Cached 10 min in memory like products (System Guide §7).
const getSeoData = asyncHandler(async (req, res) => {
  const urlPath = normalizeSeoPath(req.query.path);
  const data = await apiCache.handle({ route: "seo", urlPath }, () =>
    SeoPage.findOne({ urlPath, isActive: true }).select(PUBLIC_FIELDS).lean(),
  );
  return res.status(200).json(new ApiRes(200, data ? "SEO Data" : "No SEO data", data || null, true));
});

export { getSeoData };
