// Shop All → one section per product category, one card per PARENT product.
// Pure functions (no React) so the grouping rules are unit-tested.
//
// Data comes from lists the page already has (the cached products list, plus
// GET /categories for order/name/image), so grouping costs no extra request.
import { toCategorySlug } from './categoryUrl';
import { isVariantOutOfStock, allActiveVariantsOOS } from './variantStock';

/** Variants that are on sale (admin hides one with isActive:false). */
export const activeVariants = (p) => (p?.variantDetails || []).filter((v) => v && v.isActive !== false);

/**
 * What one parent-product card shows: the cheapest variant you can actually
 * buy (all of them if everything is sold out), "From" when variants differ in
 * price, and the real count of active designs.
 */
export const summarizeProduct = (p) => {
  const vs = activeVariants(p);
  if (!vs.length) {
    const price = Number(p?.effectivePrice || 0);
    return { price, mrp: Number(p?.effectiveMrp || 0), from: false, designs: 0, soldOut: p?.productStatus === 'out_of_stock' };
  }
  const buyable = vs.filter((v) => !isVariantOutOfStock(v));
  const pool = buyable.length ? buyable : vs;
  const priced = pool.map((v) => ({ price: Number(v.variantPrice) || 0, mrp: Number(v.variantMrp) || 0 })).filter((x) => x.price > 0);
  const best = priced.reduce((a, b) => (!a || b.price < a.price ? b : a), null) || { price: 0, mrp: 0 };
  const from = priced.length > 1 && priced.some((x) => x.price !== best.price);
  return { price: best.price, mrp: best.mrp, from, designs: vs.length, soldOut: allActiveVariantsOOS(p) };
};

/** Highest-priority tag as the card's single indicator. */
export const tagLabel = (p) => {
  const t = p?.tags || [];
  if (t.includes('best_seller')) return 'Bestseller';
  if (t.includes('trending')) return 'Trending';
  if (t.includes('new_arrival')) return 'New';
  if (t.includes('featured')) return 'Featured';
  return null;
};

/**
 * @param {object[]} products   the loaded product list (server order = admin priority)
 * @param {object[]} categories GET /categories rows (optional): order, display name, image
 * @returns {{ slug, name, label, image, products, designs }[]}
 *   Section order = the admin's category order when known, else first appearance.
 *   Inside a section sold-out products go last (stable otherwise).
 */
export const buildSections = (products = [], categories = []) => {
  const meta = new Map(categories.filter((c) => c.kind === 'category').map((c, i) => [c.slug, { ...c, rank: i }]));
  const by = new Map();
  products.forEach((p) => {
    const raw = p?.productCategory;
    const slug = toCategorySlug(raw);
    if (!slug) return;
    if (!by.has(slug)) {
      const m = meta.get(slug);
      const name = m?.name || raw;
      by.set(slug, { slug, name, label: name, image: m?.image || '', rank: m ? m.rank : Number.MAX_SAFE_INTEGER, first: by.size, products: [] });
    }
    by.get(slug).products.push(p);
  });
  return [...by.values()]
    .sort((a, b) => a.rank - b.rank || a.first - b.first)
    .map((entry) => {
      const { rank: _r, first: _f, ...s } = entry;
      const live = s.products.filter((p) => !summarizeProduct(p).soldOut);
      const sold = s.products.filter((p) => summarizeProduct(p).soldOut);
      const ordered = [...live, ...sold];
      return { ...s, products: ordered, designs: ordered.reduce((n, p) => n + (activeVariants(p).length || 1), 0) };
    });
};
