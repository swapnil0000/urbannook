// Category pages are built from what the shop actually shows: each published
// product's `productCategory`. An admin Category document (matched by
// categoryId, else by name) adds the image and display order. SEO for the
// page comes from Admin → SEO Pages (GET /seo?path=/category/<slug>).
// Products that were never linked to an admin Category still get a page.
// After them come the collection pages (buildCollections below): one per
// franchise and "Anime Katana", built from variants, not whole products.

import { seriesOf } from "./series.util.js";

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

  const categories = [...out.values()]
    .map((c) => ({ ...c, kind: "category", indexable: c.itemCount >= MIN_INDEXABLE_ITEMS }))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  const taken = new Set(categories.map((c) => c.slug));
  return [...categories, ...buildCollections(products).filter((c) => !taken.has(c.slug))];
};

// Katana variants: the wooden and LED katana products (sub-category "katana" /
// "LED Katana"), minus the display stands that share the "katana" sub-category.
const isKatanaVariant = (p, v) =>
  /^(katana|led-?katana|ledkatana)$/.test(toCategorySlug(p.productSubCategory)) &&
  /katana|sword|blade/i.test(v.variantName || "") &&
  !/stand/i.test(v.variantName || "");

/**
 * Collection pages that cut across products at the VARIANT level: one page per
 * franchise (Demon Slayer, One Piece, … and one for video games, see
 * series.util.js), plus "Anime Katana" (every wooden and LED katana). Same
 * shape as a category, plus `variantSkus`: categoryDetails returns only those
 * variants of each product, so the Demon Slayer page lists Zenitsu's wooden AND
 * LED katana but not Zoro's.
 */
export const buildCollections = (products) => {
  const out = new Map();
  const add = (meta, p, v) => {
    if (!out.has(meta.slug)) out.set(meta.slug, { ...meta, image: "", displayOrder: Number.MAX_SAFE_INTEGER, productIds: [], variantSkus: [], itemCount: 0 });
    const c = out.get(meta.slug);
    if (!c.productIds.includes(p.productId)) c.productIds.push(p.productId);
    c.variantSkus.push(v.sku);
    c.itemCount += 1;
  };
  for (const p of products) {
    for (const v of activeVariants(p)) {
      if (!v.sku) continue;
      if (isKatanaVariant(p, v)) add({ slug: "anime-katana", name: "Anime Katana", kind: "collection" }, p, v);
      const s = seriesOf(v.variantName) || seriesOf(p.productName); // the variant's own name first: a product can name several series
      if (s) add({ slug: s.slug, name: s.name, kind: s.kind === "game" ? "game" : "series" }, p, v);
    }
  }
  return [...out.values()]
    .map((c) => ({ ...c, indexable: c.itemCount >= MIN_INDEXABLE_ITEMS }))
    .sort((a, b) => b.itemCount - a.itemCount || a.name.localeCompare(b.name));
};
