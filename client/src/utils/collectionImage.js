import { toCategorySlug } from './categoryUrl';

export const LOGO = '/assets/logo.webp';

// A real photo of the product itself: its first variant shot, else its main image (never the logo fallback).
export const photoOf = (p) => (p?.variantDetails || []).find((v) => v?.isActive !== false && v?.variantImage?.[0])?.variantImage?.[0] || p?.productImg || p?.productImage || '';

/** Photo candidates for a tile, best first: the admin's category image, the category's cover (first product photo,
 *  sent by the categories API once deployed), then a published product of that category from the catalogue the page
 *  already loaded (read-only, no extra request). The logo is only the last resort. */
export const imageCandidates = (c, products) => {
  const own = products.find((p) => toCategorySlug(p?.productCategory) === c.slug && photoOf(p));
  return [...new Set([c.image, c.cover, own && photoOf(own), LOGO].filter(Boolean))];
};

