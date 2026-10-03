// Admin → SEO Pages overrides, merged over what a page sets for itself.
// Rule: a filled admin field wins; an empty one keeps the page's own value.
// With no admin entry the result is exactly the page's own values, so a page
// nobody has touched in admin looks the same as before.

const SITE = 'https://www.urbannook.in';

// Same key the admin saves under (server/src/utils/seoPath.js).
export const normalizeSeoPath = (input = '') => {
  let p = String(input).trim().replace(/^https?:\/\/[^/]+/i, '').split('#')[0].split('?')[0];
  try { p = decodeURI(p); } catch { /* keep as-is */ }
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p.toLowerCase();
};

const filled = (v) => typeof v === 'string' && v.trim() !== '';

const parseJsonLd = (raw) => {
  if (!filled(raw)) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : (v && typeof v === 'object' ? [v] : []);
  } catch { return []; }
};

/**
 * @param {object} page  what the page computed: { fullTitle, description, canonicalUrl, image,
 *                       noIndex, ogTitle, ogDescription, structuredData: [] }
 * @param {object|null} seo  the admin SEO entry for this URL, or null
 */
export const mergeSeo = (page, seo) => {
  if (!seo) return page;
  const fullTitle = filled(seo.metaTitle) ? seo.metaTitle.trim() : page.fullTitle;
  const description = filled(seo.metaDescription) ? seo.metaDescription.trim() : page.description;
  let canonicalUrl = page.canonicalUrl;
  if (filled(seo.canonicalUrl)) {
    const c = seo.canonicalUrl.trim();
    canonicalUrl = c.startsWith('/') ? `${SITE}${c}` : c;
  }
  let noIndex = page.noIndex;
  if (seo.robots === 'noindex') noIndex = true;
  if (seo.robots === 'index') noIndex = false;
  return {
    ...page,
    fullTitle,
    description,
    canonicalUrl,
    noIndex,
    // Social preview: explicit OG fields, else the (possibly overridden) title/description.
    ogTitle: filled(seo.ogTitle) ? seo.ogTitle.trim() : (filled(seo.metaTitle) ? fullTitle : page.ogTitle),
    ogDescription: filled(seo.ogDescription) ? seo.ogDescription.trim() : (filled(seo.metaDescription) ? description : page.ogDescription),
    image: filled(seo.ogImage) ? seo.ogImage.trim() : page.image,
    structuredData: [...(page.structuredData || []), ...parseJsonLd(seo.customJsonLd)],
  };
};
