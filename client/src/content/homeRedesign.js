/**
 * Homepage redesign — every word and number of the redesigned sections lives here.
 * Colours come from the --gl-* tokens in index.css, fonts from tailwind.config.js
 * (archivo / inter / mono), type scale and spacing from the `.rd-*` block in index.css.
 * Components under component/home/ hold no copy of their own.
 */

export const GIFT_EDIT = {
  eyebrow: 'Thoughtfully picked',
  index: '01',
  heading: 'A little unexpected. A lot of joy.',
  sub: 'For the ones who make your everyday brighter.',
  // {n} = how many products the admin has tagged Bestseller (shown, max `max`)
  count: ['{n} finds.', 'Endless personality.'],
  cardBadge: 'The gift edit',
  viewAll: 'Shop all',
  viewAllHref: '/products',
  off: '{pct}% off',
  max: 4,
  fallbackCategory: 'Urban Nook',
};

// Trust strip under the gift edit. `source` items are read live from GET /stats/public (shown only when there is data);
// the two without a source are store POLICIES (not statistics), so they live here as copy, not in the database.
// value → counts up; unit = small mark after it; stars → filled stars (aria-label carries the number).
export const TRUST = {
  label: 'Why people trust us',
  items: [
    { source: 'ratingAvg', decimals: 1, unit: '/5', label: 'Average rating', stars: 5 },
    { source: 'ordersDelivered', round: 10, group: true, suffix: '+', label: 'Orders delivered' },
    { value: 100, suffix: '%', label: 'Made in India' },
    { value: 7, suffix: '-day', label: 'Easy replacement' },
  ],
};

// "The UrbanNook way" band — brand promise next to the featured piece's photos (the photos come from the
// featured product's variant shots, see HomePage `carouselImages`). Figures are hand-maintained claims.
export const STATEMENT = {
  index: '04',
  eyebrow: 'The UrbanNook way',
  heading: 'Built to order. Not to sit in a warehouse.',
  body: "Every piece is 3D-printed the moment you order it - less waste, sharper detail, and a finish you won't find on a shelf.",
  // `source` = a number read live from GET /stats/public (real delivered orders, real approved-review average / count).
  // An item with no data yet (0) is simply not shown. `round` floors big counts to a clean figure (947 → "940+").
  stats: [
    { source: 'ordersDelivered', round: 10, suffix: '+', label: 'Orders delivered' },
    { source: 'ratingAvg', decimals: 1, unit: '/5', label: 'Average rating' },
    { source: 'ratingCount', round: 10, suffix: '+', label: 'Verified reviews' },
  ],
  counter: '{i} / {n}',
  prev: 'Previous photo',
  next: 'Next photo',
  goTo: 'Show photo {i}',
};
