// The shop's category pills for every shop page (Shop All and each category), in the order GET /categories
// returns them: product categories in the order set in Admin → Categories, then the collections. Nothing here
// re-sorts, so the admin's arrangement is what shoppers see, and switching pills never reshuffles the row.

/** @param {object[]} pages GET /categories rows; `keepSlug` is included even if not indexable (the current page). */
export const shopPills = (pages = [], keepSlug = null) => pages
  .filter((c) => c.slug === keepSlug || (c.indexable !== false && c.itemCount > 0));
