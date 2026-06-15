/**
 * Converts any string to a URL-safe slug.
 * "Desk Accessories" → "desk-accessories"
 * "SuperHeroes!!"   → "superheroes"
 */
const slugify = (str) =>
  str
    ?.toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // spaces → hyphens
    .replace(/[^\w-]+/g, '')     // strip non-word chars
    .replace(/--+/g, '-')        // collapse double hyphens
    .replace(/^-+|-+$/g, '')     // trim leading/trailing hyphens
  ?? '';

export default slugify;
