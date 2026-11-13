import { describe, it, expect } from 'vitest';
import { buildSections, summarizeProduct, activeVariants } from '../collectionSections';
import { toParentItems } from '../shopItems';
import { applyShopFilters, sortShopItems, EMPTY_FILTERS } from '../shopFilters';

const v = (sku, price, extra = {}) => ({ sku, variantName: sku, variantPrice: price, variantMrp: price + 100, isActive: true, ...extra });
const prod = (id, cat, variants, extra = {}) => ({ productId: id, productName: id, productCategory: cat, variantDetails: variants, ...extra });

describe('summarizeProduct', () => {
  it('counts only active variants and shows "from" when prices differ', () => {
    const s = summarizeProduct(prod('a', 'Anime', [v('1', 999), v('2', 1299), v('3', 500, { isActive: false })]));
    expect(s).toMatchObject({ designs: 2, price: 999, mrp: 1099, from: true, soldOut: false });
  });
  it('same price on every variant is not "from"', () => {
    expect(summarizeProduct(prod('a', 'Anime', [v('1', 999), v('2', 999)])).from).toBe(false);
  });
  it('prices from the cheapest variant that can be bought', () => {
    const s = summarizeProduct(prod('a', 'Anime', [v('1', 400, { variantOutOfStock: true }), v('2', 900)]));
    expect(s.price).toBe(900);
    expect(s.soldOut).toBe(false);
  });
  it('all variants sold out → soldOut, priced from the cheapest', () => {
    const s = summarizeProduct(prod('a', 'Anime', [v('1', 400, { variantOutOfStock: true }), v('2', 900, { variantQuantity: 0 })]));
    expect(s).toMatchObject({ soldOut: true, price: 400 });
  });
  it('a product with no variants does not crash', () => {
    expect(summarizeProduct(prod('a', 'Lamp', [], { effectivePrice: 700 }))).toMatchObject({ designs: 0, price: 700 });
    expect(activeVariants(undefined)).toEqual([]);
  });
});

describe('buildSections', () => {
  const products = [
    prod('k1', 'Anime', [v('a', 999), v('b', 999)]),
    prod('l1', 'Lamp', [v('c', 1500)]),
    prod('k2', 'Anime', [v('d', 800, { variantOutOfStock: true })]),
    prod('d1', 'Decor', [v('e', 300)]),
    prod('k3', 'Anime', [v('f', 700)]),
  ];

  it('one section per category, one entry per parent product, no matter the variant count', () => {
    const s = buildSections(products);
    expect(s.map((x) => x.slug)).toEqual(['anime', 'lamp', 'decor']);
    expect(s[0].products.map((p) => p.productId)).toEqual(['k1', 'k3', 'k2']); // sold-out last
    expect(s[0].designs).toBe(4);
  });

  it('follows the admin category order and display names from /categories', () => {
    const cats = [{ kind: 'category', slug: 'decor', name: 'Decor' }, { kind: 'series', slug: 'naruto', name: 'Naruto' }, { kind: 'category', slug: 'lamp', name: 'Lamp' }];
    const s = buildSections(products, cats);
    expect(s.map((x) => x.slug)).toEqual(['decor', 'lamp', 'anime']);
    expect(s[1].label).toBe('Lamp'); // the admin's own name, no front-end renaming
  });

  it('skips products without a category and handles an empty list', () => {
    expect(buildSections([prod('x', '', [v('1', 1)])])).toEqual([]);
    expect(buildSections()).toEqual([]);
  });
});

describe('toParentItems (category page)', () => {
  const list = [
    prod('a', 'Anime', [v('1', 900), v('2', 1400)], { soldTotal: 5, tags: [] }),
    prod('b', 'Anime', [v('3', 300, { variantOutOfStock: true })], { soldTotal: 50 }),
    prod('c', 'Anime', [v('4', 2000), v('5', 2100), v('6', 2200)], { soldTotal: 20 }),
  ];
  it('one item per parent product, sold-out last, priced from the cheapest buyable variant', () => {
    const items = toParentItems(list);
    expect(items.map((x) => x.key)).toEqual(['a', 'c', 'b']);
    expect(items[0]).toMatchObject({ price: 900, mrp: 1000, soldOut: false, href: '/products/a', ldHref: '/product/a', parent: true });
  });
  it('filters and sorts act on the whole parent list', () => {
    const items = toParentItems(list);
    expect(applyShopFilters(items, { ...EMPTY_FILTERS, inStock: true }).map((x) => x.key)).toEqual(['a', 'c']);
    expect(applyShopFilters(items, { ...EMPTY_FILTERS, min: '1000' }).map((x) => x.key)).toEqual(['c']);
    expect(sortShopItems(items, 'price-asc').map((x) => x.key)).toEqual(['a', 'c', 'b']); // sold-out stays last
    expect(sortShopItems(items, 'bestseller').map((x) => x.key)).toEqual(['c', 'a', 'b']); // by the product's own sales
  });
});
