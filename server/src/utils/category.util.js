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

// First real photo of a product (variant shot first), used as a tile cover when no admin image is set.
const coverOf = (p) => p?.productImg || p?.productImage || activeVariants(p).find((v) => v?.variantImage?.[0])?.variantImage?.[0] || "";

/**
 * @param {object[]} products  published, non-addon products
 * @param {object[]} categoryDocs  admin Category documents
 * @returns {object[]} one entry per productCategory, in the admin's arrangement (Categories workspace):
 *   1) displayOrder 1,2,3… as set there; 2) unset (0) after those, in the admin list order (creation);
 *   3) categories with no admin document last, A-Z. Sub-categories follow the same rule.
 */
export const buildCategories = (products, categoryDocs = []) => {
  const docs = categoryDocs.filter((c) => c && c.isActive !== false);
  // Admin rank: explicit displayOrder first, unset (0) after in list order, so "0" never jumps to the top.
  const rank = new Map(docs.map((c, i) => [c, c.displayOrder > 0 ? c.displayOrder : 1000 + i]));
  const byId = new Map(docs.filter((c) => c.categoryId).map((c) => [c.categoryId, c]));
  const bySlug = new Map(docs.map((c) => [toCategorySlug(c.slug || c.name), c]));
  // Admin sub-category order/name per category doc: slug → { name, order }.
  const docSubs = (doc) => new Map((doc?.subcategories || []).map((sc, i) => [
    toCategorySlug(sc.slug || sc.name), { name: sc.name, order: sc.displayOrder > 0 ? sc.displayOrder : 1000 + i },
  ]));

  const out = new Map();
  for (const p of products) {
    if (!p) continue;
    // The admin Category is the source of truth: a product linked by categoryId follows its category's current
    // name/slug even if the product's own productCategory text is stale (renamed) or empty.
    const doc = byId.get(p.categoryId) || bySlug.get(toCategorySlug(p.productCategory));
    const label = doc?.name || p.productCategory;
    if (!label) continue;
    const slug = toCategorySlug(label);
    if (!slug) continue;
    if (!out.has(slug)) {
      out.set(slug, {
        slug,
        name: label,
        image: doc?.image || "",
        displayOrder: doc ? rank.get(doc) : Number.MAX_SAFE_INTEGER,
        cover: "",
        productIds: [],
        itemCount: 0,
        subs: new Map(),
        subOrder: docSubs(doc),
      });
    }
    const entry = out.get(slug);
    const items = activeVariants(p).length || 1;
    entry.productIds.push(p.productId);
    entry.itemCount += items;
    entry.cover ||= coverOf(p);
    // Level 2: the product's sub-category (hierarchy category → sub-category → products → variants).
    const subSlug = toCategorySlug(p.productSubCategory);
    if (subSlug) {
      if (!entry.subs.has(subSlug)) {
        const known = entry.subOrder.get(subSlug);
        entry.subs.set(subSlug, { slug: subSlug, name: known?.name || p.productSubCategory, order: known?.order ?? Number.MAX_SAFE_INTEGER, image: "", productIds: [], itemCount: 0 });
      }
      const sub = entry.subs.get(subSlug);
      sub.productIds.push(p.productId);
      sub.itemCount += items;
      sub.image ||= coverOf(p);
    }
  }

  const categories = [...out.values()]
    .map(({ subs, subOrder, ...c }) => ({
      ...c,
      kind: "category",
      indexable: c.itemCount >= MIN_INDEXABLE_ITEMS,
      subcategories: [...subs.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)).map(({ order, ...sc }) => sc),
    }))
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
