// Collection filter state + matching, shared by the shop pages and
// component/ShopFilters.jsx. Items are `{ soldOut, price }`.
export const EMPTY_FILTERS = { inStock: false, outOfStock: false, min: '', max: '', categories: [], types: [] };

// Price boxes accept whole rupees only: digits kept, everything else (minus
// signs, "e", decimals, spaces) dropped, capped at 7 digits.
export const sanitizePrice = (v) => String(v ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 7);

// min/max as numbers, swapped if entered the wrong way round.
export const priceBounds = (f) => {
  const lo = f.min === '' ? null : Number(f.min);
  const hi = f.max === '' ? null : Number(f.max);
  return lo != null && hi != null && lo > hi ? [hi, lo] : [lo, hi];
};

export const applyShopFilters = (items, f) => {
  const [lo, hi] = priceBounds(f);
  const cats = f.categories || [];
  return items.filter((x) => {
    if (f.inStock !== f.outOfStock && (f.inStock ? x.soldOut : !x.soldOut)) return false;
    if (cats.length && !cats.includes(x.p?.productCategory)) return false;
    if (f.types?.length && !f.types.includes(x.group)) return false;
    if (lo != null && x.price < lo) return false;
    if (hi != null && x.price > hi) return false;
    return true;
  });
};

export const activeFilterCount = (f) => (f.inStock ? 1 : 0) + (f.outOfStock ? 1 : 0) + (f.min !== '' || f.max !== '' ? 1 : 0) + (f.categories?.length || 0) + (f.types?.length || 0);

// Quick price bands for the Price filter (₹). `max: ''` = no upper bound.
export const PRICE_RANGES = [
  { label: 'Under ₹500', min: '', max: '499' },
  { label: '₹500 – ₹1,000', min: '500', max: '1000' },
  { label: '₹1,000 – ₹2,000', min: '1000', max: '2000' },
  { label: 'Over ₹2,000', min: '2000', max: '' },
];

// Sort options for shop grids. Client state only (never a URL param), so no
// duplicate indexable URLs. Sold-out items always stay at the end.
export const SORT_OPTIONS = [
  { key: 'featured', label: 'Our top picks' },
  { key: 'most-bought', label: 'Most bought' },
  { key: 'trending', label: 'Trending now' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'discount', label: 'Biggest discount' },
  { key: 'new', label: 'New arrivals' },
];

const tagRank = (order) => (x) => {
  const t = x.p?.tags || [];
  const i = order.findIndex((tag) => t.includes(tag));
  return i === -1 ? order.length : i;
};
const featuredRank = tagRank(['best_seller', 'featured', 'trending']);
const mrpOf = (x) => Number(x.p?.variantDetails?.[0]?.variantMrp || 0);
const offOf = (x) => { const m = mrpOf(x); return m > x.price && x.price > 0 ? (m - x.price) / m : 0; };
// Real signals from the products API (server/src/utils/productSignals.util.js):
// units sold in the last 30 days for this card's variant, and the product's
// createdAt. Missing (older API) = 0, so the sort degrades to the server order.
const soldOf = (x) => Number(x.p?.variantDetails?.[0]?.soldRecent ?? x.p?.soldRecent ?? 0);
const soldLast7DaysOf = (x) => Number(x.p?.variantDetails?.[0]?.soldLast7Days ?? x.p?.soldLast7Days ?? 0);
const createdOf = (x) => Date.parse(x.p?.createdAt || '') || 0;
const soldAllOf = (x) => Number(x.p?.variantDetails?.[0]?.soldTotal ?? x.p?.soldTotal ?? 0);
const productSoldAllOf = (x) => Number(x.p?.soldTotal ?? 0);

const COMPARE = {
  // Admin's own ordering: priority (Admin → product priority), then its tags.
  featured: (a, b) => (Number(b.p?.priority) || 0) - (Number(a.p?.priority) || 0) || featuredRank(a) - featuredRank(b),
  trending: (a, b) => soldOf(b) - soldOf(a),
  'most-bought': (a, b) => soldAllOf(b) - soldAllOf(a),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  discount: (a, b) => offOf(b) - offOf(a),
  new: (a, b) => createdOf(b) - createdOf(a),
};

// Stable sort (Array.prototype.sort is stable), so ties keep the grouped order.
export const sortShopItems = (items, key = 'featured') => {
  const cmp = COMPARE[key] || COMPARE.featured;
  return [...items].sort((a, b) => (a.soldOut === b.soldOut ? cmp(a, b) : a.soldOut ? 1 : -1));
};

// "Cloud" chips on cards, from real sales only: the top DEMAND_TOP cards by
// all-time units get "Most bought", the next top by last-30-day units get
// "Trending now". Nothing sold = no chip. Returns a Map key → chip kind.
const DEMAND_TOP = 3;
const MIN_MOST_BOUGHT_SALES = 5;
const MAX_MOST_BOUGHT_VARIANTS_PER_PRODUCT = 2;
export const demandChips = (items) => {
  const out = new Map();
  const byProduct = new Map();
  items.forEach((item) => {
    const productId = String(item.p?.productId ?? item.key);
    if (!byProduct.has(productId)) byProduct.set(productId, []);
    byProduct.get(productId).push(item);
  });
  byProduct.forEach((variants) => {
    if (productSoldAllOf(variants[0]) < MIN_MOST_BOUGHT_SALES) return;
    variants
      .filter((item) => soldAllOf(item) > 0)
      .sort((a, b) => soldAllOf(b) - soldAllOf(a))
      .slice(0, MAX_MOST_BOUGHT_VARIANTS_PER_PRODUCT)
      .forEach((item) => out.set(item.key, 'most-bought'));
  });
  [...items].filter((x) => soldOf(x) > 0 && !out.has(x.key)).sort((a, b) => soldOf(b) - soldOf(a)).slice(0, DEMAND_TOP)
    .forEach((x) => out.set(x.key, 'trending'));
  return out;
};

const MIN_BADGE_SALES_7D = 5;
const MAX_BADGED_VARIANTS_PER_PRODUCT = 2;

// Show exact last-7-day counts on each product's top two matching variants,
// but only when a variant sold at least five units. Call with the filtered
// list so stock, price, category, and type selections all affect the ranking.
export const recentSalesChips = (items) => {
  const out = new Map();
  const selectedPerProduct = new Map();
  const ranked = [...items]
    .filter((x) => soldLast7DaysOf(x) >= MIN_BADGE_SALES_7D)
    .sort((a, b) => soldLast7DaysOf(b) - soldLast7DaysOf(a));

  for (const item of ranked) {
    const productId = String(item.p?.productId ?? item.key);
    const selected = selectedPerProduct.get(productId) || 0;
    if (selected >= MAX_BADGED_VARIANTS_PER_PRODUCT) continue;
    out.set(item.key, soldLast7DaysOf(item));
    selectedPerProduct.set(productId, selected + 1);
  }

  return out;
};
