// The shop's category pills, in ONE fixed order for every shop page (Shop All
// and each category): product categories, then collections, series, games.
// A fixed order means switching pills never reshuffles the row.
const KIND_ORDER = { category: 0, collection: 1, series: 2, game: 3 };

/** @param {object[]} pages GET /categories rows; `keepSlug` is included even if not indexable (the current page). */
export const shopPills = (pages = [], keepSlug = null) => pages
  .filter((c) => c.slug === keepSlug || (c.indexable !== false && c.itemCount > 0))
  .sort((a, b) => (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9));
