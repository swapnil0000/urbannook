// Category pages are built from what the shop actually shows: each published
// product's `productCategory`. An admin Category document (matched by
// categoryId, else by name) adds the image and display order. SEO for the
// page comes from Admin → SEO Pages (GET /seo?path=/category/<slug>).
// Products that were never linked to an admin Category still get a page.

// URL slug: lowercase words joined by "-" ("Pen Stand" → "pen-stand").
// Admin slugs use "_" ("wall_hangings"); both normalise to the same value.
export const toCategorySlug = (s = "") =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// A category page with fewer sellable items than this is "thin" and noindex.
export const MIN_INDEXABLE_ITEMS = 3;

// Variants that are actually on sale (admin can hide one with isActive:false).
export const activeVariants = (p) =>
  (p?.variantDetails || []).filter((v) => v && v.isActive !== false);

/**
 * @param {object[]} products  published, non-addon products
 * @param {object[]} categoryDocs  admin Category documents
 * @returns {object[]} one entry per productCategory, ordered by admin displayOrder then name
 */
export const buildCategories = (products, categoryDocs = []) => {
  const docs = categoryDocs.filter((c) => c && c.isActive !== false);
  const byId = new Map(docs.filter((c) => c.categoryId).map((c) => [c.categoryId, c]));
  const bySlug = new Map(docs.map((c) => [toCategorySlug(c.slug || c.name), c]));

  const out = new Map();
  for (const p of products) {
    if (!p?.productCategory) continue;
    const slug = toCategorySlug(p.productCategory);
    if (!slug) continue;
    const doc = byId.get(p.categoryId) || bySlug.get(slug);
    if (!out.has(slug)) {
      out.set(slug, {
        slug,
        name: p.productCategory,
        image: doc?.image || "",
        displayOrder: doc?.displayOrder ?? Number.MAX_SAFE_INTEGER,
        productIds: [],
        itemCount: 0,
      });
    }
    const entry = out.get(slug);
    entry.productIds.push(p.productId);
    entry.itemCount += activeVariants(p).length || 1;
  }

  return [...out.values()]
    .map((c) => ({ ...c, indexable: c.itemCount >= MIN_INDEXABLE_ITEMS }))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
};
