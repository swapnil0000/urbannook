import { isVariantOutOfStock } from './variantStock';

// Biggest real markdown on anything you can buy right now: variantMrp vs
// variantPrice on active, in-stock variants. No number is invented — with no
// discounted stock the "Up to" pill is simply left out.
export const maxDiscountPercent = (products = []) => {
  let best = 0;
  products.forEach((p) => (p?.variantDetails || []).forEach((v) => {
    if (!v || v.isActive === false || isVariantOutOfStock(v)) return;
    const mrp = Number(v.variantMrp || 0);
    const price = Number(v.variantPrice || 0);
    if (mrp > price && price > 0) best = Math.max(best, Math.round(((mrp - price) / mrp) * 100));
  }));
  return best;
};
