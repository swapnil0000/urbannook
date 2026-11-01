import { categoryPath } from './categoryUrl';

// Collection/series pages (from GET /categories) are all built from the anime
// catalogue on the server (server/src/utils/category.util.js buildCollections),
// so they hang under the Anime menu. Keyed by the stored category name.
const COLLECTION_PARENT = 'Anime';
const TYPE_KINDS = ['collection'];
const SERIES_KINDS = ['series', 'game'];
const MAX_LINKS = 8;

const firstImage = (p) => p?.variantDetails?.[0]?.variantImage?.[0] || p?.productImg || '';

/**
 * Dropdown content for one header category: link groups + a featured product.
 * Every link is a real page (category / collection / product), so the menu is
 * also crawlable. Returns null when there is nothing worth a dropdown.
 *
 * @param {string} category   stored category name ("Anime", "Lamp", …)
 * @param {object[]} products list products (useGetProductsQuery)
 * @param {object[]} pages    GET /categories rows ({ slug, name, kind, itemCount, indexable })
 */
export const buildNavMenu = (category, products = [], pages = []) => {
  const inCat = products.filter((p) => p?.productCategory === category);
  const groups = [];

  if (category === COLLECTION_PARENT) {
    const visible = pages.filter((c) => c.indexable !== false && c.itemCount > 0);
    const types = visible.filter((c) => TYPE_KINDS.includes(c.kind));
    const series = visible.filter((c) => SERIES_KINDS.includes(c.kind));
    if (types.length) groups.push({ title: 'Shop by type', links: types.map((c) => ({ label: c.name, to: `/category/${c.slug}`, count: c.itemCount })) });
    if (series.length) groups.push({ title: 'Shop by series', links: series.slice(0, MAX_LINKS).map((c) => ({ label: c.name, to: `/category/${c.slug}`, count: c.itemCount })) });
  }

  // A category that is one product (Lamps = the Brake Caliper lamp) lists its
  // designs instead, each linking to that variant's own page: one link to
  // "Brake Caliper Lamp" told the shopper nothing.
  const onlyVariants = inCat.length === 1 ? (inCat[0].variantDetails || []).filter((v) => v?.isActive !== false && v.sku) : [];
  if (onlyVariants.length > 1) {
    groups.push({
      title: 'Designs',
      links: onlyVariants.slice(0, MAX_LINKS).map((v) => ({ label: v.variantName, to: `/product/${inCat[0].productId}/${v.sku}`, img: v.variantImage?.[0] || '' })),
    });
  } else if (inCat.length) {
    groups.push({
      title: 'Products',
      links: inCat.slice(0, MAX_LINKS).map((p) => ({ label: p.productName, to: `/products/${p.productId}`, count: (p.variantDetails || []).filter((v) => v.isActive !== false).length })),
    });
  }

  if (!groups.length) return null;
  // Designs already show their own photos; a big featured image next to them
  // just repeated the first one.
  const hasThumbs = groups.some((g) => g.links.some((l) => l.img));
  const featured = hasThumbs ? null : inCat.find((p) => firstImage(p));
  return {
    groups,
    viewAll: categoryPath(category),
    featured: featured ? { name: featured.productName, img: firstImage(featured), to: `/products/${featured.productId}` } : null,
  };
};
