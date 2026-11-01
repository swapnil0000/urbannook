import { ApiRes } from "../utils/index.js";
import { asyncHandler } from "../middleware/errorHandler.middleware.js";
import HeroBanner from "../model/heroBanner.model.js";

const MAX_SLIDES = 6;

// GET /hero-banner/active — the homepage hero slides that are live RIGHT NOW
// (enabled and inside their own optional start/end window, by server time), in
// the admin's order, or { slides: [] } so the storefront keeps its built-in hero.
// One tiny single-document read, no server cache: a slide that expires or is
// switched off disappears on the next request. Browsers keep it 60 s; the client
// (RTK) keeps it 5 min like the rest of the storefront data (System Guide §7).
export const getActiveHeroBannerController = asyncHandler(async (_req, res) => {
  const now = new Date();
  const doc = await HeroBanner.findOne({ key: "home" }).lean();
  const slides = (doc?.slides || [])
    .filter((s) => s.enabled !== false && s.desktopImage && s.alt)
    .filter((s) => (!s.startsAt || s.startsAt <= now) && (!s.endsAt || s.endsAt > now))
    .slice(0, MAX_SLIDES)
    .map((s) => {
      // width / height of each picture: the banner box takes exactly this shape (no crop, no layout shift).
      // Slides saved before sizes were stored keep the 2.4:1 / 4:5 boxes.
      const dr = s.desktopW && s.desktopH ? s.desktopW / s.desktopH : 12 / 5;
      const mr = s.mobileImage ? (s.mobileW && s.mobileH ? s.mobileW / s.mobileH : 4 / 5) : dr;
      return {
        id: String(s._id),
        desktop: s.desktopImage,
        mobile: s.mobileImage || s.desktopImage,
        alt: s.alt,
        note: s.note || "",
        link: s.link || "",
        dr: Math.round(dr * 1000) / 1000,
        mr: Math.round(mr * 1000) / 1000,
        bg: /^#[0-9a-f]{6}$/i.test(s.bgTop || "") && /^#[0-9a-f]{6}$/i.test(s.bgBottom || "") ? [s.bgTop, s.bgBottom] : null,
        mbg: s.mobileImage && /^#[0-9a-f]{6}$/i.test(s.mobileBgTop || "") && /^#[0-9a-f]{6}$/i.test(s.mobileBgBottom || "") ? [s.mobileBgTop, s.mobileBgBottom] : null,
      };
    });
  const seconds = Math.min(10, Math.max(3, Number(doc?.autoplay?.seconds) || 5));
  res.set("Cache-Control", "public, max-age=60");
  return res.status(200).json(new ApiRes(200, "Hero banner", {
    slides,
    autoplay: { enabled: doc?.autoplay?.enabled !== false, seconds },
  }, true));
});
