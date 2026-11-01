// Sorting for the /offers page. Every value comes from the live promotion
// payload (GET promotions/display/home) or the live product list; nothing is
// invented. Missing values sort last, keeping admin's order among ties.

export const OFFER_SORTS = [
  { key: 'featured', label: 'Our top picks' },
  { key: 'trending', label: 'Trending now' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
];

/** Lowest real price a shopper pays to start this offer (first card of any choice, else items). */
export const offerStartPrice = (c) => {
  const prices = [
    ...(c?.choices || []).flatMap((ch) => (ch.cards || []).map((x) => Number(x.price))),
    ...(c?.items || []).map((x) => Number(x.price)),
  ].filter((n) => n > 0);
  return prices.length ? Math.min(...prices) : null;
};

/** Units sold in the last 30 days of the offer's main product (products API `soldRecent`). */
export const offerDemand = (c, productsById) => {
  const id = c?.primaryProductId || c?.choices?.[0]?.cards?.[0]?.productId || c?.items?.[0]?.productId;
  return Number(productsById.get(id)?.soldRecent || 0);
};

export const sortOffers = (combos, key, productsById = new Map()) => {
  const withPrice = (dir) => (a, b) => {
    const pa = offerStartPrice(a);
    const pb = offerStartPrice(b);
    if (pa == null) return pb == null ? 0 : 1;
    if (pb == null) return -1;
    return dir * (pa - pb);
  };
  const cmp = {
    featured: (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || (Number(b.priority) || 0) - (Number(a.priority) || 0),
    trending: (a, b) => offerDemand(b, productsById) - offerDemand(a, productsById),
    'price-asc': withPrice(1),
    'price-desc': withPrice(-1),
  }[key];
  return cmp ? [...combos].sort(cmp) : combos;
};
